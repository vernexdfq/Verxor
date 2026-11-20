/**
 * MooGold provider client (gaming top-ups, gift cards, app/AI subscriptions).
 *
 * Auth per https://doc.moogold.com — every request is a POST to
 * https://moogold.com/wp-json/v1/api/<path> with:
 *   - body  : { path, ...data, partnerOrderId? }
 *   - HMAC  : sha256(body + timestamp + path) signed with the secret  -> header `auth`
 *   - Basic : base64(partner_id:secret)                                -> header `Authorization`
 *   - unix seconds                                                       -> header `timestamp`
 *
 * Env: MOOGOLD_PARTNER_ID, MOOGOLD_SECRET_KEY (or MOOGOLD_SECRET), optional MOOGOLD_USER_ID
 * (User ID from the MooGold dashboard is not part of the signature.)
 *
 * Optional fixed-IP egress (Fixie): set MOOGOLD_PROXY_URL or FIXIE_URL to a
 * proxy URL like http://user:pass@usefixie.com:80 — MooGold calls are then
 * tunneled through it (HTTP CONNECT) using Node built-ins only, so no new
 * dependency is introduced.
 */

const MG_BASE = 'https://moogold.com/wp-json/v1/api';

export type MgCategory = { id: string; name: string };
export type MgProduct = { id: string; name: string };
export type MgVariation = {
  id: string;
  name: string;
  priceUsd: number;
  stockRaw?: string | null;
  inStock?: boolean;
};
export type MgField = { field: string };
export type MgProductDetail = {
  id: string;
  name: string;
  image?: string | null;
  variations: MgVariation[];
  fields: MgField[];
  category?: string | null;
};
export type MgServer = { id: string; name: string };

export function moogoldConfigured(): boolean {
  return Boolean(
    (process.env.MOOGOLD_PARTNER_ID || '').trim() &&
      (process.env.MOOGOLD_SECRET_KEY || process.env.MOOGOLD_SECRET || '').trim(),
  );
}

/** Last provider error text (for surfacing in route responses when lists come back empty). */
let mgLastErrorValue = '';
export function mgLastError(): string {
  return mgLastErrorValue;
}

async function mgRequest<T = unknown>(
  path: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; data?: T }> {
  const partnerId = (process.env.MOOGOLD_PARTNER_ID || '').trim();
  const secret = (process.env.MOOGOLD_SECRET_KEY || process.env.MOOGOLD_SECRET || '').trim();
  if (!partnerId || !secret) {
    mgLastErrorValue = 'MooGold provider not configured';
    return { ok: false, error: 'MooGold provider not configured' };
  }
  const payload = JSON.stringify({ path, ...data });
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const { createHmac } = await import('crypto');
  const auth = createHmac('sha256', secret).update(payload + timestamp + path).digest('hex');
  const authBasic = Buffer.from(`${partnerId}:${secret}`).toString('base64');

  const targetUrl = new URL(`${MG_BASE}/${path}`);
  const headers = {
    timestamp,
    auth,
    Authorization: `Basic ${authBasic}`,
    'Content-Type': 'application/json',
  };

  const proxyUrl = (process.env.MOOGOLD_PROXY_URL || process.env.FIXIE_URL || '').trim();

  let status = 0;
  let raw = '';
  try {
    if (proxyUrl) {
      // undici ProxyAgent handles the CONNECT tunnel + TLS correctly.
      // (The previous hand-rolled tunnel double-wrapped the socket in TLS,
      //  which MooGold's edge rejected with a 403/404 page.)
      const { fetch: proxyFetch, ProxyAgent } = await import('undici');
      const dispatcher = new ProxyAgent(proxyUrl);
      const res = await proxyFetch(targetUrl.toString(), {
        method: 'POST',
        headers,
        body: payload,
        dispatcher,
      });
      status = res.status;
      raw = await res.text().catch(() => '');
    } else {
      const res = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers,
        body: payload,
        cache: 'no-store',
      });
      status = res.status;
      raw = await res.text().catch(() => '');
    }
  } catch (e) {
    const msg = `MooGold network error: ${e instanceof Error ? e.message : 'unknown'}`;
    console.error(`[moogold] ${path}: ${msg} (proxy: ${proxyUrl ? 'on' : 'off'})`);
    mgLastErrorValue = `${msg} (proxy ${proxyUrl ? 'on' : 'off'})`;
    return { ok: false, error: msg };
  }
  if (status < 200 || status >= 300) {
    console.error(`[moogold] ${path}: HTTP ${status}: ${raw.slice(0, 180)}`);
    mgLastErrorValue = `MooGold HTTP ${status}: ${raw.slice(0, 180)}`;
    return { ok: false, error: `MooGold HTTP ${status}: ${raw.slice(0, 180)}` };
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    mgLastErrorValue = `MooGold non-JSON response (likely a WAF block): ${raw.slice(0, 120)}`;
    return { ok: false, error: `MooGold returned a non-JSON response (likely a WAF block): ${raw.slice(0, 120)}` };
  }
  const obj = body as Record<string, unknown>;
  if (obj && typeof obj === 'object' && ('err_code' in obj || 'err_message' in obj)) {
    console.error(`[moogold] ${path}: ${String(obj.err_message ?? obj.err_code ?? 'unknown')}`);
    mgLastErrorValue = `MooGold error: ${String(obj.err_message ?? obj.err_code ?? 'unknown')}`;
    return { ok: false, error: `MooGold error: ${String(obj.err_message ?? obj.err_code ?? 'unknown')}` };
  }
  return { ok: true, data: body as T };
}

