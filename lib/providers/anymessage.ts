/**
 * AnyMessage (anymessage.shop) — temporary / short-term email API.
 * Docs: https://telegra.ph/A-guide-to-API-AnyMessage-Shop-01-21-2
 * Russian guide: https://telegra.ph/Rukovodstvo-po-API-AnyMessage-Shop-01-28
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${BASE}${path}?${q.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Provider HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
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

export function normalizeSite(raw: string): string {
  let s = (raw || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .trim();
  if (s && !s.includes('.')) {
    s = `${s}.com`;
  }
  return s;
}

/** Live stock + provider cost for a site (e.g. instagram.com). */
export async function getQuantity(site: string): Promise<Record<string, DomainStock>> {
  const clean = normalizeSite(site);
  if (!clean || clean.length < 3) {
    throw new Error('Please enter a valid website name (e.g. instagram.com)');
  }
  const data = await get<QuantityResponse>('/email/quantity', { site: clean });
  if (data.status !== 'success' || !data.data) {
    if (data.value === 'site') {
      throw new Error('Platform domain not recognized by provider. Try entering the full domain like instagram.com');
    }
    throw new Error(data.value || 'Failed to retrieve available domains');
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
  const site = normalizeSite(opts.site);
  const domain = (opts.domain || '').trim().toLowerCase();
  const params: Record<string, string> = { site, domain };
  if (opts.regex) params.regex = opts.regex;
  if (opts.subject) params.subject = opts.subject;

  const data = await get<OrderResponse>('/email/order', params);
  if (data.status !== 'success' || !data.id || !data.email) {
    const val = String(data.value || '').toLowerCase();
    if (val.includes('no emails')) {
      throw new Error('NO_EMAILS_AVAILABLE');
    }
    if (val.includes('no balance') || val.includes('token')) {
      throw new Error('PROVIDER_TEMPORARILY_UNAVAILABLE');
    }
    throw new Error(data.value || 'Order creation failed');
  }
  return { id: String(data.id), email: data.email };
}

export type MessageResponse = {
  status: string;
  value?: string;
  message?: string;
};

export async function getMessage(id: string, preview = false): Promise<MessageResponse> {
  const params: Record<string, string> = { id: String(id).trim() };
  if (preview) params.preview = '1';
  return get<MessageResponse>('/email/getmessage', params);
}

export async function cancelEmail(id: string): Promise<void> {
  const data = await get<{ status: string; value?: string }>('/email/cancel', { id: String(id).trim() });
  if (data.status !== 'success') {
    const val = String(data.value || '').toLowerCase();
    if (
      val.includes('already') ||
      val.includes('no activation') ||
      val.includes('canceled') ||
      val.includes('cancelled')
    ) {
      return;
    }
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

export type ParsedOtp = {
  code: string | null;
  cleanText: string;
  link: string | null;
};

/**
 * Intelligent parser for AnyMessage response:
 * - value: e.g. "111111" (extracted OTP) or "wait message" or a verification URL
 * - message: e.g. "<html>...</html>" or plain text body
 */
export function parseOtpMessage(raw: { value?: string; message?: string }): ParsedOtp {
  const value = String(raw.value || '').trim();
  const rawMsg = String(raw.message || '').trim();

  let code: string | null = null;
  let link: string | null = null;

  // Check if value is a verification URL
  if (/^https?:\/\//i.test(value)) {
    link = value;
  } else if (value && value !== 'wait message') {
    const cleanVal = value.replace(/[^a-zA-Z0-9-]/g, '');
    if (cleanVal.length >= 3 && cleanVal.length <= 12) {
      code = cleanVal;
    }
  }

  // Strip HTML tags, styles, scripts to extract clean text
  let clean = rawMsg
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // If no link found yet, look for verification link in raw HTML or clean text
  if (!link) {
    const linkMatch = rawMsg.match(/href=["'](https?:\/\/[^"'>\s]+(?:verify|confirm|activate|token|validation)[^"'>\s]*)["']/i);
    if (linkMatch && linkMatch[1]) {
      link = linkMatch[1];
    }
  }

  // If no code extracted from value, try extracting from clean text
  if (!code && clean) {
    const digitMatch = clean.match(/\b([0-9]{4,8})\b/);
    if (digitMatch) {
      code = digitMatch[1];
    } else {
      const prefixMatch = clean.match(/(?:code|otp|pin|token)\s*(?:is)?\s*[:#-]?\s*([A-Za-z0-9-]{4,10})\b/i);
      if (prefixMatch && !/^(?:is|code|your|the)$/i.test(prefixMatch[1])) {
        code = prefixMatch[1];
      }
    }
  }

  // Fallback: if clean text is empty but value is present
  if (!clean && value && value !== 'wait message') {
    clean = value;
  }

  return { code, cleanText: clean, link };
}

// ---------------------------------------------------------------------------
// Pricing (locked product rule)
// ---------------------------------------------------------------------------

const DEFAULT_RATE = 1380;
const DEFAULT_FLAT_MARKUP_USD = 0.25;

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
