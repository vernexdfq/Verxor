import { NextRequest, NextResponse } from 'next/server';
import { calculateSmmPriceNgn, SMM_MAX_USD_CUTOFF } from '@/lib/providers/smm';
import { isSmmConfigured, smmAddOrder, smmFindService } from '@/lib/providers/smm-orders';
import { supabaseConfigured } from '@/lib/supabase-admin';

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

/**
 * POST /api/v1/boost
 * Auth → debit wallet → JAP action=add → refund on fail
 * Body: { serviceId, link, quantity, userId? }
 * History line via debit_wallet description (includes ₦ amount).
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

  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in to place a boost order.' },
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

  const rateNgn = calculateSmmPriceNgn(service.wholesaleUsd);
  const amount = Math.round((quantity / 1000) * rateNgn * 100) / 100;
  if (amount <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid order amount' }, { status: 400 });
  }

  const shortTitle =
    service.title.length > 80 ? service.title.slice(0, 77) + '…' : service.title;
  const debitRef = body.ref || `boost-${userId.slice(0, 8)}-${Date.now()}`;
  const debitDesc = `Boost — ${shortTitle} × ${quantity.toLocaleString('en-NG')} · ${formatNaira(amount)}`;
  const successTitle = `Boost order was successful — ${shortTitle} × ${quantity.toLocaleString('en-NG')} for ${formatNaira(amount)}`;

  let debited = false;
  try {
    await debitRetailWallet(userId, amount, debitRef, debitDesc);
    debited = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: 'Insufficient wallet balance. Fund your wallet first.' },
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
        message: successTitle,
        title: successTitle,
        provider: 'smm',
      },
      balanceDebited: amount,
    });
  } catch (err) {
    if (debited) {
      await creditRetailWallet(
        userId,
        amount,
        `refund-${debitRef}`,
        `Refund — ${debitDesc}`,
      );
    }
    const message = err instanceof Error ? err.message : 'Provider order failed';
    return NextResponse.json(
      { ok: false, error: message, refunded: debited },
      { status: 502 },
    );
  }
}
