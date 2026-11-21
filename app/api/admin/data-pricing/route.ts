import { NextRequest, NextResponse } from 'next/server';
import { DATA_CATALOG } from '@/lib/data-catalog';
import { loadOverrides } from '@/lib/data-overrides';

/**
 * GET/PUT /api/admin/data-pricing — data catalog pricing overrides.
 * Auth: x-admin-password (same console model as the other pricing tabs).
 * Storage: public.data_plan_overrides (service key). Missing override value =
 * keep the catalog default.
 */
export const dynamic = 'force-dynamic';

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

function childPriceOf(cost: number | null, apiPrice: number, retail: number): number {
  const c = Number(cost);
  if (Number.isFinite(c) && c > 0) return Math.ceil(c * 1.005);
  const a = Number(apiPrice);
  if (Number.isFinite(a) && a > 0) return Math.round(a);
  return Math.round(retail);
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
  const ov = await loadOverrides(true);
  const rows = DATA_CATALOG.map((p) => {
    const o = ov.get(p.id);
    const cost = Number(p.cost) || null;
    return {
      planId: p.id,
      network: p.network,
      size: p.size,
      days: p.days,
      tab: p.tab,
      planType: p.planType || null,
      defaultCost: cost,
      defaultRetail: p.retail,
      defaultApiPrice: p.apiPrice,
      childPrice: childPriceOf(cost, p.apiPrice, p.retail),
      overrideCost: null, // not editable
      overrideRetail: o?.retail ?? null,
      overrideApi: o?.apiPrice ?? null,
      hasOverride: Boolean(o),
    };
  });
  return NextResponse.json({ ok: true, rows, total: rows.length });
}

export async function PUT(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });

  let body: {
    planId?: number;
    network?: string;
    cost?: number | null;
    retail?: number | null;
    apiPrice?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const planId = Number(body.planId);
  const plan = DATA_CATALOG.find((p) => p.id === planId);
  if (!plan) return NextResponse.json({ ok: false, error: 'Unknown planId' }, { status: 400 });

  const clean = (v: number | null | undefined): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  };
  const value = {
    plan_id: planId,
    network: plan.network,
    override_cost: null, // provider cost is live-synced, never overridden
    override_retail: clean(body.retail),
    override_api_price: clean(body.apiPrice),
    active: true,
    updated_at: new Date().toISOString(),
  };
  if (value.override_retail === null && value.override_api_price === null) {
    const del = await fetch(`${base}/rest/v1/data_plan_overrides?plan_id=eq.${planId}`, {
      method: 'DELETE', headers: hdr, cache: 'no-store',
    });
    if (!del.ok && del.status !== 404 && del.status !== 204) {
      return NextResponse.json({ ok: false, error: 'Could not clear override' }, { status: 500 });
    }
    await audit('data_pricing_clear', { planId });
    await loadOverrides(true);
    return NextResponse.json({ ok: true, cleared: true });
  }

  const res = await fetch(`${base}/rest/v1/data_plan_overrides?on_conflict=plan_id`, {
    method: 'POST',
    headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(value),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    return NextResponse.json({ ok: false, error: `Save failed: ${t.slice(0, 160)}` }, { status: 500 });
  }
  await audit('data_pricing_update', { planId, network: plan.network, cost: value.override_cost, retail: value.override_retail, api: value.override_api_price });
  await loadOverrides(true);
  return NextResponse.json({ ok: true });
}
