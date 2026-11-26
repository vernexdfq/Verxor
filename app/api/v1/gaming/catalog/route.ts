import { NextRequest, NextResponse } from 'next/server';
import { S2T_GAME_ARTWORK } from '@/lib/gaming-artwork';
import {
  s2tBigCategories,
  s2tConfigured,
  s2tGameVariants,
  s2tProductsForBig,
  s2tLastError,
  s2tProductDetail,
  type S2TCategory,
  type S2TProductDetail,
} from '@/lib/providers/shop2topup';
import { gamingAudienceNgn, loadGamingMarkups, resolveFxRateNgn, resolveGamingAudience } from '@/lib/gaming-pricing';
import {
  cachedAllGameDetails,
  cachedDetail,
  cachedProducts,
  detailFresh,
  productsFresh,
  saveDetail,
  saveProducts,
} from '@/lib/gaming-cache';

/**
 * GET /api/v1/gaming/catalog
 *   → categories + gaming products (with live retail "from" Naira prices).
 *     Prices are NAIRA ONLY.
 * GET /api/v1/gaming/catalog?category_id=<bigCategoryId>
 *   → products for one category (first 60 priced; the rest show on open).
 *
 * Provider: Shop2TopUp H2H API (Bearer SHOP2TOPUP_API_KEY, no IP proxy).
 * Multi-layer caching: in-memory server cache (15m), Supabase snapshots,
 * and HTTP Cache-Control headers for instant repeat responses.
 */
export const dynamic = 'force-dynamic';

const PRICE_BATCH = 60;
const GRID_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Server-side in-memory cache for big categories (30 min TTL)
let cachedBigCats: { at: number; data: S2TCategory[] } | null = null;
async function getBigCategoriesFast(): Promise<S2TCategory[]> {
  if (cachedBigCats && Date.now() - cachedBigCats.at < 30 * 60 * 1000 && cachedBigCats.data.length > 0) {
    return cachedBigCats.data;
  }
  try {
    const fresh = await s2tBigCategories();
    if (fresh && fresh.length) {
      cachedBigCats = { at: Date.now(), data: fresh };
      return fresh;
    }
  } catch {}
  return cachedBigCats?.data || [];
}

