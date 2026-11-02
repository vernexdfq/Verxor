/**
 * Curated data catalog — plan_id matches 247API.
 * Retail = customer price on Verxor.
 * apiPrice = child panel / API user price (reference only here).
 *
 * UI rules:
 *  - Show a provider bundle family only where it is verified by plan ID
 *  - Tabs by validity: daily / weekly / monthly / 3 months+ / yearly
 *  - Hot deals chosen later after full catalog
 *
 * MTN: Daily + Weekly + Monthly + 3 months+ + Yearly locked.
 * Airtel: Daily + Weekly + Monthly locked (43 plans).
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
  /** Provider bundle type label, only when verified from the provider/catalog source. */
  planType?: string;
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

/** MTN Weekly — locked from live 247API (Gifting + AWOOF + SME1 DataShare) */
export const MTN_WEEKLY: CatalogPlan[] = [
  { id: 10, network: 'mtn', size: '500MB', days: '7', tab: 'weekly', retail: 495, apiPrice: 240, cost: 220, planType: 'SME1 DataShare' },
  { id: 9, network: 'mtn', size: '1GB', days: '7', tab: 'weekly', retail: 790, apiPrice: 385, cost: 375, planType: 'SME1 DataShare' },
  { id: 261, network: 'mtn', size: '1.5GB', days: '7', tab: 'weekly', retail: 1000, apiPrice: 972, cost: 962 },
  { id: 8, network: 'mtn', size: '2GB', days: '7', tab: 'weekly', retail: 900, apiPrice: 800, cost: 670, planType: 'SME1 DataShare' },
  { id: 101, network: 'mtn', size: '3.5GB', days: '7', tab: 'weekly', retail: 1545, apiPrice: 1465, cost: 1445 },
  { id: 262, network: 'mtn', size: '6GB', days: '7', tab: 'weekly', retail: 2700, apiPrice: 2450, cost: 2405 },
  { id: 263, network: 'mtn', size: '7GB', days: '7', tab: 'weekly', retail: 3600, apiPrice: 3500, cost: 3367 },
  { id: 102, network: 'mtn', size: '11GB', days: '7', tab: 'weekly', retail: 3713, apiPrice: 3380, cost: 3360 },
  { id: 300, network: 'mtn', size: '12.5GB', days: '14', tab: 'weekly', retail: 4550, apiPrice: 4350, cost: 4330 },
  { id: 301, network: 'mtn', size: '15GB', days: '7', tab: 'weekly', retail: 4100, apiPrice: 3950, cost: 3850 },
  { id: 302, network: 'mtn', size: '18GB', days: '14', tab: 'weekly', retail: 6100, apiPrice: 5870, cost: 5770 },
  { id: 303, network: 'mtn', size: '28GB', days: '14', tab: 'weekly', retail: 8200, apiPrice: 7850, cost: 7700 },
  { id: 304, network: 'mtn', size: '40GB', days: '14', tab: 'weekly', retail: 10300, apiPrice: 10000, cost: 9620 },
];

