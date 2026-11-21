/**
 * Shop2TopUp provider — game top-ups + vouchers H2H API.
 *
 * Replaces MooGold for the Gaming Top-Up store (Denny's decision, Nov 2026).
 *
 * Auth: one Bearer key in `SHOP2TOPUP_API_KEY` (Vercel env). No IP
 * whitelisting required (the key-allowlist is optional and left empty).
 * Rate limit: 5,000 requests / 60s per account — no proxy, no budget shield
 * pressure, but the Supabase snapshot still avoids useless calls.
 *
 * Catalog mapping (fits the existing Gaming page contract):
 *   UI "category"  = S2T big category   (141, e.g. "PUBG Mobile")
 *   UI "product"   = S2T category        (e.g. "UC Cards", "Direct Topup")
 *   UI "variation" = S2T subcategory/item (e.g. "60 UC", priced USD)
 *
 * Product ids are prefixed `s2t-<categoryId>` so they can never collide
 * with any legacy MooGold snapshot rows.
 *
 * Verified live (probe, Nov 2026):
 *   GET  /account
 *   GET  /catalog/big-categories            → data: [{id, name, image_url…}]
 *   GET  /catalog/categories?bigCategoryId=N → data: [{id, name, requirements…}]
 *   GET  /catalog/subcategories?categoryId=N→ data: [{item_id, name, price…}]
 *   GET  /catalog/category/N/requirements   → data: [{field_name, data_type, placeholder}]
 *        (404 NO_REQUIREMENTS_FOUND for gift-card-style categories)
 *   GET  /catalog/subcategory/:itemId/price → {unit_price, currency, …}
 *   POST /orders/create {order_id: UUID, sub_category_id, quantity, requirements, expected_unit_price?}
 *        → validates the player BEFORE charging the wallet
 *        (PLAYER_NOT_FOUND for a bad player id).
 */

const S2T_BASE = 'https://shop2topup.com/api/endpoints/v1';

export type S2TCategory = { id: string; name: string; image?: string | null };

export type S2TProduct = { id: string; name: string };

export type S2TVariation = {
  id: string;
  name: string;
  priceUsd: number;
  inStock?: boolean;
  productType?: string;
};

export type S2TField = { field: string; label?: string };

export type S2TProductDetail = {
  id: string;
  name: string;
  image?: string | null;
  variations: S2TVariation[];
  fields: S2TField[];
  category?: string | null;
};

export type S2TOrderResult = {
  ok: boolean;
  error?: string;
  order?: {
    orderId?: string;
    status?: string;
    message?: string;
  };
};

export type S2TAccount = { email?: string; wallet?: number };

let lastError = '';

export function s2tConfigured(): boolean {
  return Boolean(process.env.SHOP2TOPUP_API_KEY);
}

export function s2tLastError(): string {
  return lastError;
}

/* ---------------- low-level ---------------- */

