/**
 * AccsZone reseller API — accounts / logs catalogue + purchase.
 * Server-side only. Never expose API key, raw provider cost, or supplier identity to the client.
 *
 * Auth: X-API-Key
 * Base: ACCSZONE_API_BASE (default https://accszone.com/api/v1)
 * Catalogue rate limit: 30 req/min shared across categories + subcategories + listings.
 */

import {
  accountsRetailPriceNgn,
  loadAccountsMarkups,
  loadAccountsUsdRate,
  type AccountsMarkups,
} from '@/lib/accounts-pricing';

/**
 * Catalog counts snapshot — persisted in admin_settings so platform chips can
 * show "how many available" instantly for ALL platforms, without waiting for
 * each platform's cold catalog walk. Each successful walk overwrites its
 * platform's entry; stale entries stay until their platform reloads.
 */
type CountsEntry = { listings: number; stock: number; at: string };
type CountsSnapshot = Record<string, CountsEntry>;
const COUNTS_KEY = 'accounts_catalog_counts';
const COUNTS_CACHE_TTL_MS = 60 * 1000;
let countsCache: { at: number; value: CountsSnapshot } | null = null;

function snapshotDb() {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) return null;
  return {
    base,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  };
}

export async function loadCountsSnapshot(): Promise<CountsSnapshot> {
  if (countsCache && Date.now() - countsCache.at < COUNTS_CACHE_TTL_MS) return countsCache.value;
  const db = snapshotDb();
  if (!db) return {};
  try {
    const res = await fetch(
      `${db.base}/rest/v1/admin_settings?key=eq.${COUNTS_KEY}&select=value&limit=1`,
      { headers: db.headers, cache: 'no-store' },
    );
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ value?: string }>;
    const parsed = rows?.[0]?.value ? (JSON.parse(rows[0].value) as CountsSnapshot) : {};
    const value = parsed && typeof parsed === 'object' ? parsed : {};
    countsCache = { at: Date.now(), value };
    return value;
  } catch {
    return {};
  }
}

/** Fresh per-platform counts from this instance's in-memory catalog cache. */
export function liveCountsSnapshot(): CountsSnapshot {
  const out: CountsSnapshot = {};
  for (const entry of cache.values()) {
    const c = entry.catalog;
    if (c.ok && c.platform) {
      out[c.platform] = {
        listings: c.inStock,
        stock: c.offers.reduce((sum, o) => sum + (o.stock || 0), 0),
        at: c.updatedAt,
      };
    }
  }
  return out;
}

