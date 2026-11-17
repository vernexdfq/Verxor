import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * VERXOR Boost (SMM) pricing — single source of truth.
 *
 * Price = wholesale USD/1k cost × audience multiplier × USD→NGN rate.
 *
 * Wholesale tiers (per 1,000, USD):
 *   tier 1: ≤ $0.50
 *   tier 2: $0.51 – $1.00
 *   tier 3: $1.01 – $2.00
 *   tier 4: > $2.00
 *
 * Audiences:
 *   retail: customers buying on verxor.com (default)
 *   api:    API users (vx_api_* keys / users toggled as API user)
 *   child:  child panels (vx_panel_* keys)
 *
 * Locked default multipliers (owner decision, Sep 2026):
 *   retail 4.0 / 3.0 / 2.0 / 1.5
 *   api    2.2 / 1.8 / 1.5 / 1.25
 *   child  1.6 / 1.4 / 1.25 / 1.15
 *
 * Admin can edit any of the 12 multipliers in admin_settings key
 * 'boost_markups' (JSON). 15s cache. The naira rate is the shared daily
 * rate in admin_settings 'usd_ngn_rate' (fallback 1380).
 */

export type BoostAudience = 'retail' | 'api' | 'child';
export type BoostMarkupTiers = [number, number, number, number];
export type BoostMarkups = Record<BoostAudience, BoostMarkupTiers>;

export const BOOST_TIERS: { id: 1 | 2 | 3 | 4; label: string; max: number }[] = [
  { id: 1, label: '≤ $0.50', max: 0.5 },
  { id: 2, label: '$0.51 – $1.00', max: 1.0 },
  { id: 3, label: '$1.01 – $2.00', max: 2.0 },
  { id: 4, label: '> $2.00', max: Number.POSITIVE_INFINITY },
];

export const DEFAULT_BOOST_MARKUPS: BoostMarkups = {
  retail: [4.0, 3.0, 2.0, 1.5],
  api: [2.2, 1.8, 1.5, 1.25],
  child: [1.6, 1.4, 1.25, 1.15],
};

export const BOOST_FALLBACK_RATE_NGN = 1380;

let markupsCache: { at: number; markups: BoostMarkups } | null = null;
let rateCache: { at: number; rate: number } | null = null;

/** Tier index (0-3) for a wholesale USD/1k cost. */
export function boostTierIndex(costUsd: number): number {
  const c = Number(costUsd);
  if (!Number.isFinite(c) || c <= 0) return 0;
  if (c <= 0.5) return 0;
  if (c <= 1.0) return 1;
  if (c <= 2.0) return 2;
  return 3;
}

/** Markups live in admin_settings key 'boost_markups' (JSON). 15s cache. */
export async function loadBoostMarkups(): Promise<BoostMarkups> {
  if (!supabaseConfigured()) return DEFAULT_BOOST_MARKUPS;
  if (markupsCache && Date.now() - markupsCache.at < 15000) return markupsCache.markups;
  try {
    const rows = (await sbSelect(
      'admin_settings',
      'key=eq.boost_markups&select=value&limit=1',
    )) as Array<{ value?: string }>;
    const parsed = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
    const tiers = (v: unknown, d: BoostMarkupTiers): BoostMarkupTiers => {
      if (!Array.isArray(v) || v.length !== 4) return d;
      const out = v.map((x, i) => {
        const n = Number(x);
        return Number.isFinite(n) && n >= 1 && n <= 20 ? n : d[i];
      }) as BoostMarkupTiers;
      return out;
    };
    const markups: BoostMarkups = {
      retail: tiers(parsed?.retail, DEFAULT_BOOST_MARKUPS.retail),
      api: tiers(parsed?.api, DEFAULT_BOOST_MARKUPS.api),
      child: tiers(parsed?.child, DEFAULT_BOOST_MARKUPS.child),
    };
    markupsCache = { at: Date.now(), markups };
    return markups;
  } catch {
    return DEFAULT_BOOST_MARKUPS;
  }
}

/** Shared daily USD→NGN rate (admin_settings 'usd_ngn_rate'). 15s cache. */
export async function loadBoostUsdRate(): Promise<number> {
  if (!supabaseConfigured()) return BOOST_FALLBACK_RATE_NGN;
  if (rateCache && Date.now() - rateCache.at < 15000) return rateCache.rate;
  try {
    const rows = (await sbSelect(
      'admin_settings',
      'key=eq.usd_ngn_rate&select=value&limit=1',
    )) as Array<{ value?: string }>;
    const n = Number(rows?.[0]?.value);
    const rate = Number.isFinite(n) && n > 0 ? n : BOOST_FALLBACK_RATE_NGN;
    rateCache = { at: Date.now(), rate };
    return rate;
  } catch {
    return BOOST_FALLBACK_RATE_NGN;
  }
}

/** Multiplier for a wholesale cost and audience. */
export function boostMultiplier(costUsd: number, audience: BoostAudience, markups: BoostMarkups): number {
  return markups[audience][boostTierIndex(costUsd)];
}

/** Retail price per 1,000 in NGN: cost × multiplier × rate (2dp). */
export function calculateBoostPriceNgn(
  costUsd: number,
  audience: BoostAudience,
  markups: BoostMarkups,
  rate: number,
): number {
  const mult = boostMultiplier(costUsd, audience, markups);
  const r = Number.isFinite(rate) && rate > 0 ? rate : BOOST_FALLBACK_RATE_NGN;
  return Math.round(costUsd * mult * r * 100) / 100;
}

/** Invalidate the 15s caches (used by the admin pricing API after a save). */
export function invalidateBoostPricingCache(): void {
  markupsCache = null;
  rateCache = null;
}