/** MTN Monthly — locked from live 247API */
export const MTN_MONTHLY: CatalogPlan[] = [
  { id: 6, network: 'mtn', size: '100MB', days: '30', tab: 'monthly', retail: 100, apiPrice: 60, cost: 50 },
  { id: 7, network: 'mtn', size: '200MB', days: '30', tab: 'monthly', retail: 200, apiPrice: 100, cost: 90 },
  { id: 21, network: 'mtn', size: '500MB', days: '30', tab: 'monthly', retail: 450, apiPrice: 350, cost: 350 },
  { id: 11, network: 'mtn', size: '1GB', days: '30', tab: 'monthly', retail: 700, apiPrice: 425, cost: 400 },
  { id: 12, network: 'mtn', size: '2GB', days: '30', tab: 'monthly', retail: 1200, apiPrice: 750, cost: 735 },
  { id: 13, network: 'mtn', size: '3GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 1145, cost: 1000 },
  { id: 14, network: 'mtn', size: '5GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1465, cost: 1450 },
  { id: 273, network: 'mtn', size: '7GB', days: '30', tab: 'monthly', retail: 3600, apiPrice: 3380, cost: 3370.5 },
  { id: 15, network: 'mtn', size: '10GB', days: '30', tab: 'monthly', retail: 4000, apiPrice: 2855, cost: 2800 },
  { id: 103, network: 'mtn', size: '20GB', days: '30', tab: 'monthly', retail: 7600, apiPrice: 7165, cost: 7100 },
  { id: 109, network: 'mtn', size: '34GB', days: '30', tab: 'monthly', retail: 10500, apiPrice: 9858, cost: 9850 },
  { id: 279, network: 'mtn', size: '36GB', days: '30', tab: 'monthly', retail: 11500, apiPrice: 10450, cost: 10400 },
  { id: 280, network: 'mtn', size: '75GB', days: '30', tab: 'monthly', retail: 18500, apiPrice: 17070, cost: 17000 },
  { id: 282, network: 'mtn', size: '165GB', days: '30', tab: 'monthly', retail: 35000, apiPrice: 33800, cost: 33690 },
  { id: 281, network: 'mtn', size: '150GB', days: '60', tab: 'monthly', retail: 40000, apiPrice: 38590, cost: 38520 },
  { id: 285, network: 'mtn', size: '200GB', days: '60', tab: 'monthly', retail: 50000, apiPrice: 36500, cost: 36500 },
  { id: 283, network: 'mtn', size: '250GB', days: '30', tab: 'monthly', retail: 55000, apiPrice: 53065, cost: 53065 },
];

/** MTN 3 months+ — locked from live 247API */
export const MTN_THREEMONTHS: CatalogPlan[] = [
  { id: 291, network: 'mtn', size: '450GB', days: '90', tab: 'threemonths', retail: 75000, apiPrice: 73150, cost: 73000 },
  { id: 286, network: 'mtn', size: '480GB', days: '90', tab: 'threemonths', retail: 90000, apiPrice: 88100, cost: 88000 },
];

/** MTN Yearly — locked from live 247API */
export const MTN_YEARLY: CatalogPlan[] = [
  { id: 292, network: 'mtn', size: '800GB', days: '365', tab: 'yearly', retail: 127000, apiPrice: 123000, cost: 123000 },
  { id: 293, network: 'mtn', size: '1.5TB', days: '365', tab: 'yearly', retail: 227000, apiPrice: 222000, cost: 222000 },
];

/** Airtel Daily — locked from live 247API + user retail (18 plans) */
export const AIRTEL_DAILY: CatalogPlan[] = [
  { id: 350, network: 'airtel', size: '75MB', days: '1', tab: 'daily', retail: 75, apiPrice: 73, cost: 72.53, planType: 'Gifting' },
  { id: 351, network: 'airtel', size: '100MB', days: '1', tab: 'daily', retail: 100, apiPrice: 97, cost: 96.7, planType: 'Gifting' },
  { id: 400, network: 'airtel', size: '150MB', days: '1', tab: 'daily', retail: 80, apiPrice: 58, cost: 55, planType: 'SME' },
  { id: 352, network: 'airtel', size: '200MB', days: '1', tab: 'daily', retail: 200, apiPrice: 195, cost: 193.4, planType: 'Gifting' },
  { id: 401, network: 'airtel', size: '250MB Night', days: '1', tab: 'daily', retail: 100, apiPrice: 58, cost: 55, planType: 'SME' },
  { id: 410, network: 'airtel', size: '200MB', days: '2', tab: 'daily', retail: 150, apiPrice: 112, cost: 110, planType: 'SME' },
  { id: 411, network: 'airtel', size: '300MB', days: '2', tab: 'daily', retail: 300, apiPrice: 112, cost: 110, planType: 'SME' },
  { id: 412, network: 'airtel', size: '600MB', days: '2', tab: 'daily', retail: 350, apiPrice: 215, cost: 210, planType: 'SME' },
  { id: 420, network: 'airtel', size: '500MB', days: '3', tab: 'daily', retail: 450, apiPrice: 365, cost: 360, planType: 'SME' },
  { id: 349, network: 'airtel', size: '1GB', days: '1', tab: 'daily', retail: 500, apiPrice: 486, cost: 483.5, planType: 'Gifting' },
  { id: 421, network: 'airtel', size: '1GB', days: '3', tab: 'daily', retail: 550, apiPrice: 325, cost: 320, planType: 'SME' },
  { id: 403, network: 'airtel', size: '1.5GB', days: '1', tab: 'daily', retail: 550, apiPrice: 425, cost: 420, planType: 'SME' },
  { id: 413, network: 'airtel', size: '1.5GB', days: '2', tab: 'daily', retail: 700, apiPrice: 635, cost: 630, planType: 'SME' },
  { id: 409, network: 'airtel', size: '2GB', days: '2', tab: 'daily', retail: 700, apiPrice: 635, cost: 630, planType: 'SME' },
  { id: 415, network: 'airtel', size: '3GB', days: '2', tab: 'daily', retail: 900, apiPrice: 785, cost: 780, planType: 'SME' },
  { id: 414, network: 'airtel', size: '3.2GB', days: '2', tab: 'daily', retail: 1200, apiPrice: 1005, cost: 1000, planType: 'SME' },
  { id: 416, network: 'airtel', size: '5GB', days: '2', tab: 'daily', retail: 1700, apiPrice: 1505, cost: 1500, planType: 'SME' },
  { id: 450, network: 'airtel', size: '6GB', days: '2', tab: 'daily', retail: 1800, apiPrice: 1505, cost: 1500, planType: 'SME' },
];

/** Airtel Weekly — locked (10 plans; dropped 356, 426, 428) */
export const AIRTEL_WEEKLY: CatalogPlan[] = [
  { id: 354, network: 'airtel', size: '500MB', days: '7', tab: 'weekly', retail: 500, apiPrice: 486, cost: 483.5, planType: 'Gifting' },
  { id: 425, network: 'airtel', size: '1.5GB', days: '7', tab: 'weekly', retail: 600, apiPrice: 533, cost: 530, planType: 'SME' },
  { id: 355, network: 'airtel', size: '1GB', days: '7', tab: 'weekly', retail: 800, apiPrice: 776, cost: 773.6, planType: 'Gifting' },
  { id: 357, network: 'airtel', size: '3.5GB', days: '7', tab: 'weekly', retail: 1500, apiPrice: 1455, cost: 1450.5, planType: 'Gifting' },
  { id: 452, network: 'airtel', size: '4GB', days: '7', tab: 'weekly', retail: 1800, apiPrice: 1505, cost: 1500, planType: 'SME' },
  { id: 453, network: 'airtel', size: '6GB', days: '7', tab: 'weekly', retail: 2300, apiPrice: 2005, cost: 2000, planType: 'SME' },
  { id: 358, network: 'airtel', size: '8GB', days: '7', tab: 'weekly', retail: 3000, apiPrice: 2425, cost: 2417.5, planType: 'Gifting' },
  { id: 359, network: 'airtel', size: '10GB', days: '7', tab: 'weekly', retail: 3500, apiPrice: 2910, cost: 2901, planType: 'Gifting' },
  { id: 360, network: 'airtel', size: '18GB', days: '7', tab: 'weekly', retail: 5000, apiPrice: 4860, cost: 4835, planType: 'Gifting' },
  { id: 377, network: 'airtel', size: '20GB', days: '7', tab: 'weekly', retail: 5500, apiPrice: 5010, cost: 5000, planType: 'Gifting' },
];

/** Airtel Monthly — locked from live 247API + user retail (15 plans) */
export const AIRTEL_MONTHLY: CatalogPlan[] = [
  { id: 361, network: 'airtel', size: '2GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 1455, cost: 1450.5, planType: 'Gifting' },
  { id: 362, network: 'airtel', size: '3GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1940, cost: 1934, planType: 'Gifting' },
  { id: 363, network: 'airtel', size: '4GB', days: '30', tab: 'monthly', retail: 2500, apiPrice: 2425, cost: 2417.5, planType: 'Gifting' },
  { id: 364, network: 'airtel', size: '8GB', days: '30', tab: 'monthly', retail: 3000, apiPrice: 2910, cost: 2901, planType: 'Gifting' },
  { id: 430, network: 'airtel', size: '10GB', days: '30', tab: 'monthly', retail: 4000, apiPrice: 3070, cost: 3060, planType: 'SME' },
  { id: 366, network: 'airtel', size: '13GB', days: '30', tab: 'monthly', retail: 5000, apiPrice: 4845, cost: 4835, planType: 'Gifting' },
  { id: 367, network: 'airtel', size: '18GB', days: '30', tab: 'monthly', retail: 6000, apiPrice: 5810, cost: 5802, planType: 'Gifting' },
  { id: 368, network: 'airtel', size: '25GB', days: '30', tab: 'monthly', retail: 8000, apiPrice: 7750, cost: 7736, planType: 'Gifting' },
  { id: 369, network: 'airtel', size: '35GB', days: '30', tab: 'monthly', retail: 10000, apiPrice: 9680, cost: 9670, planType: 'Gifting' },
  { id: 446, network: 'airtel', size: '40GB', days: '30', tab: 'monthly', retail: 11500, apiPrice: 10020, cost: 10000, planType: 'Gifting' },
  { id: 370, network: 'airtel', size: '60GB', days: '30', tab: 'monthly', retail: 15000, apiPrice: 14520, cost: 14505, planType: 'Gifting' },
  { id: 447, network: 'airtel', size: '75GB', days: '30', tab: 'monthly', retail: 16500, apiPrice: 15020, cost: 15000, planType: 'Gifting' },
  { id: 371, network: 'airtel', size: '100GB', days: '30', tab: 'monthly', retail: 20000, apiPrice: 19360, cost: 19340, planType: 'Gifting' },
  { id: 372, network: 'airtel', size: '160GB', days: '30', tab: 'monthly', retail: 30150, apiPrice: 29040, cost: 29010, planType: 'Gifting' },
  { id: 373, network: 'airtel', size: '210GB', days: '30', tab: 'monthly', retail: 40200, apiPrice: 38720, cost: 38680, planType: 'Gifting' },
];

/** All curated plans (grows as we add tabs/networks) */
export const DATA_CATALOG: CatalogPlan[] = [
  ...MTN_DAILY,
  ...MTN_WEEKLY,
  ...MTN_MONTHLY,
  ...MTN_THREEMONTHS,
  ...MTN_YEARLY,
  ...AIRTEL_DAILY,
  ...AIRTEL_WEEKLY,
  ...AIRTEL_MONTHLY,
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
    planType: p.planType || 'Data Bundle',
    validityCategory: p.tab === 'threemonths' ? '3 months+' : p.tab.charAt(0).toUpperCase() + p.tab.slice(1),
  };
}
