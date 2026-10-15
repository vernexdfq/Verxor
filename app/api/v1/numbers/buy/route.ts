import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(
  req: NextRequest,
  body?: { userId?: string; email?: string; phone?: string },
): Promise<string | null> {
  if (body?.userId) return body.userId;

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (token && base && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) return u.id;
      }
    } catch {
      /* fall through */
    }
  }

  // Soft-session fallback (same pattern as Fund page): email or phone → profiles
  if (serviceKey && base && (body?.email || body?.phone)) {
    try {
      const headers = {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      };
      if (body.email) {
        const q = encodeURIComponent(body.email.trim().toLowerCase());
        const r = await fetch(
          `${base}/rest/v1/profiles?email=eq.${q}&select=id&limit=1`,
          { headers, cache: 'no-store' },
        );
        if (r.ok) {
          const rows = (await r.json()) as { id?: string }[];
          if (rows?.[0]?.id) return rows[0].id;
        }
      }
      if (body.phone) {
        const phone = body.phone.replace(/\s/g, '');
        const q = encodeURIComponent(phone);
        const r = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${q}&select=id&limit=1`,
          { headers, cache: 'no-store' },
        );
        if (r.ok) {
          const rows = (await r.json()) as { id?: string }[];
          if (rows?.[0]?.id) return rows[0].id;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

async function debitWallet(userId: string, amount: number, reference: string) {
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

async function creditWallet(userId: string, amount: number, reference: string) {
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
  }).catch(() => null);
}

/**
 * Buy a real OTP number from Grizzly.
 * Debits wallet first (when userId present), then calls provider.
 * Refunds wallet if provider fails after debit.
 */
export async function POST(req: NextRequest) {
  if (!grizzly.isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Grizzly SMS is not configured' },
      { status: 503 },
    );
  }

  let body: {
    service?: string;
    country?: string;
    maxPriceUsd?: number;
    poolId?: string;
    priceNgn?: number;
    userId?: string;
    email?: string;
    phone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const service = (body.service || '').trim().toLowerCase();
  const country = String(body.country || '').trim();
  const maxPriceUsd = Number(body.maxPriceUsd);
  const poolId = (body.poolId || '').toLowerCase();
  const priceNgn = Number(body.priceNgn) || 0;

  if (!service || !country) {
    return NextResponse.json(
      { ok: false, error: 'service and country are required' },
      { status: 400 },
    );
  }
  if (!Number.isFinite(maxPriceUsd) || maxPriceUsd <= 0) {
    return NextResponse.json(
      { ok: false, error: 'maxPriceUsd must be a positive number' },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(req, body);

  // Hard gate: paid buys require a resolved user
  if (priceNgn > 0 && !userId) {
    return NextResponse.json(
      { ok: false, error: 'Sign in required to buy a number.' },
      { status: 401 },
    );
  }

  const debitRef = `vn-buy-${userId || 'anon'}-${Date.now()}`;
  let debited = false;

  if (priceNgn > 0 && userId && supabaseConfigured()) {
    try {
      await debitWallet(userId, priceNgn, debitRef);
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
  }

  try {
    const maxPrice = Math.round((maxPriceUsd + 0.01) * 100) / 100;

    const result = await grizzly.getNumber({
      service,
      country,
      maxPrice,
    });

    const phone = result.phone.startsWith('+') ? result.phone : `+${result.phone}`;

    let savedId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const rows = await sbInsert('vn_orders', {
          user_id: userId || null,
          provider: 'grizzly',
          provider_order_id: result.id,
          phone,
          service_code: service,
          country_code: country,
          pool_id: poolId || null,
          cost_usd: maxPriceUsd,
          price_ngn: priceNgn,
          status: 'waiting',
          raw: { access: result.raw, debitRef: debited ? debitRef : null },
        });
        savedId = Array.isArray(rows) ? (rows[0] as { id?: string })?.id ?? null : null;
      } catch {
        // Still return the live number even if ledger insert fails
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId || result.id,
        provider: 'grizzly',
        providerOrderId: result.id,
        phone,
        status: 'waiting',
        poolId,
        service,
        country,
        priceNgn,
        costUsd: maxPriceUsd,
      },
    });
  } catch (err) {
    if (debited && userId) {
      await creditWallet(userId, priceNgn, `refund-${debitRef}`);
    }
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
