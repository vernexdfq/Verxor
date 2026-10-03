/**
 * Verxor catalog pricing (server-side only).
 * Customers and child panels never see provider names or raw cost.
 *
 * Provider cost (USD) → public tier + server column:
 *   < 0.50           → Economy   · Server 1
 *   0.50 – < 1.00    → Standard  · Server 1
 *   1.00 – < 2.00    → Fast      · Server 2
 *   ≥ 2.00           → Premium   · Server 2
 */

export const MAX_PROVIDER_COST_USD = 25;

export type ServerLane = 1 | 2;
export type PriceTier = 'economy' | 'standard' | 'fast' | 'premium';
export type Region = 'usa' | 'worldwide';

export type BandedOffer = {
  providerCostUsd: number;
  server: ServerLane;
  tier: PriceTier;
  region: Region;
  poolId: string;
};

/** Map provider cost → Server 1/2 + public tier (locked product rule). */
export function bandOffer(
  providerCostUsd: number,
  region: Region,
): BandedOffer | null {
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0) return null;
  if (providerCostUsd > MAX_PROVIDER_COST_USD) return null;

  let tier: PriceTier;
  let server: ServerLane;

  if (providerCostUsd < 0.5) {
    tier = 'economy';
    server = 1;
  } else if (providerCostUsd < 1) {
    tier = 'standard';
    server = 1;
  } else if (providerCostUsd < 2) {
    tier = 'fast';
    server = 2;
  } else {
    tier = 'premium';
    server = 2;
  }

  const poolId = `${region}-${tier}`;
  return { providerCostUsd, server, tier, region, poolId };
}

/** Cost ceiling when buying into a specific public pool. */
export function maxCostForTier(tier: PriceTier): number {
  switch (tier) {
    case 'economy':
      return 0.499999;
    case 'standard':
      return 0.999999;
    case 'fast':
      return 1.999999;
    case 'premium':
      return MAX_PROVIDER_COST_USD;
    default:
      return MAX_PROVIDER_COST_USD;
  }
}

export function minCostForTier(tier: PriceTier): number {
  switch (tier) {
    case 'economy':
      return 0.01;
    case 'standard':
      return 0.5;
    case 'fast':
      return 1;
    case 'premium':
      return 2;
    default:
      return 0.01;
  }
}

/** Apply Verxor markup to provider cost (USD). */
export function customerPriceUsd(providerCostUsd: number, markupPercent = 35): number {
  const price = providerCostUsd * (1 + markupPercent / 100);
  return Math.round(price * 100) / 100;
}

/** Display NGN from USD sell price. */
export function customerPriceNgn(providerCostUsd: number, markupPercent = 35): number {
  const usd = customerPriceUsd(providerCostUsd, markupPercent);
  const rate = Number(process.env.USD_NGN_RATE || 1600);
  return Math.round(usd * rate);
}

/** Normalize region from country string / ISO. */
export function resolveRegion(country: string): Region {
  const c = (country || '').toLowerCase().trim();
  if (
    c === 'usa' ||
    c === 'us' ||
    c === 'united states' ||
    c === 'united-states' ||
    c === 'america'
  ) {
    return 'usa';
  }
  return 'worldwide';
}

/**
 * White-label S1–S4 slots (Vernex): S1 = best/expensive.
 * <0.5 → S4, 0.5–0.99 → S3, 1–1.99 → S2, ≥2 → S1
 */
export function wholesaleSlot(providerCostUsd: number): 1 | 2 | 3 | 4 | null {
  if (providerCostUsd > MAX_PROVIDER_COST_USD || providerCostUsd <= 0) return null;
  if (providerCostUsd < 0.5) return 4;
  if (providerCostUsd < 1) return 3;
  if (providerCostUsd < 2) return 2;
  return 1;
}
