/**
 * 5SIM API client (server-only).
 * Docs: https://5sim.net
 */

const BASE = 'https://5sim.net/v1';

function apiKey(): string {
  const key = process.env.FIVESIM_API_KEY;
  if (!key) throw new Error('FIVESIM_API_KEY is not configured');
  return key;
}

async function fivesimGet(path: string, auth = true) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth) headers.Authorization = `Bearer ${apiKey()}`;
  const res = await fetch(`${BASE}${path}`, { headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`5SIM ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getBalance(): Promise<number> {
  const data = await fivesimGet('/user/profile');
  return Number(data?.balance ?? 0);
}

/** Guest prices for country+product. Returns operator → { cost, count, rate }. */
export async function getPricesByCountryProduct(country: string, product: string) {
  const q = new URLSearchParams({
    country: country.toLowerCase(),
    product: product.toLowerCase(),
  });
  return fivesimGet(`/guest/prices?${q.toString()}`, false);
}

/** Flatten guest prices into rows with cost + operator + stock. */
export async function listOffers(country: string, product: string) {
  const data = await getPricesByCountryProduct(country, product);
  const rows: Array<{ operator: string; cost: number; count: number; rate?: number }> = [];
  const byCountry = data?.[country.toLowerCase()] || data;
  const byProduct = byCountry?.[product.toLowerCase()] || byCountry;
  if (!byProduct || typeof byProduct !== 'object') return rows;

  for (const [operator, info] of Object.entries(byProduct as Record<string, any>)) {
    if (!info || typeof info !== 'object') continue;
    const cost = Number(info.cost ?? info.Price ?? info.price ?? 0);
    const count = Number(info.count ?? info.Qty ?? 0);
    if (cost > 0) {
      rows.push({ operator, cost, count, rate: Number(info.rate ?? 0) || undefined });
    }
  }
  return rows.sort((a, b) => a.cost - b.cost);
}

export async function buyActivation(opts: {
  country: string;
  product: string;
  operator?: string;
}) {
  const operator = opts.operator || 'any';
  const path = `/user/buy/activation/${encodeURIComponent(opts.country)}/${encodeURIComponent(operator)}/${encodeURIComponent(opts.product)}`;
  return fivesimGet(path);
}

export async function checkOrder(orderId: string | number) {
  return fivesimGet(`/user/check/${orderId}`);
}

export async function cancelOrder(orderId: string | number) {
  return fivesimGet(`/user/cancel/${orderId}`);
}

export function isConfigured() {
  return Boolean(process.env.FIVESIM_API_KEY);
}
