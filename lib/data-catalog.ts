/**
 * Curated data catalog — plan_id matches 247API (except 9mobile: id = hidden
 * 247 fallback, purchase goes via ClubKonnect ckCode).
 * Pricing rules (fixed):
 *   childPrice = ceil(cost * 1.005) — computed in data-plan-sync / plans route
 *   apiPrice   = ceil(cost * 1.01)
 * Retail is fixed separately and never auto-shifted.
 * fallback247Id is hidden backup metadata — never shown or pushed.
 *
 * Active plans: MTN 45, Airtel 55, Glo 19, 9mobile 5 (Glo +8 CK pending codes).
 * MTN 6, 7, 21 removed as inactive — do not re-add.
 */

export type DataNetwork = 'mtn' | 'glo' | 'airtel' | '9mobile';
export type DataTab = 'daily' | 'weekly' | 'monthly' | 'threemonths' | 'yearly' | 'router';

export interface CatalogPlan {
  /** Primary buy id: 247 plan_id when provider is 247; for 9mobile this is the 247 fallback id */
  id: number;
  network: DataNetwork;
  size: string;
  days: string;
  tab: DataTab;
  retail: number;
  apiPrice: number;
  planType?: string;
  cost?: number;
  /** ClubKonnect PRODUCT_CODE when this plan is bought via ClubKonnect (9mobile primary) */
  ckCode?: number;
  /** Hidden backup 247 plan id (Glo Corporate2) — never exposed via API */
  fallback247Id?: number;
}

export const MTN_DAILY: CatalogPlan[] = [
  { id: 250, network: 'mtn', size: '75MB', days: '1', tab: 'daily', retail: 75, apiPrice: 74, cost: 72.3 },
  { id: 251, network: 'mtn', size: '110MB', days: '1', tab: 'daily', retail: 100, apiPrice: 98, cost: 96.3 },
  { id: 252, network: 'mtn', size: '230MB', days: '1', tab: 'daily', retail: 200, apiPrice: 195, cost: 192.6 },
  { id: 247, network: 'mtn', size: '500MB', days: '1', tab: 'daily', retail: 400, apiPrice: 342, cost: 338 },
  { id: 248, network: 'mtn', size: '750MB', days: '3', tab: 'daily', retail: 450, apiPrice: 440, cost: 435 },
  { id: 253, network: 'mtn', size: '1GB', days: '1', tab: 'daily', retail: 650, apiPrice: 487, cost: 482 },
  { id: 254, network: 'mtn', size: '1.5GB', days: '2', tab: 'daily', retail: 622, apiPrice: 584, cost: 578 },
  { id: 255, network: 'mtn', size: '2GB', days: '2', tab: 'daily', retail: 787, apiPrice: 729, cost: 721.5 },
  { id: 249, network: 'mtn', size: '2.5GB', days: '1', tab: 'daily', retail: 952, apiPrice: 729, cost: 721.5 },
  { id: 256, network: 'mtn', size: '2.5GB', days: '2', tab: 'daily', retail: 955, apiPrice: 875, cost: 865.8 },
  { id: 257, network: 'mtn', size: '3.2GB', days: '2', tab: 'daily', retail: 1100, apiPrice: 972, cost: 962 },
  { id: 104, network: 'mtn', size: '3.5GB', days: '1', tab: 'daily', retail: 1100, apiPrice: 995, cost: 985 },
  { id: 105, network: 'mtn', size: '4GB', days: '2', tab: 'daily', retail: 1300, apiPrice: 1197, cost: 1185 },
  { id: 108, network: 'mtn', size: '6.5GB', days: '2', tab: 'daily', retail: 1800, apiPrice: 1500, cost: 1485 },
];

