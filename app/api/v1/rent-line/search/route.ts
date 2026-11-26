import { NextRequest, NextResponse } from 'next/server';
import { swAvailable, swConfigured } from '@/lib/providers/signalwire';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
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

/**
 * GET /api/v1/rent-line/search?country=US&type=local&areaCode=415
 * Live SignalWire number availability for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  if (!swConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Number rental is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const country = (req.nextUrl.searchParams.get('country') || 'US').trim().toUpperCase();
  const type = (req.nextUrl.searchParams.get('type') || 'local').trim();
  const areaCode = (req.nextUrl.searchParams.get('areaCode') || '').trim();
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ ok: false, error: 'Unsupported country' }, { status: 400 });
  }
  const result = await swAvailable({ country, type, areaCode });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || 'Search failed. Try again.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, numbers: result.numbers || [] });
}
