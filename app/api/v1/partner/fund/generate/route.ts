import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const BANK_CODE = '100004';
const BANK_NAME = 'OPay';
const MIN = 500;

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const apiKey = process.env.XIXAPAY_API_KEY?.trim();
    const secret = process.env.XIXAPAY_SECRET_KEY?.trim();
    const businessId = process.env.XIXAPAY_BUSINESS_ID?.trim();

    const panel = await resolvePanelClient(req).catch(() => null);
    if (!panel) {
      return json(
        { ok: false, message: 'Missing or invalid panel API key. Use X-Api-Key: vx_panel_…' },
        401,
      );
    }
    const userId = (panel.walletUserId || '').trim();
    if (!userId) {
      return json(
        {
          ok: false,
          message:
            'Panel key has no linked wallet. Regenerate with ownerEmail of a Verxor account.',
        },
        400,
      );
    }

    let body: { amount?: number; amountNgn?: number; debug?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      /* empty */
    }

    if (body.debug === true) {
      return json({
        ok: true,
        debug: true,
        panel: { id: panel.id, name: panel.name, walletUserId: userId, source: panel.source },
        xixapayConfigured: Boolean(apiKey && secret && businessId),
        merchant: 'verxor',
        message: 'Panel auth OK. Verxor XixaPay merchant ready. Money settles to Verxor.',
        ms: Date.now() - started,
      });
    }

    if (!apiKey || !secret || !businessId) {
      return json(
        { ok: false, message: 'XixaPay is not configured on Verxor (merchant keys).' },
        503,
      );
    }

    const amount = Math.round(Number(body.amountNgn ?? body.amount));
    if (!Number.isFinite(amount) || amount < MIN) {
      return json({ ok: false, message: `Minimum panel top-up is ₦${MIN}.` }, 400);
    }
    if (amount > 5_000_000) {
      return json({ ok: false, message: 'Amount is too large.' }, 400);
    }

    const panelSlug =
      (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) ||
      'partner';
    const accountName = `Verxor-${panelSlug}`;
    const externalRef = `vxp-panel-${String(panel.id).slice(0, 8)}-${Date.now()}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(
      /\/$/,
      '',
    );
    const callbackUrl =
      process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
      `${appUrl}/api/webhooks/xixapay/virtual-account`;

    const payload = {
      email:
        panelSlug === 'vernexdigital'
          ? 'vernexdigital@gmail.com'
          : `partner.${panelSlug}@gmail.com`,
      name: accountName,
      phoneNumber: '08000000000',
      bankCode: [BANK_CODE],
      businessId,
      accountType: 'dynamic',
      amount,
      externalReference: externalRef,
      callbackUrl,
    };

    const base = (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let res: Response;
    try {
      res = await fetch(`${base}/api/v1/createVirtualAccount`, {
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
    } catch (e) {
      clearTimeout(timer);
      const aborted = e instanceof Error && e.name === 'AbortError';
      console.error('[partner/fund/generate] network', e);
      return json(
        {
          ok: false,
          message: aborted
            ? 'Payment provider timed out. Try again.'
            : 'Could not reach payment provider. Try again.',
          ms: Date.now() - started,
        },
        502,
      );
    } finally {
      clearTimeout(timer);
    }

    const rawText = await res.text().catch(() => '');
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      raw = { raw: rawText.slice(0, 300) };
    }

    if (!res.ok || raw.status === 'fail') {
      console.error('[partner/fund/generate] xixapay', res.status, rawText.slice(0, 500));
      const msg =
        (typeof raw.message === 'string' && raw.message) ||
        (typeof raw.error === 'string' && raw.error) ||
        `Provider error (${res.status})`;
      return json({ ok: false, message: String(msg), ms: Date.now() - started }, 502);
    }

    const data = (raw.data as Record<string, unknown>) || raw;
    const accounts = (data.bankAccounts || data.accounts || raw.bankAccounts || []) as Array<
      Record<string, unknown>
    >;
    const first = accounts[0] || {};
    const accountNumber = String(
      first.accountNumber ||
        first.account_number ||
        data.accountNumber ||
        data.account_number ||
        '',
    ).replace(/\D/g, '');

    if (!accountNumber) {
      return json(
        {
          ok: false,
          message: 'Provider returned no account number. Try again.',
          providerRaw: rawText.slice(0, 200),
          ms: Date.now() - started,
        },
        502,
      );
    }

    const bankName = String(first.bankName || first.bank_name || data.bankName || BANK_NAME);
    const expireAt = first.expire_at || first.expireAt || data.expire_at || data.expireAt || null;
    const customer = (data.customer || raw.customer || {}) as Record<string, unknown>;
    const providerCustomerId = String(
      customer.customer_id || customer.id || data.customer_id || data.customerId || '',
    );

    // Register VA for webhook (inline fetch — no heavy import path)
    try {
      const sbUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
        .replace(/\/rest\/v1\/?$/, '')
        .replace(/\/$/, '');
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey) {
        await fetch(`${sbUrl}/rest/v1/virtual_accounts`, {
          method: 'POST',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            provider: 'xixapay',
            bank_code: BANK_CODE,
            bank_name: bankName,
            account_number: accountNumber,
            account_name: accountName,
            account_type: 'dynamic',
            amount_ngn: amount,
            external_ref: externalRef,
            provider_customer_id: providerCustomerId || null,
            raw: {
              expire_at: expireAt ? String(expireAt) : null,
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
      console.error('[partner/fund/generate] va save non-fatal', e);
    }

    return json({
      ok: true,
      mode: 'partner',
      amount,
      amountNgn: amount,
      bankName,
      accountNumber,
      accountName,
      reservedAccountId: providerCustomerId || null,
      expireAt: expireAt ? String(expireAt) : null,
      externalReference: externalRef,
      externalRef,
      panel: { id: panel.id, name: panel.name },
      merchant: 'verxor',
      ms: Date.now() - started,
      message:
        'Transfer the exact amount. Money settles to Verxor; panel wholesale balance updates when the bank confirms.',
    });
  } catch (e) {
    console.error('[partner/fund/generate] unhandled', e);
    return json(
      {
        ok: false,
        message: e instanceof Error ? e.message : 'Server error creating funding account',
        ms: Date.now() - started,
      },
      500,
    );
  }
}
