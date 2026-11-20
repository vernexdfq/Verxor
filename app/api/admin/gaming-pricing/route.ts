import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_GAMING_MARKUPS,
  invalidateGamingPricingCache,
  resolveFxRateNgn,
  type GamingMarkupTiers,
} from '@/lib/gaming-pricing';

/**
 * GET  /api/admin/gaming-pricing — { rate, retail, child, api } tier multipliers
 * PUT  /api/admin/gaming-pricing — body { retail?: number[4], child?: number[4], api?: number[4] }
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Multipliers are stored in admin_settings key 'gaming_markups' (JSON).
 * The naira rate is the shared daily rate (admin_settings usd_ngn_rate).
 */
export const dynamic = 'force-dynamic';

type AllMarkups = { retail: GamingMarkupTiers; child: GamingMarkupTiers; api: GamingMarkupTiers };

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

async function readMarkups(): Promise<AllMarkups | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.gaming_markups&select=value&limit=1',
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    const fallback: AllMarkups = { ...DEFAULT_GAMING_MARKUPS };
    if (!rows?.length) return fallback;
    const parsed = rows[0].value ? JSON.parse(rows[0].value) : null;
    const tiers = (v: unknown, d: GamingMarkupTiers): GamingMarkupTiers => {
      if (!Array.isArray(v) || v.length !== 4) return d;
      return v.map((x, i) => {
        const n = Number(x);
        return Number.isFinite(n) && n >= 1 && n <= 20 ? n : d[i];
      }) as GamingMarkupTiers;
    };
    return {
      retail: tiers(parsed?.retail, fallback.retail),
      child: tiers(parsed?.child, fallback.child),
      api: tiers(parsed?.api, fallback.api),
    };
  } catch {
    return null;
  }
}

async function writeMarkups(next: AllMarkups): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify(next);
  const patched = await fetch(base + '/rest/v1/admin_settings?key=eq.gaming_markups', {
    method: 'PATCH',
    headers: hdr,
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  if (patched.ok) return true;
  const inserted = await fetch(base + '/rest/v1/admin_settings', {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'gaming_markups', value }),
    cache: 'no-store',
  });
  return inserted.ok;
}

const bad = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const markups = await readMarkups();
  if (!markups) {
    return NextResponse.json(
      { ok: false, error: 'Could not read gaming pricing settings' },
      { status: 500 },
    );
  }
  const rate = await resolveFxRateNgn();
  return NextResponse.json({ ok: true, rate, ...markups });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const audiences = ['retail', 'child', 'api'] as const;
  if (!audiences.some((a) => body[a] !== undefined)) {
    return bad('Nothing to update — send retail, child and/or api tier arrays');
  }
  const current = await readMarkups();
  if (!current) {
    return NextResponse.json(
      { ok: false, error: 'Could not read current settings' },
      { status: 500 },
    );
  }
  const next: AllMarkups = { ...current };
  for (const a of audiences) {
    const incoming = body[a];
    if (incoming === undefined) continue;
    if (!Array.isArray(incoming) || incoming.length !== 4) {
      return bad(`${a} must be an array of 4 multipliers (tier 1-4)`);
    }
    const tiers = incoming.map((x) => {
      const n = Number(x);
      if (!Number.isFinite(n) || n < 1 || n > 20) return Number.NaN;
      return n;
    }) as number[];
    if (tiers.some((n) => !Number.isFinite(n))) {
      return bad('Multipliers must be between 1.0 and 20');
    }
    next[a] = tiers as GamingMarkupTiers; // eslint-disable-line no-param-reassign
  }
  const saved = await writeMarkups(next);
  if (!saved) {
    return NextResponse.json({ ok: false, error: 'Could not save settings' }, { status: 500 });
  }
  invalidateGamingPricingCache();
  await audit('admin.gaming_pricing.update', { updated: audiences.filter((a) => body[a] !== undefined) });
  return NextResponse.json({ ok: true, rate: await resolveFxRateNgn(), ...next });
}
