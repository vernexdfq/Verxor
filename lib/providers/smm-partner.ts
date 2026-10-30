import { SMM_EXCHANGE_RATE } from '@/lib/providers/smm';

/** Locked partner mults: 2.0 / 1.7 / 1.35 / 1.15 */
export function getSmmPartnerMultiplier(costUsd: number): number {
  if (costUsd <= 0.5) return 2.0;
  if (costUsd <= 1.0) return 1.7;
  if (costUsd <= 2.0) return 1.35;
  return 1.15;
}

export function calculateSmmPartnerPriceNgn(costUsd: number): number {
  const mult = getSmmPartnerMultiplier(costUsd);
  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;
}