/** Fire-and-forget: merge this platform's counts into the snapshot row. */
async function persistPlatformCounts(platform: string, listings: number, stock: number) {
  const db = snapshotDb();
  if (!db) return;
  try {
    const merged: CountsSnapshot = { ...(await loadCountsSnapshot()) };
    merged[platform] = { listings, stock, at: new Date().toISOString() };
    const value = JSON.stringify(merged);
    // Upsert (PATCH alone is a silent no-op when the row does not exist yet).
    const posted = await fetch(`${db.base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...db.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: COUNTS_KEY, value }),
      cache: 'no-store',
    });
    if (!posted.ok) {
      await fetch(`${db.base}/rest/v1/admin_settings?key=eq.${COUNTS_KEY}`, {
        method: 'PATCH',
        headers: db.headers,
        body: JSON.stringify({ value }),
        cache: 'no-store',
      });
    }
    countsCache = { at: Date.now(), value: merged };
  } catch {
    /* best-effort */
  }
}


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
  /** Raw provider cost in USD (wholesale pricing basis). */
  costUsd: number;
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
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_MAX_MS = 2 * 60 * 60 * 1000;

/**
 * Catalogue endpoints (categories, subcategories, listings) share a single
 * 30 req/min bucket per AccsZone account. We walk EVERY page so the full
 * provider catalogue (600+ listings) is mirrored, and rely on pacing plus
 * Retry-After backoff to stay inside the provider limit. Results are cached
 * server-side for 2 minutes, so steady-state traffic is near zero.
 */

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
    signal: init?.signal ?? AbortSignal.timeout(20_000),
  });
  if (res.status === 429) {
    const retry = Number(res.headers.get('Retry-After') || 5);
    const err = new Error(`AccsZone rate limit — retry after ${retry}s`);
    (err as Error & { retryAfter?: number }).retryAfter = retry;
    throw err;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const err = new Error(body?.message || `AccsZone HTTP ${res.status}`);
    (err as Error & { statusCode?: number }).statusCode = res.status;
    (err as Error & { errorCode?: string }).errorCode = body?.error_code;
    throw err;
  }
  return body as T;
}

type ListResponse<T> = {
  success: boolean;
  data: T;
  meta?: { current_page: number; per_page: number; last_page: number; total: number };
};

async function paginateListings(
  categoryId: number,
  deadline: number,
): Promise<{ listings: AccsZoneListing[]; partial: boolean }> {
  // Fetch a single listings page with 100 per page (AccsZone API standard), backing off on 429.
  async function fetchPage(page: number): Promise<ListResponse<AccsZoneListing[]>> {
    const path = `/listings?per_page=100&page=${page}&category_id=${categoryId}&include=description`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await accsFetch<ListResponse<AccsZoneListing[]>>(path);
      } catch (err) {
        const retryAfter = (err as Error & { retryAfter?: number })?.retryAfter;
        if (typeof retryAfter !== 'number' || attempt === 2) throw err;
        await sleep(Math.max(retryAfter, 4) * 1000);
      }
    }
    throw new Error(`AccsZone listings page ${page} failed`);
  }
  const first = await fetchPage(1);
  const out: AccsZoneListing[] = Array.isArray(first.data) ? [...first.data] : [];
  const last = first.meta?.last_page || 1;
  // AccsZone guide: Pace yourself: one catalogue request every 4 seconds always stays under the limit.
  // Send requests one after another, never many at the same time.
  for (let p = 2; p <= last; p += 1) {
    if (Date.now() > deadline) return { listings: out, partial: true };
    await sleep(4000);
    try {
      const res = await fetchPage(p);
      if (Array.isArray(res.data)) out.push(...res.data);
    } catch {
      return { listings: out, partial: true };
    }
  }
  return { listings: out, partial: false };
}

async function fetchSubcategories(categoryId: number): Promise<AccsZoneSubcategory[]> {
  type SubsPayload = { category: AccsZoneCategory; subcategories: AccsZoneSubcategory[] };
  const collect = (payload: unknown, out: AccsZoneSubcategory[]) => {
    if (payload && Array.isArray((payload as SubsPayload).subcategories)) {
      out.push(...(payload as SubsPayload).subcategories);
    } else if (Array.isArray(payload)) {
      out.push(...(payload as AccsZoneSubcategory[]));
    }
  };
  const fetchPage = (page: number) =>
    accsFetch<ListResponse<SubsPayload | AccsZoneSubcategory[]>>(
      `/categories/${categoryId}/subcategories?per_page=100&page=${page}`,
    );
  const out: AccsZoneSubcategory[] = [];
  try {
    const first = await fetchPage(1);
    collect(first.data, out);
    const last = first.meta?.last_page || 1;
    for (let p = 2; p <= last; p += 1) {
      await sleep(4000);
      const res = await fetchPage(p);
      collect(res.data, out);
    }
  } catch {
    /* best effort */
  }
  return out;
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
  // Keep the provider's guidance links usable: "label (https://…)" — the client
  // DescriptionBody linkifies them back into clickable anchors.
  s = s.replace(
    /<a\s[^>]*href=(["'])(https?:\/\/[^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, _q, href: string, label: string) =>
      `${label.trim() || href} (${href})`,
  );
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

function mapListing(
  item: AccsZoneListing,
  platform: string,
  rate: number,
  markups: AccountsMarkups,
): AccountOffer {
  const cost = Number(item.price) || 0;
  const meta = enrichFromTitle(item.title || '');
  const subtype = item.subcategory?.title || 'General';
  // Keep the provider's FULL description verbatim — specs, how-to guidance and
  // links included. It is what explains each service to the customer. Only
  // fall back to a short note when the listing has no description at all.
  const description = item.description
    ? htmlToPlainText(item.description)
    : `${item.title}. Instant delivery when in stock. Use matching proxy and follow platform rules.`;

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
    priceNgn: accountsRetailPriceNgn(cost, markups, rate),
    costUsd: cost,
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

export const KNOWN_CATEGORY_IDS: Record<string, number> = {
  facebook: 22,
};

let cachedCategories: AccsZoneCategory[] | null = null;
let categoriesFetchedAt = 0;
// AccsZone guide: Categories rarely change. Fetch once, save, and refresh once a day (24 hours).
const CATEGORIES_CACHE_TTL = 24 * 60 * 60 * 1000;
const CATEGORIES_DB_KEY = 'accounts_categories_cache';

async function loadCategoriesFromDb(): Promise<AccsZoneCategory[] | null> {
  const db = snapshotDb();
  if (!db) return null;
  try {
    const res = await fetch(
      `${db.base}/rest/v1/admin_settings?key=eq.${CATEGORIES_DB_KEY}&select=value&limit=1`,
      { headers: db.headers, cache: 'no-store' },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ value?: string }>;
    if (!rows?.[0]?.value) return null;
    const parsed = JSON.parse(rows[0].value) as { at: number; categories: AccsZoneCategory[] };
    if (parsed && Array.isArray(parsed.categories) && Date.now() - Number(parsed.at || 0) < CATEGORIES_CACHE_TTL) {
      return parsed.categories;
    }
  } catch {
    /* best effort */
  }
  return null;
}

async function persistCategoriesToDb(categories: AccsZoneCategory[]) {
  const db = snapshotDb();
  if (!db || !categories.length) return;
  try {
    const value = JSON.stringify({ at: Date.now(), categories });
    const posted = await fetch(`${db.base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...db.headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: CATEGORIES_DB_KEY, value }),
      cache: 'no-store',
    });
    if (!posted.ok) {
      await fetch(`${db.base}/rest/v1/admin_settings?key=eq.${CATEGORIES_DB_KEY}`, {
        method: 'PATCH',
        headers: db.headers,
        body: JSON.stringify({ value }),
        cache: 'no-store',
      });
    }
  } catch {
    /* best effort */
  }
}

