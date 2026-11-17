import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * VERXOR virtual-number pricing — single source of truth.
 *
 * Price = provider USD cost x base_naira_rate x multiplier(tier, audience)
 *
 * Audiences:
 *  - retail: customers buying on verxor.com (default)
 *  - api:    customers calling our API with a user API key (vx_api_*)
 *  - panel:  child panels (vx_panel_* keys) and users toggled as
 *            Child Panel in the admin panel (child_panels row)
 *
 * Tier comes from the provider cost band, so it can never be picked by the caller.
 * The buy endpoint recomputes the charge server-side; client-sent prices are ignored.
 */

export type VnTier = 'economy' | 'standard' | 'fast' | 'premium';
export type VnAudience = 'retail' | 'api' | 'panel';

export type VnMultiplierSet = Record<VnTier, number>;

export type VnPricing = {
  rate: number;
  retail: VnMultiplierSet;
  api: VnMultiplierSet;
  panel: VnMultiplierSet;
};

export const DEFAULT_VN_PRICING: VnPricing = {
  rate: 1380,
  retail: { economy: 5.0, standard: 4.0, fast: 3.0, premium: 2.0 },
  api: { economy: 2.0, standard: 1.6, fast: 1.4, premium: 1.25 },
  panel: { economy: 1.5, standard: 1.3, fast: 1.2, premium: 1.15 },
};

/** Tier from the provider cost band — never trust a client-supplied tier. */
export function tierFromCost(costUsd: number): VnTier {
  if (costUsd < 0.5) return 'economy';
  if (costUsd <= 1.0) return 'standard';
  if (costUsd <= 2.0) return 'fast';
  return 'premium';
}

/** Tier implied by a pool id like "usa-economy". */
export function tierFromPoolId(poolId: string): VnTier | null {
  const p = String(poolId || '').toLowerCase();
  if (p.includes('economy')) return 'economy';
  if (p.includes('standard')) return 'standard';
  if (p.includes('fast')) return 'fast';
  if (p.includes('premium')) return 'premium';
  return null;
}

/** Sell price in naira, rounded up to the nearest naira. */
export function sellPrice(costUsd: number, tier: VnTier, rate: number, mult: number): number {
  const m = Number.isFinite(mult) && mult > 0 ? mult : DEFAULT_VN_PRICING.retail[tier];
  return Math.ceil(costUsd * rate * m);
}

export function multipliersFor(audience: VnAudience, pricing: VnPricing): VnMultiplierSet {
  if (audience === 'panel') return pricing.panel;
  if (audience === 'api') return pricing.api;
  return pricing.retail;
}

type SettingsRow = {
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

let cache: { at: number; pricing: VnPricing } | null = null;
const CACHE_MS = 15_000;

/** Load rate + multipliers from vn_pricing_settings (15s cache). */
export async function loadVnPricing(): Promise<VnPricing> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.pricing;
  let pricing = DEFAULT_VN_PRICING;
  try {
    if (supabaseConfigured()) {
      const rows = (await sbSelect('vn_pricing_settings', 'select=*&limit=1')) as SettingsRow[];
      const s = rows?.[0];
      if (s) {
        pricing = {
          rate: Number(s.base_naira_rate) || DEFAULT_VN_PRICING.rate,
          retail: {
            economy: Number(s.retail_economy) || DEFAULT_VN_PRICING.retail.economy,
            standard: Number(s.retail_standard) || DEFAULT_VN_PRICING.retail.standard,
            fast: Number(s.retail_fast) || DEFAULT_VN_PRICING.retail.fast,
            premium: Number(s.retail_premium) || DEFAULT_VN_PRICING.retail.premium,
          },
          api: {
            economy: Number(s.api_economy) || DEFAULT_VN_PRICING.api.economy,
            standard: Number(s.api_standard) || DEFAULT_VN_PRICING.api.standard,
            fast: Number(s.api_fast) || DEFAULT_VN_PRICING.api.fast,
            premium: Number(s.api_premium) || DEFAULT_VN_PRICING.api.premium,
          },
          panel: {
            economy: Number(s.panel_economy) || DEFAULT_VN_PRICING.panel.economy,
            standard: Number(s.panel_standard) || DEFAULT_VN_PRICING.panel.standard,
            fast: Number(s.panel_fast) || DEFAULT_VN_PRICING.panel.fast,
            premium: Number(s.panel_premium) || DEFAULT_VN_PRICING.panel.premium,
          },
        };
      }
    }
  } catch {
    pricing = DEFAULT_VN_PRICING;
  }
  cache = { at: Date.now(), pricing };
  return pricing;
}

/** True when the admin has toggled this user as a Child Panel (child_panels row). */
export async function isChildPanelUser(userId: string): Promise<boolean> {
  if (!userId || !supabaseConfigured()) return false;
  try {
    const rows = (await sbSelect(
      'child_panels',
      `user_id=eq.${encodeURIComponent(userId)}&select=id,user_id&limit=1`,
    )) as Array<{ id: string }>;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/** Extract a bearer / X-Api-Key token from a request. */
export function apiKeyFromRequest(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return (req.headers.get('x-api-key') || '').trim();
}

/**
 * Resolve the pricing audience for a request.
 *  - vx_panel_* key -> panel prices
 *  - vx_api_* key    -> api prices (user API keys, issued later)
 *  - x-vx-user header with a child_panels row -> panel prices
 *  - otherwise -> retail prices
 */
export async function resolveVnAudience(req: Request): Promise<VnAudience> {
  const key = apiKeyFromRequest(req);
  if (key.startsWith('vx_panel_')) return 'panel';
  if (key.startsWith('vx_api_')) return 'api';
  const uid = (req.headers.get('x-vx-user') || '').trim();
  if (uid && (await isChildPanelUser(uid))) return 'panel';
  return 'retail';
}

/** Server-side charge for a buy. Falls back to pool tier when no option row is found. */
export async function computeVnCharge(opts: {
  costUsd: number;
  optionId?: string | null;
  poolId?: string | null;
  audience: VnAudience;
}): Promise<{ charge: number; tier: VnTier; costUsd: number }> {
  const pricing = await loadVnPricing();
  let costUsd = opts.costUsd;
  let tier: VnTier = tierFromCost(costUsd);

  if (opts.optionId && supabaseConfigured()) {
    try {
      const rows = (await sbSelect(
        'vn_price_options',
        `id=eq.${encodeURIComponent(opts.optionId)}&select=id,cost_usd,tier,is_available&limit=1`,
      )) as Array<{ cost_usd: number; tier?: string | null; is_available?: boolean }>;
      const row = rows?.[0];
      if (row && row.is_available !== false) {
        const rowCost = Number(row.cost_usd);
        if (Number.isFinite(rowCost) && rowCost > 0) {
          costUsd = rowCost;
          tier = tierFromCost(costUsd);
        }
      }
    } catch {
      /* fall back to supplied cost */
    }
  }
  if (opts.poolId) {
    const poolTier = tierFromPoolId(opts.poolId);
    if (poolTier) tier = poolTier;
  }

  const mult = multipliersFor(opts.audience, pricing)[tier];
  return { charge: sellPrice(costUsd, tier, pricing.rate, mult), tier, costUsd };
}
