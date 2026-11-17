import { NextRequest, NextResponse } from 'next/server';

/**
 * GET/PUT /api/admin/rate — USD→NGR rate stored in admin_settings (value is text).
 * Same logic as /api/admin/settings/rate; this is the path the admin UI calls.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } : null;
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  try {
    const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`, {
      headers: hdr, cache: 'no-store',
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: 'Rate not found' }, { status: 404 });
    const rows = (await res.json()) as Array<{ value?: string | number }>;
    const rate = Number(rows[0]?.value);
    if (!Number.isFinite(rate) || rate <= 0) return NextResponse.json({ ok: false, error: 'Invalid rate value' }, { status: 500 });
    return NextResponse.json({ ok: true, rate });
  } catch {
    return NextResponse.json({ ok: false, error: 'Network error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  let body: { rate?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid rate' }, { status: 400 });
  }
  const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate`, {
    method: 'PATCH',
    headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ value: String(rate), updated_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    console.error('[admin/rate] patch failed', res.status, raw.slice(0, 200));
    return NextResponse.json({ ok: false, error: 'Could not save the rate' }, { status: 500 });
  }
  try {
    await fetch(`${base}/rest/v1/admin_audit_log`, {
      method: 'POST',
      headers: { ...hdr, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rate_update', amount_ngn: rate, meta: { setting: 'usd_ngn_rate' } }),
      cache: 'no-store',
    });
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true, rate });
}
