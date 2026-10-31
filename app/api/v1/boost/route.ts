import { NextRequest, NextResponse } from 'next/server';
import {
  calculateSmmPriceNgn,
  calculateSmmPartnerPriceNgn,
  getSmmMultiplier,
  getSmmPartnerMultiplier,
  SMM_MAX_USD_CUTOFF,
} from '@/lib/providers/smm';
import { isSmmConfigured, smmAddOrder, smmFindService } from '@/lib/providers/smm-orders';
import { sendBoostReceipt, sendPanelAdminOrderAlert } from '@/lib/email/receipts';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient, panelAllowsBoost, getPanelAdminEmail } from '@/lib/panel-auth';

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

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function persistBoostOrderMeta(
  userId: string,
  debitRef: string,
  payload: {
    providerOrderId: string;
    serviceId: string;
    serviceTitle: string;
    platform: string;
    link: string;
    quantity: number;
    amountNgn: number;
    status: string;
  },
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || !userId || !debitRef) return;
  const meta = {
    type: 'boost',
    product: 'boost',
    providerOrderId: payload.providerOrderId,
    orderId: payload.providerOrderId,
    serviceId: payload.serviceId,
    serviceTitle: payload.serviceTitle,
    title: payload.serviceTitle,
    platform: payload.platform,
    link: payload.link,
    quantity: payload.quantity,
    amountNgn: payload.amountNgn,
    status: payload.status,
  };
  try {
    const patchRes = await fetch(
      `${base}/rest/v1/wallet_ledger?user_id=eq.${encodeURIComponent(userId)}&reference=eq.${encodeURIComponent(debitRef)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ meta }),
      },
    );
    if (!patchRes.ok) {
      await fetch(`${base}/rest/v1/wallet_ledger`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: userId,
          kind: 'purchase',
          amount_ngn: -Math.abs(payload.amountNgn),
          currency: 'NGN',
          reference: `boost-order-${payload.providerOrderId}`,
          meta,
        }),
      });
    }
  } catch (err) {
    console.warn('[boost] persist order meta failed', err);
  }
}

async function debitRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
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
      p_description: description,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
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
      p_description: description,
    }),
  });
}

async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const sel = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    },
  );
  const rows = (await sel.json().catch(() => [])) as Array<{ balance?: number }>;
  const balance = Number(rows?.[0]?.balance ?? 0);
  if (!Number.isFinite(balance) || balance < amount) throw new Error('INSUFFICIENT_BALANCE');

  const up = await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      balance: balance - amount,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }

  await fetch(`${base}/rest/v1/wallet_ledger`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      kind: 'wholesale_debit',
      amount_ngn: -Math.abs(amount),
      currency: 'NGN',
      reference,
      meta: { reference, mode: 'reseller_wallet' },
    }),
  });
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;

  const sel = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    },
  );
  const rows = (await sel.json().catch(() => [])) as Array<{ balance?: number }>;
  const balance = Number(rows?.[0]?.balance ?? 0);

  await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      balance: balance + amount,
      updated_at: new Date().toISOString(),
    }),
  });

  await fetch(`${base}/rest/v1/wallet_ledger`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      kind: 'refund',
      amount_ngn: Math.abs(amount),
      currency: 'NGN',
      reference,
      meta: { reference, mode: 'reseller_wallet' },
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Service unavailable' }, { status: 503 });
  }
  if (!isSmmConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Boost provider not configured' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const isPanel = token.startsWith('vx_panel_');

  let panel: Awaited<ReturnType<typeof resolvePanelClient>> = null;
  let userId: string | null = null;
  let useReseller = false;

  if (isPanel) {
    panel = await resolvePanelClient(token);
    if (!panel) {
      return NextResponse.json({ ok: false, error: 'Invalid panel key' }, { status: 401 });
    }
    if (!panelAllowsBoost(panel.panelType || panel.type || '')) {
      return NextResponse.json(
        { ok: false, error: 'This panel key is not allowed to place boost orders' },
        { status: 403 },
      );
    }
    useReseller = true;
    userId =
      (panel.meta && (panel.meta as any).wallet_user_id) ||
      process.env.VERXOR_PANEL_WALLET_USER_ID ||
      null;
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Panel wallet not linked. Set meta.wallet_user_id on the API client or VERXOR_PANEL_WALLET_USER_ID.',
        },
        { status: 400 },
      );
    }
  } else {
    userId = await resolveUserId(req, body.userId ? String(body.userId) : undefined);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
    }
  }

  const serviceId = String(body.serviceId || body.service_id || '').trim();
  const link = String(body.link || body.target || '').trim();
  const quantity = Number(body.quantity || body.qty || 0);
  if (!serviceId || !link || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { ok: false, error: 'serviceId, link, and quantity are required' },
      { status: 400 },
    );
  }

  const service = await smmFindService(serviceId);
  if (!service) {
    return NextResponse.json({ ok: false, error: 'Service not found in live catalog' }, { status: 404 });
  }

  const priceMult = useReseller ? getSmmPartnerMultiplier(quantity) : getSmmMultiplier(quantity);
  const amount = useReseller
    ? calculateSmmPartnerPriceNgn(service.wholesaleUsd, quantity)
    : calculateSmmPriceNgn(service.wholesaleUsd, quantity);
  const rateNgn = quantity > 0 ? (amount / quantity) * 1000 : 0;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid order amount' }, { status: 400 });
  }
  if (service.wholesaleUsd > SMM_MAX_USD_CUTOFF) {
    return NextResponse.json({ ok: false, error: 'Service price exceeds safety cutoff' }, { status: 400 });
  }

  const shortTitle =
    service.title.length > 80 ? service.title.slice(0, 77) + '…' : service.title;
  const debitRef =
    String(body.ref || '') ||
    `boost-${useReseller ? `panel-${panel!.id}` : userId!.slice(0, 8)}-${Date.now()}`;
  const debitDesc = `Boost — ${shortTitle} × ${quantity.toLocaleString('en-NG')} · ${formatNaira(amount)}${useReseller ? ' (partner)' : ''}`;
  const successTitle = `Boost order was successful — ${shortTitle} × ${quantity.toLocaleString('en-NG')} for ${formatNaira(amount)}`;

  let debited = false;
  try {
    if (useReseller) {
      await debitResellerWallet(userId!, amount, debitRef);
    } else {
      await debitRetailWallet(userId!, amount, debitRef, debitDesc);
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

  try {
    const japServiceId = Number(service.providerId);
    if (!Number.isFinite(japServiceId) || japServiceId <= 0) {
      throw new Error('Service is missing a valid provider id for SMM placement');
    }
    const result = await smmAddOrder({
      service: japServiceId,
      link,
      quantity,
    });

    if (userId) {
      await persistBoostOrderMeta(userId, debitRef, {
        providerOrderId: String(result.order),
        serviceId: String(service.id),
        serviceTitle: service.title,
        platform: service.platformName || service.platform,
        link,
        quantity,
        amountNgn: amount,
        status: 'processing',
      });
    }

    if (!useReseller && userId) {
      try {
        const mail = await sendBoostReceipt(userId, {
          platform: service.platformName || service.platform,
          serviceTitle: service.title,
          quantity,
          link,
          orderId: String(result.order),
          amountNgn: amount,
          status: 'Processing',
          date: new Date(),
        });
        if (!mail.ok) console.warn('[email] Boost order receipt not sent:', mail.error);
      } catch (err) {
        console.warn('[email] Boost order receipt dispatch failed:', err);
      }
    } else if (panel) {
      try {
        const adminEmail = await getPanelAdminEmail(panel);
        if (adminEmail) {
          const retailNgn = Number(body.retailPriceNgn ?? body.customerPaidNgn);
          const validRetail = Number.isFinite(retailNgn) && retailNgn > 0 ? retailNgn : undefined;
          const customerLabel =
            (String(body.customerName || body.customer || '').trim() || 'Child panel customer');
          const mail = await sendPanelAdminOrderAlert({
            adminEmail,
            customerName: customerLabel,
            customerEmail: body.customerEmail ? String(body.customerEmail).trim() : undefined,
            service: `Boost: ${service.platformName || service.platform} ${service.title}`,
            orderId: String(result.order),
            wholesaleAmountNgn: amount,
            customerPaidNgn: validRetail,
            details: [
              { label: 'Customer', value: customerLabel },
              { label: 'Platform', value: service.platformName || service.platform },
              { label: 'Service', value: service.title },
              { label: 'Quantity', value: Number(quantity).toLocaleString('en-NG') },
              { label: 'Target link', value: link },
            ],
            date: new Date(),
          });
          if (!mail.ok) console.warn('[email] Panel admin alert for boost not sent:', mail.error);
        }
      } catch (err) {
        console.warn('[email] Panel admin alert for boost failed:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        ref: String(result.order),
        providerOrderId: result.order,
        status: 'processing',
        serviceId: service.id,
        serviceTitle: service.title,
        platform: service.platform,
        platformName: service.platformName,
        link,
        quantity,
        amount,
        ratePer1000: rateNgn,
        priceMode: useReseller ? 'partner' : 'retail',
        priceMult,
        wholesaleUsd: service.wholesaleUsd,
        message: successTitle,
        title: successTitle,
        provider: 'smm',
      },
      balanceDebited: amount,
      walletMode: useReseller ? 'reseller_wallet' : 'retail',
      panel: panel ? { id: panel.id, name: panel.name } : null,
    });
  } catch (err) {
    if (debited && userId) {
      if (useReseller) {
        await creditResellerWallet(userId, amount, `refund-${debitRef}`);
      } else {
        await creditRetailWallet(userId, amount, `refund-${debitRef}`, `Refund — ${debitDesc}`);
      }
    }
    const message = err instanceof Error ? err.message : 'Provider order failed';
    return NextResponse.json({ ok: false, error: message, refunded: debited }, { status: 502 });
  }
}
