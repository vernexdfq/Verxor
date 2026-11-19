import { NextRequest, NextResponse } from 'next/server';
import {
  mgCreateOrder,
  mgProductDetail,
  moogoldConfigured,
} from '@/lib/providers/moogold';
import { gamingRetailNgn, resolveFxRateNgn } from '@/lib/gaming-pricing';
import { notifyAdmin } from '@/lib/notify';

/**
 * POST /api/v1/gaming/purchase
 *   { productId, variationId, quantity, fields: { "User ID": "...", ... }, userId }
 *
 * Retail customer flow: wallet is debited first (₦ retail price at the live
 * admin FX rate), then the MooGold order is created; on provider failure the
 * debit is refunded (credit) and the error is surfaced + reported to the
 * Telegram admin line.
 */
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
  if (!token) return null;
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

async function debitRetailWallet(userId: string, amount: number, reference: string, description: string) {
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

async function creditRetailWallet(userId: string, amount: number, reference: string, description: string) {
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
  }).catch(() => null);
}

export async function POST(req: NextRequest) {
  if (!moogoldConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    productId?: string;
    variationId?: string;
    quantity?: number;
    fields?: Record<string, string>;
    userId?: string;
  };

  const productId = String(body.productId || '').trim();
  const variationId = String(body.variationId || '').trim();
  const quantity = Math.max(1, Math.min(99, Math.floor(Number(body.quantity) || 1)));
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.fields || {})) {
    const val = String(v || '').trim();
    if (val) fields[k] = val;
  }
  if (!productId || !variationId) {
    return NextResponse.json({ ok: false, error: 'Missing product or denomination' }, { status: 400 });
  }

  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in to complete your purchase.' }, { status: 401 });
  }

  const detail = await mgProductDetail(productId);
  const variation = detail?.variations.find((v) => v.id === variationId);
  if (!detail || !variation) {
    return NextResponse.json({ ok: false, error: 'That product or denomination is not available. Refresh and try again.' }, { status: 400 });
  }
  if (variation.inStock === false) {
    return NextResponse.json({ ok: false, error: 'That denomination just went out of stock. Pick another one.' }, { status: 400 });
  }
  if (!variation.priceUsd || variation.priceUsd <= 0) {
    return NextResponse.json({ ok: false, error: 'Pricing is unavailable for that denomination right now.' }, { status: 400 });
  }

  const rate = await resolveFxRateNgn();
  const baseUsdCost = variation.priceUsd * quantity;
  const totalNgn = gamingRetailNgn(baseUsdCost, rate);
  if (!totalNgn || totalNgn <= 0) {
    return NextResponse.json({ ok: false, error: 'Could not compute the price. Try again.' }, { status: 500 });
  }

  const debitRef = `gmg-${userId.slice(0, 8)}-${Date.now()}`;
  const desc = `Gaming · ${detail.name} · ${variation.name}${quantity > 1 ? ` ×${quantity}` : ''}`;
  let debited = false;

  try {
    await debitRetailWallet(userId, totalNgn, debitRef, desc);
    debited = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: `Insufficient wallet balance. Fund your wallet and try again — total is ₦${totalNgn.toLocaleString('en-NG')}.` },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const result = await mgCreateOrder({
    category: detail.category || String(process.env.MOOGOLD_GAMING_CATEGORY_ID || '1'),
    productId: detail.id,
    variationId: variation.id,
    quantity,
    quantityMax: 99,
    fields,
    partnerOrderId: debitRef,
  });

  if (!result.ok) {
    if (debited) {
      await creditRetailWallet(userId, totalNgn, `refund-${debitRef}`, `Refund (gaming order failed) · ${desc}`);
    }
    void notifyAdmin(
      `⚠️ Verxor gaming order FAILED (wallet refunded)\n${detail.name} · ${variation.name} ×${quantity} · ₦${totalNgn.toLocaleString('en-NG')}\nError: ${result.error}\nCustomer: ${userId}`,
    );
    return NextResponse.json({ ok: false, error: result.error || 'The order failed. Your wallet has been refunded.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      ref: debitRef,
      providerOrderId: result.order?.orderId,
      status: result.order?.status || 'processing',
      message: result.order?.message,
      accountDetails: result.order?.accountDetails,
      totalNgn,
      productName: detail.name,
      variationName: variation.name,
      quantity,
    },
  });
}
