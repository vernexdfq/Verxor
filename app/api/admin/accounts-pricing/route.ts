import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_ACCOUNTS_MARKUPS,
  loadAccountsUsdRate,
  invalidateAccountsPricingCache,
} from '@/lib/accounts-pricing';

/**
 * GET  /api/admin/accounts-pricing — Buy Logs tier multipliers + round-up rule
 * PUT  /api/admin/accounts-pricing — body { retail?: number[3], wholesale?: number[3], roundUpNgn?: number }
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Stored in admin_settings key 'accounts_markups' (JSON). The naira rate is
 * the shared daily rate (admin_settings usd_ngn_rate).
 *
 * Tiers (provider cost in USD):
 *   retail:    <=$1 ×3.0 · <=$10 ×2.0 · >$10 ×1.4  (naira rounded up to roundUpNgn)
 *   wholesale: <=$1 ×1.5 · <=$10 ×1.25 · >$10 ×1.15 (API / child panel, whole naira)
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

type AccountsMarkupsValue = {
  retail: number[];
  wholesale: number[];
  roundUpNgn: number;
};

async function readMarkups(): Promise<AccountsMarkupsValue | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(
      base + '/rest/v1/admin_settings?key=eq.accounts_markups&select=value&limit=1',
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    if (!rows?.length || !rows[0].value) return { ...DEFAULT_ACCOUNTS_MARKUPS };
    const parsed = JSON.parse(rows[0].value) as Partial<AccountsMarkupsValue>;
    const tiers = (v: unknown, d: number[]): number[] => {
      if (!Array.isArray(v) || v.length !== 3) return d;
      return v.map((x, i) => {
        const n = Number(x);
        return Number.isFinite(n) && n >= 1 && n <= 20 ? n : d[i];
      });
    };
    const roundUp = Number(parsed.roundUpNgn);
    return {
      retail: tiers(parsed.retail, DEFAULT_ACCOUNTS_MARKUPS.retail),
      wholesale: tiers(parsed.wholesale, DEFAULT_ACCOUNTS_MARKUPS.wholesale),
      roundUpNgn:
        Number.isFinite(roundUp) && roundUp >= 1 && roundUp <= 1000
          ? Math.round(roundUp)
          : DEFAULT_ACCOUNTS_MARKUPS.roundUpNgn,
    };
  } catch {
    return null;
  }
}

async function writeMarkups(next: AccountsMarkupsValue): Promise<boolean> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return false;
  const value = JSON.stringify(next);
  // Upsert (PATCH alone is a silent no-op when the row does not exist yet).
  const inserted = await fetch(base + '/rest/v1/admin_settings', {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ key: 'accounts_markups', value }),
    cache: 'no-store',
  });
  if (inserted.ok) return true;
  const patched = await fetch(base + '/rest/v1/admin_settings?key=eq.accounts_markups', {
    method: 'PATCH',
    headers: hdr,
    body: JSON.stringify({ value }),
    cache: 'no-store',
  });
  return patched.ok;
}

const bad = (msg: string) => NextResponse.json({ ok: false, error: msg }, { status: 400 });

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const markups = await readMarkups();
  if (!markups) {
    return NextResponse.json(
      { ok: false, error: 'Could not read Buy Logs pricing settings' },
      { status: 500 },
    );
  }
  const rate = await loadAccountsUsdRate();
  return NextResponse.json({ ok: true, rate, ...markups });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.retail === undefined && body.wholesale === undefined && body.roundUpNgn === undefined) {
    return bad('Nothing to update — send retail, wholesale and/or roundUpNgn');
  }
  const current = await readMarkups();
  if (!current) {
    return NextResponse.json({ ok: false, error: 'Could not read current settings' }, { status: 500 });
  }
  const next: AccountsMarkupsValue = { ...current };
  for (const group of ['retail', 'wholesale'] as const) {
    const incoming = body[group];
    if (incoming === undefined) continue;
    if (!Array.isArray(incoming) || incoming.length !== 3) {
      return bad(`${group} must be an array of 3 multipliers (<=$1, <=$10, >$10)`);
    }
    const tiers = incoming.map((x) => Number(x));
    if (tiers.some((n) => !Number.isFinite(n) || n < 1 || n > 20)) {
      return bad('Multipliers must be between 1.0 and 20');
    }
    next[group] = tiers;
  }
  if (body.roundUpNgn !== undefined) {
    const n = Number(body.roundUpNgn);
    if (!Number.isFinite(n) || n < 1 || n > 1000 || !Number.isInteger(n)) {
      return bad('roundUpNgn must be a whole number between 1 and 1000 (e.g. 50)');
    }
    next.roundUpNgn = n;
  }

  const ok = await writeMarkups(next);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
  invalidateAccountsPricingCache();
  await audit('accounts_pricing_update', { markups: next });
  const rate = await loadAccountsUsdRate();
  return NextResponse.json({ ok: true, rate, ...next });
}
