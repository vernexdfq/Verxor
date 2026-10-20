import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/** Same bank as working user funding path */
const BANK = { code: '100004', name: 'OPay' };
const MIN = 500;

function xixapayBase() {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
}

function pickAccount(raw: Record<string, unknown>) {
  const data = (raw?.data as Record<string, unknown>) || raw;
  const bankAccounts = (data.bankAccounts || data.accounts || raw.bankAccounts || []) as Array<
    Record<string, unknown>
  >;
  const first = bankAccounts[0] || {};
  const customer = (data.customer || raw.customer || {}) as Record<string, unknown>;

  const accountNumber = String(
    first.accountNumber ||
      first.account_number ||
      data.accountNumber ||
      data.account_number ||
      data.virtualAccountNumber ||
      (data.account as Record<string, unknown> | undefined)?.number ||
      '',
  ).replace(/\D/g, '');

  const accountName = String(
    first.accountName ||
      first.account_name ||
      data.accountName ||
      data.account_name ||
      (data.account as Record<string, unknown> | undefined)?.name ||
      '',
  );
  const bankName = String(
    first.bankName || first.bank_name || data.bankName || data.bank_name || data.bank || '',
  );
  const providerCustomerId = String(
    customer.customer_id || customer.id || data.customer_id || data.customerId || '',
  );
  const expireAt = first.expire_at || first.expireAt || data.expire_at || data.expireAt || null;
  const errors = Array.isArray(raw.errors)
    ? raw.errors.map(String)
    : Array.isArray(data.errors)
      ? (data.errors as unknown[]).map(String)
      : [];

  return { accountNumber, accountName, bankName, providerCustomerId, expireAt, errors };
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const apiKey = process.env.XIXAPAY_API_KEY?.trim();
  const secret = process.env.XIXAPAY_SECRET_KEY?.trim();
  const businessId = process.env.XIXAPAY_BUSINESS_ID?.trim();

  if (!apiKey || !secret || !businessId) {
    return NextResponse.json(
      { ok: false, message: 'XixaPay is not configured. Check XIXAPAY_* env vars on Verxor.' },
      { status: 503 },
    );
  }

  const panel = await resolvePanelClient(req).catch(() => null);
  if (!panel) {
    return NextResponse.json(
      { ok: false, message: 'Missing or invalid panel API key. Use X-Api-Key: vx_panel_…' },
      { status: 401 },
    );
  }
  const userId = (panel.walletUserId || '').trim();
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Panel key has no linked wallet. Regenerate with ownerEmail of a Verxor account.',
      },
      { status: 400 },
    );
  }

  let body: { amount?: number; amountNgn?: number; debug?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  if (body.debug === true) {
    return NextResponse.json({
      ok: true,
      debug: true,
      panel: { id: panel.id, name: panel.name, walletUserId: userId, source: panel.source },
      xixapayConfigured: true,
      merchant: 'verxor',
      message: 'Panel auth OK. Same XixaPay merchant as user funding.',
      ms: Date.now() - started,
    });
  }

  const amount = Math.round(Number(body.amountNgn ?? body.amount));
  if (!Number.isFinite(amount) || amount < MIN) {
    return NextResponse.json(
      { ok: false, message: `Minimum panel top-up is ₦${MIN}.` },
      { status: 400 },
    );
  }
  if (amount > 5_000_000) {
    return NextResponse.json({ ok: false, message: 'Amount is too large.' }, { status: 400 });
  }

  const panelSlug =
    (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'partner';

  // Mirror user funding: real-looking identity (same pattern as Verxor-Denny success)
  const name = `Verxor-${panelSlug}`;
  const email =
    panelSlug === 'vernexdigital'
      ? 'vernexdigital@gmail.com'
      : `partner.${panelSlug}@gmail.com`;
  // Use a valid NG mobile format (same style as working user path)
  const phone = panelSlug === 'vernexdigital' ? '09164159443' : '08141620644';

  const externalRef = `vxp-${String(panel.id).slice(0, 8)}-${Date.now()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(/\/$/, '');
  const callbackUrl =
    process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
    `${appUrl}/api/webhooks/xixapay/virtual-account`;

  // Exact same payload shape as app/api/v1/funding/generate (working path)
  const payload: Record<string, unknown> = {
    email,
    name: name.slice(0, 80),
    phoneNumber: phone,
    bankCode: [BANK.code],
    businessId,
    accountType: 'dynamic',
    amount,
    externalReference: externalRef,
    callbackUrl,
  };

  let xixapayRes: Response;
  try {
    xixapayRes = await fetch(`${xixapayBase()}/api/v1/createVirtualAccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[partner/fund/generate] xixapay network', e);
    return NextResponse.json(
      { ok: false, message: 'Could not reach payment provider. Try again.', ms: Date.now() - started },
      { status: 502 },
    );
  }

  const rawText = await xixapayRes.text().catch(() => '');
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    raw = { raw: rawText.slice(0, 200) };
  }

  if (
    !xixapayRes.ok ||
    raw.status === 'fail' ||
    String(raw.message || '').includes('API Key is not active')
  ) {
    console.error('[partner/fund/generate] xixapay error', xixapayRes.status, rawText.slice(0, 500));
    const msg =
      (typeof raw.message === 'string' && raw.message) ||
      (typeof raw.error === 'string' && raw.error) ||
      `Provider error (${xixapayRes.status})`;
    return NextResponse.json(
      { ok: false, message: String(msg), ms: Date.now() - started },
      { status: 502 },
    );
  }

  const picked = pickAccount(raw);
  if (!picked.accountNumber) {
    const errMsg =
      picked.errors.filter(Boolean).join('; ') ||
      (typeof raw.message === 'string' && raw.message) ||
      'Provider returned no account number.';
    console.error('[partner/fund/generate] no account', rawText.slice(0, 600));
    return NextResponse.json(
      {
        ok: false,
        message: errMsg,
        errors: picked.errors,
        ms: Date.now() - started,
      },
      { status: 502 },
    );
  }

  const accountName = picked.accountName || name;
  const bankName = picked.bankName || BANK.name;
  const expireAt = picked.expireAt ? String(picked.expireAt) : null;

  // Register VA so webhook can credit reseller_wallet
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
          bank_code: BANK.code,
          bank_name: bankName,
          account_number: String(picked.accountNumber),
          account_name: String(accountName),
          account_type: 'dynamic',
          amount_ngn: amount,
          external_ref: externalRef,
          provider_customer_id: picked.providerCustomerId || null,
          raw: {
            expire_at: expireAt,
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
    console.error('[partner/fund/generate] save VA non-fatal', e);
  }

  return NextResponse.json({
    ok: true,
    mode: 'partner',
    amount,
    amountNgn: amount,
    bankName,
    bankCode: BANK.code,
    accountNumber: String(picked.accountNumber),
    accountName: String(accountName),
    reservedAccountId: picked.providerCustomerId || null,
    expireAt,
    externalReference: externalRef,
    externalRef,
    panel: { id: panel.id, name: panel.name },
    merchant: 'verxor',
    ms: Date.now() - started,
    message:
      'Transfer the exact amount. Money settles to Verxor; panel wholesale balance updates when the bank confirms.',
  });
}
