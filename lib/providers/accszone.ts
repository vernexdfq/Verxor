/**
 * AccsZone reseller API — accounts / logs catalogue + purchase.
 * Server-side only. Never expose API key, raw provider cost, or supplier identity to the client.
 *
 * Auth: X-API-Key
 * Base: ACCSZONE_API_BASE (default https://accszone.com/api/v1)
 * Catalogue rate limit: 30 req/min shared across categories + listings.
 */

export type AccsZoneListing = {
  id: number;
  title: string;
  slug: string;
  price: string;
  available_stock: number;
  sold?: number;
  sort_key?: number;
  category?: { id: number; title: string; slug: string };
  subcategory?: { id: number; title: string; slug: string } | null;
  description?: string;
  format?: string;
};

export type AccsZoneSubcategory = {
  id: number;
  title: string;
  slug: string;
};

export type AccsZoneCategory = {
  id: number;
  title: string;
  slug: string;
  image?: string;
};

/** Public account row for Buy Logs (no provider cost, no provider name). */
export type AccountOffer = {
  id: string;
  providerListingId: number;
  slug: string;
  platform: string;
  subtype: string;
  subtypeId: number | null;
  title: string;
  shortTitle: string;
  description: string;
  format: string;
  age: string;
  country: string;
  priceNgn: number;
  stock: number;
  sold: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
  badge?: 'INSTANT' | 'SOFTREG' | 'AGED' | 'PVA';
};

export type AccountSubtype = {
  id: number | null;
  name: string;
  slug: string;
  count: number;
  stock: number;
};

export type AccountsCatalog = {
  ok: boolean;
  source: 'live' | 'cached' | 'fallback' | 'empty' | 'error';
  platform: string;
  rate: number;
  updatedAt: string;
  subtypes: AccountSubtype[];
  offers: AccountOffer[];
  total: number;
  inStock: number;
  error?: string;
  warning?: string;
};

const DEFAULT_BASE = 'https://accszone.com/api/v1';
const DEFAULT_RATE = 1380;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Retail multipliers (end-user). */
export function retailMultiplier(costUsd: number): number {
  if (costUsd <= 1) return 3.0;
  if (costUsd <= 10) return 2.0;
  return 1.4;
}

/** Round up to nearest ₦50. */
export function roundUpNgn50(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n / 50) * 50;
}

export function retailPriceNgn(costUsd: number, rate = DEFAULT_RATE): number {
  const usd = costUsd * retailMultiplier(costUsd);
  return roundUpNgn50(usd * rate);
}

function baseUrl(): string {
  return (process.env.ACCSZONE_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

function apiKey(): string | undefined {
  return process.env.ACCSZONE_API_KEY || undefined;
}

function exchangeRate(): number {
  const n = Number(process.env.USD_NGN_RATE || DEFAULT_RATE);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RATE;
}

async function accsFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error('ACCSZONE_API_KEY is not configured');
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-API-Key': key,
      'User-Agent': 'Verxor/1.0',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') || 5);
    const err = new Error(`AccsZone rate limit — retry after ${retry}s`);
    (err as Error & { retryAfter?: number }).retryAfter = retry;
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `AccsZone HTTP ${res.status}`);
  }
  return body as T;
}

type ListResponse<T> = {
  success: boolean;
  data: T;
  meta?: { current_page: number; per_page: number; last_page: number; total: number };
};

async function paginateListings(categoryId: number): Promise<AccsZoneListing[]> {
  const out: AccsZoneListing[] = [];
  let page = 1;
  let last = 1;
  while (page <= last) {
    const res = await accsFetch<ListResponse<AccsZoneListing[]>>(
      `/listings?page=${page}&category_id=${categoryId}&include=description`,
    );
    const batch = Array.isArray(res.data) ? res.data : [];
    out.push(...batch);
    last = res.meta?.last_page || 1;
    page += 1;
    if (page <= last) await sleep(200);
  }
  return out;
}

