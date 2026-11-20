/**
 * Verxor gaming/gift-card pricing rules (Denny's master pricing).
 *
 * Base FX rate: the live admin rate stored in admin_settings (`usd_ngn_rate`,
 * ₦1,380 by default), NOT the static env rate — the same "one daily rate"
 * principle the admin Overview controls.
 *
 * Gaming top-ups: percentage multipliers on the MooGold USD cost by tier.
 * Gift cards: standalone FX rates, decoupled from the global rate (later).
 */

export const GAMING_DEFAULT_FX = 1380;

type Tier = { maxUsd: number; retail: number; api: number; label: string };

/** Tier multipliers — retail and API/Child-Panel profit per base-USD band. */
export const GAMING_TIERS: Tier[] = [
  { maxUsd: 1.0, retail: 1.25, api: 1.12, label: 'Micro Packs' },
  { maxUsd: 4.99, retail: 1.15, api: 1.07, label: 'Small Packs' },
  { maxUsd: 24.99, retail: 1.1, api: 1.05, label: 'Standard Packs' },
  { maxUsd: Number.POSITIVE_INFINITY, retail: 1.07, api: 1.03, label: 'High-Value Packs' },
];

function tierFor(baseUsd: number): Tier {
  return GAMING_TIERS.find((t) => baseUsd <= t.maxUsd) ?? GAMING_TIERS[GAMING_TIERS.length - 1];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Retail customer USD price for a MooGold base cost. */
export function gamingRetailUsd(baseUsd: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return round2(baseUsd * tierFor(baseUsd).retail);
}

/** API / Child-Panel USD price for a MooGold base cost. */
export function gamingApiUsd(baseUsd: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return round2(baseUsd * tierFor(baseUsd).api);
}

/**
 * Current live USD→NGN rate: admin_settings `usd_ngn_rate`, falling back to
 * the env rate and then to the ₦1,380 base rule.
 */
export async function resolveFxRateNgn(): Promise<number> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string | number }>;
        const rate = Number(rows[0]?.value);
        if (Number.isFinite(rate) && rate > 0) return rate;
      }
    } catch {
      /* fall through to env */
    }
  }
  const envRate = Number(process.env.USD_NGN_RATE);
  return Number.isFinite(envRate) && envRate > 0 ? envRate : GAMING_DEFAULT_FX;
}

/** Retail Naira price for a MooGold base USD cost at the given/live rate. */
export function gamingRetailNgn(baseUsd: number, rateNgn: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0 || !Number.isFinite(rateNgn) || rateNgn <= 0) return 0;
  return Math.round(baseUsd * tierFor(baseUsd).retail * rateNgn);
}

/** API/Child-Panel Naira price (used for panel pricing later). */
export function gamingApiNgn(baseUsd: number, rateNgn: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0 || !Number.isFinite(rateNgn) || rateNgn <= 0) return 0;
  return Math.round(baseUsd * tierFor(baseUsd).api * rateNgn);
}

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

/* ---------- admin-editable tier markups (owner request, Nov 2026) ----------
 * Same pattern as boost_markups: 4 base-USD bands × 3 audiences
 * (retail / child panel / API), stored in admin_settings key
 * 'gaming_markups' (JSON), 15s server cache.
 */

import { apiKeyFromRequest, isApiUser, isChildPanelUser } from '@/lib/vn-pricing';

export type GamingAudience = 'retail' | 'child' | 'api';
export type GamingMarkupTiers = [number, number, number, number];
export type GamingMarkups = Record<GamingAudience, GamingMarkupTiers>;

/** Defaults = Denny's locked tiers; child/api start equal (current behaviour). */
export const DEFAULT_GAMING_MARKUPS: GamingMarkups = {
  retail: [1.25, 1.15, 1.1, 1.07],
  child: [1.12, 1.07, 1.05, 1.03],
  api: [1.12, 1.07, 1.05, 1.03],
};

/** Band labels for the admin UI (index-aligned with the multipliers). */
export const GAMING_TIER_BANDS = [
  { label: '≤ $1.00', hint: 'Micro Packs' },
  { label: '$1.01 – $4.99', hint: 'Small Packs' },
  { label: '$5.00 – $24.99', hint: 'Standard Packs' },
  { label: '≥ $25.00', hint: 'High-Value Packs' },
];

let markupsCache: { at: number; markups: GamingMarkups } | null = null;

/** Tier index (0-3) for a provider base USD cost. */
export function gamingTierIndex(baseUsd: number): number {
  const c = Number(baseUsd);
  if (!Number.isFinite(c) || c <= 0) return 0;
  if (c <= 1) return 0;
  if (c <= 4.99) return 1;
  if (c <= 24.99) return 2;
  return 3;
}

/** Markups live in admin_settings key 'gaming_markups' (JSON). 15s cache. */
export async function loadGamingMarkups(): Promise<GamingMarkups> {
  if (markupsCache && Date.now() - markupsCache.at < 15000) return markupsCache.markups;
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return DEFAULT_GAMING_MARKUPS;
  try {
    const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.gaming_markups&select=value&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return DEFAULT_GAMING_MARKUPS;
    const rows = (await res.json()) as Array<{ value?: string }>;
    const parsed = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
    const tiers = (v: unknown, d: GamingMarkupTiers): GamingMarkupTiers => {
      if (!Array.isArray(v) || v.length !== 4) return d;
      return v.map((x, i) => {
        const n = Number(x);
        return Number.isFinite(n) && n >= 1 && n <= 20 ? n : d[i];
      }) as GamingMarkupTiers;
    };
    const markups: GamingMarkups = {
      retail: tiers(parsed?.retail, DEFAULT_GAMING_MARKUPS.retail),
      child: tiers(parsed?.child, DEFAULT_GAMING_MARKUPS.child),
      api: tiers(parsed?.api, DEFAULT_GAMING_MARKUPS.api),
    };
    markupsCache = { at: Date.now(), markups };
    return markups;
  } catch {
    return DEFAULT_GAMING_MARKUPS;
  }
}

/** Invalidate the 15s cache (admin pricing API after a save). */
export function invalidateGamingPricingCache(): void {
  markupsCache = null;
}

/** Audience-aware Naira price: base USD × tier multiplier × rate, rounded. */
export function gamingAudienceNgn(
  baseUsd: number,
  audience: GamingAudience,
  markups: GamingMarkups,
  rateNgn: number,
): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0 || !Number.isFinite(rateNgn) || rateNgn <= 0) return 0;
  return Math.round(baseUsd * markups[audience][gamingTierIndex(baseUsd)] * rateNgn);
}

/**
 * Resolve the pricing audience for a gaming request.
 *   vx_panel_* key, or x-vx-user with a child_panels row -> child
 *   vx_api_* key, or x-vx-user toggled as API user          -> api
 *   otherwise -> retail
 */
export async function resolveGamingAudience(req: Request): Promise<GamingAudience> {
  const key = apiKeyFromRequest(req);
  if (key.startsWith('vx_panel_')) return 'child';
  if (key.startsWith('vx_api_')) return 'api';
  const uid = (req.headers.get('x-vx-user') || '').trim();
  if (uid && (await isChildPanelUser(uid))) return 'child';
  if (uid && (await isApiUser(uid))) return 'api';
  return 'retail';
}
