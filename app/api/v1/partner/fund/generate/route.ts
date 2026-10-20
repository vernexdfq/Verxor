import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const runtime = 'nodejs';

const BANK = { code: '100004', name: 'OPay' };
const MIN_AMOUNT_NGN = 500;

function xixapayBase() {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
}

function toNgPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '08000000000';
  if (d.startsWith('0') && d.length >= 11) return d.slice(0, 11);
  if (d.startsWith('234') && d.length >= 13) return `0${d.slice(3, 13)}`;
  const last10 = d.slice(-10);
  if (last10.length === 10) return `0${last10}`;
  return d.padStart(11, '0').slice(0, 11);
}

/** Same robust parser as the working /funding/generate route */
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
    first.bankName || first.bank_name || data.bankName || data.bank_name || data.bank || BANK.name,
  );
  const providerCustomerId = String(
    customer.customer_id || customer.id || data.customer_id || data.customerId || '',
  );
  const expireAt = first.expire_at || first.expireAt || data.expire_at || data.expireAt || null;

  return { accountNumber, accountName, bankName, providerCustomerId, expireAt };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

/**
 * Partner wholesale top-up via Verxor's single XixaPay.
 * Auth: X-Api-Key: vx_panel_*  (preferred) or Authorization: Bearer vx_panel_*
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.XIXAPAY_API_KEY?.trim();
    const secret = process.env.XIXAPAY_SECRET_KEY?.trim();
    const businessId = process.env.XIXAPAY_BUSINESS_ID?.trim();

    if (!apiKey || !secret || !businessId) {
      return jsonError('XixaPay is not configured on Verxor.', 503);
    }

    let panel;
    try {
      panel = await resolvePanelClient(req);
    } catch (e) {
      console.error('[partner/fund/generate] resolvePanelClient', e);
      return jsonError('Panel auth failed. Check API key.', 401);
    }

    if (!panel) {
      return jsonError('Missing or invalid panel API key. Use X-Api-Key: vx_panel_…', 401);
    }

    const userId = (panel.walletUserId || '').trim();
    if (!userId) {
      return jsonError(
        'Panel key has no linked wallet. Regenerate the key with ownerEmail of a Verxor account.',
        400,
      );
    }

    let body: { amount?: number; amountNgn?: number } = {};
    try {
      body = await req.json();
    } catch {
      /* empty ok */
    }

    const amount = Math.round(Number(body.amountNgn ?? body.amount));
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT_NGN) {
      return jsonError(`Minimum panel top-up is ₦${MIN_AMOUNT_NGN}.`, 400);
    }
    if (amount > 5_000_000) {
      return jsonError('Amount is too large.', 400);
    }

    const panelSlug =
      (panel.name || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) ||
      'partner';
    // ASCII hyphen only — avoid special en-dash that some gateways choke on
    const accountName = `Verxor-${panelSlug}`.slice(0, 80);
    const externalRef = `vxp-panel-${String(panel.id).slice(0, 8)}-${Date.now()}`;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(
      /\/$/,
      '',
    );
    const callbackUrl =
      process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
      `${appUrl}/api/webhooks/xixapay/virtual-account`;

    const vaEmail =
      panelSlug === 'vernexdigital'
        ? 'vernexdigital@gmail.com'
        : `partner.${panelSlug}@gmail.com`;

    const payload: Record<string, unknown> = {
      email: vaEmail,
      name: accountName,
      phoneNumber: toNgPhone('08000000000'),
      bankCode: [BANK.code],
      businessId,
      accountType: 'dynamic',
      amount,
      externalReference: externalRef,
      callbackUrl,
    };

    // Same pattern as the working /funding/generate route (no AbortController)
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
      return jsonError('Could not reach payment provider. Try again.', 502);
    }

    const rawText = await xixapayRes.text().catch(() => '');
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      raw = { raw: rawText.slice(0, 300) };
    }

    if (
      !xixapayRes.ok ||
      raw.status === 'fail' ||
      String(raw.message || '').includes('API Key is not active')
    ) {
      console.error(
        '[partner/fund/generate] xixapay error',
        xixapayRes.status,
        rawText.slice(0, 500),
      );
      const msg =
        (typeof raw.message === 'string' && raw.message) ||
        (typeof raw.error === 'string' && raw.error) ||
        `Provider error (${xixapayRes.status})`;
      return jsonError(String(msg), 502);
    }

    const picked = pickAccount(raw);
    if (!picked.accountNumber) {
      return jsonError('Provider returned no account number. Try again in a moment.', 502);
    }

    const bankName = picked.bankName || BANK.name;
    const expireAt = picked.expireAt ? String(picked.expireAt) : null;
    const displayName = accountName;
    const accountNumber = String(picked.accountNumber).replace(/\D/g, '');

    if (supabaseConfigured()) {
      try {
        await sbInsert('virtual_accounts', {
          user_id: userId,
          provider: 'xixapay',
          bank_code: BANK.code,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: displayName,
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
          },
        });
      } catch (e) {
        console.error('[partner/fund/generate] save VA (non-fatal)', e);
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'partner',
      amount,
      amountNgn: amount,
      bankName,
      accountNumber,
      accountName: displayName,
      reservedAccountId: picked.providerCustomerId || null,
      expireAt,
      externalReference: externalRef,
      externalRef,
      panel: { id: panel.id, name: panel.name },
      message: 'Transfer the exact amount. Panel balance updates when the bank confirms.',
    });
  } catch (e) {
    console.error('[partner/fund/generate] unhandled', e);
    return jsonError(
      e instanceof Error ? e.message : 'Server error creating funding account',
      500,
    );
  }
}