export const MTN_WEEKLY: CatalogPlan[] = [
  { id: 10, network: 'mtn', size: '500MB', days: '7', tab: 'weekly', retail: 495, apiPrice: 223, cost: 220, planType: 'SME1 DataShare' },
  { id: 9, network: 'mtn', size: '1GB', days: '7', tab: 'weekly', retail: 790, apiPrice: 379, cost: 375, planType: 'SME1 DataShare' },
  { id: 8, network: 'mtn', size: '2GB', days: '7', tab: 'weekly', retail: 925, apiPrice: 702, cost: 695, planType: 'SME1 DataShare' },
  { id: 261, network: 'mtn', size: '1.5GB', days: '7', tab: 'weekly', retail: 1000, apiPrice: 972, cost: 962 },
  { id: 101, network: 'mtn', size: '3.5GB', days: '7', tab: 'weekly', retail: 1545, apiPrice: 1460, cost: 1445 },
  { id: 262, network: 'mtn', size: '6GB', days: '7', tab: 'weekly', retail: 2700, apiPrice: 2430, cost: 2405 },
  { id: 263, network: 'mtn', size: '7GB', days: '7', tab: 'weekly', retail: 3600, apiPrice: 3401, cost: 3367 },
  { id: 102, network: 'mtn', size: '11GB', days: '7', tab: 'weekly', retail: 3713, apiPrice: 3394, cost: 3360 },
  { id: 301, network: 'mtn', size: '15GB', days: '7', tab: 'weekly', retail: 4100, apiPrice: 3889, cost: 3850 },
  { id: 300, network: 'mtn', size: '12.5GB', days: '14', tab: 'weekly', retail: 4550, apiPrice: 4374, cost: 4330 },
  { id: 302, network: 'mtn', size: '18GB', days: '14', tab: 'weekly', retail: 6100, apiPrice: 5828, cost: 5770 },
  { id: 303, network: 'mtn', size: '28GB', days: '14', tab: 'weekly', retail: 8200, apiPrice: 7777, cost: 7700 },
  { id: 304, network: 'mtn', size: '40GB', days: '14', tab: 'weekly', retail: 10300, apiPrice: 9717, cost: 9620 },
];

