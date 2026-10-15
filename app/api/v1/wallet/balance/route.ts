import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/wallet/balance
 * Returns live balance from public.wallets for the authenticated user.
 * Accepts Bearer token and/or ?userId= / email / phone query for soft-session restore.
 */
export async function GET(req: NextRequest) {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, message: 'DB not configured' }, { status: 503 });
  }

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  let userId = (req.nextUrl.searchParams.get('userId') || '').trim();
  const emailQ = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  const phoneQ = (req.nextUrl.searchParams.get('phone') || '').trim();

  // Prefer JWT if present
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) userId = u.id;
      }
    } catch {
      /* ignore */
    }
  }

  async function profileId(query: string): Promise<string | null> {
    const res = await fetch(`${base}/rest/v1/profiles?${query}&select=id&limit=1`, {
      headers: hdr,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ id?: string }>;
    return rows[0]?.id || null;
  }

  if (!userId && emailQ) {
    userId = (await profileId(`email=eq.${encodeURIComponent(emailQ)}`)) || '';
  }
  if (!userId && phoneQ) {
    const d = phoneQ.replace(/\D/g, '');
    const candidates = new Set<string>([phoneQ, d, `+${d}`]);
    if (d.startsWith('234') && d.length >= 13) {
      candidates.add(`0${d.slice(3)}`);
      candidates.add(d.slice(3));
    }
    if (d.startsWith('0') && d.length >= 11) {
      candidates.add(`+234${d.slice(1)}`);
      candidates.add(`234${d.slice(1)}`);
    }
    const last10 = d.slice(-10);
    if (last10.length === 10) {
      candidates.add(`+234${last10}`);
      candidates.add(`0${last10}`);
    }
    for (const p of candidates) {
      const id = await profileId(`phone=eq.${encodeURIComponent(p)}`);
      if (id) {
        userId = id;
        break;
      }
    }
    if (!userId && last10.length >= 9) {
      userId = (await profileId(`phone=like.*${last10}`)) || '';
    }
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, message: 'Sign in required', balanceNgn: 0, balanceUsd: 0 },
      { status: 401 },
    );
  }

  try {
    const wRes = await fetch(
      `${base}/rest/v1/wallets?user_id=eq.${userId}&select=balance_ngn,balance_usd,updated_at&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!wRes.ok) {
      const t = await wRes.text().catch(() => '');
      console.error('[wallet/balance]', wRes.status, t.slice(0, 200));
      return NextResponse.json({ ok: false, message: 'Could not load wallet' }, { status: 500 });
    }
    const rows = (await wRes.json()) as Array<{
      balance_ngn?: number;
      balance_usd?: number;
      updated_at?: string;
    }>;
    const row = rows[0];
    const balanceNgn = Number(row?.balance_ngn) || 0;
    const balanceUsd = Number(row?.balance_usd) || 0;

    return NextResponse.json({
      ok: true,
      userId,
      balanceNgn,
      balanceUsd,
      updatedAt: row?.updated_at || null,
    });
  } catch (e) {
    console.error('[wallet/balance]', e);
    return NextResponse.json({ ok: false, message: 'Wallet error' }, { status: 500 });
  }
}
