import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { textverifiedConfigured, tvCreateVerification } from '@/lib/providers/textverified';
import { sbInsert, sbSelect, supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient, panelAllowsVirtualNumbers, getPanelAdminEmail } from '@/lib/panel-auth';
import { sendVirtualNumberReceipt, sendPanelAdminOrderAlert } from '@/lib/email/receipts';
import { computeVnCharge, isChildPanelUser, isApiUser, apiKeyFromRequest, tierFromCost, tierFromPoolId, type VnAudience } from '@/lib/vn-pricing';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

/** Retail end-user wallet (wallets table via debit_wallet RPC). */
async function debitRetailWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const res = await fetch(`${base}/rest/v1/rpc/debit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Virtual number purchase',
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Partner / child-panel wholesale balance (reseller_wallet).
 * This is where Partner Fund deposits land — must be used for panel buys.
 */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  // Ensure row exists
  await fetch(`${base}/rest/v1/reseller_wallet`, {
    method: 'POST',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: userId, balance: 0 }),
  }).catch(() => null);

  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!balRes.ok) {
    throw new Error(`Reseller balance read failed: ${balRes.status}`);
  }
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  if (prev < amount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  const next = Math.round((prev - amount) * 100) / 100;

  const up = await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }

  // Ledger row (best-effort)
  try {
    await fetch(`${base}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'panel_vn_debit',
        status: 'completed',
        amount: -amount,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* optional */
  }

  return { balance: next };
}