export const MTN_MONTHLY: CatalogPlan[] = [
  { id: 11, network: 'mtn', size: '1GB', days: '30', tab: 'monthly', retail: 740, apiPrice: 445, cost: 440 },
  { id: 12, network: 'mtn', size: '2GB', days: '30', tab: 'monthly', retail: 1200, apiPrice: 743, cost: 735 },
  { id: 13, network: 'mtn', size: '3GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 1010, cost: 1000 },
  { id: 14, network: 'mtn', size: '5GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1465, cost: 1450 },
  { id: 273, network: 'mtn', size: '7GB', days: '30', tab: 'monthly', retail: 3600, apiPrice: 3405, cost: 3370.5 },
  { id: 15, network: 'mtn', size: '10GB', days: '30', tab: 'monthly', retail: 4100, apiPrice: 2929, cost: 2900 },
  { id: 103, network: 'mtn', size: '20GB', days: '30', tab: 'monthly', retail: 7600, apiPrice: 7171, cost: 7100 },
  { id: 109, network: 'mtn', size: '34GB', days: '30', tab: 'monthly', retail: 10500, apiPrice: 9949, cost: 9850 },
  { id: 279, network: 'mtn', size: '36GB', days: '30', tab: 'monthly', retail: 11500, apiPrice: 10504, cost: 10400 },
  { id: 280, network: 'mtn', size: '75GB', days: '30', tab: 'monthly', retail: 18500, apiPrice: 17170, cost: 17000 },
  { id: 282, network: 'mtn', size: '165GB', days: '30', tab: 'monthly', retail: 35000, apiPrice: 34027, cost: 33690 },
  { id: 281, network: 'mtn', size: '150GB', days: '60', tab: 'monthly', retail: 40000, apiPrice: 38906, cost: 38520 },
  { id: 285, network: 'mtn', size: '200GB', days: '60', tab: 'monthly', retail: 50000, apiPrice: 36865, cost: 36500 },
  { id: 283, network: 'mtn', size: '250GB', days: '30', tab: 'monthly', retail: 55000, apiPrice: 53596, cost: 53065 },
];

export const MTN_THREEMONTHS: CatalogPlan[] = [
  { id: 291, network: 'mtn', size: '450GB', days: '90', tab: 'threemonths', retail: 75000, apiPrice: 73730, cost: 73000 },
  { id: 286, network: 'mtn', size: '480GB', days: '90', tab: 'threemonths', retail: 90000, apiPrice: 88880, cost: 88000 },
];

export const MTN_YEARLY: CatalogPlan[] = [
  { id: 292, network: 'mtn', size: '800GB', days: '365', tab: 'yearly', retail: 127000, apiPrice: 124230, cost: 123000 },
  { id: 293, network: 'mtn', size: '1.5TB', days: '365', tab: 'yearly', retail: 227000, apiPrice: 224220, cost: 222000 },
];

export const AIRTEL_DAILY: CatalogPlan[] = [
  { id: 350, network: 'airtel', size: '75MB', days: '1', tab: 'daily', retail: 75, apiPrice: 74, cost: 72.53, planType: 'Gifting' },
  { id: 351, network: 'airtel', size: '100MB', days: '1', tab: 'daily', retail: 100, apiPrice: 98, cost: 96.7, planType: 'Gifting' },
  { id: 400, network: 'airtel', size: '150MB', days: '1', tab: 'daily', retail: 80, apiPrice: 56, cost: 55, planType: 'SME' },
  { id: 352, network: 'airtel', size: '200MB', days: '1', tab: 'daily', retail: 200, apiPrice: 196, cost: 193.4, planType: 'Gifting' },
  { id: 401, network: 'airtel', size: '250MB Night', days: '1', tab: 'daily', retail: 100, apiPrice: 56, cost: 55, planType: 'SME' },
  { id: 410, network: 'airtel', size: '200MB', days: '2', tab: 'daily', retail: 150, apiPrice: 112, cost: 110, planType: 'SME' },
  { id: 411, network: 'airtel', size: '300MB', days: '2', tab: 'daily', retail: 300, apiPrice: 112, cost: 110, planType: 'SME' },
  { id: 412, network: 'airtel', size: '600MB', days: '2', tab: 'daily', retail: 350, apiPrice: 213, cost: 210, planType: 'SME' },
  { id: 420, network: 'airtel', size: '500MB', days: '3', tab: 'daily', retail: 450, apiPrice: 364, cost: 360, planType: 'SME' },
  { id: 349, network: 'airtel', size: '1GB', days: '1', tab: 'daily', retail: 500, apiPrice: 489, cost: 483.5, planType: 'Gifting' },
  { id: 421, network: 'airtel', size: '1GB', days: '3', tab: 'daily', retail: 550, apiPrice: 324, cost: 320, planType: 'SME' },
  { id: 403, network: 'airtel', size: '1.5GB', days: '1', tab: 'daily', retail: 550, apiPrice: 425, cost: 420, planType: 'SME' },
  { id: 413, network: 'airtel', size: '1.5GB', days: '2', tab: 'daily', retail: 700, apiPrice: 637, cost: 630, planType: 'SME' },
  { id: 409, network: 'airtel', size: '2GB', days: '2', tab: 'daily', retail: 700, apiPrice: 637, cost: 630, planType: 'SME' },
  { id: 415, network: 'airtel', size: '3GB', days: '2', tab: 'daily', retail: 900, apiPrice: 788, cost: 780, planType: 'SME' },
  { id: 414, network: 'airtel', size: '3.2GB', days: '2', tab: 'daily', retail: 1200, apiPrice: 1010, cost: 1000, planType: 'SME' },
  { id: 416, network: 'airtel', size: '5GB', days: '2', tab: 'daily', retail: 1700, apiPrice: 1515, cost: 1500, planType: 'SME' },
  { id: 450, network: 'airtel', size: '6GB', days: '2', tab: 'daily', retail: 1800, apiPrice: 1515, cost: 1500, planType: 'SME' },
];

export const AIRTEL_WEEKLY: CatalogPlan[] = [
  { id: 354, network: 'airtel', size: '500MB', days: '7', tab: 'weekly', retail: 500, apiPrice: 489, cost: 483.5, planType: 'Gifting' },
  { id: 425, network: 'airtel', size: '1.5GB', days: '7', tab: 'weekly', retail: 600, apiPrice: 536, cost: 530, planType: 'SME' },
  { id: 355, network: 'airtel', size: '1GB', days: '7', tab: 'weekly', retail: 800, apiPrice: 782, cost: 773.6, planType: 'Gifting' },
  { id: 357, network: 'airtel', size: '3.5GB', days: '7', tab: 'weekly', retail: 1500, apiPrice: 1466, cost: 1450.5, planType: 'Gifting' },
  { id: 452, network: 'airtel', size: '4GB', days: '7', tab: 'weekly', retail: 1800, apiPrice: 1515, cost: 1500, planType: 'SME' },
  { id: 453, network: 'airtel', size: '6GB', days: '7', tab: 'weekly', retail: 2300, apiPrice: 2020, cost: 2000, planType: 'SME' },
  { id: 358, network: 'airtel', size: '8GB', days: '7', tab: 'weekly', retail: 3000, apiPrice: 2442, cost: 2417.5, planType: 'Gifting' },
  { id: 359, network: 'airtel', size: '10GB', days: '7', tab: 'weekly', retail: 3500, apiPrice: 2931, cost: 2901, planType: 'Gifting' },
  { id: 360, network: 'airtel', size: '18GB', days: '7', tab: 'weekly', retail: 5000, apiPrice: 4884, cost: 4835, planType: 'Gifting' },
  { id: 377, network: 'airtel', size: '20GB', days: '7', tab: 'weekly', retail: 5500, apiPrice: 5050, cost: 5000, planType: 'Gifting' },
];

export const AIRTEL_MONTHLY: CatalogPlan[] = [
  { id: 361, network: 'airtel', size: '2GB', days: '30', tab: 'monthly', retail: 1500, apiPrice: 1466, cost: 1450.5, planType: 'Gifting' },
  { id: 362, network: 'airtel', size: '3GB', days: '30', tab: 'monthly', retail: 2000, apiPrice: 1954, cost: 1934, planType: 'Gifting' },
  { id: 363, network: 'airtel', size: '4GB', days: '30', tab: 'monthly', retail: 2500, apiPrice: 2442, cost: 2417.5, planType: 'Gifting' },
  { id: 364, network: 'airtel', size: '8GB', days: '30', tab: 'monthly', retail: 3000, apiPrice: 2931, cost: 2901, planType: 'Gifting' },
  { id: 430, network: 'airtel', size: '10GB', days: '30', tab: 'monthly', retail: 4000, apiPrice: 3091, cost: 3060, planType: 'SME' },
  { id: 366, network: 'airtel', size: '13GB', days: '30', tab: 'monthly', retail: 5000, apiPrice: 4884, cost: 4835, planType: 'Gifting' },
  { id: 367, network: 'airtel', size: '18GB', days: '30', tab: 'monthly', retail: 6000, apiPrice: 5861, cost: 5802, planType: 'Gifting' },
  { id: 368, network: 'airtel', size: '25GB', days: '30', tab: 'monthly', retail: 8000, apiPrice: 7814, cost: 7736, planType: 'Gifting' },
  { id: 369, network: 'airtel', size: '35GB', days: '30', tab: 'monthly', retail: 10000, apiPrice: 9767, cost: 9670, planType: 'Gifting' },
  { id: 446, network: 'airtel', size: '40GB', days: '30', tab: 'monthly', retail: 11500, apiPrice: 10100, cost: 10000, planType: 'Gifting' },
  { id: 370, network: 'airtel', size: '60GB', days: '30', tab: 'monthly', retail: 15000, apiPrice: 14651, cost: 14505, planType: 'Gifting' },
  { id: 447, network: 'airtel', size: '75GB', days: '30', tab: 'monthly', retail: 16500, apiPrice: 15150, cost: 15000, planType: 'Gifting' },
  { id: 371, network: 'airtel', size: '100GB', days: '30', tab: 'monthly', retail: 20000, apiPrice: 19534, cost: 19340, planType: 'Gifting' },
  { id: 372, network: 'airtel', size: '160GB', days: '30', tab: 'monthly', retail: 30150, apiPrice: 29301, cost: 29010, planType: 'Gifting' },
  { id: 373, network: 'airtel', size: '210GB', days: '30', tab: 'monthly', retail: 40200, apiPrice: 39067, cost: 38680, planType: 'Gifting' },
];

export const AIRTEL_THREEMONTHS: CatalogPlan[] = [
  { id: 374, network: 'airtel', size: '300GB', days: '90', tab: 'threemonths', retail: 50300, apiPrice: 48834, cost: 48350, planType: 'Gifting' },
  { id: 375, network: 'airtel', size: '350GB', days: '120', tab: 'threemonths', retail: 60300, apiPrice: 58601, cost: 58020, planType: 'Gifting' },
];

export const AIRTEL_ROUTER: CatalogPlan[] = [
  { id: 384, network: 'airtel', size: '20 Mbps', days: '30', tab: 'router', retail: 30000, apiPrice: 29088, cost: 28800, planType: 'Router' },
  { id: 385, network: 'airtel', size: '50 Mbps', days: '30', tab: 'router', retail: 25000, apiPrice: 24240, cost: 24000, planType: 'Router' },
  { id: 386, network: 'airtel', size: '100 Mbps', days: '30', tab: 'router', retail: 45000, apiPrice: 43632, cost: 43200, planType: 'Router' },
  { id: 387, network: 'airtel', size: '60 Mbps', days: '30', tab: 'router', retail: 50000, apiPrice: 48480, cost: 48000, planType: 'Router' },
  { id: 388, network: 'airtel', size: '60 Mbps', days: '90', tab: 'router', retail: 136000, apiPrice: 136350, cost: 135000, planType: 'Router' },
  { id: 390, network: 'airtel', size: '20 Mbps', days: '90', tab: 'router', retail: 81000, apiPrice: 80800, cost: 80000, planType: 'Router' },
  { id: 391, network: 'airtel', size: '20 Mbps', days: '180', tab: 'router', retail: 151000, apiPrice: 151500, cost: 150000, planType: 'Router' },
  { id: 393, network: 'airtel', size: '100 Mbps', days: '30', tab: 'router', retail: 45000, apiPrice: 43632, cost: 43200, planType: 'Router' },
  { id: 392, network: 'airtel', size: '50 Mbps', days: '30', tab: 'router', retail: 25000, apiPrice: 24240, cost: 24000, planType: 'Router' },
];

export const AIRTEL_YEARLY: CatalogPlan[] = [
  { id: 376, network: 'airtel', size: '650GB', days: '365', tab: 'yearly', retail: 100500, apiPrice: 97667, cost: 96700, planType: 'Gifting' },
];

export const GLO_DAILY: CatalogPlan[] = [
  { id: 110, network: 'glo', size: '750MB SME', days: '1', tab: 'daily', retail: 210, apiPrice: 182, cost: 180, planType: 'SME' },
  { id: 111, network: 'glo', size: '1.5GB SME', days: '1', tab: 'daily', retail: 325, apiPrice: 273, cost: 270, planType: 'SME' },
  { id: 112, network: 'glo', size: '2.5GB SME', days: '2', tab: 'daily', retail: 510, apiPrice: 455, cost: 450, planType: 'SME' },
  { id: 702, network: 'glo', size: '1GB', days: '3', tab: 'daily', retail: 355, apiPrice: 334, cost: 330, planType: 'Corporate2', fallback247Id: 45 },
  { id: 703, network: 'glo', size: '2GB', days: '3', tab: 'daily', retail: 720, apiPrice: 667, cost: 660, planType: 'Corporate2' },
  { id: 704, network: 'glo', size: '3GB', days: '3', tab: 'daily', retail: 1060, apiPrice: 1000, cost: 990, planType: 'Corporate2', fallback247Id: 46 },
  { id: 706, network: 'glo', size: '5GB', days: '3', tab: 'daily', retail: 1850, apiPrice: 1667, cost: 1650, planType: 'Corporate2', fallback247Id: 47 },
  { id: 707, network: 'glo', size: '10GB', days: '3', tab: 'daily', retail: 3600, apiPrice: 3333, cost: 3300, planType: 'Corporate2' },
];

export const GLO_WEEKLY: CatalogPlan[] = [
  { id: 710, network: 'glo', size: '1GB', days: '7', tab: 'weekly', retail: 370, apiPrice: 349, cost: 345, planType: 'Corporate2', fallback247Id: 60 },
  { id: 711, network: 'glo', size: '2GB', days: '7', tab: 'weekly', retail: 730, apiPrice: 691, cost: 684, planType: 'Corporate2' },
  { id: 712, network: 'glo', size: '3GB', days: '7', tab: 'weekly', retail: 1115, apiPrice: 1037, cost: 1026, planType: 'Corporate2', fallback247Id: 61 },
  { id: 714, network: 'glo', size: '5GB', days: '7', tab: 'weekly', retail: 1860, apiPrice: 1728, cost: 1710, planType: 'Corporate2', fallback247Id: 62 },
  { id: 113, network: 'glo', size: '10GB SME', days: '7', tab: 'weekly', retail: 2030, apiPrice: 1818, cost: 1800, planType: 'SME' },
];

export const GLO_MONTHLY: CatalogPlan[] = [
  { id: 701, network: 'glo', size: '500MB', days: '30', tab: 'monthly', retail: 250, apiPrice: 197, cost: 195, planType: 'Corporate2', fallback247Id: 51 },
  { id: 720, network: 'glo', size: '1GB', days: '30', tab: 'monthly', retail: 450, apiPrice: 389, cost: 385, planType: 'Corporate2', fallback247Id: 52 },
  { id: 721, network: 'glo', size: '2GB', days: '30', tab: 'monthly', retail: 910, apiPrice: 768, cost: 760, planType: 'Corporate2', fallback247Id: 53 },
  { id: 722, network: 'glo', size: '3GB', days: '30', tab: 'monthly', retail: 1360, apiPrice: 1152, cost: 1140, planType: 'Corporate2', fallback247Id: 54 },
  { id: 724, network: 'glo', size: '5GB', days: '30', tab: 'monthly', retail: 2350, apiPrice: 1919, cost: 1900, planType: 'Corporate2', fallback247Id: 55 },
  { id: 730, network: 'glo', size: '10GB', days: '30', tab: 'monthly', retail: 4500, apiPrice: 3838, cost: 3800, planType: 'Corporate2', fallback247Id: 56 },
];


/** 9mobile Monthly — ClubKonnect primary (MobileNetwork=03, DataPlan=ckCode), 247 id fallback */
export const NINEMOBILE_MONTHLY: CatalogPlan[] = [
  { id: 80, network: '9mobile', size: '500MB', days: '30', tab: 'monthly', retail: 250, apiPrice: 232, cost: 228.78, planType: 'SME', ckCode: 4 },
  { id: 81, network: '9mobile', size: '1GB', days: '30', tab: 'monthly', retail: 495, apiPrice: 463, cost: 457.56, planType: 'SME', ckCode: 5 },
  { id: 82, network: '9mobile', size: '2GB', days: '30', tab: 'monthly', retail: 985, apiPrice: 925, cost: 915.12, planType: 'SME', ckCode: 6 },
  { id: 83, network: '9mobile', size: '3GB', days: '30', tab: 'monthly', retail: 1480, apiPrice: 1387, cost: 1372.68, planType: 'SME', ckCode: 7 },
  { id: 84, network: '9mobile', size: '5GB', days: '30', tab: 'monthly', retail: 2450, apiPrice: 2311, cost: 2287.8, planType: 'SME', ckCode: 9 },
];

/**
 * Glo large ClubKonnect plans — HELD BACK (not in DATA_CATALOG, not sold, not
 * shown to the child panel) until their ClubKonnect PRODUCT_CODEs arrive.
 * When they do, move each row below into GLO_MONTHLY (or a new GLO_CK_MONTHLY)
 * with id = hidden 247 fallback and ckCode = PRODUCT_CODE.
 */
export const GLO_CK_PENDING: Omit<CatalogPlan, 'id'>[] = [
  { network: 'glo', size: '12.5GB', days: '30', tab: 'monthly', retail: 4000, apiPrice: 3859, cost: 3820, planType: 'Corporate2' },
  { network: 'glo', size: '28GB', days: '30', tab: 'monthly', retail: 8000, apiPrice: 7717, cost: 7640, planType: 'Corporate2' },
  { network: 'glo', size: '38GB', days: '30', tab: 'monthly', retail: 10000, apiPrice: 9646, cost: 9550, planType: 'Corporate2' },
  { network: 'glo', size: '64GB', days: '30', tab: 'monthly', retail: 15000, apiPrice: 14469, cost: 14325, planType: 'Corporate2' },
  { network: 'glo', size: '107GB', days: '30', tab: 'monthly', retail: 20000, apiPrice: 19291, cost: 19100, planType: 'Corporate2' },
  { network: 'glo', size: '165GB', days: '30', tab: 'monthly', retail: 30000, apiPrice: 28937, cost: 28650, planType: 'Corporate2' },
  { network: 'glo', size: '220GB', days: '30', tab: 'monthly', retail: 40000, apiPrice: 34724, cost: 34380, planType: 'Corporate2' },
  { network: 'glo', size: '1TB', days: '365', tab: 'monthly', retail: 150000, apiPrice: 144683, cost: 143250, planType: 'Corporate2' },
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
  ...NINEMOBILE_MONTHLY,
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
