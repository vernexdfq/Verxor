/**
 * Buy Logs (AccsZone accounts) wholesale pricing & permissions for child panels / API users.
 *
 * Wholesale tiers (provider cost basis, rate ₦1,380/$):
 *   $0.01–$1.00   → ×1.50  (e.g. $0.40 Facebook → $0.60)
 *   $1.01–$10.00  → ×1.25  (e.g. $2.21 Indeed → $2.76)
 *   $10.01+        → ×1.15  (e.g. $100 Google Ads → $115)
 */

import type { PanelClient } from '@/lib/panel-auth';

/** Buy Logs permission for child panels / API keys. */
export function panelAllowsBuyLogs(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('accounts') ||
    allowed.includes('buy_logs') ||
    allowed.includes('logs')
  );
}

/** Wholesale multiplier by provider cost in USD. */
export function accountsWholesaleMultiplier(providerUsd: number): number {
  const usd = Number(providerUsd);
  if (!Number.isFinite(usd) || usd <= 0) return 1.5;
  if (usd <= 1) return 1.5;
  if (usd <= 10) return 1.25;
  return 1.15;
}

/**
 * Wholesale NGN unit price for a panel/API buyer.
 * retailUnitNgn is the parent's live price (providerUsd × rate), so
 * wholesale = retail × multiplier on the same rate. Rounded to whole naira.
 */
export function accountsWholesaleUnitNgn(retailUnitNgn: number, rate: number): number {
  const retail = Math.round(Number(retailUnitNgn) || 0);
  const safeRate = Number(rate) > 0 ? Number(rate) : 1380;
  if (retail <= 0) return 0;
  const providerUsd = retail / safeRate;
  return Math.max(1, Math.round(retail * accountsWholesaleMultiplier(providerUsd)));
}
