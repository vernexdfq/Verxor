import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/settings/rate  — current USD→NGN rate (text value in admin_settings)
 * PUT /api/admin/settings/rate  — update the rate. Body: { rate: number }
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function authHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey
    ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
    : null;
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

async function readRate(): Promise<number | null> {
  const base = supabaseBase();
  const hdr = authHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string | number }>;
    const v = Number(rows[0]?.value);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const rate = await readRate();
  if (rate === null) {
    return NextResponse.json({ ok: false, error: 'Rate not found in admin_settings' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, rate });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const base = supabaseBase();
  const hdr = authHeaders();
  if (!base || !hdr) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }
  let body: { rate?: number | string };
  try {
    body = (await req.json()) as { rate?: number | string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid rate' }, { status: 400 });
  }

  // admin_settings.value is text in this database.
  const res = await fetch(
    `${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate`,
    {
      method: 'PATCH',
      headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ value: String(rate), updated_at: new Date().toISOString() }),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    console.error('[admin/settings/rate] patch failed', res.status, raw.slice(0, 200));
    return NextResponse.json({ ok: false, error: 'Could not save the rate' }, { status: 500 });
  }

  // Audit entry
  try {
    await fetch(`${base}/rest/v1/admin_audit_log`, {
      method: 'POST',
      headers: { ...hdr, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rate_update',
        amount_ngn: rate,
        meta: { setting: 'usd_ngn_rate' },
      }),
      cache: 'no-store',
    });
  } catch {
    /* audit is best-effort */
  }

  return NextResponse.json({ ok: true, rate });
}
