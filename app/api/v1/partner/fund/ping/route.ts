import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

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

    const payload = fullTest
      ? {
          email:
            panelSlug === 'vernexdigital'
              ? 'vernexdigital@gmail.com'
              : `partner.${panelSlug}@gmail.com`,
          name: accountName,
          phoneNumber: '08000000000',
          bankCode: ['100004'],
          businessId,
          accountType: 'dynamic',
          amount,
          externalReference: externalRef,
          callbackUrl: `${appUrl}/api/webhooks/xixapay/virtual-account`,
        }
      : { businessId };

    let status = 0;
    let bodyText = '';
    let networkError = '';

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15_000);
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
      clearTimeout(t);
      status = res.status;
      bodyText = await res.text().catch(() => '');
    } catch (e) {
      networkError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    const reachable = !networkError && status > 0;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      /* ignore */
    }

    // Parse account from success payload
    let accountNumber = '';
    let bankName = 'OPay';
    let expireAt: string | null = null;
    let providerCustomerId = '';
    if (fullTest && (status === 200 || status === 201) && parsed.status !== 'fail') {
      const data = (parsed.data as Record<string, unknown>) || parsed;
      const accounts = (data.bankAccounts || data.accounts || parsed.bankAccounts || []) as Array<
        Record<string, unknown>
      >;
      const first = accounts[0] || {};
      accountNumber = String(
        first.accountNumber || first.account_number || data.accountNumber || '',
      ).replace(/\D/g, '');
      bankName = String(first.bankName || first.bank_name || data.bankName || 'OPay');
      const ex = first.expire_at || first.expireAt || data.expire_at || data.expireAt;
      expireAt = ex ? String(ex) : null;
      const customer = (data.customer || parsed.customer || {}) as Record<string, unknown>;
      providerCustomerId = String(
        customer.customer_id || customer.id || data.customer_id || data.customerId || '',
      );

      // Save VA for webhook credit
      if (accountNumber) {
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
                bank_code: '100004',
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                account_type: 'dynamic',
                amount_ngn: amount,
                external_ref: externalRef,
                provider_customer_id: providerCustomerId || null,
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
      }
    }

    return NextResponse.json({
      ok: reachable && (!fullTest || Boolean(accountNumber)),
      step: fullTest ? 'full_create' : 'xixapay',
      fullTest,
      merchant: 'verxor',
      panel: { id: panel.id, name: panel.name },
      xixapayHttpStatus: status,
      xixapayBody: bodyText.slice(0, 800),
      networkError: networkError || null,
      providerMessage: typeof parsed.message === 'string' ? parsed.message : null,
      // Success fields for partner-fund to consume
      accountNumber: accountNumber || null,
      accountName,
      bankName,
      amount: fullTest ? amount : null,
      expireAt,
      externalReference: fullTest ? externalRef : null,
      reservedAccountId: providerCustomerId || null,
      ms: Date.now() - started,
      message: networkError
        ? `Cannot reach XixaPay: ${networkError}`
        : accountNumber
          ? 'Account created on Verxor merchant'
          : fullTest
            ? `Full create HTTP ${status}`
            : 'Reachability OK',
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        step: 'crash',
        message: e instanceof Error ? e.message : 'error',
        ms: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