async function fetchSubcategories(categoryId: number): Promise<AccsZoneSubcategory[]> {
  const res = await accsFetch<
    ListResponse<{ category: AccsZoneCategory; subcategories: AccsZoneSubcategory[] }>
  >(`/categories/${categoryId}/subcategories?page=1`);
  const data = res.data;
  if (data && Array.isArray((data as { subcategories?: AccsZoneSubcategory[] }).subcategories)) {
    return (data as { subcategories: AccsZoneSubcategory[] }).subcategories;
  }
  if (Array.isArray(data)) return data as unknown as AccsZoneSubcategory[];
  return [];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function enrichFromTitle(title: string): {
  age: string;
  country: string;
  tags: string[];
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  badge?: AccountOffer['badge'];
} {
  const t = title.toLowerCase();
  const tags: string[] = [];
  let country = 'Mixed';
  let age = 'Mixed';
  let badge: AccountOffer['badge'] | undefined;

  if (/\busa\b|\bus\b|united states/.test(t)) country = 'USA';
  else if (/\buk\b|united kingdom|europe|france|germany|italy|spain/.test(t)) country = 'Europe';
  else if (/canada|oceania|new zealand|australia/.test(t)) country = 'North America \/ Oceania';
  else if (/latin|colombia|brazil|mexico|argentina/.test(t)) country = 'Latin America';
  else if (/africa|algeria|nigeria|middle east/.test(t)) country = 'Middle East & Africa';
  else if (/asia|bangladesh|india|pacific/.test(t)) country = 'Asia & Pacific';
  else if (/\bmix\b|mixed/.test(t)) country = 'Mixed';

  if (/2007|2008|2009|2010|2011|2012|2013|2014|2015|aged/.test(t)) {
    age = 'Aged';
    badge = 'AGED';
    tags.push('Aged');
  } else if (/soft.?reg|fresh|new to/.test(t)) {
    age = 'New–6 mo';
    badge = 'SOFTREG';
    tags.push('Softreg');
  } else if (/\bpva\b|phone.?verif/.test(t)) {
    badge = 'PVA';
    tags.push('PVA');
  } else {
    badge = 'INSTANT';
  }

  const cookies = /cookie/.test(t);
  const twoFa = /2fa|two.?factor/.test(t);
  const emailIncluded =
    /email (access|included|in set)|@outlook|@hotmail|@gmail|email verified & included/.test(t);
  if (cookies) tags.push('Cookies');
  if (twoFa) tags.push('2FA');
  if (emailIncluded) tags.push('Email');
  if (/marketplace/.test(t)) tags.push('Marketplace');
  if (/with page|\bpage\b/.test(t)) tags.push('With Page');
  if (/friend/.test(t)) tags.push('Friends');
  if (/ads|business manager|\bbm\b/.test(t)) tags.push('Ads');

  return { age, country, tags, instant: true, cookies, emailIncluded, twoFa, badge };
}

function shortTitle(title: string, max = 42): string {
  const clean = title.replace(/\s*\|\s*/g, ' · ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function htmlToPlainText(input: string): string {
  if (!input) return '';
  let s = input;
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*p\s*>/gi, '\n');
  s = s.replace(/<\/\s*li\s*>/gi, '\n');
  s = s.replace(/<\/\s*h[1-6]\s*>/gi, '\n');
  s = s.replace(/<\s*li[^>]*>/gi, '• ');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function scrubProviderTraces(text: string): string {
  if (!text) return '';
  let s = text;
  const patterns = [
    /accs\s*zone/gi,
    /accszone/gi,
    /accs\s*market/gi,
    /accsmarket/gi,
    /https?:\/\/(?:www\.)?accszone\.com[^\s]*/gi,
    /https?:\/\/(?:www\.)?accsmarket\.com[^\s]*/gi,
  ];
  for (const p of patterns) s = s.replace(p, '');
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function mapListing(item: AccsZoneListing, platform: string, rate: number): AccountOffer {
  const cost = Number(item.price) || 0;
  const meta = enrichFromTitle(item.title || '');
  const subtype = item.subcategory?.title || 'General';
  const rawDesc = item.description
    ? scrubProviderTraces(htmlToPlainText(item.description))
    : '';
  const description =
    rawDesc.length > 40
      ? rawDesc
      : scrubProviderTraces(
          `${item.title}. Instant delivery when in stock. Use matching proxy and follow platform rules.`,
        );

  return {
    id: `acz-${item.id}`,
    providerListingId: item.id,
    slug: item.slug,
    platform,
    subtype,
    subtypeId: item.subcategory?.id ?? null,
    title: scrubProviderTraces(item.title || ''),
    shortTitle: shortTitle(item.title || ''),
    description,
    format: item.format || 'login:password (see delivery note)',
    age: meta.age,
    country: meta.country,
    priceNgn: retailPriceNgn(cost, rate),
    stock: Number(item.available_stock) || 0,
    sold: Number(item.sold) || 0,
    instant: meta.instant,
    cookies: meta.cookies,
    emailIncluded: meta.emailIncluded,
    twoFa: meta.twoFa,
    tags: meta.tags,
    badge: meta.badge,
  };
}

export const ACCSZONE_FACEBOOK_CATEGORY_ID = 22;

type CacheEntry = { at: number; catalog: AccountsCatalog };
const cache = new Map<string, CacheEntry>();

export async function fetchFacebookCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<AccountsCatalog> {
  const rate = exchangeRate();
  const cacheKey = `facebook:${rate}`;
  const now = Date.now();
  if (!options?.forceRefresh) {
    const hit = cache.get(cacheKey);
    if (hit && now - hit.at < CACHE_TTL_MS) {
      return { ...hit.catalog, source: 'cached' };
    }
  }

  if (!apiKey()) {
    return {
      ok: false,
      source: 'error',
      platform: 'Facebook',
      rate,
      updatedAt: new Date().toISOString(),
      subtypes: [],
      offers: [],
      total: 0,
      inStock: 0,
      error: 'ACCSZONE_API_KEY is not configured',
    };
  }

  try {
    const [subs, listings] = await Promise.all([
      fetchSubcategories(ACCSZONE_FACEBOOK_CATEGORY_ID),
      paginateListings(ACCSZONE_FACEBOOK_CATEGORY_ID),
    ]);

    const offers = listings
      .map((l) => mapListing(l, 'Facebook', rate))
      .filter((o) => o.stock > 0)
      .sort((a, b) => b.stock - a.stock || a.priceNgn - b.priceNgn);

    const stockBySub = new Map<
      string,
      { id: number | null; slug: string; count: number; stock: number }
    >();
    for (const o of offers) {
      const key = o.subtype || 'General';
      const prev = stockBySub.get(key) || {
        id: o.subtypeId,
        slug: '',
        count: 0,
        stock: 0,
      };
      prev.count += 1;
      prev.stock += o.stock;
      if (o.subtypeId != null) prev.id = o.subtypeId;
      stockBySub.set(key, prev);
    }

    const subtypes: AccountSubtype[] = [];
    const seen = new Set<string>();
    for (const s of subs) {
      const stats = stockBySub.get(s.title);
      if (!stats || stats.count === 0) continue;
      subtypes.push({
        id: s.id,
        name: s.title,
        slug: s.slug,
        count: stats.count,
        stock: stats.stock,
      });
      seen.add(s.title);
    }
    for (const [name, stats] of stockBySub) {
      if (seen.has(name)) continue;
      subtypes.push({
        id: stats.id,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        count: stats.count,
        stock: stats.stock,
      });
    }
    subtypes.sort((a, b) => b.stock - a.stock);

    const catalog: AccountsCatalog = {
      ok: true,
      source: 'live',
      platform: 'Facebook',
      rate,
      updatedAt: new Date().toISOString(),
      subtypes,
      offers,
      total: listings.length,
      inStock: offers.length,
    };
    cache.set(cacheKey, { at: now, catalog });
    return catalog;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AccsZone catalog failed';
    const hit = cache.get(cacheKey);
    if (hit) return { ...hit.catalog, source: 'fallback', warning: message };
    return {
      ok: false,
      source: 'error',
      platform: 'Facebook',
      rate,
      updatedAt: new Date().toISOString(),
      subtypes: [],
      offers: [],
      total: 0,
      inStock: 0,
      error: message,
    };
  }
}

export async function fetchAccsZoneBalance(): Promise<{
  ok: boolean;
  balance?: number;
  error?: string;
}> {
  try {
    const res = await accsFetch<{ success: boolean; data: { balance: string } }>('/user/balance');
    return { ok: true, balance: Number(res.data?.balance) || 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'balance failed' };
  }
}

/** Result of a successful AccsZone purchase. */
export type PurchaseResult = {
  ok: true;
  orderId?: string | number;
  accounts: string[];
  raw?: unknown;
};

export type PurchaseError = {
  ok: false;
  error: string;
  code?: string;
};

/**
 * Purchase one or more units of an AccsZone listing.
 * Server-side only. Body matches AccsZone /purchase.
 */
export async function purchaseListing(params: {
  adId: number;
  quantity: number;
  clientReference?: string;
}): Promise<PurchaseResult | PurchaseError> {
  const adId = Number(params.adId);
  const quantity = Math.max(1, Math.min(50, Math.floor(Number(params.quantity) || 1)));
  if (!Number.isFinite(adId) || adId <= 0) {
    return { ok: false, error: 'Invalid listing id', code: 'invalid_ad' };
  }
  if (!apiKey()) {
    return { ok: false, error: 'ACCSZONE_API_KEY is not configured', code: 'config' };
  }

  const body: Record<string, unknown> = {
    ad_id: adId,
    quantity,
  };
  if (params.clientReference) {
    body.client_reference = String(params.clientReference).slice(0, 64);
  }

  try {
    const res = await accsFetch<{
      success?: boolean;
      message?: string;
      data?: {
        order_id?: string | number;
        id?: string | number;
        accounts?: string[] | Array<Record<string, unknown>>;
        items?: string[] | Array<Record<string, unknown>>;
        credentials?: string[] | Array<Record<string, unknown>>;
        [key: string]: unknown;
      };
      accounts?: string[];
      [key: string]: unknown;
    }>('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = res.data ?? res;
    const rawList =
      (data as { accounts?: unknown }).accounts ??
      (data as { items?: unknown }).items ??
      (data as { credentials?: unknown }).credentials ??
      (res as { accounts?: unknown }).accounts ??
      [];

    const accounts: string[] = [];
    if (Array.isArray(rawList)) {
      for (const item of rawList) {
        if (typeof item === 'string' && item.trim()) {
          accounts.push(item.trim());
        } else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          const line =
            (typeof obj.account === 'string' && obj.account) ||
            (typeof obj.login === 'string' && obj.login) ||
            (typeof obj.credential === 'string' && obj.credential) ||
            (typeof obj.value === 'string' && obj.value) ||
            [
              obj.email ?? obj.login ?? obj.username,
              obj.password,
              obj.token ?? obj.cookie ?? obj['2fa'] ?? obj.twofa,
            ]
              .filter((x) => x != null && String(x).length > 0)
              .join(':');
          if (line) accounts.push(String(line));
        }
      }
    }

    const orderId =
      (data as { order_id?: string | number }).order_id ??
      (data as { id?: string | number }).id ??
      undefined;

    if (accounts.length === 0) {
      return {
        ok: false,
        error: 'Purchase succeeded but no credentials were returned',
        code: 'empty_credentials',
      };
    }

    return { ok: true, orderId, accounts, raw: res };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Purchase failed',
      code: 'provider_error',
    };
  }
}