export async function fetchAccsZoneCategories(): Promise<AccsZoneCategory[]> {
  const now = Date.now();
  if (cachedCategories && now - categoriesFetchedAt < CATEGORIES_CACHE_TTL) {
    return cachedCategories;
  }
  const fromDb = await loadCategoriesFromDb();
  if (fromDb && fromDb.length > 0) {
    cachedCategories = fromDb;
    categoriesFetchedAt = now;
    return fromDb;
  }
  const collect = (res: unknown, out: AccsZoneCategory[]) => {
    if (Array.isArray(res)) {
      out.push(...res);
    } else if (res && typeof res === 'object') {
      const data = (res as Record<string, unknown>).data;
      if (Array.isArray(data)) out.push(...(data as AccsZoneCategory[]));
      else if (Array.isArray((res as Record<string, unknown>).categories)) {
        out.push(...((res as Record<string, unknown>).categories as AccsZoneCategory[]));
      }
    }
  };
  const fetchPage = (page: number) => accsFetch(`/categories?per_page=100&page=${page}`);
  let list: AccsZoneCategory[] = [];
  try {
    const first = await fetchPage(1);
    collect(first, list);
    const meta = (first as ListResponse<unknown>)?.meta;
    const last = meta?.last_page || 1;
    for (let p = 2; p <= last; p += 1) {
      await sleep(4000);
      const res = await fetchPage(p);
      collect(res, list);
    }
  } catch {
    // Fall through with whatever pages we managed to read.
  }
  if (list.length > 0) {
    cachedCategories = list;
    categoriesFetchedAt = now;
    void persistCategoriesToDb(list);
  }
  return list;
}

/** Prunes an unavailable or out-of-stock listing from active in-memory caches. */
export function pruneListingFromCache(adId: number, platform?: string): void {
  for (const [key, entry] of cache.entries()) {
    if (platform && !key.startsWith(platform.toLowerCase())) continue;
    if (entry.catalog?.offers) {
      const initLen = entry.catalog.offers.length;
      entry.catalog.offers = entry.catalog.offers.filter(
        (o) => o.providerListingId !== adId,
      );
      if (entry.catalog.offers.length !== initLen) {
        entry.catalog.inStock = entry.catalog.offers.filter((o) => o.stock > 0).length;
        entry.catalog.total = entry.catalog.offers.length;
      }
    }
  }
}

