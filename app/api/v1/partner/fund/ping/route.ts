import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const BANK_NAMES: Record<string, string> = {
  '100004': 'OPay',
  '20867': 'Palmpay',
  '29007': 'Safehaven',
  '20987': 'Kolomoni MFB',
};

function pickAccount(parsed: Record<string, unknown>) {
  const data = (parsed.data as Record<string, unknown>) || parsed;
  const accounts = (data.bankAccounts || data.accounts || parsed.bankAccounts || []) as Array<
    Record<string, unknown>
  >;
  const first = accounts[0] || {};
  const accountNumber = String(
    first.accountNumber || first.account_number || data.accountNumber || data.account_number || '',
  ).replace(/\D/g, '');
  const rawCode = String(first.bankCode || first.bank_code || data.bankCode || '').trim();
  const bankName = String(
    first.bankName ||
      first.bank_name ||
      data.bankName ||
      (rawCode && BANK_NAMES[rawCode]) ||
      'OPay',
  );
  const ex = first.expire_at || first.expireAt || data.expire_at || data.expireAt;
  const expireAt = ex ? String(ex) : null;
  const customer = (data.customer || parsed.customer || {}) as Record<string, unknown>;
  const providerCustomerId = String(
    customer.customer_id || customer.id || data.customer_id || data.customerId || '',
  );
  return {
    accountNumber,
    bankName,
    bankCode: rawCode || '100004',
    expireAt,
    providerCustomerId,
    accountsLen: accounts.length,
  };
}

