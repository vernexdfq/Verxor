/**
 * POST /api/v1/accounts/buy
 * wallet debit → AccsZone /purchase → refund on failure → save order → return credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { purchaseListing } from '@/lib/providers/accszone';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

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

type BuyBody = {
  listingId?: number | string;
  providerListingId?: number | string;
  quantity?: number;
  platform?: string;
  title?: string;
  unitPriceNgn?: number;
  userId?: string;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BuyBody;
    const userId = await resolveUserId(req, body.userId);
    if (!userId) return bad('Unauthorized', 401);

    const adId = Number(body.providerListingId ?? body.listingId);
    const quantity = Math.max(1, Math.min(20, Math.floor(Number(body.quantity) || 1)));
    const unitPrice = Math.max(0, Math.floor(Number(body.unitPriceNgn) || 0));
    const platform = String(body.platform || 'Facebook').slice(0, 40);
    const title = String(body.title || 'Account purchase').slice(0, 200);
    const totalNgn = unitPrice * quantity;

    if (!Number.isFinite(adId) || adId <= 0) return bad('Invalid listing');
    if (unitPrice <= 0 || totalNgn <= 0) return bad('Invalid price');

    const clientRef = `vx-acc-${userId.slice(0, 8)}-${Date.now()}`;
    const debitRef = `acc-buy-${clientRef}`;

    try {
      await debitRetailWallet(userId, totalNgn, debitRef, `Accounts: ${title} x${quantity}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') return bad('Insufficient wallet balance', 402);
      return bad(msg, 500);
    }

    const purchase = await purchaseListing({
      adId,
      quantity,
      clientReference: clientRef,
    });

    if (!purchase.ok) {
      await creditRetailWallet(
        userId,
        totalNgn,
        `refund-${debitRef}`,
        `Refund accounts purchase failed: ${title}`,
      );
      return NextResponse.json(
        {
          ok: false,
          error: purchase.error || 'Purchase failed at provider',
          code: purchase.code || 'provider_error',
          refunded: true,
        },
        { status: 502 },
      );
    }

    let orderId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const inserted = await sbInsert('account_orders', {
          user_id: userId,
          platform,
          title,
          quantity,
          unit_price_ngn: unitPrice,
          total_ngn: totalNgn,
          provider_listing_id: adId,
          credentials: purchase.accounts,
          status: 'delivered',
          provider_order_id: purchase.orderId != null ? String(purchase.orderId) : null,
          client_reference: clientRef,
        });
        const row = Array.isArray(inserted) ? inserted[0] : inserted;
        orderId = row && typeof row === 'object' && 'id' in row ? String((row as { id: string }).id) : null;
      } catch {
        /* persistence must not hide credentials */
      }
    }

    return NextResponse.json({
      ok: true,
      orderId,
      credentials: purchase.accounts,
      quantity: purchase.accounts.length,
      totalNgn,
      platform,
      title,
      message: 'Purchase successful. Credentials are ready.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
