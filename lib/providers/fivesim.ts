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

async function fivesimGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
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

/** Buy activation. product e.g. telegram, country e.g. usa */
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
