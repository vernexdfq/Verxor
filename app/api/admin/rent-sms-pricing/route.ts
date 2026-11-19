import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/admin/rent-sms-pricing — { rate, retail, api } multipliers + the live global rate
 * PUT  /api/admin/rent-sms-pricing — body { retail?, api? } percentage multipliers (>= 1)
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Stored in admin_settings key 'rent_sms_markups' (JSON). The FX rate is the
 * shared daily rate (Overview) — rentals follow the Virtual Number pattern.
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

type Multipliers = { retail: number; api: number };

const DEFAULTS: Multipliers = { retail: 1.5, api: 1.3 };

async function readMultipliers(): Promise<Multipliers | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.rent_sms_markups&select=value&limit=1',
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    if (!rows?.length) return { ...DEFAULTS };
    const parsed = rows[0].value ? JSON.parse(rows[0].value) : null;
    const num = (v: unknown, d: number) => (Number(v) >= 1 ? Number(v) : d);
    return {
      retail: num(parsed?.retail, DEFAULTS.retail),
      api: num(parsed?.api, DEFAULTS.api),
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

async function writeMultipliers(next: Multipliers): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify(next);
  const patched = await fetch(base + '/rest/v1/admin_settings?key=eq.rent_sms_markups', {
    method: 'PATCH',
    headers: hdr,
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  if (patched.ok) return true;
  const inserted = await fetch(base + '/rest/v1/admin_settings', {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'rent_sms_markups', value }),
    cache: 'no-store',
  });
  return inserted.ok;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const multipliers = await readMultipliers();
  if (!multipliers) {
    return NextResponse.json({ ok: false, error: 'Could not read Rent SMS settings' }, { status: 500 });
  }
  const rate = await readRate();
  return NextResponse.json({ ok: true, rate, ...multipliers });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const current = await readMultipliers();
  if (!current) {
    return NextResponse.json({ ok: false, error: 'Could not read current settings' }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    retail?: number | string;
    api?: number | string;
  };
  const pick = (v: number | string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : d;
  };
  const next: Multipliers = {
    retail: pick(body.retail, current.retail),
    api: pick(body.api, current.api),
  };
  const okWrite = await writeMultipliers(next);
  if (!okWrite) {
    return NextResponse.json({ ok: false, error: 'Could not save settings' }, { status: 500 });
  }
  await audit('rent_sms_markups_update', { ...next, previous: current });
  const rate = await readRate();
  return NextResponse.json({ ok: true, rate, ...next });
}
