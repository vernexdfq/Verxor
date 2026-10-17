import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'not configured' }, { status: 503 });
  }

  let userId = req.nextUrl.searchParams.get('userId') || '';
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

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  const res = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${userId}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!res.ok) {
    return NextResponse.json({ ok: true, balanceNgn: 0, userId });
  }
  const rows = await res.json();
  return NextResponse.json({
    ok: true,
    balanceNgn: Number(rows[0]?.balance) || 0,
    userId,
  });
}
