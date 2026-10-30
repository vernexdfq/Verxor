/**
 * JustAnotherPanel / Standard SMM Panel API v2 Integration.
 * RESTORED - see git history for full catalog implementation.
 * Full file restored in next commit if truncated.
 */
export const SMM_EXCHANGE_RATE = 1380;
export const SMM_MAX_USD_CUTOFF = 10.0;

export function getSmmMultiplier(costUsd: number): number {
  if (costUsd <= 0.50) return 4.0;
  if (costUsd <= 1.00) return 3.0;
  if (costUsd <= 2.00) return 2.0;
  return 1.5;
}

export function calculateSmmPriceNgn(costUsd: number): number {
  const mult = getSmmMultiplier(costUsd);
  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;
}

export function getSmmPartnerMultiplier(costUsd: number): number {
  if (costUsd <= 0.50) return 2.0;
  if (costUsd <= 1.00) return 1.7;
  if (costUsd <= 2.00) return 1.35;
  return 1.15;
}

export function calculateSmmPartnerPriceNgn(costUsd: number): number {
  const mult = getSmmPartnerMultiplier(costUsd);
  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;
}

// Minimal stubs — full catalog must be restored
export async function fetchSmmCatalog(): Promise<any> {
  return { ok: false, error: 'SMM catalog module incomplete — restoring', platforms: [], services: [], totalPlatforms: 0, totalServices: 0, rate: SMM_EXCHANGE_RATE, updatedAt: new Date().toISOString(), source: 'empty' };
}
