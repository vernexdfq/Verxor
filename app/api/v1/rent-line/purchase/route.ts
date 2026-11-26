import { NextRequest, NextResponse } from 'next/server';
import { swBuyNumber, swConfigured } from '@/lib/providers/signalwire';
import { rentLinePriceNgn, RENT_LINE_PERIODS } from '@/lib/rentline-pricing';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const header = (req.headers.get('x-vx-user') || '').trim();
  if (header) return header;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(base + '/auth/v1/user', {
      headers: { apikey: anon, Authorization: 'Bearer ' + token },
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
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
  }).catch(() => null);
}

function friendlyE164(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+1 (${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

/**
 * POST /api/v1/rent-line/purchase
 *   { e164, country, type, period, userId }
 * Wallet debited at the server-side price, then the number is provisioned at
 * SignalWire. On provider failure the debit is refunded + admin notified.
 */
export async function POST(req: NextRequest) {
  if (!swConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Number rental is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    e164?: string;
    country?: string;
    type?: string;
    period?: string;
    userId?: string;
  };
  const e164 = String(body.e164 || '').trim();
  const country = String(body.country || '').trim().toUpperCase();
  const type = String(body.type || 'local').trim();
  const period = RENT_LINE_PERIODS[body.period || ''] ? String(body.period) : '30d';
  if (!e164 || !/^\+[0-9]{7,15}$/.test(e164)) {
    return NextResponse.json({ ok: false, error: 'Pick a number first.' }, { status: 400 });
  }
  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in to rent a number.' }, { status: 401 });
  }
  const totalNgn = await rentLinePriceNgn(country, period);
  if (!totalNgn) {
    return NextResponse.json({ ok: false, error: 'Pricing is not set for that country yet.' }, { status: 400 });
  }
  const periodInfo = RENT_LINE_PERIODS[period];
  const debitRef = `swl-${userId.slice(0, 8)}-${Date.now()}`;
  const desc = `Rent-a-line · ${e164} · ${periodInfo.label}`;

  try {
    await debitRetailWallet(userId, totalNgn, debitRef, desc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: `Insufficient wallet balance — total is ₦${totalNgn.toLocaleString('en-NG')}.` },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const buy = await swBuyNumber(e164);
  if (!buy.ok || !buy.sid) {
    await creditRetailWallet(userId, totalNgn, `refund-${debitRef}`, `Refund (number rental failed) · ${desc}`);
    void notifyAdmin(
      `⚠️ Rent-a-line FAILED (wallet refunded)\n${e164} · ${periodInfo.label} · ₦${totalNgn.toLocaleString('en-NG')}\nError: ${buy.error}\nCustomer: ${userId}`,
    );
    return NextResponse.json(
      { ok: false, error: buy.error || 'The number could not be rented. Your wallet has been refunded.' },
      { status: 503 },
    );
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let lineId = '';
  try {
    if (base && serviceKey) {
      const res = await fetch(`${base}/rest/v1/rented_lines`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          provider: 'signalwire',
          provider_sid: buy.sid,
          e164,
          friendly: friendlyE164(e164),
          country_code: country,
          number_type: type,
          status: 'active',
          period,
          amount_ngn: totalNgn,
          expires_at: new Date(Date.now() + periodInfo.days * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ id?: string }>;
        lineId = String(rows?.[0]?.id || '');
      }
    }
  } catch {
    /* non-fatal: number is provisioned; row may be missing */
  }

  void notifyAdmin(
    `✅ Rent-a-line SOLD\n${e164} · ${country} · ${periodInfo.label} · ₦${totalNgn.toLocaleString('en-NG')}\nCustomer: ${userId}`,
  );

  return NextResponse.json({
    ok: true,
    line: {
      id: lineId,
      e164,
      friendly: friendlyE164(e164),
      country,
      period,
      amountNgn: totalNgn,
      expiresAt: new Date(Date.now() + periodInfo.days * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
}
