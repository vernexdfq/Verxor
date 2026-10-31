/**
 * RESTORED - see next commit for full content
 * Temporary minimal stub to unblock build - will be replaced immediately
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
  return Math.round(costUsd * getSmmMultiplier(costUsd) * SMM_EXCHANGE_RATE * 100) / 100;
}
export function getSmmPartnerMultiplier(costUsd: number): number {
  if (costUsd <= 0.50) return 2.0;
  if (costUsd <= 1.00) return 1.7;
  if (costUsd <= 2.00) return 1.35;
  return 1.15;
}
export function calculateSmmPartnerPriceNgn(costUsd: number): number {
  return Math.round(costUsd * getSmmPartnerMultiplier(costUsd) * SMM_EXCHANGE_RATE * 100) / 100;
}
export type BoostService = {
  id: string;
  providerId: number;
  platform: string;
  platformName: string;
  category: string;
  categoryName: string;
  title: string;
  ratePer1000: number;
  wholesaleUsd: number;
  min: number;
  max: number;
  speed: string;
  refill?: string;
  quality?: string;
  instant?: boolean;
  desc?: string;
};
export type BoostCatalog = {
  ok: boolean;
  source: 'live' | 'cached' | 'fallback' | 'empty';
  rate: number;
  updatedAt: string;
  totalPlatforms: number;
  totalServices: number;
  platforms: any[];
  services: BoostService[];
  error?: string;
  warning?: string;
};
export async function fetchSmmCatalog(): Promise<BoostCatalog> {
  return {
    ok: false,
    source: 'empty',
    rate: SMM_EXCHANGE_RATE,
    updatedAt: new Date().toISOString(),
    totalPlatforms: 0,
    totalServices: 0,
    platforms: [],
    services: [],
    error: 'Catalog module restoring — redeploy pending',
  };
}
export function resolvePlatform() {
  return { id: 'other', name: 'Other', shortName: 'Other', brandColor: '#475569', placeholder: 'https://...', linkHint: 'Paste link', urlPatternStr: 'https?:\\/\\/' };
}
