import { NextRequest, NextResponse } from 'next/server';

/**
 * GET/PUT /api/admin/rate — USD→NGN daily rate stored in admin_settings.
 * Auth: x-admin-password must match ADMIN_PASSWORD.
 * admin_settings.value is a text column, so values are stored as plain strings.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function adminAuthed(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

async function audit(action: string, meta: Record<string, unknown>) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/rest/v1/admin_audit_log`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ action, meta }),
  }).catch(() => null);
}

export async function GET(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  const res = await fetch(
    `${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
  );
  if (!res.ok) return NextResponse.json({ ok: false, error: 'Could not read rate' }, { status: 500 });
  const rows = (await res.json()) as Array<{ value?: string }>;
  const rate = Number(rows[0]?.value);
  return NextResponse.json({ ok: true, rate: Number.isFinite(rate) && rate > 0 ? rate : 1380 });
}

export async function PUT(req: NextRequest) {
  if (!adminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });

  let rate = 0;
  try {
    const body = (await req.json()) as { rate?: number | string };
    rate = Number(body.rate);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100000) {
    return NextResponse.json({ ok: false, error: 'Rate must be a positive number' }, { status: 400 });
  }

  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const up = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate`, {
    method: 'PATCH',
    headers: { ...hdr, Prefer: 'return=minimal' },
    body: JSON.stringify({ value: String(rate), updated_at: new Date().toISOString() }),
  });
  if (!up.ok) {
    return NextResponse.json({ ok: false, error: 'Could not save rate' }, { status: 500 });
  }
  await audit('rate_update', { rate });
  return NextResponse.json({ ok: true, rate });
}
