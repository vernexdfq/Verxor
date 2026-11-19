import { NextRequest, NextResponse } from 'next/server';
import {
  textverifiedConfigured,
  tvCreateRental,
  tvRentalPriceUsd,
  TV_DURATIONS,
  type TvRentalDuration,
} from '@/lib/providers/textverified';
import { rentSmsRetailNgn } from '@/lib/rentsms-pricing';
import { notifyAdmin } from '@/lib/notify';

/**
 * POST /api/v1/rent-sms/purchase
 *   { serviceName, duration, userId }
 *
 * Retail customer flow: live USD price check → wallet debit (₦) → Textverified
 * rental created → stored in rent_sms_rentals → number returned. On provider
 * failure the debit is refunded and the admin line is pinged. The price is
 * re-quoted server-side, so a stale client quote can't undercharge.
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
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
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
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
  }).catch(() => null);
}

async function saveRental(row: Record<string, unknown>): Promise<boolean> {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return false;
  const res = await fetch(`${base}/rest/v1/rent_sms_rentals`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
    cache: 'no-store',
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    serviceName?: string;
    duration?: string;
    userId?: string;
  };
  const serviceName = String(body.serviceName || '').trim();
  const duration = String(body.duration || '').trim() as TvRentalDuration;
  if (!serviceName || !TV_DURATIONS.some((d) => d.id === duration)) {
    return NextResponse.json({ ok: false, error: 'Missing service or duration' }, { status: 400 });
  }

  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in to rent a number.' }, { status: 401 });
  }

  // Server-side re-quote: never trust a client-sent price.
  const price = await tvRentalPriceUsd({ serviceName, duration, isRenewable: false });
  if (!price.ok || !price.priceUsd) {
    return NextResponse.json(
      { ok: false, error: price.error || 'That option is not available right now. Try another duration.' },
      { status: 404 },
    );
  }
  const totalNgn = await rentSmsRetailNgn(price.priceUsd);
  if (!totalNgn || totalNgn <= 0) {
    return NextResponse.json({ ok: false, error: 'Could not compute the price. Try again.' }, { status: 500 });
  }

  const durationLabel = TV_DURATIONS.find((d) => d.id === duration)?.label || duration;
  const debitRef = `rsm-${userId.slice(0, 8)}-${Date.now()}`;
  const desc = `Rent SMS · ${serviceName} · ${durationLabel}`;

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

  const rental = await tvCreateRental({ serviceName, duration, isRenewable: false });
  if (!rental.ok || !rental.reservationId) {
    if (debited) {
      await creditRetailWallet(userId, totalNgn, `refund-${debitRef}`, `Refund (rental failed) · ${desc}`);
    }
    void notifyAdmin(
      `⚠️ Verxor rent-SMS order FAILED (wallet refunded)\n${serviceName} · ${durationLabel} · ₦${totalNgn.toLocaleString('en-NG')}\nError: ${rental.error}\nCustomer: ${userId}`,
    );
    return NextResponse.json(
      { ok: false, error: rental.error || 'The rental failed. Your wallet has been refunded.' },
      { status: 502 },
    );
  }

  // Best-effort persist (the rental exists at the provider either way).
  const saved = await saveRental({
    user_id: userId,
    provider_reservation_id: rental.reservationId,
    service_name: serviceName,
    duration,
    number: rental.e164 || '',
    cost_usd: price.priceUsd,
    charged_ngn: totalNgn,
    status: 'active',
    ends_at: rental.endsAt ? new Date(rental.endsAt).toISOString() : null,
  });
  if (!saved) {
    void notifyAdmin(
      `⚠️ Verxor rent-SMS order created but NOT stored in the rentals table (${serviceName} · ${durationLabel} · res ${rental.reservationId}). Run supabase/rent-sms.sql if the table is missing.`,
    );
  }

  return NextResponse.json({
    ok: true,
    rental: {
      ref: debitRef,
      reservationId: rental.reservationId,
      number: rental.e164 || '',
      endsAt: rental.endsAt || null,
      serviceName,
      duration,
      durationLabel,
      totalNgn,
    },
  });
}
