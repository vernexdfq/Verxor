/**
 * Shop2TopUp provider — game top-ups + vouchers H2H API.
 *
 * Auth: one Bearer key in `SHOP2TOPUP_API_KEY` (Vercel env).
 * Rate limit: 5,000 requests / 60s per account.
 *
 * Catalog hierarchy:
 *   UI "category"  = S2T big category   (e.g. "PUBG Mobile", id: 1)
 *   UI "product"   = S2T category        (e.g. "UC Cards", "Direct Topup")
 *   UI "variation" = S2T subcategory/item (e.g. "60 UC", priced USD)
 *
 * Product ids: `s2t-<categoryId>` for top-up option sheets, `game-<bigId>` for variant pickers.
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

export type S2TItemPriceInfo = {
  price: number;
  inStock?: boolean;
};

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
    return payload as T;
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

/** Fallback base USD estimate for standard game packs if provider catalog and live price return zero */
function estimateKnownPackUsd(name: string): number {
  const n = name.toLowerCase();
  // PUBG UC packs
  if (/\b10\s*uc\b/.test(n)) return 0.16;
  if (/\b60\s*uc\b/.test(n)) return 0.96;
  if (/\b300\s*\+\s*25\s*uc\b|\b325\s*uc\b/.test(n)) return 4.75;
  if (/\b600\s*\+\s*60\s*uc\b|\b660\s*uc\b/.test(n)) return 9.5;
  if (/\b1,?500\s*\+\s*300\s*uc\b|\b1800\s*uc\b/.test(n)) return 23.75;
  if (/\b3,?000\s*\+\s*850\s*uc\b|\b3850\s*uc\b/.test(n)) return 47.5;
  if (/\b6,?000\s*\+\s*2,?100\s*uc\b|\b8100\s*uc\b/.test(n)) return 95.0;
  if (/\b12,?000\s*\+\s*4,?200\s*uc\b|\b16200\s*uc\b/.test(n)) return 190.0;
  if (/\b18,?000\s*\+\s*6,?300\s*uc\b|\b24300\s*uc\b/.test(n)) return 285.0;
  if (/\b24,?000\s*\+\s*8,?400\s*uc\b|\b32400\s*uc\b/.test(n)) return 380.0;
  if (/\b30,?000\s*\+\s*10,?500\s*uc\b|\b40500\s*uc\b/.test(n)) return 475.0;
  if (/elite\s*pass\s*plus/.test(n)) return 23.75;
  if (/elite\s*pass\s*lv1-50/.test(n)) return 4.75;
  if (/elite\s*pass/.test(n)) return 9.5;
  // Free Fire Diamonds
  if (/\b100\s*diamond/.test(n)) return 0.95;
  if (/\b210\s*diamond/.test(n)) return 1.95;
  if (/\b530\s*diamond/.test(n)) return 4.85;
  if (/\b1080\s*diamond/.test(n)) return 9.75;
  if (/\b2200\s*diamond/.test(n)) return 19.5;
  return 0;
}

/* ---------------- catalog ---------------- */

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
  const res = await s2tRequest<any>('/catalog/big-categories?for_ui=true').catch(() => []);
  const rows: Row[] = Array.isArray(res)
    ? res
    : Array.isArray(res?.big_categories)
      ? res.big_categories
      : Array.isArray(res?.data)
        ? res.data
        : [];
  const raw = rows.map((r) => {
    const img = r.image_url || r.image || null;
    const fullImg = img
      ? img.startsWith('http://') || img.startsWith('https://')
        ? img
        : img.startsWith('/')
          ? `https://shop2topup.com${img}`
          : `https://shop2topup.com/api/public/img/${img}?w=512&q=80`
      : null;
    return {
      id: String(r.id),
      name: String(r.name || 'Game'),
      image: fullImg,
    };
  });
  return raw.sort(
    (a, b) => popularWeight(a.name) - popularWeight(b.name) || a.name.localeCompare(b.name),
  );
}

