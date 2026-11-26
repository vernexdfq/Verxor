/**
 * Rent-a-line pricing (SignalWire numbers) — VERXOR MASTER PRICING RULES.
 *
 * Provider base cost ₦690/month; tiers below are fixed NGN per audience
 * (Child Panel / API Developer / Retail Customer), rounded to ₦50.
 * Optional admin override in admin_settings key 'rent_line_pricing':
 *   { "30d": { "child": 4200, "api": 4800, "retail": 5500 }, ... }
 * Only supplied tiers override the master defaults. 60s cache.
 */

export type RentLineAudience = 'retail' | 'child' | 'api';

export const RENT_LINE_PERIODS: Record<string, { label: string; days: number }> = {
  '30d': { label: '1 Month', days: 30 },
  '90d': { label: '3 Months', days: 90 },
  '180d': { label: '6 Months', days: 180 },
  '365d': { label: '12 Months', days: 365 },
};

/** Master tier prices (NGN). */
export const MASTER_RENT_LINE_PRICES: Record<string, Record<RentLineAudience, number>> = {
  '30d': { child: 4200, api: 4800, retail: 5500 },
  '90d': { child: 10350, api: 11500, retail: 13800 },
  '180d': { child: 17500, api: 19800, retail: 23500 },
  '365d': { child: 25900, api: 28900, retail: 34450 },
};

let cache: { at: number; prices: Record<string, Record<RentLineAudience, number>> } | null = null;

export async function loadRentLinePricing(): Promise<Record<string, Record<RentLineAudience, number>>> {
  if (cache && Date.now() - cache.at < 60000) return cache.prices;
  const prices: Record<string, Record<RentLineAudience, number>> = JSON.parse(JSON.stringify(MASTER_RENT_LINE_PRICES));
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(
        `${base}/rest/v1/admin_settings?key=eq.rent_line_pricing&select=value&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string }>;
        const parsed = rows?.[0]?.value ? (JSON.parse(rows[0].value) as Record<string, Record<string, unknown>>) : null;
        if (parsed && typeof parsed === 'object') {
          for (const [period, tiers] of Object.entries(parsed)) {
            if (!RENT_LINE_PERIODS[period] || !tiers || typeof tiers !== 'object') continue;
            for (const aud of ['child', 'api', 'retail'] as RentLineAudience[]) {
              const n = Number((tiers as Record<string, unknown>)[aud]);
              if (Number.isFinite(n) && n > 0) prices[period][aud] = n;
            }
          }
        }
      }
    } catch {
      /* admin pricing unavailable — master defaults apply */
    }
  }
  cache = { at: Date.now(), prices };
  return prices;
}

/** Tier price in NGN for a period + audience. 0 = not priced. */
export async function rentLinePriceNgn(period: string, audience: RentLineAudience = 'retail'): Promise<number> {
  const prices = await loadRentLinePricing();
  const tier = prices[period];
  if (!tier) return 0;
  const n = tier[audience] || tier.retail || 0;
  return n > 0 ? n : 0;
}