async function creditRetailWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Refund: number purchase failed',
    }),
  });
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  const rows = balRes.ok ? ((await balRes.json()) as Array<{ balance: number }>) : [];
  const prev = Number(rows?.[0]?.balance) || 0;
  const next = Math.round((prev + amount) * 100) / 100;

  await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });

  try {
    await fetch(`${base}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'panel_vn_refund',
        status: 'completed',
        amount,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* optional */
  }
}

/**
 * Buy a virtual number (Grizzly).
 * Auth: retail JWT or child-panel API key (vx_panel_*) with linked wallet.
 * Panel buys debit reseller_wallet (Partner Fund). Retail buys debit wallets via debit_wallet.
 * Refunds the same wallet if provider fails after debit.
 */
export async function POST(req: NextRequest) {
  if (!grizzly.isConfigured() && !textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'No SMS OTP provider is configured' },
      { status: 503 },
    );
  }

  let body: {
    service?: string;
    country?: string;
    maxPriceUsd?: number;
    poolId?: string;
    optionId?: string;
    priceNgn?: number;
    userId?: string;
    customerName?: string;
    customerEmail?: string;
    retailPriceNgn?: number;
    customerPaidNgn?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const service = (body.service || '').trim().toLowerCase();
  const country = String(body.country || '').trim();
  const poolId = (body.poolId || '').toLowerCase();
  // NOTE: body.priceNgn is intentionally IGNORED — the charge is computed
  // server-side from the option's real provider cost. Nobody can bypass the
  // tier multipliers by calling this endpoint directly.

  if (!service || !country) {
    return NextResponse.json(
      { ok: false, error: 'service and country are required' },
      { status: 400 },
    );
  }
  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsVirtualNumbers(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to buy virtual numbers' },
      { status: 403 },
    );
  }

  let userId = await resolveUserId(req, body.userId);
  if (!userId && panel?.walletUserId) {
    userId = panel.walletUserId;
  }

  if (!userId && !panel) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in or pass a child-panel API key.' },
      { status: 401 },
    );
  }
  if (panel && !userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Panel wallet not linked. Regenerate the panel key with ownerEmail, or set meta.wallet_user_id / VERXOR_PANEL_WALLET_USER_ID.',
      },
      { status: 402 },
    );
  }

  if (!/^(usa|worldwide)-(economy|standard|fast|premium)$/.test(poolId)) {
    return NextResponse.json({ ok: false, error: 'Invalid number pool. Refresh the catalog and try again.' }, { status: 400 });
  }
  const selectedPoolTier = tierFromPoolId(poolId);
  if (!selectedPoolTier) {
    return NextResponse.json({ ok: false, error: 'Invalid number tier. Refresh the catalog and try again.' }, { status: 400 });
  }

  let optionId = body.optionId ? String(body.optionId) : null;
  if (!optionId && supabaseConfigured()) {
    // Resilient fallback for child panels: find active catalog option matching service, country and pool tier
    const svcs = (await sbSelect('vn_services', `code=eq.${encodeURIComponent(service)}&select=id&limit=1`)) as Array<{ id: string }>;
    const cnts = (await sbSelect('vn_countries', `code=eq.${encodeURIComponent(country)}&select=id&limit=1`)) as Array<{ id: string }>;
    if (svcs[0] && cnts[0]) {
      const candidates = (await sbSelect(
        'vn_price_options',
        `service_id=eq.${encodeURIComponent(svcs[0].id)}&country_id=eq.${encodeURIComponent(cnts[0].id)}&is_available=eq.true&order=cost_usd.asc&limit=20`,
      )) as Array<{ id: string; cost_usd: number }>;
      const matching = candidates?.find((c) => tierFromCost(Number(c.cost_usd)) === selectedPoolTier);
      if (matching) optionId = matching.id;
    }
  }

  // Provider cost option is the authority for provider, price, service, country and tier.
  if (!optionId || !supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'A live catalog option is required. Refresh prices and try again.' }, { status: 409 });
  }

  const optionRows = (await sbSelect(
    'vn_price_options',
    `id=eq.${encodeURIComponent(String(optionId))}&select=id,service_id,country_id,cost_usd,tier,is_available,provider_code,provider_service&limit=1`,
  )) as Array<{
    id: string; service_id: string; country_id: string; cost_usd: number;
    tier?: string | null; is_available?: boolean | null; provider_code?: string | null; provider_service?: string | null;
  }>;
  const selectedOption = optionRows?.[0];
  if (!selectedOption || selectedOption.is_available === false) {
    return NextResponse.json({ ok: false, error: 'This number option is no longer available. Refresh prices.' }, { status: 409 });
  }
  const providerCostUsd = Number(selectedOption.cost_usd);
  const actualTier = tierFromCost(providerCostUsd);
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0 || actualTier !== selectedPoolTier) {
    return NextResponse.json({ ok: false, error: 'The selected option does not match this tier. Refresh prices and choose a matching option.' }, { status: 409 });
  }
  // Cost band strictly determines tier for all numbers
  const isUsPool = poolId.startsWith('usa-');
  const isUsCountry = country === '187' || country === '12' || country === 'US' || country === 'USA';
  if (isUsPool !== isUsCountry) {
    return NextResponse.json({ ok: false, error: 'The selected option does not match this pool location.' }, { status: 409 });
  }

  const selectedServices = (await sbSelect(
    'vn_services',
    `code=eq.${encodeURIComponent(service)}&select=id&limit=1`,
  )) as Array<{ id: string }>;
  if (!selectedServices[0] || selectedServices[0].id !== selectedOption.service_id) {
    return NextResponse.json({ ok: false, error: 'The selected option does not match this service. Refresh prices.' }, { status: 409 });
  }
  const selectedCountries = (await sbSelect(
    'vn_countries',
    `code=eq.${encodeURIComponent(country)}&select=id&limit=1`,
  )) as Array<{ id: string }>;
  if (!selectedCountries[0] || selectedCountries[0].id !== selectedOption.country_id) {
    return NextResponse.json({ ok: false, error: 'The selected option does not match this country. Refresh prices.' }, { status: 409 });
  }

  const rawProviderCode = String(selectedOption.provider_code || 'grizzly').trim().toLowerCase();
  const providerCode = rawProviderCode === 'textverified' ? 'textverified' : 'grizzly';
  const tvServiceName = String(selectedOption.provider_service || '').trim() || null;
  if (rawProviderCode !== 'textverified' && rawProviderCode !== 'grizzly' && !/^\d+$/.test(rawProviderCode)) {
    return NextResponse.json({ ok: false, error: 'The selected provider is not supported.' }, { status: 409 });
  }
  if (providerCode === 'textverified' && !textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'SMS service is temporarily unavailable' },
      { status: 503 },
    );
  }
  if (providerCode === 'grizzly' && !grizzly.isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'SMS service is temporarily unavailable' },
      { status: 503 },
    );
  }

  // Server-side pricing enforcement:
  //  - child-panel key          -> panel multipliers
  //  - user toggled Child Panel -> panel multipliers (admin toggle)
  //  - user toggled API User    -> api multipliers (admin toggle)
  //  - user API key (vx_api_*)  -> api multipliers
  //  - everyone else           -> retail multipliers
  let audience: VnAudience = 'retail';
  if (panel) audience = 'panel';
  else if (userId && (await isChildPanelUser(userId))) audience = 'panel';
  else if (userId && (await isApiUser(userId))) audience = 'api';
  else if (apiKeyFromRequest(req).startsWith('vx_api_')) audience = 'api';

  const computed = await computeVnCharge({
    costUsd: providerCostUsd,
    optionId: body.optionId,
    poolId: poolId || null,
    audience,
  });
  const priceNgn = computed.charge;

  const useReseller = Boolean(panel);
  const debitRef = `vn-buy-${panel ? `panel-${panel.id}` : userId}-${Date.now()}`;
  let debited = false;

  if (priceNgn > 0 && userId && supabaseConfigured()) {
    try {
      if (useReseller) {
        await debitResellerWallet(userId, priceNgn, debitRef);
      } else {
        await debitRetailWallet(userId, priceNgn, debitRef);
      }
      debited = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          {
            ok: false,
            error: useReseller
              ? 'Insufficient panel wholesale balance. Fund the partner wallet first.'
              : 'Insufficient wallet balance. Fund your wallet first.',
          },
          { status: 402 },
        );
      }
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  } else if (priceNgn > 0 && !userId) {
    return NextResponse.json(
      { ok: false, error: 'Cannot charge: no wallet user for this request' },
      { status: 402 },
    );
  }

  try {
    // Tier-bounded price limits to guarantee no VoIP/cheapest leakage while preventing NO_NUMBERS
    const tierMin: number | undefined =
      selectedPoolTier === 'standard' ? 0.50 :
      selectedPoolTier === 'fast' ? 1.00 :
      selectedPoolTier === 'premium' ? 2.00 : undefined;

    const tierMax: number =
      selectedPoolTier === 'economy' ? Math.min(0.49, Math.max(providerCostUsd, 0.45)) :
      selectedPoolTier === 'standard' ? Math.min(0.99, Math.max(providerCostUsd, 0.85)) :
      selectedPoolTier === 'fast' ? Math.min(1.99, Math.max(providerCostUsd, 1.50)) :
      Math.max(providerCostUsd, 2.50);

    // Either SMS activation or a Textverified one-time verification.
    let resultPhone = '';
    let resultId = '';
    if (providerCode === 'textverified') {
      const tv = await tvCreateVerification({
        serviceName: tvServiceName || service,
        maxPriceUsd: providerCostUsd,
      });
      if (!tv.ok || !tv.verification) {
        throw new Error(tv.error || 'Provider get number failed');
      }
      resultId = tv.verification.verificationId;
      resultPhone = tv.verification.number.startsWith('+')
        ? tv.verification.number
        : `+${tv.verification.number}`;
    } else {
      const providerIds = /^\d+$/.test(rawProviderCode) ? [rawProviderCode] : undefined;
      let result: { id: string; phone: string; raw?: string } | null = null;
      try {
        result = await grizzly.getNumber({
          service,
          country,
          minPrice: tierMin,
          maxPrice: tierMax,
          providerIds,
        });
      } catch (err: any) {
        const errMsg = String(err?.message || '');
        // If the specific supplier ID has no stock or failed, fallback to any supplier in this tier
        if (providerIds && (errMsg.includes('NO_NUMBERS') || errMsg.includes('NO_NUMBER'))) {
          try {
            result = await grizzly.getNumber({
              service,
              country,
              minPrice: tierMin,
              maxPrice: tierMax,
              providerIds: undefined,
            });
          } catch (retryErr: any) {
            // For USA, try alternate route (187 <-> 12) within this tier if out of numbers
            if (isUsPool && String(retryErr?.message || '').includes('NO_NUMBERS')) {
              const altCountry = country === '187' ? '12' : '187';
              result = await grizzly.getNumber({
                service,
                country: altCountry,
                minPrice: tierMin,
                maxPrice: tierMax,
                providerIds: undefined,
              });
            } else {
              throw retryErr;
            }
          }
        } else if (isUsPool && errMsg.includes('NO_NUMBERS')) {
          const altCountry = country === '187' ? '12' : '187';
          result = await grizzly.getNumber({
            service,
            country: altCountry,
            minPrice: tierMin,
            maxPrice: tierMax,
            providerIds: undefined,
          });
        } else {
          throw err;
        }
      }
      if (!result) {
        throw new Error('Provider get number failed: NO_NUMBERS');
      }
      resultId = String(result.id);
      resultPhone = result.phone.startsWith('+') ? result.phone : `+${result.phone}`;
    }
    const phone = resultPhone;

    let savedId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const rows = userId
          ? await sbInsert('vn_orders', {
              user_id: userId,
              provider: providerCode,
              activation_id: String(resultId),
              phone_number: phone,
              service_code: service,
              country_code: country,
              cost_usd: computed.costUsd,
              charged_ngn: priceNgn,
              status: 'waiting',
            })
          : null;
        if (Array.isArray(rows) && rows[0]?.id) savedId = String(rows[0].id);
      } catch {
        /* order row optional */
      }
    }

    if (panel) {
      // Panel wholesale order: Notify panel admin only, NEVER email the end customer
      try {
        const adminEmail = await getPanelAdminEmail(panel);
        if (adminEmail) {
          const retailNgn = Number(body.retailPriceNgn ?? body.customerPaidNgn);
          const validRetail = Number.isFinite(retailNgn) && retailNgn > 0 ? retailNgn : undefined;
          const customerLabel = (body.customerName || body.customerEmail || '').trim() || 'Child panel customer';

          const mail = await sendPanelAdminOrderAlert(adminEmail, {
            panelName: panel.name,
            adminEmail,
            customerName: customerLabel,
            customerEmail: body.customerEmail ? body.customerEmail.trim() : undefined,
            service: `Virtual number (${service.toUpperCase()})`,
            orderId: savedId || resultId,
            wholesaleAmountNgn: priceNgn,
            customerPaidNgn: validRetail,
            details: [
              { label: 'Customer', value: customerLabel },
              { label: 'Service', value: service.toUpperCase() },
              { label: 'Phone number', value: phone },
              { label: 'Country', value: country },
            ],
            date: new Date(),
          });
          if (!mail.ok) console.warn('[email] Panel admin alert not sent:', mail.error);
        } else {
          console.warn('[email] Panel admin alert skipped: no admin email resolved for panel', panel.name);
        }
      } catch (err) {
        console.warn('[email] Panel admin alert dispatch failed:', err);
      }
    } else if (userId) {
      // Retail consumer order directly on Verxor:
      // Receipt email is dispatched once the verification code (OTP) arrives, not on initial purchase.
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId || resultId,
        providerOrderId: String(resultId),
        provider: providerCode,
        phone,
        service,
        country,
        poolId: poolId || null,
        priceNgn,
        status: 'waiting',
        panel: panel ? { id: panel.id, name: panel.name } : null,
      },
    });
  } catch (err) {
    if (debited && userId) {
      if (useReseller) {
        await creditResellerWallet(userId, priceNgn, `refund-${debitRef}`);
      } else {
        await creditRetailWallet(userId, priceNgn, `refund-${debitRef}`);
      }
    }
    const rawMessage = err instanceof Error ? err.message : 'Provider get number failed';
    const message = rawMessage
      .replace(/grizzly\s*(sms)?/gi, 'provider')
      .replace(/textverified/gi, 'provider')
      .replace(/getnumber/gi, 'get number');
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
