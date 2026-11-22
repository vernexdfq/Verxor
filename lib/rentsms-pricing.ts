/**
 * Verxor Rent-for-SMS pricing (Textverified rentals) — Tiered master pricing.
 * Calibrated 2026-11: slightly above Fleexa retail, solid margins.
 *
 * Price = provider USD cost × tier multiplier (per audience) × the live global
 * USD→NGN rate (the same admin daily rate Virtual Number and Email OTP use),
 * then rounded UP to the nearest ₦50.
 *
 * Tier table (calibrated: slightly above Fleexa retail, solid margins):
 *   1. Micro/Short        $1.50–$3.50   panel 1.25 | api 1.40 | retail 1.80
 *   2. Standard single-app $3.51–$6.99  panel 1.12 | api 1.20 | retail 1.38
 *   3. All-Services/mid   $7.00–$15.00  panel 1.10 | api 1.15 | retail 1.25
 *   4. Long multi-month   $15.01–$50.00 panel 1.06 | api 1.10 | retail 1.15
 *   5. Annual             $50.01+       panel 1.03 | api 1.05 | retail 1.10
 * Provider costs below $1.50 bill at Tier 1 (most protective tier).
 *
 * Multipliers are stored in admin_settings key `rent_sms_markups` (JSON) in the
 * shape { tiers: [{ minUsd, maxUsd, panel, api, retail }, …] } and editable in
 * Admin → Pricing → Rent SMS. Legacy flat shape ({ retail, api }) is ignored.
 *
 * USD is never shown to customers; Naira only.
 */

import { resolveFxRateNgn } from './gaming-pricing';

export type RentSmsAudience = 'panel' | 'api' | 'retail';

export type RentSmsTier = {
  minUsd: number;
  maxUsd: number | null; // null = no upper bound (Tier 5)
  multipliers: Record<RentSmsAudience, number>;
};

export const RENT_SMS_DEFAULT_TIERS: RentSmsTier[] = [
  { minUsd: 0, maxUsd: 3.5, multipliers: { panel: 1.25, api: 1.4, retail: 1.8 } },
  { minUsd: 3.51, maxUsd: 6.99, multipliers: { panel: 1.12, api: 1.2, retail: 1.38 } },
  { minUsd: 7.0, maxUsd: 15.0, multipliers: { panel: 1.1, api: 1.15, retail: 1.25 } },
  { minUsd: 15.01, maxUsd: 50.0, multipliers: { panel: 1.06, api: 1.1, retail: 1.15 } },
  { minUsd: 50.01, maxUsd: null, multipliers: { panel: 1.03, api: 1.05, retail: 1.1 } },
];

/** Round UP to the nearest ₦50 (₦2,921 → ₦2,950). ₦0 stays ₦0. */
export function roundUpTo50Ngn(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / 50) * 50;
}

function defaultFallbackTier(): RentSmsTier {
  return RENT_SMS_DEFAULT_TIERS[0];
}

/** The tier that applies to a given provider USD cost. */
export function tierForCost(tiers: RentSmsTier[], costUsd: number): RentSmsTier {
  const list = tiers.length ? tiers : RENT_SMS_DEFAULT_TIERS;
  for (const t of list) {
    if (costUsd >= t.minUsd && (t.maxUsd === null || costUsd <= t.maxUsd)) return t;
  }
  // Below the lowest band (or gaps between edited bands): most protective tier.
  return list[0] ?? defaultFallbackTier();
}

/**
 * Load the editable tier table from admin_settings `rent_sms_markups`.
 * Tolerates the legacy flat { retail, api } shape (falls back to defaults).
 */
export async function resolveRentSmsTiers(): Promise<RentSmsTier[]> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.rent_sms_markups&select=value&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string }>;
        const parsed = rows[0]?.value ? JSON.parse(rows[0].value) : null;
        const rawTiers = parsed?.tiers;
        if (Array.isArray(rawTiers) && rawTiers.length) {
          const num = (v: unknown, d: number) =>
            Number.isFinite(Number(v)) && Number(v) >= 1 ? Number(v) : d;
          const tiers: RentSmsTier[] = rawTiers
            .map((t: unknown) => {
              const r = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
              const min = Number(r.minUsd);
              const max = r.maxUsd === null || r.maxUsd === undefined ? null : Number(r.maxUsd);
              const multi = r.multipliers && typeof r.multipliers === 'object'
                ? (r.multipliers as Record<string, unknown>)
                : r;
              return {
                minUsd: Number.isFinite(min) ? min : 0,
                maxUsd: max !== null && Number.isFinite(max) ? max : null,
                multipliers: {
                  panel: num(multi.panel, defaultFallbackTier().multipliers.panel),
                  api: num(multi.api, defaultFallbackTier().multipliers.api),
                  retail: num(multi.retail, defaultFallbackTier().multipliers.retail),
                },
              } satisfies RentSmsTier;
            })
            .sort((a: RentSmsTier, b: RentSmsTier) => a.minUsd - b.minUsd);
          return tiers;
        }
      }
    } catch {
      /* fall through to defaults */
    }
  }
  return [...RENT_SMS_DEFAULT_TIERS];
}

/**
 * Retail/customer Naira price for a provider USD cost: live tier multiplier ×
 * live rate, rounded UP to the nearest ₦50.
 */
export async function rentSmsRetailNgn(costUsd: number): Promise<number> {
  return rentSmsAudienceNgn(costUsd, 'retail');
}

/** API audience Naira price (Textverified rentals sold via the Verxor API). */
export async function rentSmsApiNgn(costUsd: number): Promise<number> {
  return rentSmsAudienceNgn(costUsd, 'api');
}

/** Child-Panel audience Naira price. */
export async function rentSmsPanelNgn(costUsd: number): Promise<number> {
  return rentSmsAudienceNgn(costUsd, 'panel');
}

export async function rentSmsAudienceNgn(costUsd: number, audience: RentSmsAudience): Promise<number> {
  const [tiers, rate] = await Promise.all([resolveRentSmsTiers(), resolveFxRateNgn()]);
  return rentSmsNgn(tierForCost(tiers, costUsd).multipliers[audience], rate, costUsd);
}

/** Compose from resolved parts. Multiplier × rate × USD, rounded up to ₦50. */
export function rentSmsNgn(multiplier: number, rateNgn: number, costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  return roundUpTo50Ngn(costUsd * multiplier * rateNgn);
}