/* ---------- normalization (MooGold shapes per the py reference client) ---------- */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const unwrapData = (body: unknown): unknown => {
  const rec = asRecord(body);
  return 'data' in rec ? rec.data : body;
};

function normalizeStock(v: Record<string, unknown>): { inStock?: boolean; stockRaw?: string | null } {
  const stockVal = v.stock ?? v.stock_status ?? v.status ?? null;
  const s = str(stockVal).toLowerCase();
  if (!s) return {};
  if (/out|sold|empty|unavail/.test(s)) return { inStock: false, stockRaw: str(stockVal) };
  return { inStock: true, stockRaw: str(stockVal) };
}

function normalizeVariations(v: unknown): MgVariation[] {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .map((item) => {
      const r = asRecord(item);
      const id = str(r.variation_id ?? r.id ?? r.ID);
      if (!id) return null;
      const stock = normalizeStock(r);
      return {
        id,
        name: str(r.variation_name ?? r.name ?? r.post_title),
        priceUsd: num(r.variation_price ?? r.price ?? r.price_usd),
        ...stock,
      } as MgVariation;
    })
    .filter((x): x is MgVariation => Boolean(x));
}

function normalizeFields(v: unknown): MgField[] {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .map((item) => {
      if (typeof item === 'string') return { field: item };
      const r = asRecord(item);
      const name = str(r.field ?? r.label ?? r.name);
      return name ? { field: name } : null;
    })
    .filter((x): x is MgField => Boolean(x));
}

/* ---------- endpoint wrappers with a small in-process cache ---------- */

type CacheEntry<T> = { at: number; value: T };
const CACHE = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T | null>): Promise<T | null> {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await load();
  if (value !== null) CACHE.set(key, { at: Date.now(), value });
  return value;
}

/**
 * Categories — verified against the live API (20 Nov 2026): the docs'
 * product/category path does not exist (HTTP 404). The whole gaming
 * catalog lives in "Direct Top-Up" (category 50, 500+ titles).
 * Static list avoids a dead API call on every cold start.
 * Verified IDs if we ever split storefronts: 50 Direct top-up, 3563 Roblox,
 * 538 Google Play, 993 Steam, 765 PSN, 451 Razer Gold, 766 Garena, 1223 LoL.
 */
const MG_GAMING_CATEGORIES: MgCategory[] = [
  { id: '50', name: 'All Games' },
];

/** Product categories (static, verified). */
export async function mgCategories(): Promise<MgCategory[]> {
  return MG_GAMING_CATEGORIES;
}

/** Products in one category. */
export async function mgListProducts(categoryId: string): Promise<MgProduct[]> {
  const v = await cached<MgProduct[]>(`mg:products:${categoryId}`, 10 * 60 * 1000, async () => {
    const res = await mgRequest('product/list_product', { category_id: categoryId });
    if (!res.ok) return null;
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(unwrapData(res.data))
        ? (unwrapData(res.data) as unknown[])
        : null;
    if (!list) {
      console.warn('[moogold] list_product response not a list:', JSON.stringify(res.data)?.slice(0, 200));
      return null;
    }
    return list
      .map((item) => {
        const r = asRecord(item);
        const p = asRecord(r.product ?? item);
        const id = str(p.ID ?? p.id);
        const name = str(p.post_title ?? p.name ?? id);
        return id ? ({ id, name } as MgProduct) : null;
      })
      .filter((x): x is MgProduct => Boolean(x));
  });
  return v ?? [];
}

