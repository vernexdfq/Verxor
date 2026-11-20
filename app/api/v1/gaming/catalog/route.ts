import { NextRequest, NextResponse } from 'next/server';
import {
  s2tBigCategories,
  s2tConfigured,
  s2tGameVariants,
  s2tProductsForBig,
  s2tLastError,
  s2tProductDetail,
  type S2TProductDetail,
} from '@/lib/providers/shop2topup';
import { gamingApiNgn, gamingRetailNgn, resolveFxRateNgn } from '@/lib/gaming-pricing';
import { resolvePanelClient } from '@/lib/panel-auth';
import {
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
 * The Supabase snapshot (gaming_products + gaming_product_details) still
 * shields browsing behind caches: product lists 7 days, grid "from" prices
 * 7 days, buy-sheet details 12 hours. Purchases always re-check live.
 * Shop2TopUp ids are prefixed `s2t-<categoryId>`.
 */
export const dynamic = 'force-dynamic';

const PRICE_BATCH = 60;
const GRID_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!s2tConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }

  // Child panels call with their panel key: they see child-panel (API-tier)
  // prices instead of retail, from the same Supabase snapshot.
  const panel = await resolvePanelClient(req);
  const priceNgn = panel ? gamingApiNgn : gamingRetailNgn;
  const audience = panel ? 'child' : 'retail';

  // Full A–Z/Popular list: one grid with every game, priced "from" its
  // cheapest option. Details are cached in gaming_product_details under
  // `game-<bigCategoryId>` (12h TTL); each request refreshes a bounded batch,
  // so a cold catalog fills gradually without hammering the provider.
  if (req.nextUrl.searchParams.get('all')) {
    const debug = req.nextUrl.searchParams.get('debug') === '1';
    const rate = await resolveFxRateNgn();
    const cats = await s2tBigCategories();
    let warm = 0;
    const dbg = { fresh: 0, warmed: 0, readFails: [] as string[], writeFails: [] as string[] };
    const games = await Promise.all(
      cats.map(async (c) => {
        let detail: S2TProductDetail | null = null;
        try {
          const c2 = await cachedDetail(`game-${c.id}`);
          if (c2 && detailFresh(c2.syncedAt)) {
            detail = c2.detail;
            dbg.fresh += 1;
          }
        } catch (e) {
          dbg.readFails.push(`${c.id}: ${e instanceof Error ? e.message.slice(0, 80) : 'read failed'}`);
        }
        if (!detail && warm < 24) {
          warm += 1;
          try {
            detail = await s2tGameVariants(c.id, c.name);
            if (detail) {
              dbg.warmed += 1;
              try {
                await saveDetail(detail);
              } catch (e) {
                dbg.writeFails.push(`${c.id}: ${e instanceof Error ? e.message.slice(0, 120) : 'write failed'}`);
              }
            }
          } catch {
            // provider error — show the game unpriced; it prices on a later request
          }
        }
        const prices = (detail?.variations || []).map((v) => v.priceUsd).filter((x) => x > 0);
        return {
          id: c.id,
          name: c.name,
          fromNgn: prices.length ? priceNgn(Math.min(...prices), rate) : null,
        };
      }),
    );
    return NextResponse.json({ ok: true, rate, audience, games, ...(debug ? { debug: dbg } : {}) });
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

    // 3) "From" prices: cached details first, a bounded batch of live
    //    provider calls for the rest. Shop2TopUp rate limits are generous
    //    (5,000/60s) so the cap is about politeness, not survival.
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
              try {
                await saveDetail(detail);
              } catch {
                // non-fatal
              }
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
    return NextResponse.json({ ok: true, categoryId, rate, audience, products: [...priced, ...rest] });
  }

  const categories = await s2tBigCategories();
  const rate = await resolveFxRateNgn();
  return NextResponse.json({ ok: true, rate, audience, categories });
}