async function callXixaPay(
  base: string,
  apiKey: string,
  secret: string,
  payload: Record<string, unknown>,
) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${base}/api/v1/createVirtualAccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });
    const bodyText = await res.text().catch(() => '');
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      parsed = { raw: bodyText.slice(0, 400) };
    }
    return { status: res.status, bodyText, parsed };
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const panel = await resolvePanelClient(req);
    if (!panel?.walletUserId) {
      return NextResponse.json(
        { ok: false, step: 'auth', message: 'Invalid panel key or no linked wallet' },
        { status: 401 },
      );
    }

    const apiKey = process.env.XIXAPAY_API_KEY?.trim();
    const secret = process.env.XIXAPAY_SECRET_KEY?.trim();
    const businessId = process.env.XIXAPAY_BUSINESS_ID?.trim();
    if (!apiKey || !secret || !businessId) {
      return NextResponse.json({
        ok: false,
        step: 'config',
        message: 'XIXAPAY_* missing on Verxor',
        ms: Date.now() - started,
      });
    }

    let body: { amount?: number; phone?: string; phoneNumber?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* empty */
    }
    const amount = Math.round(Number(body.amount)) || 0;
    const fullTest = amount >= 500;

    const base = (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
    const panelSlug =
      (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'partner';
    const accountName = `Verxor-${panelSlug}`;
    const externalRef = `vxp-panel-${String(panel.id).slice(0, 8)}-${Date.now()}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(/\/$/, '');
    const callbackUrl =
      process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
      `${appUrl}/api/webhooks/xixapay/virtual-account`;

    if (!fullTest) {
      const probe = await callXixaPay(base, apiKey, secret, { businessId });
      return NextResponse.json({
        ok: probe.status > 0,
        step: 'xixapay',
        fullTest: false,
        merchant: 'verxor',
        xixapayHttpStatus: probe.status,
        xixapayBody: probe.bodyText.slice(0, 400),
        ms: Date.now() - started,
        message: 'Reachability OK',
      });
    }

    const userPhone =
      (body.phone || body.phoneNumber || '').trim() ||
      (panelSlug === 'vernexdigital' ? '09164159443' : '08141620644');
    const customerEmail =
      panelSlug === 'vernexdigital'
        ? 'vernexdigital@gmail.com'
        : `partner.${panelSlug}@gmail.com`;
    const customerName = `Verxor ${panelSlug}`;

    // Supported partner banks in order of priority: OPay, Palmpay, Safehaven
    const candidateBanks = ['100004', '20867', '29007'];

    // Step 1: create with customer details + candidate banks list
    const payload1 = {
      email: customerEmail,
      name: customerName,
      phoneNumber: userPhone,
      bankCode: candidateBanks,
      businessId,
      accountType: 'dynamic',
      amount,
      externalReference: externalRef,
      callbackUrl,
    };

    let result = await callXixaPay(base, apiKey, secret, payload1);
    let picked = pickAccount(result.parsed);

    const customer = (result.parsed.customer || {}) as Record<string, unknown>;
    const customerId = String(customer.customer_id || customer.id || '');
    const errors = result.parsed.errors;
    const errList = Array.isArray(errors) ? errors.map(String) : [];

    // Step 2: if customer exists but no account, retry individual banks with customer_id (Option 1)
    if (!picked.accountNumber && customerId) {
      for (const b of candidateBanks) {
        const payload2 = {
          customer_id: customerId,
          bankCode: [b],
          businessId,
          accountType: 'dynamic',
          amount,
          externalReference: `${externalRef}-${b}`,
          callbackUrl,
        };
        const r2 = await callXixaPay(base, apiKey, secret, payload2);
        const p2 = pickAccount(r2.parsed);
        if (p2.accountNumber) {
          result = r2;
          picked = p2;
          break;
        }
        if (Array.isArray(r2.parsed.errors)) {
          errList.push(...r2.parsed.errors.map(String));
        }
      }
    }

    // Step 3: if still no account and no customerId, retry individual banks with raw customer data
    if (!picked.accountNumber && !customerId) {
      for (const b of ['20867', '29007', '100004']) {
        const payload3 = {
          email: customerEmail,
          name: customerName,
          phoneNumber: userPhone,
          bankCode: [b],
          businessId,
          accountType: 'dynamic',
          amount,
          externalReference: `${externalRef}-${b}`,
          callbackUrl,
        };
        const r3 = await callXixaPay(base, apiKey, secret, payload3);
        const p3 = pickAccount(r3.parsed);
        if (p3.accountNumber) {
          result = r3;
          picked = p3;
          break;
        }
        if (Array.isArray(r3.parsed.errors)) {
          errList.push(...r3.parsed.errors.map(String));
        }
      }
    }

    if (!picked.accountNumber) {
      const authFail = errList.some((e) => /auth/i.test(e));
      const msg =
        errList.filter(Boolean).join('; ') ||
        (typeof result.parsed.message === 'string' ? result.parsed.message : null) ||
        `XixaPay returned no account number (HTTP ${result.status})`;
      return NextResponse.json({
        ok: false,
        step: 'full_create',
        fullTest: true,
        merchant: 'verxor',
        xixapayHttpStatus: result.status,
        xixapayBody: result.bodyText.slice(0, 600),
        providerMessage: typeof result.parsed.message === 'string' ? result.parsed.message : null,
        errors: errList,
        accountNumber: null,
        ms: Date.now() - started,
        message: authFail
          ? `XixaPay bank auth failed: ${msg}. Check API Key + Secret + Business ID match the enabled credentials in XixaPay dashboard, then redeploy Verxor.`
          : msg,
      });
    }

    // Save VA for webhook
    try {
      const sbUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
        .replace(/\/rest\/v1\/?$/, '')
        .replace(/\/$/, '');
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey && panel.walletUserId) {
        await fetch(`${sbUrl}/rest/v1/virtual_accounts`, {
          method: 'POST',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: panel.walletUserId,
            provider: 'xixapay',
            bank_code: picked.bankCode,
            bank_name: picked.bankName,
            account_number: picked.accountNumber,
            account_name: accountName,
            account_type: 'dynamic',
            amount_ngn: amount,
            external_ref: externalRef,
            provider_customer_id: picked.providerCustomerId || null,
            raw: {
              partner_fund: true,
              wallet_type: 'reseller',
              panel_id: panel.id,
              panel_name: panel.name,
              merchant: 'verxor',
            },
          }),
        });
      }
    } catch (e) {
      console.error('[partner/fund/ping] va save', e);
    }

    return NextResponse.json({
      ok: true,
      step: 'full_create',
      fullTest: true,
      merchant: 'verxor',
      panel: { id: panel.id, name: panel.name },
      xixapayHttpStatus: result.status,
      accountNumber: picked.accountNumber,
      accountName,
      bankName: picked.bankName,
      bankCode: picked.bankCode,
      amount,
      expireAt: picked.expireAt,
      externalReference: externalRef,
      reservedAccountId: picked.providerCustomerId || null,
      ms: Date.now() - started,
      message: 'Account created on Verxor merchant',
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      {
        ok: false,
        step: 'crash',
        message: aborted
          ? 'Payment provider timed out'
          : e instanceof Error
            ? e.message
            : 'error',
        ms: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