/** One product's details: variations (denominations), required fields, image. */
export async function mgProductDetail(productId: string): Promise<MgProductDetail | null> {
  const v = await cached<MgProductDetail>(`mg:detail:${productId}`, 10 * 60 * 1000, async () => {
    const res = await mgRequest('product/product_detail', { product_id: productId });
    if (!res.ok) return null;
    const d = asRecord(unwrapData(res.data) ?? res.data);
    const id = str(d.ID ?? d.id ?? productId);
    const name = str(d.Product_Name ?? d.post_title ?? id);
    const variations = normalizeVariations(d.Variation ?? d.variation ?? d.variations);
    if (!id || !variations.length) {
      console.warn('[moogold] product_detail unusable:', JSON.stringify(res.data)?.slice(0, 200));
      return null;
    }
    return {
      id,
      name,
      image: str(d.Image_URL ?? d.image?.toString() ?? '') || null,
      variations,
      fields: normalizeFields(d.fields ?? d.Fields),
      category: str(d.category ?? d.Category) || null,
    };
  });
  return v;
}

/** Server / region list for products that need one (per docs `product/server_list`). */
export async function mgServerList(productId: string): Promise<MgServer[]> {
  const res = await mgRequest('product/server_list', { product_id: productId });
  if (!res.ok) return [];
  const d = asRecord(unwrapData(res.data) ?? res.data);
  const inner = asRecord(d.data ?? d);
  const entries = Object.entries(inner);
  return entries
    .map(([id, name]) => ({ id, name: str(name) || id }))
    .filter((s) => s.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type MgOrderResult = {
  ok: boolean;
  error?: string;
  order?: {
    orderId?: string;
    partnerOrderId?: string;
    status?: string;
    message?: string;
    accountDetails?: Record<string, string>;
  };
};

/** Place the order. `fields` are the product's required inputs (User ID, Server, …). */
export async function mgCreateOrder(opts: {
  category: string;
  productId: string;
  variationId: string;
  quantity: number;
  quantityMax: number;
  fields: Record<string, string>;
  partnerOrderId: string;
}): Promise<MgOrderResult> {
  const data: Record<string, unknown> = {
    category: opts.category,
    'product-id': opts.productId,
    'variation-id': opts.variationId,
    quantity: String(opts.quantity),
    'quantity-max': String(opts.quantityMax),
  };
  for (const [k, v] of Object.entries(opts.fields)) {
    if (v) data[k] = v;
  }
  const res = await mgRequest('order/create_order', { ...data, partnerOrderId: opts.partnerOrderId });
  if (!res.ok) return { ok: false, error: res.error };
  const d = asRecord(res.data);
  const inner = asRecord(d.data ?? d);
  const status = str(inner.status ?? d.status).toLowerCase();
  if (status && status !== 'ok' && status !== 'success') {
    return { ok: false, error: `MooGold order status: ${status || 'unknown'} ${str(inner.message ?? d.message)}`.trim() };
  }
  const acct = asRecord(inner.account_details ?? d.account_details);
  const acctClean: Record<string, string> = {};
  for (const [k, v] of Object.entries(acct)) acctClean[k] = str(v);
  return {
    ok: true,
    order: {
      orderId: str(inner.order_id ?? d.order_id) || undefined,
      partnerOrderId: opts.partnerOrderId,
      status: str(inner.order_status ?? d.order_status ?? status) || undefined,
      message: str(inner.message ?? d.message) || undefined,
      accountDetails: Object.keys(acctClean).length ? acctClean : undefined,
    },
  };
}

/** Partner order lookup (e.g. to check delivery later). */
export async function mgOrderByPartnerId(partnerOrderId: string): Promise<{ ok: boolean; error?: string; detail?: Record<string, unknown> }> {
  const res = await mgRequest('order/order_detail_partner_id', { partner_order_id: partnerOrderId });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, detail: asRecord(res.data) };
}

/** Provider wallet balance in USD (for admin diagnostics later). */
export async function mgBalance(): Promise<{ ok: boolean; error?: string; currency?: string; balance?: number }> {
  const res = await mgRequest('user/balance', {});
  if (!res.ok) return { ok: false, error: res.error };
  const d = asRecord(unwrapData(res.data) ?? res.data);
  return { ok: true, currency: str(d.currency) || undefined, balance: num(d.balance) };
}
