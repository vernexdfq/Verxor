import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const BANK_CODE = '100004';

function toNgPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '08000000000';
  if (d.startsWith('0') && d.length >= 11) return d.slice(0, 11);
  if (d.startsWith('234') && d.length >= 13) return `0${d.slice(3, 13)}`;
  const last10 = d.slice(-10);
  if (last10.length === 10) return `0${last10}`;
  return d.padStart(11, '0').slice(0, 11);
}

async function loadWalletProfile(userId: string): Promise<{ email: string; phone: string; name: string }> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || !userId) return { email: '', phone: '', name: '' };
  try {
    const res = await fetch(
      `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email,phone,full_name,name&limit=1`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return { email: '', phone: '', name: '' };
    const rows = (await res.json()) as Array<{
      email?: string;
      phone?: string;
      full_name?: string;
      name?: string;
    }>;
    const row = rows[0] || {};
    return {
      email: (row.email || '').trim().toLowerCase(),
      phone: (row.phone || '').trim(),
      name: (row.full_name || row.name || '').trim(),
    };
  } catch {
    return { email: '', phone: '', name: '' };
  }
}

function pickAccount(parsed: Record<string, unknown>) {
  const data = (parsed.data as Record<string, unknown>) || parsed;
  const accounts = (data.bankAccounts || data.accounts || parsed.bankAccounts || []) as Array<
    Record<string, unknown>
  >;
  const first = accounts[0] || {};
  const accountNumber = String(
    first.accountNumber || first.account_number || data.accountNumber || data.account_number || '',
  ).replace(/\D/g, '');
  const bankName = String(first.bankName || first.bank_name || data.bankName || 'OPay');
  const ex = first.expire_at || first.expireAt || data.expire_at || data.expireAt;
  const expireAt = ex ? String(ex) : null;
  const customer = (data.customer || parsed.customer || {}) as Record<string, unknown>;
  const providerCustomerId = String(
    customer.customer_id || customer.id || data.customer_id || data.customerId || '',
  );
  return { accountNumber, bankName, expireAt, providerCustomerId };
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

    let body: { amount?: number } = {};
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
      return NextResponse.json({
        ok: true,
        step: 'xixapay',
        fullTest: false,
        merchant: 'verxor',
        panel: { id: panel.id, name: panel.name },
        ms: Date.now() - started,
        message: 'Reachability OK',
      });
    }

    const profile = await loadWalletProfile(panel.walletUserId);
    const email =
      profile.email ||
      (panelSlug === 'vernexdigital' ? 'vernexdigital@gmail.com' : `partner.${panelSlug}@gmail.com`);
    const phone = toNgPhone(profile.phone || '08000000000');

    const payload = {
      email,
      name: accountName,
      phoneNumber: phone,
      bankCode: [BANK_CODE],
      businessId,
      accountType: 'dynamic',
      amount,
      externalReference: externalRef,
      callbackUrl,
    };

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    let status = 0;
    let bodyText = '';
    let parsed: Record<string, unknown> = {};
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
      status = res.status;
      bodyText = await res.text().catch(() => '');
      try {
        parsed = JSON.parse(bodyText) as Record<string, unknown>;
      } catch {
        parsed = { raw: bodyText.slice(0, 400) };
      }
    } finally {
      clearTimeout(t);
    }

    const picked = pickAccount(parsed);
    const errors = Array.isArray(parsed.errors) ? parsed.errors.map(String) : [];

    if (!picked.accountNumber) {
      const msg =
        errors.filter(Boolean).join('; ') ||
        (typeof parsed.message === 'string' ? parsed.message : null) ||
        `XixaPay returned no account number (HTTP ${status})`;
      return NextResponse.json({
        ok: false,
        step: 'full_create',
        fullTest: true,
        merchant: 'verxor',
        xixapayHttpStatus: status,
        xixapayBody: bodyText.slice(0, 600),
        usedEmail: email,
        usedPhone: phone,
        errors,
        accountNumber: null,
        ms: Date.now() - started,
        message: msg,
      });
    }

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
            bank_code: BANK_CODE,
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
      xixapayHttpStatus: status,
      accountNumber: picked.accountNumber,
      accountName,
      bankName: picked.bankName,
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
