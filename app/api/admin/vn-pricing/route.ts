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
  rounding_step_ngn?: number | null;
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
  step: 50,
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
  if (!r) return { rate: DEFAULTS.rate, step: DEFAULTS.step, retail: DEFAULTS.retail, api: DEFAULTS.api, panel: DEFAULTS.panel };
  const num = (v: number | null | undefined, d: number) =>
    Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d;
  return {
    rate: num(r.base_naira_rate, DEFAULTS.rate),
    step: num(r.rounding_step_ngn, DEFAULTS.step),
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
    const res = await fetch(`${base}/rest/v1/pricing_rules?select=*&limit=1`, {
      headers: hdr, cache: 'no-store',
    });
    if (res.ok) {
      const rows = (await res.json()) as PricingRow[];
      if (rows?.[0]) return rows[0];
    }
    // fall back to the legacy table until pricing_rules is created
    const res2 = await fetch(`${base}/rest/v1/vn_pricing_settings?select=*&limit=1`, {
      headers: hdr, cache: 'no-store',
    });
    if (!res2.ok) return null;
    const rows2 = (await res2.json()) as PricingRow[];
    return rows2?.[0] ?? null;
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

  let body: { rate?: number; retail?: Mults; api?: Mults; panel?: Mults; step?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const clean = (m: unknown): Mults | null | undefined => {
    if (m === undefined) return undefined;
    if (!m || typeof m !== 'object') return null;
    const obj = m as Record<string, unknown>;
    const out: Mults = {
      economy: Number(obj.economy),
      standard: Number(obj.standard),
      fast: Number(obj.fast),
      premium: Number(obj.premium),
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
  const step = Number(body.step);
  if (Number.isFinite(step) && Number(body.step) > 0 && (!Number.isInteger(step) || step < 1 || step > 1000)) {
    return NextResponse.json({ ok: false, error: 'Rounding step must be a whole number between 1 and 1000' }, { status: 400 });
  }

  const current = rowToPayload((await readRow()) ?? undefined);
  const next = {
    base_naira_rate: Number.isFinite(rate) && rate > 0 ? rate : current.rate,
    rounding_step_ngn: Number.isInteger(step) && step >= 1 ? step : current.step,
    retail_economy: retail !== undefined ? retail.economy : current.retail.economy,
    retail_standard: retail !== undefined ? retail.standard : current.retail.standard,
    retail_fast: retail !== undefined ? retail.fast : current.retail.fast,
    retail_premium: retail !== undefined ? retail.premium : current.retail.premium,
    api_economy: api !== undefined ? api.economy : current.api.economy,
    api_standard: api !== undefined ? api.standard : current.api.standard,
    api_fast: api !== undefined ? api.fast : current.api.fast,
    api_premium: api !== undefined ? api.premium : current.api.premium,
    panel_economy: panel !== undefined ? panel.economy : current.panel.economy,
    panel_standard: panel !== undefined ? panel.standard : current.panel.standard,
    panel_fast: panel !== undefined ? panel.fast : current.panel.fast,
    panel_premium: panel !== undefined ? panel.premium : current.panel.premium,
    updated_at: new Date().toISOString(),
  };

  let okSave = false;
  {
    const check = await fetch(`${base}/rest/v1/pricing_rules?select=id&limit=1`, {
      headers: hdr, cache: 'no-store',
    });
    if (check.ok) {
      const rows = (await check.json()) as Array<{ id: string | number }>;
      if (rows?.[0]?.id != null) {
        const res = await fetch(`${base}/rest/v1/pricing_rules?id=eq.${encodeURIComponent(String(rows[0].id))}`, {
          method: 'PATCH',
          headers: { ...hdr, Prefer: 'return=minimal' },
          body: JSON.stringify(next),
          cache: 'no-store',
        });
        okSave = res.ok;
      } else {
        const res = await fetch(`${base}/rest/v1/pricing_rules`, {
          method: 'POST',
          headers: { ...hdr, Prefer: 'return=minimal' },
          body: JSON.stringify(next),
          cache: 'no-store',
        });
        okSave = res.ok;
      }
    }
  }
  if (!okSave) {
    return NextResponse.json(
      { ok: false, error: 'Could not save pricing. Run supabase/pricing-rules.sql first.' },
      { status: 500 },
    );
  }

  await audit('vn_pricing_update', { rate: next.base_naira_rate, step: next.rounding_step_ngn, retail, api, panel });

  const row = await readRow();
  return NextResponse.json({ ok: true, ...rowToPayload(row ?? undefined) });
}