export function normalizePlatform(platform: string): string {
  const p = (platform || '').trim();
  const lower = p.toLowerCase();
  if (lower.includes('mobile prox') || lower.includes('proxy') || lower.includes('proxies')) return 'Mobile Proxies';
  if (lower.includes('google voice')) return 'Google Voice';
  if (lower.includes('e-commerce') || lower.includes('ecommerce')) return 'E-Commerce';
  if (lower.includes('spotify')) return 'Spotify';
  if (lower.includes('vpn')) return 'VPN';
  if (lower.includes('netflix')) return 'Netflix';
  if (lower.includes('pinterest')) return 'Pinterest';
  if (lower.includes('yahoo')) return 'Yahoo';
  if (lower.includes('capcut')) return 'CapCut';
  if (lower.includes('phone') || lower.includes('messaging')) return 'Phone & Messaging';
  if (lower.includes('roblox')) return 'Roblox';
  if (lower.includes('github')) return 'GitHub';
  if (lower.includes('outlook')) return 'Outlook';
  if (lower.includes('apple')) return 'Apple';
  if (lower.includes('mastercard')) return 'Mastercard';
  if (lower.includes('google ads')) return 'Google Ads';
  if (lower.includes('ai accounts') || lower === 'ai') return 'AI Accounts';
  if (lower.includes('indeed')) return 'Indeed';
  if (lower.includes('truth')) return 'Truth Social';
  if (lower.includes('bluesky') || lower.includes('blue sky') || lower.includes('bsky')) return 'Bluesky';
  if (lower.includes('twitch')) return 'Twitch';
  if (lower.includes('trustpilot')) return 'Trustpilot';
  if (lower.includes('quora')) return 'Quora';
  if (lower.includes('grindr')) return 'Grindr';
  if (lower.includes('eharmony')) return 'eHarmony';
  if (lower.includes('badoo')) return 'Badoo';
  if (lower.includes('gaming account') || lower === 'gaming') return 'Gaming';
  if (lower.includes('premium subscription')) return 'Premium Subscriptions';
  if (lower.includes('dating')) return 'Dating Apps';
  if (lower === 'x' || lower.includes('twitter')) return 'X / Twitter';
  if (lower.includes('instagram')) return 'Instagram';
  if (lower.includes('tiktok')) return 'TikTok';
  if (lower.includes('telegram')) return 'Telegram';
  if (lower.includes('facebook')) return 'Facebook';
  if (lower.includes('youtube')) return 'YouTube';
  if (lower.includes('gmail') || lower.includes('google')) return 'Gmail';
  if (lower.includes('discord')) return 'Discord';
  if (lower.includes('linkedin')) return 'LinkedIn';
  if (lower.includes('threads')) return 'Threads';
  if (lower.includes('reddit')) return 'Reddit';
  if (lower.includes('snapchat')) return 'Snapchat';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('odnoklassniki') || lower.includes('ok.ru') || lower === 'ok') return 'Odnoklassniki';
  return p || 'Facebook';
}

export async function resolveCategoryIdForPlatform(platform: string): Promise<number | null> {
  const norm = normalizePlatform(platform);
  const key = norm.toLowerCase();
  if (KNOWN_CATEGORY_IDS[key]) return KNOWN_CATEGORY_IDS[key];

  const categories = await fetchAccsZoneCategories().catch(() => []);
  if (!categories || categories.length === 0) return KNOWN_CATEGORY_IDS[key] ?? null;

  const terms: string[] = [];
  if (norm === 'Facebook') terms.push('facebook');
  else if (norm === 'Instagram') terms.push('instagram');
  else if (norm === 'TikTok') terms.push('tiktok');
  else if (norm === 'X / Twitter') terms.push('twitter', 'x accounts', 'x / twitter', 'x.com');
  else if (norm === 'Telegram') terms.push('telegram');
  else if (norm === 'Mobile Proxies') terms.push('mobile proxies', 'proxies');
  else if (norm === 'Google Voice') terms.push('google voice', 'google');
  else if (norm === 'Odnoklassniki') terms.push('odnoklassniki', 'ok.ru');
  else if (norm === 'Indeed') terms.push('indeed');
  else if (norm === 'Truth Social') terms.push('truth social', 'truthsocial', 'truth');
  else if (norm === 'AI Accounts') terms.push('ai accounts', 'chatgpt', 'openai', 'claude');
  else if (norm === 'Google Ads') terms.push('google ads', 'google adwords', 'adwords');
  else if (norm === 'Bluesky') terms.push('bluesky', 'blue sky', 'bsky');
  else if (norm === 'Reddit') terms.push('reddit');
  else if (norm === 'Dating Apps') terms.push('dating apps', 'dating');
  else if (norm === 'Grindr') terms.push('grindr');
  else if (norm === 'eHarmony') terms.push('eharmony');
  else if (norm === 'Badoo') terms.push('badoo');
  else if (norm === 'Gaming') terms.push('gaming account', 'gaming accounts', 'gaming');
  else if (norm === 'Premium Subscriptions') terms.push('premium subscriptions', 'premium subscription', 'subscriptions');
  else if (norm === 'Mastercard') terms.push('mastercard');
  else if (norm === 'Apple') terms.push('apple accounts', 'apple');
  else if (norm === 'E-Commerce') terms.push('e-commerce', 'ecommerce');
  else if (norm === 'Spotify') terms.push('spotify premium', 'spotify');
  else if (norm === 'VPN') terms.push('vpn premium', 'vpn');
  else if (norm === 'Netflix') terms.push('netflix');
  else if (norm === 'Pinterest') terms.push('pinterest');
  else if (norm === 'Yahoo') terms.push('yahoo mail', 'yahoo');
  else if (norm === 'CapCut') terms.push('capcut pro', 'capcut');
  else if (norm === 'Phone & Messaging') terms.push('phone & messaging', 'messaging', 'phone');
  else if (norm === 'Roblox') terms.push('roblox');
  else if (norm === 'GitHub') terms.push('github');
  else if (norm === 'Outlook') terms.push('outlook email', 'outlook');
  else terms.push(norm.toLowerCase());

  for (const t of terms) {
    const match = categories.find((c) => {
      const title = (c.title || '').toLowerCase();
      const slug = (c.slug || '').toLowerCase();
      return title.includes(t) || slug.includes(t);
    });
    if (match) {
      KNOWN_CATEGORY_IDS[key] = match.id;
      return match.id;
    }
  }

  return null;
}


