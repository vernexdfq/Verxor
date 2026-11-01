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

/** Partner / child-panel wholesale balance (reseller_wallet). */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

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
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ balance: next }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }

  // Optional ledger row (best-effort)
  try {
    await fetch(`${base}/rest/v1/wallet_ledger`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        amount: -amount,
        kind: 'panel_boost_debit',
        reference,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* ignore */
  }
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
  if (!balRes.ok) return;
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  const next = Math.round((prev + amount) * 100) / 100;

  await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ balance: next }),
  });

  try {
    await fetch(`${base}/rest/v1/wallet_ledger`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        amount,
        kind: 'panel_boost_refund',
        reference,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* ignore */
  }
}

/**
 * POST /api/v1/boost
 * Auth: retail JWT or child-panel API key (vx_panel_*) with linked wallet.
 * Retail → wallets via debit_wallet + retail mult (4/3/2/1.5)
 * Panel  → reseller_wallet + partner mult (2.0/1.7/1.35/1.15)
 * Body: { serviceId, link, quantity, userId? }
 */
export async function POST(req: NextRequest) {
  if (!isSmmConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Boost provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    serviceId?: string | number;
    link?: string;
    quantity?: number;
    userId?: string;
    ref?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const link = String(body.link || '').trim();
  if (!link || link.length < 5) {
    return NextResponse.json(
      { ok: false, error: 'Valid target link is required' },
      { status: 400 },
    );
  }

  const quantity = Math.round(Number(body.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ ok: false, error: 'Invalid quantity' }, { status: 400 });
  }

  const serviceId = String(body.serviceId || '').trim();
  if (!serviceId) {
    return NextResponse.json({ ok: false, error: 'Service is required' }, { status: 400 });
  }

  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsBoost(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to place boost orders' },
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
          'Panel wallet not linked. Set meta.wallet_user_id on the API client or VERXOR_PANEL_WALLET_USER_ID.',
      },
      { status: 401 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured' },
      { status: 503 },
    );
  }

  const service = await smmFindService(serviceId);
  if (!service) {
    return NextResponse.json(
      { ok: false, error: 'Service not available or no longer offered' },
      { status: 404 },
    );
  }

  if (service.wholesaleUsd > SMM_MAX_USD_CUTOFF) {
    return NextResponse.json(
      { ok: false, error: 'Service not available for retail' },
      { status: 400 },
    );
  }

  if (quantity < service.min || quantity > service.max) {
    return NextResponse.json(
      {
        ok: false,
        error: `Quantity must be between ${service.min.toLocaleString('en-NG')} and ${service.max.toLocaleString('en-NG')}`,
      },
      { status: 400 },
    );
  }

  const useReseller = Boolean(panel);
  const rateNgn = useReseller
    ? calculateSmmPartnerPriceNgn(service.wholesaleUsd)
    : calculateSmmPriceNgn(service.wholesaleUsd);
  const priceMult = useReseller
    ? getSmmPartnerMultiplier(service.wholesaleUsd)
    : getSmmMultiplier(service.wholesaleUsd);
  const amount = Math.round((quantity / 1000) * rateNgn * 100) / 100;
  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid order amount' }, { status: 400 });
  }

  const shortTitle =
    service.title.length > 80 ? service.title.slice(0, 77) + '…' : service.title;
  const debitRef =
    body.ref ||
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
    const result = await smmAddOrder({
      service: service.providerId,
      link,
      quantity,
    });

    // Receipt only for retail end-users (panel sends its own)
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
      // Panel wholesale order: Notify panel admin only, NEVER email the end customer
      try {
        const adminEmail = await getPanelAdminEmail(panel);
        if (adminEmail) {
          const retailNgn = Number((body as any).retailPriceNgn ?? (body as any).customerPaidNgn);
          const validRetail = Number.isFinite(retailNgn) && retailNgn > 0 ? retailNgn : undefined;
          const customerLabel = ((body as any).customerName || (body as any).customerEmail || '').trim() || 'Child panel customer';

          const mail = await sendPanelAdminOrderAlert(adminEmail, {
            panelName: panel.name,
            adminEmail,
            customerName: customerLabel,
            customerEmail: (body as any).customerEmail ? String((body as any).customerEmail).trim() : undefined,
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
        await creditRetailWallet(
          userId,
          amount,
          `refund-${debitRef}`,
          `Refund — ${debitDesc}`,
        );
      }
    }
    const message = err instanceof Error ? err.message : 'Provider order failed';
    return NextResponse.json(
      { ok: false, error: message, refunded: debited },
      { status: 502 },
    );
  }
}
