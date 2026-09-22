/**
 * Verxor catalog pricing rules (server-side only).
 * Customers and white-label panels never see provider names or raw cost.
 *
 * Provider cost bands (USD) → public tier + server column:
 *   < 0.50           → Economy   · Server 1
 *   0.50 – < 1.00    → Fast      · Server 2
 *   1.00 – < 2.00    → Standard  · Server 1
 *   ≥ 2.00           → Premium   · Server 2
 */

/** Soft ceiling for catalog pulls; premium allows higher routes. */
export const MAX_PROVIDER_COST_USD = 25;

export type ServerLane = 1 | 2;
export type PriceTier = 'economy' | 'fast' | 'standard' | 'premium';

export type BandedOffer = {
  providerCostUsd: number;
  server: ServerLane;
  tier: PriceTier;
  region: 'usa' | 'worldwide';
};

/** Map provider cost → Server 1/2 + public tier. */
export function bandOffer(
  providerCostUsd: number,
  region: 'usa' | 'worldwide',
): BandedOffer | null {
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0) return null;
  if (providerCostUsd > MAX_PROVIDER_COST_USD) return null;

  let tier: PriceTier;
  let server: ServerLane;

  if (providerCostUsd < 0.5) {
    tier = 'economy';
    server = 1;
  } else if (providerCostUsd < 1) {
    tier = 'fast';
    server = 2;
  } else if (providerCostUsd < 2) {
    tier = 'standard';
    server = 1;
  } else {
    tier = 'premium';
    server = 2;
  }

  return { providerCostUsd, server, tier, region };
}

/** Apply Verxor markup to provider cost. */
export function customerPriceUsd(providerCostUsd: number, markupPercent = 35): number {
  const price = providerCostUsd * (1 + markupPercent / 100);
  return Math.round(price * 100) / 100;
}

/**
 * White-label (vernexdigital) S1–S4 slots: S1 = best/expensive.
 * <0.5 → S4, 0.5–0.99 → S3, 1–1.99 → S2, ≥2 → S1
 */
export function wholesaleSlot(providerCostUsd: number): 1 | 2 | 3 | 4 | null {
  if (providerCostUsd > MAX_PROVIDER_COST_USD || providerCostUsd <= 0) return null;
  if (providerCostUsd < 0.5) return 4;
  if (providerCostUsd < 1) return 3;
  if (providerCostUsd < 2) return 2;
  return 1;
}
