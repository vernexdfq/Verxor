import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/admin/email-otp-pricing — { rate, retail, api, panel }
 * PUT  /api/admin/email-otp-pricing — body { retail?, api?, panel? } flat USD markups
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Markups are stored in admin_settings key 'email_otp_markups' (JSON).
 * The rate is NOT stored here — it is the single daily rate (admin_settings usd_ngn_rate).
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
  };
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

async function audit(action: string, meta: Record<string, unknown>) {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return;
  try {
    await fetch(base + '/rest/v1/admin_audit_log', {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({ action, meta }),
      cache: 'no-store',
    });
  } catch {
    /* audit is best-effort */
  }
}

type Markups = { retail: number; api: number; panel: number };

const DEFAULTS: Markups = { retail: 0.25, api: 0.18, panel: 0.12 };

async function readMarkups(): Promise<Markups | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.email_otp_markups&select=value&limit=1',
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    if (!rows?.length) return { ...DEFAULTS };
    const parsed = rows[0].value ? JSON.parse(rows[0].value) : null;
    const num = (v: unknown, d: number) => (Number(v) > 0 ? Number(v) : d);
    return {
      retail: num(parsed?.retail, DEFAULTS.retail),
      api: num(parsed?.api, DEFAULTS.api),
      panel: num(parsed?.panel, DEFAULTS.panel),
    };
  } catch {
    return null;
  }
}

async function readRate(): Promise<number> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return 1380;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1',
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return 1380;
    const rows = (await res.json()) as Array<{ value?: string }>;
    const n = Number(rows?.[0]?.value);
    return Number.isFinite(n) && n > 0 ? n : 1380;
  } catch {
    return 1380;
  }
}

async function writeMarkups(next: Markups): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify(next);
  const patched = await fetch(base + '/rest/v1/admin_settings?key=eq.email_otp_markups', {
    method: 'PATCH',
    headers: hdr,
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  if (patched.ok) return true;
  const inserted = await fetch(base + '/rest/v1/admin_settings', {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'email_otp_markups', value }),
    cache: 'no-store',
  });
  return inserted.ok;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const markups = await readMarkups();
  if (!markups) {
    return NextResponse.json(
      { ok: false, error: 'Could not read Email OTP settings' },
      { status: 500 },
    );
  }
  const rate = await readRate();
  return NextResponse.json({ ok: true, rate, ...markups });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.retail === undefined && body.api === undefined && body.panel === undefined) {
    return NextResponse.json(
      { ok: false, error: 'Nothing to update — send retail, api and/or panel' },
      { status: 400 },
    );
  }
  // Reject explicitly invalid values instead of silently keeping the old ones.
  for (const k of ['retail', 'api', 'panel'] as const) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (!Number.isFinite(n) || n < 0.01 || n > 5) {
        return NextResponse.json(
          { ok: false, error: 'Markups must be between $0.01 and $5.00' },
          { status: 400 },
        );
      }
    }
  }
  const current = await readMarkups();
  if (!current) {
    return NextResponse.json(
      { ok: false, error: 'Could not read current settings' },
      { status: 500 },
    );
  }
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0.01 && n <= 5 ? n : fallback;
  };
  const next: Markups = {
    retail: num(body.retail, current.retail),
    api: num(body.api, current.api),
    panel: num(body.panel, current.panel),
  };
  const ok = await writeMarkups(next);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
  await audit('email_otp_pricing_update', { markups: next });
  const rate = await readRate();
  return NextResponse.json({ ok: true, rate, ...next });
}
