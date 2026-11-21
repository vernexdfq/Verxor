/**
 * Live sync for curated data catalog vs 247API.
 *
 * Rules:
 *  1. Plan missing from 247 live list → hide (never sell a dead plan).
 *     Exception: 9mobile + ckCode never uses 247 for list/price — catalog
 *     cost is ClubKonnect net; buy path uses CK first, 247 as fallback only.
 *  2. 247 cost changes → adjust retail by the same ₦ delta so margin stays fixed:
 *       retail = round(liveCost + (catalog.retail - catalog.cost))
 *  3. Child / API wholesale ≈ liveCost + 0.5% / +1% (ceil).
 *  4. If 247 is down → fall back to static catalog (do not blank the shop).
 */

import {
  type CatalogPlan,
  catalogForNetwork,
  findCatalogPlan,
  toLivePlan,
} from '@/lib/data-catalog';
import { fetchLiveDataPlans247, isApi247Configured } from '@/lib/providers/api247';
import { loadOverrides } from '@/lib/data-overrides';

export type LivePlanRow = {
  plan_id: number;
  price: number;
  network?: string;
  datasize?: string;
  day?: string;
  type?: string;
};

export type SyncedPlan = CatalogPlan & {
  /** True when price was adjusted from live 247 cost */
  priceAdjusted?: boolean;
  /** Live 247 cost used for this response */
  liveCost?: number;
  /** Optional admin override for the child-panel (wholesale) price */
  childPriceOverride?: number;
};

let cache: { at: number; byId: Map<number, LivePlanRow> } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

function ceilNaira(n: number): number {
  return Math.ceil(Number(n) || 0);
}

/** Fixed ₦ margin from catalog baseline. */
export function marginNaira(plan: CatalogPlan): number {
  const cost = Number(plan.cost);
  const retail = Number(plan.retail);
  if (!Number.isFinite(retail)) return 0;
  if (!Number.isFinite(cost) || cost <= 0) return Math.max(0, retail);
  return retail - cost;
}

/** Apply live cost while keeping the same ₦ margin as the locked catalog. */
export function retailWithFixedMargin(plan: CatalogPlan, liveCost: number): number {
  const live = Number(liveCost);
  if (!Number.isFinite(live) || live <= 0) {
    return Math.round(plan.retail);
  }
  const m = marginNaira(plan);
  return Math.max(50, Math.round(live + m));
}

export function childPriceFromCost(liveCost: number): number {
  return ceilNaira(liveCost * 1.005);
}

export function apiPriceFromCost(liveCost: number): number {
  return ceilNaira(liveCost * 1.01);
}

async function loadLiveById(force = false): Promise<Map<number, LivePlanRow> | null> {
  if (!isApi247Configured()) return null;
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) {
    return cache.byId;
  }
  try {
    const rows = await fetchLiveDataPlans247();
    const byId = new Map<number, LivePlanRow>();
    for (const r of rows) {
      const id = Number(r.plan_id);
      const price = Number(r.price);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (!Number.isFinite(price) || price <= 0) continue;
      byId.set(id, {
        plan_id: id,
        price,
        network: r.network,
        datasize: r.datasize,
        day: r.day,
        type: r.type,
      });
    }
    if (byId.size === 0) return cache?.byId ?? null;
    cache = { at: now, byId };
    return byId;
  } catch (e) {
    console.warn('[data-plan-sync] live fetch failed:', e instanceof Error ? e.message : e);
    return cache?.byId ?? null;
  }
}

/** Sync one catalog plan against live map. Returns null if plan is dead on 247. */
export function applyLiveToPlan(
  plan: CatalogPlan,
  liveById: Map<number, LivePlanRow> | null,
): SyncedPlan | null {
  // 9mobile primary is ClubKonnect (ckCode). Never reprice from 247 live list —
  // catalog cost is the CK net baseline and retail margin is locked against it.
  const ckCode = Number((plan as { ckCode?: number | string }).ckCode);
  if (plan.network === '9mobile' && Number.isFinite(ckCode) && ckCode > 0) {
    return { ...plan };
  }

  if (!liveById) {
    // Provider unreachable — keep catalog so shop still works
    return { ...plan };
  }
  const live = liveById.get(plan.id);
  if (!live) {
    // Dead / removed on 247 — hide
    return null;
  }
  const liveCost = live.price;
  const retail = retailWithFixedMargin(plan, liveCost);
  const apiPrice = apiPriceFromCost(liveCost);
  const priceAdjusted =
    Math.round(retail) !== Math.round(plan.retail) ||
    Math.round(liveCost) !== Math.round(Number(plan.cost) || 0);

  return {
    ...plan,
    cost: liveCost,
    retail,
    apiPrice,
    priceAdjusted,
    liveCost,
  };
}

/** Active plans for a network, filtered + margin-safe priced. */
export async function getSyncedPlansForNetwork(network: string): Promise<{
  plans: SyncedPlan[];
  source: 'live' | 'catalog-fallback';
  hidden: number;
}> {
  const base = catalogForNetwork(network);
  const liveById = await loadLiveById();
  if (!liveById) {
    return { plans: base.map((p) => ({ ...p })), source: 'catalog-fallback', hidden: 0 };
  }
  const plans: SyncedPlan[] = [];
  let hidden = 0;
  for (const p of base) {
    const s = applyLiveToPlan(p, liveById);
    if (!s) {
      hidden += 1;
      continue;
    }
    plans.push(s);
  }
  const ov = await loadOverrides();
  for (const p of plans) {
    const o = ov.get(p.id);
    if (!o) continue;
    if (o.cost) p.cost = o.cost;
    if (o.retail) p.retail = o.retail;
    if (o.apiPrice) p.apiPrice = o.apiPrice;
    if (o.childPrice) p.childPriceOverride = o.childPrice;
  }
  return { plans, source: 'live', hidden };
}

/** UI list for data page */
export async function getSyncedLivePlansForNetwork(network: string) {
  const { plans, source, hidden } = await getSyncedPlansForNetwork(network);
  return {
    plans: plans.map(toLivePlan),
    source,
    hidden,
  };
}

/**
 * Resolve sell price for purchase debit.
 * Rejects if plan is known-dead on 247 (when live list is available).
 */
export async function resolvePurchasePlan(planId: number): Promise<{
  ok: true;
  plan: SyncedPlan;
  amount: number;
  source: 'live' | 'catalog-fallback';
} | {
  ok: false;
  error: string;
  status: number;
}> {
  const catalog = findCatalogPlan(planId);
  if (!catalog) {
    return {
      ok: false,
      error: 'This plan is not available yet. Try another bundle.',
      status: 400,
    };
  }
  const liveById = await loadLiveById();
  const synced = applyLiveToPlan(catalog, liveById);
  if (!synced) {
    return {
      ok: false,
      error: 'This plan is temporarily unavailable. Please choose another bundle.',
      status: 410,
    };
  }
  const o = (await loadOverrides()).get(catalog.id);
  if (o) {
    if (o.cost) synced.cost = o.cost;
    if (o.retail) synced.retail = o.retail;
    if (o.apiPrice) synced.apiPrice = o.apiPrice;
    if (o.childPrice) synced.childPriceOverride = o.childPrice;
  }
  const amount = Math.round(synced.retail);
  if (amount < 50) {
    return { ok: false, error: 'Invalid plan price', status: 400 };
  }
  return {
    ok: true,
    plan: synced,
    amount,
    source: liveById ? 'live' : 'catalog-fallback',
  };
}
