/**
 * AnyMessage (anymessage.shop) — temporary / short-term email API.
 * Docs: https://telegra.ph/A-guide-to-API-AnyMessage-Shop-01-21-2
 */

const BASE = 'https://api.anymessage.shop';

function token(): string {
  const t = process.env.ANYMESSAGE_API_TOKEN;
  if (!t) throw new Error('ANYMESSAGE_API_TOKEN is not configured');
  return t;
}

export function isConfigured() {
  return Boolean(process.env.ANYMESSAGE_API_TOKEN);
}

async function get<T = unknown>(path: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams({ token: token(), ...params });
  const res = await fetch(`${BASE}${path}?${q.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`AnyMessage ${path} HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type BalanceResponse = { status: string; balance?: string | number; value?: string };

export async function getBalance(): Promise<number> {
  const data = await get<BalanceResponse>('/user/balance');
  if (data.status !== 'success') throw new Error(data.value || 'balance failed');
  return Number(data.balance) || 0;
}

export type DomainStock = {
  count: number;
  price: number; // USD
};

export type QuantityResponse = {
  status: string;
  data?: Record<string, DomainStock>;
  value?: string;
};

/** Live stock + provider cost for a site (e.g. instagram.com). */
export async function getQuantity(site: string): Promise<Record<string, DomainStock>> {
  const clean = site
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();
  const data = await get<QuantityResponse>('/email/quantity', { site: clean });
  if (data.status !== 'success' || !data.data) {
    throw new Error(data.value || 'quantity failed');
  }
  return data.data;
}

export type OrderResponse = {
  status: string;
  id?: string;
  email?: string;
  value?: string;
};

export async function orderEmail(opts: {
  site: string;
  domain: string;
  regex?: string;
  subject?: string;
}): Promise<{ id: string; email: string }> {
  const params: Record<string, string> = {
    site: opts.site,
    domain: opts.domain,
  };
  if (opts.regex) params.regex = opts.regex;
  if (opts.subject) params.subject = opts.subject;

  const data = await get<OrderResponse>('/email/order', params);
  if (data.status !== 'success' || !data.id || !data.email) {
    throw new Error(data.value || 'order failed');
  }
  return { id: String(data.id), email: data.email };
}

export type MessageResponse = {
  status: string;
  value?: string;
  message?: string;
};

export async function getMessage(id: string, preview = false): Promise<MessageResponse> {
  const params: Record<string, string> = { id };
  if (preview) params.preview = '1';
  return get<MessageResponse>('/email/getmessage', params);
}

export async function cancelEmail(id: string): Promise<void> {
  const data = await get<{ status: string; value?: string }>('/email/cancel', { id });
  if (data.status !== 'success') {
    throw new Error(data.value || 'cancel failed');
  }
}

export async function reorderEmail(opts: {
  id?: string;
  email?: string;
  site?: string;
  regex?: string;
  subject?: string;
}): Promise<{ id: string; email: string }> {
  const params: Record<string, string> = {};
  if (opts.id) params.id = opts.id;
  if (opts.email) params.email = opts.email;
  if (opts.site) params.site = opts.site;
  if (opts.regex) params.regex = opts.regex;
  if (opts.subject) params.subject = opts.subject;

  const data = await get<OrderResponse>('/email/reorder', params);
  if (data.status !== 'success' || !data.id || !data.email) {
    throw new Error(data.value || 'reorder failed');
  }
  return { id: String(data.id), email: data.email };
}

// ---------------------------------------------------------------------------
// Pricing (locked product rule)
// ---------------------------------------------------------------------------

const DEFAULT_RATE = 1380;
const DEFAULT_FLAT_MARKUP_USD = 0.25;

/**
 * (provider cost + flat markup) x rate, rounded.
 * Owner rule: prices above 450 up to 500 snap to 500.
 * Above 500 the real price stays — NO hard ceiling anymore.
 * Live requests pass markup + rate from lib/email-otp-pricing.
 */
export function emailOtpPriceNgn(
  providerCostUsd: number,
  markupUsd = Number(process.env.EMAIL_OTP_FLAT_MARKUP_USD) || DEFAULT_FLAT_MARKUP_USD,
  rate = Number(process.env.USD_NGN_RATE) || DEFAULT_RATE,
): number {
  const ngn = Math.round((providerCostUsd + markupUsd) * rate);
  if (ngn > 450 && ngn <= 500) return 500;
  return ngn;
}

export type PricedDomain = {
  domain: string;
  count: number;
  costUsd: number;
  priceNgn: number;
};

/** Normalize quantity response into customer-facing priced list (stock > 0 first). */
export function priceDomains(
  raw: Record<string, DomainStock>,
  opts?: { markup?: number; rate?: number },
): PricedDomain[] {
  const list: PricedDomain[] = Object.entries(raw).map(([domain, row]) => ({
    domain,
    count: Number(row.count) || 0,
    costUsd: Number(row.price) || 0,
    priceNgn: emailOtpPriceNgn(Number(row.price) || 0, opts?.markup, opts?.rate),
  }));

  // In-stock first, then cheapest
  return list.sort((a, b) => {
    if (a.count > 0 && b.count === 0) return -1;
    if (b.count > 0 && a.count === 0) return 1;
    return a.priceNgn - b.priceNgn || a.domain.localeCompare(b.domain);
  });
}
