import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/admin/giftcard-rates — { retail, api, trade } standalone FX rates
 * PUT  /api/admin/giftcard-rates — body { retail?, api?, trade? }
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Rates are stored in admin_settings key 'gift_card_rates' (JSON) and are
 * DECOUPLED from the global usd_ngn_rate daily rate.
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

type Rates = { retail: number; api: number; trade: number };

const DEFAULTS: Rates = { retail: 1460, api: 1415, trade: 1200 };

async function readRates(): Promise<Rates | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.gift_card_rates&select=value&limit=1',
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
      trade: num(parsed?.trade, DEFAULTS.trade),
    };
  } catch {
    return null;
  }
}

async function writeRates(next: Rates): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify(next);
  // Try update first (normal case); insert as new row if not present yet.
  const existing = await fetch(base + '/rest/v1/admin_settings?key=eq.gift_card_rates&select=key&limit=1', {
    headers: hdr,
    cache: 'no-store',
  });
  const hasRow = existing.ok && ((await existing.json()) as unknown[]).length > 0;
  if (hasRow) {
    const patched = await fetch(base + '/rest/v1/admin_settings?key=eq.gift_card_rates', {
      method: 'PATCH',
      headers: hdr,
      body: JSON.stringify({ value }),
      cache: 'no-store',
    });
    return patched.ok;
  }
  const inserted = await fetch(base + '/rest/v1/admin_settings', {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'gift_card_rates', value }),
    cache: 'no-store',
  });
  return inserted.ok;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const rates = await readRates();
  if (!rates) {
    return NextResponse.json({ ok: false, error: 'Could not read Gift Card rates' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...rates });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const current = await readRates();
  if (!current) {
    return NextResponse.json({ ok: false, error: 'Could not read current rates' }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    retail?: number | string;
    api?: number | string;
    trade?: number | string;
  };
  const pick = (v: number | string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n < 100000 ? n : d;
  };
  const next: Rates = {
    retail: pick(body.retail, current.retail),
    api: pick(body.api, current.api),
    trade: pick(body.trade, current.trade),
  };
  const okWrite = await writeRates(next);
  if (!okWrite) {
    return NextResponse.json({ ok: false, error: 'Could not save rates' }, { status: 500 });
  }
  await audit('gift_card_rates_update', { ...next, previous: current });
  return NextResponse.json({ ok: true, ...next });
}
