/**
 * Curated data catalog — plan_id matches 247API.
 * Retail = customer price on Verxor.
 * apiPrice = child panel / API user price (reference only here).
 *
 * UI rules:
 *  - No SME / Gifting / AWOOF labels
 *  - Tabs by validity: daily / weekly / monthly / yearly
 *  - Hot deals chosen later after full catalog
 */

export type DataNetwork = 'mtn' | 'glo' | 'airtel' | '9mobile';
export type DataTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CatalogPlan {
  /** 247API plan_id — used for purchase */
  id: number;
  network: DataNetwork;
  /** Clean volume label e.g. "1GB", "75MB" */
  size: string;
  /** Validity in days (string for UI helpers) */
  days: string;
  tab: DataTab;
  /** Customer retail price (₦) */
  retail: number;
  /** Child panel / API user price (₦) */
  apiPrice: number;
  /** Provider cost snapshot (optional, for admin) */
  cost?: number;
}

/** MTN Daily — confirmed with user */
export const MTN_DAILY: CatalogPlan[] = [
  { id: 250, network: 'mtn', size: '75MB', days: '1', tab: 'daily', retail: 80, apiPrice: 74, cost: 72.3 },
  { id: 251, network: 'mtn', size: '110MB', days: '1', tab: 'daily', retail: 100, apiPrice: 98, cost: 96.3 },
  { id: 252, network: 'mtn', size: '230MB', days: '1', tab: 'daily', retail: 200, apiPrice: 195, cost: 192.6 },
  { id: 247, network: 'mtn', size: '500MB', days: '1', tab: 'daily', retail: 350, apiPrice: 340, cost: 338 },
  { id: 248, network: 'mtn', size: '750MB', days: '3', tab: 'daily', retail: 500, apiPrice: 450, cost: 435 },
  { id: 253, network: 'mtn', size: '1GB', days: '1', tab: 'daily', retail: 500, apiPrice: 490, cost: 482 },
  { id: 254, network: 'mtn', size: '1.5GB', days: '2', tab: 'daily', retail: 700, apiPrice: 595, cost: 578 },
  { id: 255, network: 'mtn', size: '2GB', days: '2', tab: 'daily', retail: 750, apiPrice: 740, cost: 721.5 },
  { id: 249, network: 'mtn', size: '2.5GB', days: '1', tab: 'daily', retail: 750, apiPrice: 740, cost: 721.5 },
  { id: 100, network: 'mtn', size: '2.5GB', days: '2', tab: 'daily', retail: 900, apiPrice: 880.5, cost: 864 },
  { id: 257, network: 'mtn', size: '3.2GB', days: '2', tab: 'daily', retail: 1050, apiPrice: 982, cost: 962 },
  { id: 104, network: 'mtn', size: '3.5GB', days: '1', tab: 'daily', retail: 1100, apiPrice: 995, cost: 985 },
  { id: 105, network: 'mtn', size: '4GB', days: '2', tab: 'daily', retail: 1300, apiPrice: 1195, cost: 1185 },
  { id: 108, network: 'mtn', size: '6.5GB', days: '2', tab: 'daily', retail: 1700, apiPrice: 1585, cost: 1485 },
];

/** All curated plans (grows as we add tabs/networks) */
export const DATA_CATALOG: CatalogPlan[] = [...MTN_DAILY];

export function catalogForNetwork(network: string): CatalogPlan[] {
  const n = network.toLowerCase();
  return DATA_CATALOG.filter((p) => p.network === n);
}

export function findCatalogPlan(planId: number): CatalogPlan | undefined {
  return DATA_CATALOG.find((p) => p.id === planId);
}

/** UI-facing shape used by data-page */
export function toLivePlan(p: CatalogPlan) {
  return {
    id: p.id,
    name: p.size,
    price: p.retail,
    days: p.days,
    planType: p.tab.charAt(0).toUpperCase() + p.tab.slice(1),
  };
}