async function s2tRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.SHOP2TOPUP_API_KEY;
  if (!key) throw new Error('Shop2TopUp key not configured');
  const res = await fetch(`${S2T_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  let payload: Record<string, unknown> = {};
  try {
    payload = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`Shop2TopUp network error (HTTP ${res.status})`);
  }
  if (payload.success === true) {
    lastError = '';
    return (payload.data !== undefined ? payload.data : payload) as T;
  }
  const err = (payload.error || {}) as { code?: string; message?: string; details?: Record<string, unknown> };
  lastError = err.code ? `[${err.code}] ${err.message || ''}` : String(err.message || 'Shop2TopUp error');
  const e = new Error(lastError);
  (e as Error & { code?: string }).code = err.code;
  throw e;
}

function humanizeField(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID');
}

/* ---------------- catalog ---------------- */

/** Trending-first ordering for the category chips (street demand in NG). */
const S2T_POPULAR = [
  'PUBG Mobile',
  'Free Fire',
  'Mobile Legends: Bang Bang',
  'Genshin Impact',
  'Whiteout Survival',
  'Blood Strike',
  'Honor of Kings',
  'Call of Duty Mobile',
  'EA FC Mobile',
  'Roblox',
  'Steam',
  'Apple',
];

function popularWeight(name: string): number {
  const i = S2T_POPULAR.indexOf(name);
  return i === -1 ? S2T_POPULAR.length + 1 : i;
}

/** All big categories (UI category chips), trending first then A–Z. */
export async function s2tBigCategories(): Promise<S2TCategory[]> {
  type Row = { id: number; name: string; image_url?: string | null; image?: string | null };
  const rows = await s2tRequest<Row[]>('/catalog/big-categories').catch(() => [] as Row[]);
  const raw = (Array.isArray(rows) ? rows : []).map((r) => ({
    id: String(r.id),
    name: String(r.name || 'Game'),
    image: r.image_url || r.image || null,
  }));
  return raw.sort(
    (a, b) => popularWeight(a.name) - popularWeight(b.name) || a.name.localeCompare(b.name),
  );
}

/** Products (S2T categories) of one big category, with a live "from" USD price. */
export async function s2tProductsForBig(
  bigCategoryId: string,
): Promise<Array<{ id: string; name: string; fromUsd: number | null }>> {
  type CatRow = { id: number; name: string };
  type SubRow = { item_id: number; name: string; price: number | string; product_type?: string };
  const cats = await s2tRequest<CatRow[]>(`/catalog/categories?bigCategoryId=${encodeURIComponent(bigCategoryId)}`);
  const list = Array.isArray(cats) ? cats : [];
  const products = await Promise.all(
    list.map(async (c) => {
      let fromUsd: number | null = null;
      try {
        const subs = await s2tRequest<SubRow[]>(`/catalog/subcategories?categoryId=${encodeURIComponent(String(c.id))}`);
        const prices = (Array.isArray(subs) ? subs : [])
          .map((s) => Number(s.price))
          .filter((p) => Number.isFinite(p) && p > 0);
        if (prices.length) fromUsd = Math.min(...prices);
      } catch {
        // price discovery failure is non-fatal for the listing
      }
      return {
        id: `s2t-${c.id}`,
        name: String(c.name || 'Top-Up'),
        fromUsd,
      };
    }),
  );
  return products;
}

/** Buy-sheet detail for one UI product (`s2t-<categoryId>`): denominations + form fields. */
export async function s2tProductDetail(productId: string): Promise<S2TProductDetail | null> {
  const catId = productId.replace(/^s2t-/, '');
  type SubRow = {
    item_id: number;
    name: string;
    price: number | string;
    product_type?: string;
    category_name?: string;
  };
  const subs = await s2tRequest<SubRow[]>(`/catalog/subcategories?categoryId=${encodeURIComponent(catId)}`);
  const items = Array.isArray(subs) ? subs : [];
  if (!items.length) return null;

  let fields: S2TField[] = [];
  try {
    type ReqRow = { field_name: string; data_type?: string; placeholder?: string };
    const req = await s2tRequest<ReqRow[]>(`/catalog/category/${encodeURIComponent(catId)}/requirements`);
    fields = (Array.isArray(req) ? req : []).map((r) => ({
      field: String(r.field_name),
      label: humanizeField(String(r.field_name)),
    }));
  } catch {
    // NO_REQUIREMENTS_FOUND etc. → no extra form needed (gift-card style).
  }

  const variations: S2TVariation[] = items.map((s) => {
    const usd = Number(s.price);
    return {
      id: String(s.item_id),
      name: String(s.name),
      priceUsd: Number.isFinite(usd) ? usd : 0,
      inStock: usd > 0,
      productType: s.product_type,
    };
  });

  return {
    id: productId,
    name: String(items[0]?.category_name || 'Top-Up'),
    image: null,
    variations,
    fields,
    category: catId,
  };
}

/** Fresh unit price for one item (always read before creating an order). */
export async function s2tItemPrice(itemId: string): Promise<number> {
  type PriceRow = { unit_price?: number | string; currency?: string };
  const row = await s2tRequest<PriceRow>(`/catalog/subcategory/${encodeURIComponent(itemId)}/price`);
  const p = Number(row?.unit_price);
  return Number.isFinite(p) && p > 0 ? p : 0;
}

/* ---------------- wallet ---------------- */

export async function s2tAccount(): Promise<S2TAccount | null> {
  try {
    type AccRow = { email?: string; wallet?: number | string };
    const acc = await s2tRequest<AccRow>('/account');
    return {
      email: acc?.email ? String(acc.email) : undefined,
      wallet: Number(acc?.wallet) || 0,
    };
  } catch {
    return null;
  }
}

/* ---------------- orders ---------------- */

function friendlyOrderError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : 'Order failed';
  if (code === 'PLAYER_NOT_FOUND') return 'Player ID not found. Check the ID and try again.';
  if (code === 'PRICE_INCREASED') return 'The provider price just changed. Your wallet was refunded — please try again.';
  if (/INSUFFICIENT|WALLET|BALANCE/i.test(msg)) {
    return 'The provider is settling its balance right now. Your wallet was refunded — try again shortly.';
  }
  return msg;
}

/**
 * Create an order. `orderUuid` is the idempotency key: retries with the same
 * UUID never double-charge. The provider validates the player BEFORE touching
 * the wallet, so bad player ids fail safely.
 */
export async function s2tCreateOrder(opts: {
  itemId: string;
  quantity: number;
  requirements: Record<string, string>;
  expectedUnitPrice?: number;
  orderUuid: string;
}): Promise<S2TOrderResult> {
  try {
    const payload: Record<string, unknown> = {
      order_id: opts.orderUuid,
      sub_category_id: Number(opts.itemId),
      quantity: opts.quantity,
      requirements: opts.requirements,
    };
    if (opts.expectedUnitPrice && opts.expectedUnitPrice > 0) {
      payload.expected_unit_price = opts.expectedUnitPrice.toFixed(6);
    }
    const data = await s2tRequest<Record<string, unknown>>('/orders/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    const orderRaw = (row.order ?? row) as Record<string, unknown>;
    return {
      ok: true,
      order: {
        orderId: String(orderRaw.order_id ?? orderRaw.id ?? opts.orderUuid),
        status: String(orderRaw.status ?? 'processing').toLowerCase(),
        message: orderRaw.message ? String(orderRaw.message) : undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: friendlyOrderError(e) };
  }
}

/** Poll one provider order. */
export async function s2tOrderStatus(providerOrderId: string): Promise<{ status?: string; raw?: unknown } | null> {
  try {
    const row = await s2tRequest<Record<string, unknown>>(`/orders/${encodeURIComponent(providerOrderId)}`);
    return {
      status: row?.status ? String(row.status).toLowerCase() : undefined,
      raw: row,
    };
  } catch {
    return null;
  }
}

/* ---------------- game-level variant list ---------------- */

/**
 * One game = one big category. This returns the game's option list
 * (its S2T categories, e.g. UC Cards / Direct Topup / regions) as a
 * "detail" whose variations are the options, priced with their live
 * "from" USD. The Gaming page uses it as the intermediate picker step:
 * tile → game options → denominations of the chosen option.
 */
export async function s2tGameVariants(
  bigCategoryId: string,
  bigName?: string,
  bigImage?: string | null,
): Promise<S2TProductDetail | null> {
  const products = await s2tProductsForBig(bigCategoryId);
  if (!products.length) return null;
  let name = bigName;
  if (!name) {
    try {
      const cats = await s2tBigCategories();
      name = cats.find((c) => c.id === String(bigCategoryId))?.name;
    } catch {
      name = undefined;
    }
  }
  return {
    id: `game-${bigCategoryId}`,
    name: name || 'Game',
    image: bigImage || null,
    fields: [],
    variations: products.map((p) => ({
      id: p.id,
      name: p.name,
      priceUsd: p.fromUsd || 0,
      inStock: (p.fromUsd || 0) > 0,
    })),
    category: String(bigCategoryId),
  };
}
