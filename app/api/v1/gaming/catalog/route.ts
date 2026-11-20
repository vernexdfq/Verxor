import { NextRequest, NextResponse } from 'next/server';
import {
  s2tBigCategories,
  s2tConfigured,
  s2tLastError,
  s2tProductDetail,
  s2tProductsForBig,
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
