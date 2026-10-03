/**
 * PVAPins REST API (server-only). Non-VoIP focus.
 * Base: https://api.pvapins.com
 * Auth: X-API-Key: sk_live_...
 */

const BASE = process.env.PVAPINS_API_URL || 'https://api.pvapins.com';

function apiKey(): string {
  const key = process.env.PVAPINS_API_KEY;
  if (!key) throw new Error('PVAPINS_API_KEY is not configured');
  return key;
}

async function pvaFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': apiKey(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PVAPins ${res.status}: ${text.slice(0, 240)}`);
  }
  return res.json();
}

export async function getAccount() {
  return pvaFetch('/api/v1/account');
}

export async function listCountries() {
  return pvaFetch('/api/v1/countries');
}

export async function listServices() {
  return pvaFetch('/api/v1/services');
}

/** Operators + prices for country+service (most reliable first). */
export async function listOperators(country: string, service: string) {
  const q = new URLSearchParams({
    country: country.toUpperCase(),
    service,
  });
  return pvaFetch(`/api/v1/operators?${q.toString()}`);
}

export async function listOffers(country: string, service: string) {
  const data = await listOperators(country, service);
  const ops = (data?.operators || data || []) as Array<any>;
  return ops
    .map((o) => ({
      operator: String(o.displayId ?? o.operator ?? o.id ?? ''),
      cost: Number(o.price ?? o.cost ?? 0),
      count: o.count == null ? null : Number(o.count),
      label: o.label as string | undefined,
    }))
    .filter((o) => o.cost > 0)
    .sort((a, b) => a.cost - b.cost);
}

export async function createOrder(opts: {
  country: string;
  service: string;
  operator?: number;
  idempotencyKey?: string;
}) {
  const headers: Record<string, string> = {};
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  const body: Record<string, unknown> = {
    country: opts.country.toUpperCase(),
    service: opts.service,
  };
  if (opts.operator != null) body.operator = opts.operator;
  return pvaFetch('/api/v1/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

export async function getOrder(id: string) {
  return pvaFetch(`/api/v1/orders/${encodeURIComponent(id)}`);
}

export function isConfigured() {
  return Boolean(process.env.PVAPINS_API_KEY);
}
