/**
 * Curated data catalog — plan_id matches 247API.
 * Retail = customer price on Verxor (baseline margin = retail - cost).
 * Live sync (lib/data-plan-sync.ts) hides missing IDs and shifts retail
 * by the same ₦ delta as 247 cost so margin stays fixed.
 *
 * MTN: Daily + Weekly + Monthly + 3 months+ + Yearly.
 * Airtel: Daily + Weekly + Monthly + 3 months+ + Router + Yearly.
 * Glo: Daily + Weekly + Monthly (Corporate2 / SME).
 */

export type DataNetwork = 'mtn' | 'glo' | 'airtel' | '9mobile';
export type DataTab = 'daily' | 'weekly' | 'monthly' | 'threemonths' | 'yearly' | 'router';

export interface CatalogPlan {
  id: number;
  network: DataNetwork;
  size: string;
  days: string;
  tab: DataTab;
  retail: number;
  apiPrice: number;
  planType?: string;
  cost?: number;
}

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

export const MTN_WEEKLY: CatalogPlan[] = [
  { id: 10, network: 'mtn', size: '500MB', days: '7', tab: 'weekly', retail: 495, apiPrice: 240, cost: 220, planType: 'SME1 DataShare' },
  { id: 9, network: 'mtn', size: '1GB', days: '7', tab: 'weekly', retail: 790, apiPrice: 385, cost: 375, planType: 'SME1 DataShare' },
  { id: 261, network: 'mtn', size: '1.5GB', days: '7', tab: 'weekly', retail: 1000, apiPrice: 972, cost: 962 },
  { id: 8, network: 'mtn', size: '2GB', days: '7', tab: 'weekly', retail: 925, apiPrice: 702, cost: 695, planType: 'SME1 DataShare' },
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

export const MTN_MONTHLY: CatalogPlan[] = [
  { id: 11, network: 'mtn', size: '1GB', days: '30', tab: 'monthly', retail: 740, apiPrice: 445, cost: 440 },
  { id: 12, network: 'mtn', size: '2GB', days: '30', tab: 'monthly', retail: 1200, apiPrice: 750, cost: 735 },
  { id: 13, network: 'mtn', size: '3GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 1145, cost: 1000 },
  { id: 14, network: 'mtn', size: '5GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1465, cost: 1450 },
  { id: 273, network: 'mtn', size: '7GB', days: '30', tab: 'monthly', retail: 3600, apiPrice: 3380, cost: 3370.5 },
  { id: 15, network: 'mtn', size: '10GB', days: '30', tab: 'monthly', retail: 4100, apiPrice: 2929, cost: 2900 },
  { id: 103, network: 'mtn', size: '20GB', days: '30', tab: 'monthly', retail: 7600, apiPrice: 7165, cost: 7100 },
  { id: 109, network: 'mtn', size: '34GB', days: '30', tab: 'monthly', retail: 10500, apiPrice: 9858, cost: 9850 },
  { id: 279, network: 'mtn', size: '36GB', days: '30', tab: 'monthly', retail: 11500, apiPrice: 10450, cost: 10400 },
  { id: 280, network: 'mtn', size: '75GB', days: '30', tab: 'monthly', retail: 18500, apiPrice: 17070, cost: 17000 },
  { id: 282, network: 'mtn', size: '165GB', days: '30', tab: 'monthly', retail: 35000, apiPrice: 33800, cost: 33690 },
  { id: 281, network: 'mtn', size: '150GB', days: '60', tab: 'monthly', retail: 40000, apiPrice: 38590, cost: 38520 },
  { id: 285, network: 'mtn', size: '200GB', days: '60', tab: 'monthly', retail: 50000, apiPrice: 36500, cost: 36500 },
  { id: 283, network: 'mtn', size: '250GB', days: '30', tab: 'monthly', retail: 55000, apiPrice: 53065, cost: 53065 },
];

export const MTN_THREEMONTHS: CatalogPlan[] = [
  { id: 291, network: 'mtn', size: '450GB', days: '90', tab: 'threemonths', retail: 75000, apiPrice: 73150, cost: 73000 },
  { id: 286, network: 'mtn', size: '480GB', days: '90', tab: 'threemonths', retail: 90000, apiPrice: 88100, cost: 88000 },
];

export const MTN_YEARLY: CatalogPlan[] = [
  { id: 292, network: 'mtn', size: '800GB', days: '365', tab: 'yearly', retail: 127000, apiPrice: 123000, cost: 123000 },
  { id: 293, network: 'mtn', size: '1.5TB', days: '365', tab: 'yearly', retail: 227000, apiPrice: 222000, cost: 222000 },
];

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

export const AIRTEL_WEEKLY: CatalogPlan[] = [
  { id: 354, network: 'airtel', size: '500MB', days: '7', tab: 'weekly', retail: 500, apiPrice: 486, cost: 483.5, planType: 'Gifting' },
  { id: 425, network: 'airtel', size: '1.5GB', days: '7', tab: 'weekly', retail: 600, apiPrice: 533, cost: 530, planType: 'SME' },
  { id: 355, network: 'airtel', size: '1GB', days: '7', tab: 'weekly', retail: 800, apiPrice: 776, cost: 773.6, planType: 'Gifting' },
  { id: 357, network: 'airtel', size: '3.5GB', days: '7', tab: 'weekly', retail: 1500, apiPrice: 1455, cost: 1450.5, planType: 'Gifting' },
  { id: 452, network: 'airtel', size: '4GB', days: '7', tab: 'weekly', retail: 1800, apiPrice: 1505, cost: 1500, planType: 'SME' },
  { id: 453, network: 'airtel', size: '6GB', days: '7', tab: 'weekly', retail: 2300, apiPrice: 2005, cost: 2000, planType: 'SME' },
  { id: 358, network: 'airtel', size: '6GB', days: '7', tab: 'weekly', retail: 3000, apiPrice: 2425, cost: 2417.5, planType: 'Gifting' },
  { id: 359, network: 'airtel', size: '10GB', days: '7', tab: 'weekly', retail: 3500, apiPrice: 2910, cost: 2901, planType: 'Gifting' },
  { id: 360, network: 'airtel', size: '18GB', days: '7', tab: 'weekly', retail: 5000, apiPrice: 4860, cost: 4835, planType: 'Gifting' },
  { id: 377, network: 'airtel', size: '20GB', days: '7', tab: 'weekly', retail: 5500, apiPrice: 5010, cost: 5000, planType: 'Gifting' },
];

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

export const AIRTEL_THREEMONTHS: CatalogPlan[] = [
  { id: 374, network: 'airtel', size: '300GB', days: '90', tab: 'threemonths', retail: 50300, apiPrice: 48400, cost: 48350, planType: 'Gifting' },
  { id: 375, network: 'airtel', size: '350GB', days: '120', tab: 'threemonths', retail: 60300, apiPrice: 58050, cost: 58020, planType: 'Gifting' },
];

export const AIRTEL_ROUTER: CatalogPlan[] = [
  { id: 385, network: 'airtel', size: '50 Mbps', days: '30', tab: 'router', retail: 25000, apiPrice: 24050, cost: 24000, planType: 'Router' },
  { id: 392, network: 'airtel', size: '50 Mbps', days: '30', tab: 'router', retail: 25000, apiPrice: 24050, cost: 24000, planType: 'Router' },
  { id: 384, network: 'airtel', size: '20 Mbps', days: '30', tab: 'router', retail: 30000, apiPrice: 28850, cost: 28800, planType: 'Router' },
  { id: 386, network: 'airtel', size: '100 Mbps', days: '30', tab: 'router', retail: 45000, apiPrice: 43250, cost: 43200, planType: 'Router' },
  { id: 393, network: 'airtel', size: '100 Mbps', days: '30', tab: 'router', retail: 45000, apiPrice: 43250, cost: 43200, planType: 'Router' },
  { id: 387, network: 'airtel', size: '60 Mbps', days: '30', tab: 'router', retail: 50000, apiPrice: 48050, cost: 48000, planType: 'Router' },
  { id: 390, network: 'airtel', size: '20 Mbps', days: '90', tab: 'router', retail: 81000, apiPrice: 80100, cost: 80000, planType: 'Router' },
  { id: 388, network: 'airtel', size: '60 Mbps', days: '90', tab: 'router', retail: 136000, apiPrice: 135100, cost: 135000, planType: 'Router' },
  { id: 391, network: 'airtel', size: '20 Mbps', days: '180', tab: 'router', retail: 151000, apiPrice: 150100, cost: 150000, planType: 'Router' },
];

export const AIRTEL_YEARLY: CatalogPlan[] = [
  { id: 376, network: 'airtel', size: '650GB', days: '365', tab: 'yearly', retail: 100500, apiPrice: 96800, cost: 96700, planType: 'Gifting' },
];

/** Glo Daily (1–3 days) — Corporate2 preferred over Corporate twins */
export const GLO_DAILY: CatalogPlan[] = [
  { id: 110, network: 'glo', size: '750MB', days: '1', tab: 'daily', retail: 210, apiPrice: 182, cost: 180, planType: 'SME' },
  { id: 111, network: 'glo', size: '1.5GB', days: '1', tab: 'daily', retail: 325, apiPrice: 273, cost: 270, planType: 'SME' },
  { id: 112, network: 'glo', size: '2.5GB', days: '2', tab: 'daily', retail: 510, apiPrice: 455, cost: 450, planType: 'SME' },
  { id: 702, network: 'glo', size: '1GB', days: '3', tab: 'daily', retail: 355, apiPrice: 334, cost: 330, planType: 'Corporate2' },
  { id: 703, network: 'glo', size: '2GB', days: '3', tab: 'daily', retail: 720, apiPrice: 667, cost: 660, planType: 'Corporate2' },
  { id: 704, network: 'glo', size: '3GB', days: '3', tab: 'daily', retail: 1060, apiPrice: 1000, cost: 990, planType: 'Corporate2' },
  { id: 706, network: 'glo', size: '5GB', days: '3', tab: 'daily', retail: 1850, apiPrice: 1667, cost: 1650, planType: 'Corporate2' },
  { id: 707, network: 'glo', size: '10GB', days: '3', tab: 'daily', retail: 3600, apiPrice: 3333, cost: 3300, planType: 'Corporate2' },
];

/** Glo Weekly */
export const GLO_WEEKLY: CatalogPlan[] = [
  { id: 710, network: 'glo', size: '1GB', days: '7', tab: 'weekly', retail: 370, apiPrice: 349, cost: 345, planType: 'Corporate2' },
  { id: 711, network: 'glo', size: '2GB', days: '7', tab: 'weekly', retail: 730, apiPrice: 691, cost: 684, planType: 'Corporate2' },
  { id: 712, network: 'glo', size: '3GB', days: '7', tab: 'weekly', retail: 1115, apiPrice: 1037, cost: 1026, planType: 'Corporate2' },
  { id: 714, network: 'glo', size: '5GB', days: '7', tab: 'weekly', retail: 1860, apiPrice: 1728, cost: 1710, planType: 'Corporate2' },
  { id: 113, network: 'glo', size: '10GB', days: '7', tab: 'weekly', retail: 2030, apiPrice: 1818, cost: 1800, planType: 'SME' },
];

/** Glo Monthly */
export const GLO_MONTHLY: CatalogPlan[] = [
  { id: 701, network: 'glo', size: '500MB', days: '30', tab: 'monthly', retail: 250, apiPrice: 197, cost: 195, planType: 'Corporate2' },
  { id: 720, network: 'glo', size: '1GB', days: '30', tab: 'monthly', retail: 450, apiPrice: 389, cost: 385, planType: 'Corporate2' },
  { id: 721, network: 'glo', size: '2GB', days: '30', tab: 'monthly', retail: 910, apiPrice: 768, cost: 760, planType: 'Corporate2' },
  { id: 722, network: 'glo', size: '3GB', days: '30', tab: 'monthly', retail: 1360, apiPrice: 1152, cost: 1140, planType: 'Corporate2' },
  { id: 724, network: 'glo', size: '5GB', days: '30', tab: 'monthly', retail: 2350, apiPrice: 1919, cost: 1900, planType: 'Corporate2' },
  { id: 730, network: 'glo', size: '10GB', days: '30', tab: 'monthly', retail: 4500, apiPrice: 3838, cost: 3800, planType: 'Corporate2' },
];

export const DATA_CATALOG: CatalogPlan[] = [
  ...MTN_DAILY,
  ...MTN_WEEKLY,
  ...MTN_MONTHLY,
  ...MTN_THREEMONTHS,
  ...MTN_YEARLY,
  ...AIRTEL_DAILY,
  ...AIRTEL_WEEKLY,
  ...AIRTEL_MONTHLY,
  ...AIRTEL_THREEMONTHS,
  ...AIRTEL_ROUTER,
  ...AIRTEL_YEARLY,
  ...GLO_DAILY,
  ...GLO_WEEKLY,
  ...GLO_MONTHLY,
];

export function catalogForNetwork(network: string): CatalogPlan[] {
  const n = network.toLowerCase();
  return DATA_CATALOG.filter((p) => p.network === n);
}

export function findCatalogPlan(planId: number): CatalogPlan | undefined {
  return DATA_CATALOG.find((p) => p.id === planId);
}

export function toLivePlan(p: CatalogPlan) {
  const validity =
    p.tab === 'threemonths'
      ? '3 months+'
      : p.tab === 'router'
        ? 'Router'
        : p.tab.charAt(0).toUpperCase() + p.tab.slice(1);
  const name =
    p.tab === 'router' || /mbps/i.test(p.size)
      ? p.size.replace(/Mbps/gi, 'M\u200cBps')
      : p.size;
  return {
    id: p.id,
    name,
    price: p.retail,
    days: p.days,
    planType: p.planType || 'Data Bundle',
    validityCategory: validity,
  };
}