/** Products (S2T categories) of one big category, with live "from" USD price and stock status. */
export async function s2tProductsForBig(
  bigCategoryId: string,
): Promise<Array<{ id: string; name: string; fromUsd: number | null; inStock?: boolean }>> {
  type CatRow = { id: number; name: string };
  type SubRow = { item_id: number; name: string; price: number | string; product_type?: string; in_stock?: boolean | string };
  const catsRes = await s2tRequest<any>(`/catalog/categories?bigCategoryId=${encodeURIComponent(bigCategoryId)}&for_ui=true`).catch(() => []);
  const list: CatRow[] = Array.isArray(catsRes)
    ? catsRes
    : Array.isArray(catsRes?.categories)
      ? catsRes.categories
      : Array.isArray(catsRes?.data)
        ? catsRes.data
        : [];

  const products = await Promise.all(
    list.map(async (c) => {
      let fromUsd: number | null = null;
      let inStock = true;
      try {
        const subsRes = await s2tRequest<any>(`/catalog/subcategories?categoryId=${encodeURIComponent(String(c.id))}`);
        const subs: SubRow[] = Array.isArray(subsRes)
          ? subsRes
          : Array.isArray(subsRes?.subcategories)
            ? subsRes.subcategories
            : Array.isArray(subsRes?.data)
              ? subsRes.data
              : [];
        if (subs.length > 0) {
          // If any item in the category is in stock, the category option is in stock
          inStock = subs.some((s) => {
            if (typeof s.in_stock === 'boolean') return s.in_stock;
            if (typeof s.in_stock === 'string') return /^(true|1|yes)$/i.test(s.in_stock);
            return true;
          });

          const prices = subs
            .map((s) => Number(s.price))
            .filter((p) => Number.isFinite(p) && p > 0);

          if (prices.length) {
            fromUsd = Math.min(...prices);
          } else if (subs[0]?.item_id) {
            // The catalog subcategories endpoint returns price 0 for some games;
            // query the first item's unit price to find the "From" price.
            try {
              const liveP = await s2tItemPrice(String(subs[0].item_id));
              if (liveP > 0) {
                fromUsd = liveP;
              } else {
                const est = estimateKnownPackUsd(subs[0].name);
                if (est > 0) fromUsd = est;
              }
            } catch {
              const est = estimateKnownPackUsd(subs[0].name);
              if (est > 0) fromUsd = est;
            }
          }
        } else {
          inStock = false;
        }
      } catch {
        // price discovery failure is non-fatal for the listing
      }
      return {
        id: `s2t-${c.id}`,
        name: String(c.name || 'Top-Up'),
        fromUsd,
        inStock,
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
    in_stock?: boolean | string;
  };
  const subsRes = await s2tRequest<any>(`/catalog/subcategories?categoryId=${encodeURIComponent(catId)}`);
  const items: SubRow[] = Array.isArray(subsRes)
    ? subsRes
    : Array.isArray(subsRes?.subcategories)
      ? subsRes.subcategories
      : Array.isArray(subsRes?.data)
        ? subsRes.data
        : [];
  if (!items.length) return null;

  let fields: S2TField[] = [];
  try {
    type ReqRow = { field_name: string; data_type?: string; placeholder?: string };
    const reqRes = await s2tRequest<any>(`/catalog/category/${encodeURIComponent(catId)}/requirements`);
    const reqList: ReqRow[] = Array.isArray(reqRes)
      ? reqRes
      : Array.isArray(reqRes?.requirements)
        ? reqRes.requirements
        : Array.isArray(reqRes?.data)
          ? reqRes.data
          : [];
    fields = reqList.map((r) => ({
      field: String(r.field_name),
      label: humanizeField(String(r.field_name)),
    }));
  } catch {
    // NO_REQUIREMENTS_FOUND etc. → no extra form needed (gift-card style).
  }

  const variations: S2TVariation[] = items.map((s) => {
    const usd = Number(s.price);
    const providerStock =
      typeof s.in_stock === 'boolean' ? s.in_stock
      : typeof s.in_stock === 'string' ? /^(true|1|yes)$/i.test(s.in_stock)
      : undefined;
    return {
      id: String(s.item_id),
      name: String(s.name),
      priceUsd: Number.isFinite(usd) && usd > 0 ? usd : 0,
      inStock: providerStock === undefined ? true : providerStock,
      productType: s.product_type,
    };
  });

  // The catalog subcategories endpoint returns price 0 for stocked items;
  // the live per-item unit price endpoint is the authoritative source. Refill zeros.
  const zeroPriced = variations.filter((v) => !v.priceUsd || v.priceUsd <= 0).slice(0, 40);
  if (zeroPriced.length) {
    await Promise.all(
      zeroPriced.map(async (v) => {
        try {
          const info = await s2tItemPriceInfo(v.id);
          if (info.price > 0) v.priceUsd = info.price;
          if (info.inStock !== undefined) v.inStock = info.inStock;
          if (v.priceUsd <= 0) {
            const est = estimateKnownPackUsd(v.name);
            if (est > 0) v.priceUsd = est;
          }
        } catch {
          const est = estimateKnownPackUsd(v.name);
          if (est > 0) v.priceUsd = est;
        }
      }),
    );
  }

  return {
    id: productId,
    name: String(items[0]?.category_name || 'Top-Up'),
    image: null,
    variations,
    fields,
    category: catId,
  };
}

/** Fresh unit price + stock for one item (from /catalog/subcategory/:itemId/price). */
export async function s2tItemPriceInfo(itemId: string): Promise<S2TItemPriceInfo> {
  const row = await s2tRequest<any>(`/catalog/subcategory/${encodeURIComponent(itemId)}/price`);
  const priceObj = row?.price ?? row?.data?.price ?? row?.data ?? row;
  const rawPrice =
    priceObj?.unit_price ??
    priceObj?.price ??
    priceObj?.original_price ??
    row?.unit_price ??
    (typeof row?.price === "number" || typeof row?.price === "string" ? row.price : undefined);
  const p = Number(rawPrice);
  const stockRaw = priceObj?.in_stock ?? row?.in_stock;
  const inStock =
    typeof stockRaw === "boolean" ? stockRaw
    : typeof stockRaw === "string" ? /^(true|1|yes)$/i.test(stockRaw)
    : undefined;

  return {
    price: Number.isFinite(p) && p > 0 ? p : 0,
    inStock,
  };
}

export async function s2tItemPrice(itemId: string): Promise<number> {
  const info = await s2tItemPriceInfo(itemId);
  return info.price;
}

/* ---------------- wallet ---------------- */

export async function s2tAccount(): Promise<S2TAccount | null> {
  try {
    const acc = await s2tRequest<any>('/account');
    const obj = acc?.account ?? acc?.data?.account ?? acc?.data ?? acc;
    return {
      email: obj?.email ? String(obj.email) : undefined,
      wallet: Number(obj?.wallet) || 0,
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
    const orderRaw = (row.order ?? (row.data as any)?.order ?? row.data ?? row) as Record<string, unknown>;
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
    const orderObj = (row?.order ?? (row?.data as any)?.order ?? row?.data ?? row) as Record<string, unknown>;
    return {
      status: orderObj?.status ? String(orderObj.status).toLowerCase() : undefined,
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
      inStock: p.inStock !== false,
    })),
    category: String(bigCategoryId),
  };
}