type CacheEntry = { at: number; catalog: AccountsCatalog };
const cache = new Map<string, CacheEntry>();

const inflight = new Map<string, Promise<AccountsCatalog>>();

export async function fetchPlatformCatalog(
  platformInput: string,
  options?: { forceRefresh?: boolean },
): Promise<AccountsCatalog> {
  const [markups, rate] = await Promise.all([loadAccountsMarkups(), loadAccountsUsdRate()]);
  const platform = normalizePlatform(platformInput);
  const pricingKey = `${rate}|${markups.retail.join('/')}|${markups.wholesale.join('/')}|${markups.roundUpNgn}`;
  const cacheKey = `${platform.toLowerCase()}:${pricingKey}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && !options?.forceRefresh) {
    const age = now - hit.at;
    if (age < CACHE_TTL_MS) return { ...hit.catalog, source: 'cached' };
    if (age < STALE_MAX_MS) {
      void loadPlatformCatalog(platform, cacheKey, rate, markups).catch(() => undefined);
      return { ...hit.catalog, source: 'cached' };
    }
  }
  return loadPlatformCatalog(platform, cacheKey, rate, markups);
}

function loadPlatformCatalog(
  platform: string,
  cacheKey: string,
  rate: number,
  markups: AccountsMarkups,
): Promise<AccountsCatalog> {
  const existing = inflight.get(cacheKey);
  if (existing) return existing;
  const p = buildPlatformCatalog(platform, cacheKey, rate, markups).finally(() =>
    inflight.delete(cacheKey),
  );
  inflight.set(cacheKey, p);
  return p;
}

async function buildPlatformCatalog(
  platform: string,
  cacheKey: string,
  rate: number,
  markups: AccountsMarkups,
): Promise<AccountsCatalog> {
  const now = Date.now();
  if (!apiKey()) {
    return {
      ok: false,
      source: 'error',
      platform,
      rate,
      updatedAt: new Date().toISOString(),
      subtypes: [],
      offers: [],
      total: 0,
      inStock: 0,
      error: 'ACCSZONE_API_KEY is not configured',
    };
  }

  // Serverless functions die around 60s — keep the walk inside a budget so a
  // cold catalog always returns something (partial beats a 502 "no account").
  const deadline = now + 42_000;

  const categoryId = await resolveCategoryIdForPlatform(platform);
  if (!categoryId) {
    return {
      ok: false,
      source: 'error',
      platform,
      rate,
      updatedAt: new Date().toISOString(),
      subtypes: [],
      offers: [],
      total: 0,
      inStock: 0,
      error: `Could not resolve AccsZone category for ${platform}. Check categories endpoint.`,
    };
  }

  try {
    // Subcategory failures never kill the catalog (types are re-derived from
    // the listings themselves); the listings walk owns the deadline.
    const subs = await fetchSubcategories(categoryId).catch(
      () => [] as AccsZoneSubcategory[],
    );
    const { listings, partial } = await paginateListings(categoryId, deadline);
    const warnings: string[] = [];
    if (partial) {
      warnings.push(
        'Catalog loaded partially — the provider rate limit was hit. Prices shown are live; more listings appear as the provider bucket refills.',
      );
    }

    const previous = cache.get(cacheKey);
    let offers = listings
      .map((l) => mapListing(l, platform, rate, markups))
      // Marketplace rule: gift cards are not sold on Verxor. Filter them out
      // everywhere so they can never surface via any platform chip.
      .filter((o) => o.stock > 0 && !/gift\s*card|gift\s*code|giftcode/i.test(o.title))
      .sort((a, b) => b.stock - a.stock || a.priceNgn - b.priceNgn);

    if (partial && previous?.catalog?.offers && previous.catalog.offers.length > offers.length) {
      // Merge: retain in-stock offers from the previous full walk that were not in
      // the partial walk, so a provider rate-limit hit never drops hundreds of listings.
      const newIds = new Set(offers.map((o) => o.providerListingId));
      const preserved = previous.catalog.offers.filter(
        (o) => !newIds.has(o.providerListingId) && o.stock > 0,
      );
      offers = [...offers, ...preserved].sort((a, b) => b.stock - a.stock || a.priceNgn - b.priceNgn);
    }

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
      platform,
      rate,
      updatedAt: new Date().toISOString(),
      subtypes,
      offers,
      total: listings.length,
      inStock: offers.length,
      ...(warnings.length > 0 ? { warning: warnings.join(' ') } : {}),
    };
    if (partial) {
      // Serve the partial catalog now, but let it go stale quickly (2 min)
      // so the background revalidation fills in the remaining pages soon.
      cache.set(cacheKey, { at: Date.now() - 8 * 60 * 1000, catalog });
    } else {
      cache.set(cacheKey, { at: now, catalog });
    }
    if (!partial && offers.length > 0) {
      void persistPlatformCounts(
        platform,
        offers.length,
        offers.reduce((sum, o) => sum + (o.stock || 0), 0),
      );
    }
    return catalog;
  } catch (err) {
    const message = err instanceof Error ? err.message : `AccsZone ${platform} catalog failed`;
    const hit = cache.get(cacheKey);
    if (hit) return { ...hit.catalog, source: 'fallback', warning: message };
    return {
      ok: false,
      source: 'error',
      platform,
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

export const fetchFacebookCatalog = (options?: { forceRefresh?: boolean }) =>
  fetchPlatformCatalog('Facebook', options);

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
 * Server-side only. Body matches AccsZone POST /purchase.
 *
 * `clientReference` is AccsZone's idempotency key and must be a UUID v4 —
 * on a timeout/dropped connection the purchase may still have completed, and
 * replaying with the SAME reference returns the original order (charged once)
 * instead of buying twice. When no reference is supplied we generate one.
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

  const clientReference = params.clientReference || crypto.randomUUID();
  const body: Record<string, unknown> = {
    ad_id: adId,
    quantity,
    client_reference: clientReference,
  };

  type PurchaseResponse = {
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
  };

  const doPurchase = () =>
    accsFetch<PurchaseResponse>('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  let res: PurchaseResponse;
  try {
    res = await doPurchase();
  } catch (err) {
    // Only network-level failures are ambiguous (timeout / dropped connection /
    // DNS). HTTP errors from AccsZone mean the transaction definitely did not
    // go through, so those are final and safe to surface as-is.
    const ambiguous =
      err instanceof DOMException ||
      (err instanceof TypeError) ||
      (err instanceof Error && /fetch failed|network|ECONNRESET|ETIMEDOUT|aborted/i.test(err.message));
    if (!ambiguous) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Purchase failed',
        code: (err as Error & { errorCode?: string })?.errorCode || 'provider_error',
      };
    }
    // Replay once with the same client_reference. AccsZone returns the original
    // order (HTTP 200, "replayed": true) if the first attempt actually landed.
    try {
      res = await doPurchase();
    } catch (err2) {
      return {
        ok: false,
        error:
          err2 instanceof Error
            ? `Provider connection failed: ${err2.message}`
            : 'Provider connection failed. The order status is unconfirmed — contact support with the reference before retrying.',
        code: 'provider_timeout_unconfirmed',
      };
    }
  }

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
}
