import { NextRequest, NextResponse } from 'next/server';
import { swReleaseNumber } from '@/lib/providers/signalwire';
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

/**
 * POST /api/v1/rent-line/release  { id, userId }
 * Owner releases a line: best-effort provider release, row marked 'released'.
 * No refund for remaining days (stated upfront).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; userId?: string };
  const lineId = String(body.id || '').trim();
  if (!lineId) return NextResponse.json({ ok: false, error: 'Missing line id' }, { status: 400 });
  const userId = await resolveUserId(req, body.userId);
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hdr = { apikey: serviceKey || '', Authorization: `Bearer ${serviceKey || ''}`, 'Content-Type': 'application/json' };
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Backend not configured' }, { status: 503 });
  }
  const q = await fetch(
    `${base}/rest/v1/rented_lines?id=eq.${encodeURIComponent(lineId)}&select=id,user_id,provider_sid,e164,status`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!q.ok) return NextResponse.json({ ok: false, error: 'Could not find that line' }, { status: 502 });
  const rows = (await q.json()) as Array<{ id?: string; user_id?: string; provider_sid?: string | null; e164?: string; status?: string }>;
  const row = rows?.[0];
  if (!row) return NextResponse.json({ ok: false, error: 'Line not found' }, { status: 404 });
  if (String(row.user_id || '') !== userId) {
    return NextResponse.json({ ok: false, error: 'Not your line' }, { status: 403 });
  }
  if (String(row.status || '') === 'released') {
    return NextResponse.json({ ok: true, already: true });
  }

  // Provider release is best-effort: the row is the source of truth for the
  // customer; a stuck provider number is cleaned up separately.
  if (row.provider_sid) {
    swReleaseNumber(String(row.provider_sid)).catch(() => null);
  }

  const upd = await fetch(`${base}/rest/v1/rented_lines?id=eq.${encodeURIComponent(lineId)}`, {
    method: 'PATCH',
    headers: { ...hdr, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'released', updated_at: new Date().toISOString() }),
  });
  if (!upd.ok) return NextResponse.json({ ok: false, error: 'Could not release the line. Try again.' }, { status: 502 });
  void notifyAdmin(`🗑️ Rent-a-line released\n${String(row.e164 || '')}\nCustomer: ${userId}`);
  return NextResponse.json({ ok: true });
}
