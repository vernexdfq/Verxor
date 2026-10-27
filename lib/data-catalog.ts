/**
 * Curated data catalog — plan_id matches 247API.
 * Retail = customer price on Verxor.
 * apiPrice = child panel / API user price (reference only here).
 *
 * UI rules:
 *  - No SME / Gifting / AWOOF labels
 *  - Tabs by validity: daily / weekly / monthly / 3 months+ / yearly
 *  - Hot deals chosen later after full catalog
 *
 * Networks: MTN Daily + Weekly + Monthly + 3 months+ locked.
 */

export type DataNetwork = 'mtn' | 'glo' | 'airtel' | '9mobile';
export type DataTab = 'daily' | 'weekly' | 'monthly' | 'threemonths' | 'yearly';

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

/** MTN Daily — locked from live 247API pull + user retail */
export const MTN_DAILY: CatalogPlan[] = [
  { id: 250, network: 'mtn', size: '75MB', days: '1', tab: 'daily', retail: 75, apiPrice: 74, cost: 72.3 },
  { id: 251, network: 'mtn', size: '110MB', days: '1', tab: 'daily', retail: 100, apiPrice: 98, cost: 96.3 },
  { id: 252, network: 'mtn', size: '230MB', days: '1', tab: 'daily', retail: 200, apiPrice: 195, cost: 192.6 },
  { id: 247, network: 'mtn', size: '500MB', days: '1', tab: 'daily', retail: 400, apiPrice: 340, cost: 338 },
  { id: 248, network: 'mtn', size: '750MB', days: '3', tab: 'daily', retail: 450, apiPrice: 450, cost: 435 },
  { id: 253, network: 'mtn', size: '1GB', days: '1', tab: 'daily', retail: 650, apiPrice: 490, cost: 482 },
  { id: 254, network: 'mtn', size: '1.5GB', days: '2', tab: 'daily', retail: 622, apiPrice: 595, cost: 578 },
  { id: 255, network: 'mtn', size: '2GB', days: '2', tab: 'daily', retail: 787, apiPrice: 740, cost: 721.5 },
  { id: 249, network: 'mtn', size: '2.5GB', days: '1', tab: 'daily', retail: 952, apiPrice: 740, cost: 721.5 },
  { id: 256, network: 'mtn', size: '2.5GB', days: '2', tab: 'daily', retail: 955, apiPrice: 880, cost: 865.8 },
  { id: 257, network: 'mtn', size: '3.2GB', days: '2', tab: 'daily', retail: 1100, apiPrice: 982, cost: 962 },
  { id: 104, network: 'mtn', size: '3.5GB', days: '1', tab: 'daily', retail: 1100, apiPrice: 995, cost: 985 },
  { id: 105, network: 'mtn', size: '4GB', days: '2', tab: 'daily', retail: 1300, apiPrice: 1195, cost: 1185 },
  { id: 108, network: 'mtn', size: '6.5GB', days: '2', tab: 'daily', retail: 1800, apiPrice: 1585, cost: 1485 },
];

/** MTN Weekly — confirmed with user */
export const MTN_WEEKLY: CatalogPlan[] = [
  { id: 10, network: 'mtn', size: '500MB', days: '7', tab: 'weekly', retail: 500, apiPrice: 240, cost: 220 },
  { id: 9, network: 'mtn', size: '1GB', days: '7', tab: 'weekly', retail: 795, apiPrice: 385, cost: 375 },
  { id: 260, network: 'mtn', size: '1.5GB', days: '7', tab: 'weekly', retail: 950, apiPrice: 750, cost: 740 },
  { id: 261, network: 'mtn', size: '2GB', days: '7', tab: 'weekly', retail: 1000, apiPrice: 972, cost: 960 },
  { id: 8, network: 'mtn', size: '2.5GB', days: '7', tab: 'weekly', retail: 1100, apiPrice: 800, cost: 790 },
  { id: 503, network: 'mtn', size: '2.5GB', days: '7', tab: 'weekly', retail: 1090, apiPrice: 790, cost: 780 },
  { id: 101, network: 'mtn', size: '3GB', days: '7', tab: 'weekly', retail: 1500, apiPrice: 1465, cost: 1450 },
  { id: 262, network: 'mtn', size: '5GB', days: '7', tab: 'weekly', retail: 2550, apiPrice: 2450, cost: 2430 },
  { id: 102, network: 'mtn', size: '7GB', days: '7', tab: 'weekly', retail: 3500, apiPrice: 3380, cost: 3360 },
  { id: 300, network: 'mtn', size: '10GB', days: '7', tab: 'weekly', retail: 4550, apiPrice: 4350, cost: 4320 },
  { id: 301, network: 'mtn', size: '11GB', days: '7', tab: 'weekly', retail: 4100, apiPrice: 3950, cost: 3920 },
  { id: 302, network: 'mtn', size: '15GB', days: '7', tab: 'weekly', retail: 6100, apiPrice: 5870, cost: 5840 },
  { id: 303, network: 'mtn', size: '20GB', days: '7', tab: 'weekly', retail: 8200, apiPrice: 7850, cost: 7820 },
];