// Server-side in-memory cache for the full catalog (15 min TTL)
type CatalogCacheEntry = {
  timestamp: number;
  rate: number;
  audience: string;
  games: Array<{ id: string; name: string; image: string | null; fromNgn: number | null }>;
};
const serverCatalogMemory = new Map<string, CatalogCacheEntry>();
const SERVER_CATALOG_TTL_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!s2tConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }

  // Audience-aware pricing (retail / child panel / API) from admin_settings
  // 'gaming_markups' — same snapshot, different tier multipliers.
  const audience = await resolveGamingAudience(req);
  const markups = await loadGamingMarkups();
  const priceNgn = (usd: number, rate: number) => gamingAudienceNgn(usd, audience, markups, rate);

  // Full A–Z/Popular list: one grid with every game, priced "from" its
  // cheapest option. Cached in-memory and in Supabase snapshot.
  if (req.nextUrl.searchParams.get('all')) {
    const debug = req.nextUrl.searchParams.get('debug') === '1';
    const rate = await resolveFxRateNgn();

    // Check server in-memory cache first (< 1ms response)
    const cacheKey = `${audience}:${Math.round(rate)}`;
    const memCached = serverCatalogMemory.get(cacheKey);
    if (!debug && memCached && Date.now() - memCached.timestamp < SERVER_CATALOG_TTL_MS && memCached.games.length > 0) {
      return NextResponse.json(
        { ok: true, rate, audience, games: memCached.games, count: memCached.games.length, cached: true },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
          },
        },
      );
    }

    const cats = await getBigCategoriesFast();
    // Batch-load all snapshots in 1 query from Supabase instead of 50 individual calls
    const allDetails = await cachedAllGameDetails();

    let warm = 0;
    const dbg = { fresh: 0, warmed: 0, readFails: [] as string[], writeFails: [] as string[] };
    const games = await Promise.all(
      cats.map(async (c) => {
        let detail: S2TProductDetail | null = null;
        const c2 = allDetails[`game-${c.id}`];
        if (c2 && detailFresh(c2.syncedAt)) {
          detail = c2.detail;
          dbg.fresh += 1;
        } else if (c2) {
          // Stale snapshot is still usable for "from" price preview
          detail = c2.detail;
        }

        // Limit cold warming to 4 to prevent blocking the response
        if (!detail && warm < 4) {
          warm += 1;
          try {
            detail = await s2tGameVariants(c.id, c.name, c.image || S2T_GAME_ARTWORK[c.id]);
            if (detail) {
              dbg.warmed += 1;
              void saveDetail(detail).catch(() => null);
            }
          } catch {
            // provider error — show the game unpriced; it prices on a later request
          }
        }
        const prices = (detail?.variations || []).map((v) => v.priceUsd).filter((x) => x > 0);
        return {
          id: c.id,
          name: c.name,
          image: c.image || S2T_GAME_ARTWORK[c.id] || detail?.image || null,
          fromNgn: prices.length ? priceNgn(Math.min(...prices), rate) : null,
        };
      }),
    );

    // Save to server in-memory cache
    if (games.length > 0) {
      serverCatalogMemory.set(cacheKey, {
        timestamp: Date.now(),
        rate,
        audience,
        games,
      });
    }

    return NextResponse.json(
      { ok: true, rate, audience, games, ...(debug ? { debug: dbg } : {}) },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      },
    );
  }

  if (req.nextUrl.searchParams.get('category_id')) {
    const categoryId = req.nextUrl.searchParams.get('category_id') as string;
    const rate = await resolveFxRateNgn();

    // 1) Snapshot first.
    let products: Array<{ id: string; name: string }> = [];
    let snapshotServed = false;
    try {
      const snap = await cachedProducts(categoryId);
      if (snap.products.length) {
        products = snap.products;
        snapshotServed = productsFresh(
          snap.rows.length ? snap.rows.reduce((a, b) => (a.syncedAt < b.syncedAt ? a : b)).syncedAt : undefined,
        );
      }
    } catch {
      // Supabase snapshot unavailable — fall through to the provider.
    }

    // 2) Refresh the product list from the provider only when stale.
    if (!products.length || !snapshotServed) {
      try {
        const fresh = await s2tProductsForBig(categoryId);
        if (fresh.length) {
          products = fresh.map((p) => ({ id: p.id, name: p.name }));
          try {
            await saveProducts(categoryId, products);
          } catch {
            // Cache write failure is non-fatal.
          }
        }
      } catch {
        // Provider failed; keep the (possibly stale) snapshot below.
      }
    }

    if (!products.length) {
      return NextResponse.json({
        ok: true,
        categoryId,
        rate,
        products: [],
        providerNotice: s2tLastError() || 'provider returned no products',
      });
    }

    // 3) "From" prices: cached details first, bounded batch of live provider calls
    let providerCalls = 0;
    const priced = await Promise.all(
      products.slice(0, PRICE_BATCH).map(async (p) => {
        let detail: S2TProductDetail | null = null;
        try {
          const c = await cachedDetail(p.id);
          if (c && detailFresh(c.syncedAt, GRID_TTL_MS)) detail = c.detail;
        } catch {
          // ignore cache read errors
        }
        if (!detail && providerCalls < 12) {
          providerCalls += 1;
          try {
            detail = await s2tProductDetail(p.id);
            if (detail) {
              void saveDetail(detail).catch(() => null);
            }
          } catch {
            // provider error — leave unpriced ("View prices" on open)
          }
        }
        const prices = (detail?.variations || []).map((v) => v.priceUsd).filter((x) => x > 0);
        return {
          id: p.id,
          name: p.name,
          image: detail?.image || null,
          fromNgn: prices.length ? priceNgn(Math.min(...prices), rate) : null,
        };
      }),
    );
    const rest = products.slice(PRICE_BATCH).map((p) => ({ id: p.id, name: p.name, image: null, fromNgn: null }));
    return NextResponse.json(
      { ok: true, categoryId, rate, audience, products: [...priced, ...rest] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      },
    );
  }

  const categories = await getBigCategoriesFast();
  const rate = await resolveFxRateNgn();
  return NextResponse.json(
    { ok: true, rate, audience, categories },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    },
  );
}
