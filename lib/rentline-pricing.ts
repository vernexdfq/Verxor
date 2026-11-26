/**
 * Rent-a-line pricing (SignalWire numbers).
 * Monthly retail NGN per country lives in admin_settings key
 * 'rent_line_pricing' as JSON: { "US": 6990, "GB": 7990, ... }
 * Period multipliers match the periods offered in the UI.
 * 60s cache, safe defaults so the service never prices blind.
 */

export const RENT_LINE_PERIODS: Record<string, { label: string; days: number; mult: number }> = {
  '30d': { label: '1 Month', days: 30, mult: 1 },
  '90d': { label: '3 Months', days: 90, mult: 2.55 },
  '365d': { label: '12 Months', days: 365, mult: 8.4 },
};

export const DEFAULT_RENT_LINE_MONTHLY_NGN: Record<string, number> = {
  US: 6990,
  CA: 6490,
  GB: 7990,
  AU: 8990,
  DE: 8490,
  FR: 7990,
  NL: 7990,
  SE: 8490,
};

let cache: { at: number; prices: Record<string, number> } | null = null;

export async function loadRentLinePricing(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < 60000) return cache.prices;
  const prices = { ...DEFAULT_RENT_LINE_MONTHLY_NGN };
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
        const parsed = rows?.[0]?.value ? (JSON.parse(rows[0].value) as Record<string, unknown>) : null;
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            const n = Number(v);
            if (/^[A-Z]{2}$/.test(k) && Number.isFinite(n) && n > 0) prices[k] = n;
          }
        }
      }
    } catch {
      /* admin pricing unavailable — defaults apply */
    }
  }
  cache = { at: Date.now(), prices };
  return prices;
}

/** Retail price in NGN for a country + period. 0 = country not priced. */
export async function rentLinePriceNgn(country: string, period: string): Promise<number> {
  const prices = await loadRentLinePricing();
  const monthly = prices[(country || '').toUpperCase()];
  const p = RENT_LINE_PERIODS[period] || RENT_LINE_PERIODS['30d'];
  if (!monthly || monthly <= 0) return 0;
  return Math.round(monthly * p.mult);
}
