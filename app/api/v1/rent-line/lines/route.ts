import { NextRequest, NextResponse } from 'next/server';

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
 * GET /api/v1/rent-line/lines
 * The signed-in user's rented lines with honest effective status
 * (active / expired) computed from expires_at.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required', lines: [] }, { status: 401 });
  }
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: true, lines: [], message: 'Wallet backend not configured' });
  }
  try {
    const res = await fetch(
      `${base}/rest/v1/rented_lines?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50` +
        `&select=id,provider,provider_sid,e164,friendly,country_code,number_type,label,status,period,amount_ngn,expires_at,created_at,updated_at`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ ok: true, lines: [], error: 'Failed to load lines: ' + t.slice(0, 160) });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const now = Date.now();
    const lines = rows.map((r) => {
      const stored = String(r.status || 'active');
      const expires = Date.parse(String(r.expires_at || '')) || 0;
      const status = stored === 'released' ? 'released' : now < expires ? 'active' : 'expired';
      return {
        id: String(r.id || ''),
        e164: String(r.e164 || ''),
        friendly: String(r.friendly || r.e164 || ''),
        country: String(r.country_code || ''),
        type: String(r.number_type || 'local'),
        label: String(r.label || ''),
        status,
        period: String(r.period || '30d'),
        amountNgn: Number(r.amount_ngn) || 0,
        expiresAt: String(r.expires_at || ''),
        createdAt: String(r.created_at || ''),
      };
    });
    return NextResponse.json({ ok: true, lines, count: lines.length });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: true, lines: [], error: 'Failed to load lines: ' + detail });
  }
}
