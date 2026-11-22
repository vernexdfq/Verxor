import { NextRequest, NextResponse } from 'next/server';
import { textverifiedConfigured, tvSms } from '@/lib/providers/textverified';

/**
 * GET /api/v1/rent-sms/numbers          → my rentals (from rent_sms_rentals)
 * GET /api/v1/rent-sms/numbers?res=<id> → live SMS inbox for one rental
 *
 * Auth: bearer session token or ?userId (same resolution as purchase).
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const urlUserId = req.nextUrl.searchParams.get('userId');
  if (urlUserId) return urlUserId;
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

export async function GET(req: NextRequest) {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to see your numbers.' }, { status: 401 });

  const headers = serviceKey
    ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    : undefined;
  if (!base || !headers) return NextResponse.json({ ok: false, error: 'Backend not configured' }, { status: 500 });

  const res = req.nextUrl.searchParams.get('res');
  if (res) {
    // SMS inbox for one reservation (live from Textverified).
    const rows = await tvSms({ reservationId: res });
    const messages = rows.map((r) => {
      const rec = r as Record<string, unknown>;
      return {
        id: String(rec.id ?? ''),
        from: String(rec.fromNumber ?? rec.from ?? ''),
        text: String(rec.text ?? rec.message ?? ''),
        receivedAt: rec.receivedAt ? String(rec.receivedAt) : rec.createdAt ? String(rec.createdAt) : '',
      };
    });
    return NextResponse.json({ ok: true, messages });
  }

  try {
    const r = await fetch(
      `${base}/rest/v1/rent_sms_rentals?user_id=eq.${userId}&select=id,provider_reservation_id,service_name,duration,number,cost_usd,charged_ngn,status,ends_at,created_at&order=created_at.desc&limit=100`,
      { headers, cache: 'no-store' },
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return NextResponse.json(
        {
          ok: false,
          error:
            'Your rentals list is not available (' +
            (detail ? detail.slice(0, 160) : `history query failed with HTTP ${r.status}`) +
            ').',
        },
        { status: 503 },
      );
    }
    const rows = (await r.json()) as Array<Record<string, string | number | null>>;
    const rentals = rows.map((row) => ({
      id: String(row.id),
      reservationId: String(row.provider_reservation_id || ''),
      serviceName: String(row.service_name || ''),
      duration: String(row.duration || ''),
      number: String(row.number || ''),
      chargedNgn: Number(row.charged_ngn || 0),
      status: String(row.status || ''),
      endsAt: row.ends_at ? String(row.ends_at) : null,
      createdAt: String(row.created_at || ''),
    }));
    return NextResponse.json({ ok: true, rentals });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
