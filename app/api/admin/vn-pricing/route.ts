import { NextRequest, NextResponse } from 'next/server';

/**
 * GET/PUT /api/admin/vn-pricing — Virtual Number tier multipliers.
 * Price = provider USD cost x base_naira_rate x multiplier(tier, audience).
 * Audiences: retail (website), api (user API keys), panel (child panels + toggled users).
 * Auth: x-admin-password header must match ADMIN_PASSWORD. Every change is audit logged.
 */
export const dynamic = 'force-dynamic';

type Mults = { economy: number; standard: number; fast: number; premium: number };
type PricingRow = {
  id?: string;
  base_naira_rate?: number | null;
  retail_economy?: number | null;
  retail_standard?: number | null;
  retail_fast?: number | null;
  retail_premium?: number | null;
  api_economy?: number | null;
  api_standard?: number | null;
  api_fast?: number | null;
  api_premium?: number | null;
  panel_economy?: number | null;
  panel_standard?: number | null;
  panel_fast?: number | null;
  panel_premium?: number | null;
};

const DEFAULTS = {
  rate: 1380,
  retail: { economy: 5, standard: 4, fast: 3, premium: 2 } as Mults,
  api: { economy: 2, standard: 1.6, fast: 1.4, premium: 1.25 } as Mults,
  panel: { economy: 1.5, standard: 1.3, fast: 1.2, premium: 1.15 } as Mults,
};

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey
    ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    : null;
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

function rowToPayload(r: PricingRow | undefined) {
  if (!r) return { rate: DEFAULTS.rate, retail: DEFAULTS.retail, api: DEFAULTS.api, panel: DEFAULTS.panel };
  const num = (v: number | null | undefined, d: number) =>
    Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d;
  return {
    rate: num(r.base_naira_rate, DEFAULTS.rate),
    retail: {
      economy: num(r.retail_economy, DEFAULTS.retail.economy),
      standard: num(r.retail_standard, DEFAULTS.retail.standard),
      fast: num(r.retail_fast, DEFAULTS.retail.fast),
      premium: num(r.retail_premium, DEFAULTS.retail.premium),
    },
    api: {
      economy: num(r.api_economy, DEFAULTS.api.economy),
      standard: num(r.api_standard, DEFAULTS.api.standard),
      fast: num(r.api_fast, DEFAULTS.api.fast),
      premium: num(r.api_premium, DEFAULTS.api.premium),
    },
    panel: {
      economy: num(r.panel_economy, DEFAULTS.panel.economy),
      standard: num(r.panel_standard, DEFAULTS.panel.standard),
      fast: num(r.panel_fast, DEFAULTS.panel.fast),
      premium: num(r.panel_premium, DEFAULTS.panel.premium),
    },
  };
}

async function readRow(): Promise<PricingRow | null> {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return null;
  try {
    const res = await fetch(`${base}/rest/v1/vn_pricing_settings?select=*&limit=1`, {
      headers: hdr, cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as PricingRow[];
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

async function audit(action: string, meta: Record<string, unknown>) {
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return;
  try {
    await fetch(`${base}/rest/v1/admin_audit_log`, {
      method: 'POST', headers: hdr, cache: 'no-store',
      body: JSON.stringify({ action, meta }),
    });
  } catch { /* best effort */ }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const row = await readRow();
  const payload = rowToPayload(row ?? undefined);
  return NextResponse.json({ ok: true, ...payload });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });

  let body: { rate?: number; retail?: Mults; api?: Mults; panel?: Mults };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const clean = (m: Mults | undefined): Mults | null => {
    if (!m) return null;
    const out: Mults = {
      economy: Number(m.economy),
      standard: Number(m.standard),
      fast: Number(m.fast),
      premium: Number(m.premium),
    };
    for (const v of Object.values(out)) {
      if (!Number.isFinite(v) || v < 1 || v > 50) return null;
    }
    return out;
  };

  const retail = clean(body.retail);
  const api = clean(body.api);
  const panel = clean(body.panel);
  const rate = Number(body.rate);
  if (retail === null || api === null || panel === null) {
    return NextResponse.json({ ok: false, error: 'Multipliers must be numbers between 1 and 50' }, { status: 400 });
  }
  if (Number.isFinite(rate) && (rate < 100 || rate > 10000)) {
    return NextResponse.json({ ok: false, error: 'Rate must be between 100 and 10000' }, { status: 400 });
  }

  const current = rowToPayload((await readRow()) ?? undefined);
  const next = {
    base_naira_rate: Number.isFinite(rate) && rate > 0 ? rate : current.rate,
    retail_economy: retail ? retail.economy : current.retail.economy,
    retail_standard: retail ? retail.standard : current.retail.standard,
    retail_fast: retail ? retail.fast : current.retail.fast,
    retail_premium: retail ? retail.premium : current.retail.premium,
    api_economy: api ? api.economy : current.api.economy,
    api_standard: api ? api.standard : current.api.standard,
    api_fast: api ? api.fast : current.api.fast,
    api_premium: api ? api.premium : current.api.premium,
    panel_economy: panel ? panel.economy : current.panel.economy,
    panel_standard: panel ? panel.standard : current.panel.standard,
    panel_fast: panel ? panel.fast : current.panel.fast,
    panel_premium: panel ? panel.premium : current.panel.premium,
    updated_at: new Date().toISOString(),
  };

  const existing = await readRow();
  let okSave = false;
  if (existing?.id) {
    const res = await fetch(`${base}/rest/v1/vn_pricing_settings?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify(next),
      cache: 'no-store',
    });
    okSave = res.ok;
  } else {
    const res = await fetch(`${base}/rest/v1/vn_pricing_settings`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify(next),
      cache: 'no-store',
    });
    okSave = res.ok;
  }
  if (!okSave) {
    return NextResponse.json(
      { ok: false, error: 'Could not save pricing. Run supabase/vn-pricing-tiers.sql first.' },
      { status: 500 },
    );
  }

  await audit('vn_pricing_update', { rate: next.base_naira_rate, retail, api, panel });

  const row = await readRow();
  return NextResponse.json({ ok: true, ...rowToPayload(row ?? undefined) });
}