/** MTN Monthly — confirmed with user */
export const MTN_MONTHLY: CatalogPlan[] = [
  { id: 6, network: 'mtn', size: '100MB', days: '30', tab: 'monthly', retail: 100, apiPrice: 60, cost: 55 },
  { id: 7, network: 'mtn', size: '200MB', days: '30', tab: 'monthly', retail: 200, apiPrice: 100, cost: 95 },
  { id: 21, network: 'mtn', size: '750MB', days: '30', tab: 'monthly', retail: 600, apiPrice: 384.5, cost: 380 },
  { id: 11, network: 'mtn', size: '1GB', days: '30', tab: 'monthly', retail: 1000, apiPrice: 425, cost: 420 },
  { id: 12, network: 'mtn', size: '1.5GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 750, cost: 740 },
  { id: 13, network: 'mtn', size: '3GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1145, cost: 1130 },
  { id: 14, network: 'mtn', size: '5GB', days: '30', tab: 'monthly', retail: 1800, apiPrice: 1465, cost: 1450 },
  { id: 15, network: 'mtn', size: '10GB', days: '30', tab: 'monthly', retail: 4000, apiPrice: 2855, cost: 2830 },
  { id: 273, network: 'mtn', size: '12GB', days: '30', tab: 'monthly', retail: 3500, apiPrice: 3380.5, cost: 3360 },
  { id: 275, network: 'mtn', size: '15GB', days: '30', tab: 'monthly', retail: 5500, apiPrice: 5305, cost: 5280 },
  { id: 244, network: 'mtn', size: '15GB', days: '30', tab: 'monthly', retail: 5000, apiPrice: 4908, cost: 4890 },
  { id: 276, network: 'mtn', size: '16.5GB', days: '30', tab: 'monthly', retail: 6500, apiPrice: 6271, cost: 6259.5 },
  { id: 103, network: 'mtn', size: '20GB', days: '30', tab: 'monthly', retail: 7600, apiPrice: 7165, cost: 7100 },
  { id: 278, network: 'mtn', size: '25GB', days: '30', tab: 'monthly', retail: 9000, apiPrice: 8677, cost: 8667 },
  { id: 288, network: 'mtn', size: '30GB', days: '30', tab: 'monthly', retail: 9500, apiPrice: 8800, cost: 8700 },
  { id: 109, network: 'mtn', size: '34GB', days: '30', tab: 'monthly', retail: 10000, apiPrice: 9858, cost: 9850 },
  { id: 279, network: 'mtn', size: '36GB', days: '30', tab: 'monthly', retail: 11000, apiPrice: 10450, cost: 10400 },
  { id: 289, network: 'mtn', size: '45GB', days: '30', tab: 'monthly', retail: 15500, apiPrice: 14450, cost: 14000 },
  { id: 287, network: 'mtn', size: '65GB', days: '30', tab: 'monthly', retail: 16100, apiPrice: 15650, cost: 15600 },
  { id: 280, network: 'mtn', size: '75GB', days: '30', tab: 'monthly', retail: 18000, apiPrice: 17070, cost: 17000 },
  { id: 290, network: 'mtn', size: '120GB', days: '30', tab: 'monthly', retail: 25000, apiPrice: 23495, cost: 23400 },
  { id: 281, network: 'mtn', size: '150GB', days: '60', tab: 'monthly', retail: 40000, apiPrice: 38590, cost: 38520 },
  { id: 282, network: 'mtn', size: '165GB', days: '30', tab: 'monthly', retail: 35000, apiPrice: 33800, cost: 33690 },
];

/** MTN 3 months+ — confirmed with user */
export const MTN_THREEMONTHS: CatalogPlan[] = [
  { id: 291, network: 'mtn', size: '450GB', days: '90', tab: 'threemonths', retail: 75000, apiPrice: 73150, cost: 73000 },
  { id: 286, network: 'mtn', size: '480GB', days: '90', tab: 'threemonths', retail: 90000, apiPrice: 88100, cost: 88000 },
];

/** All curated plans (grows as we add tabs/networks) */
export const DATA_CATALOG: CatalogPlan[] = [
  ...MTN_DAILY,
  ...MTN_WEEKLY,
  ...MTN_MONTHLY,
  ...MTN_THREEMONTHS,
];

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
    planType: p.tab === 'threemonths' ? '3 months+' : p.tab.charAt(0).toUpperCase() + p.tab.slice(1),
  };
}
