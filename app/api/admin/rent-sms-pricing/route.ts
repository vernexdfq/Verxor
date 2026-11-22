import { NextRequest, NextResponse } from 'next/server';
import { RENT_SMS_DEFAULT_TIERS, type RentSmsTier } from '@/lib/rentsms-pricing';

/**
 * GET  /api/admin/rent-sms-pricing — { rate, tiers } tiered master pricing (5
 *        USD-cost tiers × panel/api/retail multipliers) + the live global rate.
 * PUT  /api/admin/rent-sms-pricing — body { tiers: [{ minUsd, maxUsd, panel, api, retail }, …] }.
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Stored in admin_settings key 'rent_sms_markups' (JSON, { tiers: […] }).
 * FX: the shared daily rate (Overview) — rentals follow the Virtual Number pattern.
 * Rounding: prices are rounded UP to the nearest ₦50 in the pricing engine.
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

function tierFromRecord(r: Record<string, unknown>, fallback: RentSmsTier): RentSmsTier {
  const num = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : d;
  };
  const min = Number(r.minUsd);
  const max = r.maxUsd === null || r.maxUsd === undefined ? null : Number(r.maxUsd);
  return {
    minUsd: Number.isFinite(min) ? min : fallback.minUsd,
    maxUsd: max !== null && Number.isFinite(max) ? max : fallback.maxUsd,
    multipliers: {
      panel: num(r.panel, fallback.multipliers.panel),
      api: num(r.api, fallback.multipliers.api),
      retail: num(r.retail, fallback.multipliers.retail),
    },
  };
}

const BAND_LABELS = ['Micro/Short', 'Standard single-app', 'All-Services & mid', 'Long multi-month', 'Annual'];

async function readTiers(): Promise<RentSmsTier[] | null> {
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
    if (!rows?.length) return RENT_SMS_DEFAULT_TIERS.map((t) => ({ ...t, multipliers: { ...t.multipliers } }));
    const parsed = rows[0].value ? JSON.parse(rows[0].value) : null;
    const rawTiers = parsed?.tiers;
    if (Array.isArray(rawTiers) && rawTiers.length) {
      return rawTiers.map((t: unknown, i: number) =>
        tierFromRecord((t && typeof t === 'object' ? t : {}) as Record<string, unknown>, RENT_SMS_DEFAULT_TIERS[i] ?? RENT_SMS_DEFAULT_TIERS[0]),
      ).sort((a: RentSmsTier, b: RentSmsTier) => a.minUsd - b.minUsd);
    }
    // Legacy flat shape ({ retail, api }) — ignored; tier defaults apply.
    return [...RENT_SMS_DEFAULT_TIERS];
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

async function writeTiers(next: RentSmsTier[]): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify({ tiers: next });
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
  const tiers = await readTiers();
  if (!tiers) {
    return NextResponse.json({ ok: false, error: 'Could not read Rent SMS settings' }, { status: 500 });
  }
  const rate = await readRate();
  return NextResponse.json({
    ok: true,
    rate,
    tiers: tiers.map((t, i) => ({ label: BAND_LABELS[i] ?? `Tier ${i + 1}`, ...t })),
  });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const current = await readTiers();
  if (!current) {
    return NextResponse.json({ ok: false, error: 'Could not read current settings' }, { status: 500 });
  }
  const body = (await req.json().catch(() => ({}))) as { tiers?: unknown };
  const raw = body.tiers;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ ok: false, error: 'Invalid tier table' }, { status: 400 });
  }
  const next: RentSmsTier[] = raw.map((t: unknown, i: number) => {
    const fallback = current[i] ?? RENT_SMS_DEFAULT_TIERS[i] ?? RENT_SMS_DEFAULT_TIERS[0];
    return tierFromRecord((t && typeof t === 'object' ? t : {}) as Record<string, unknown>, fallback);
  });
  const okWrite = await writeTiers(next);
  if (!okWrite) {
    return NextResponse.json({ ok: false, error: 'Could not save settings' }, { status: 500 });
  }
  await audit('rent_sms_tiers_update', { tiers: next, previous: current });
  const rate = await readRate();
  return NextResponse.json({
    ok: true,
    rate,
    tiers: next.map((t, i) => ({ label: BAND_LABELS[i] ?? `Tier ${i + 1}`, ...t })),
  });
}
