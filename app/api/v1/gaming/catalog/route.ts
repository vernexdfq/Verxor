import { NextRequest, NextResponse } from 'next/server';
import {
  mgCategories,
  mgLastError,
  mgListProducts,
  mgProductDetail,
  moogoldConfigured,
  type MgProduct,
  type MgProductDetail,
} from '@/lib/providers/moogold';
import { gamingRetailNgn, resolveFxRateNgn } from '@/lib/gaming-pricing';
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
 * GET /api/v1/gaming/catalog?category_id=<id>
 *   → products for one category (first 60 priced; the rest show on open).
 *
 * Budget shield (Fixie 500 req/mo): the catalog snapshot lives in Supabase
 * (gaming_products + gaming_product_details, see supabase/gaming-cache.sql).
 * Browsing serves from the snapshot; the provider is only called when a
 * snapshot is stale, and a stale snapshot still serves if the provider
 * errors. Child panels / API users can reuse the same snapshot later.
 *
 * If the provider's category list is unavailable, the MOOGOLD_GAMING_CATEGORY_ID
 * env var (default 50, verified live) is used as a single "All Games" category.
 */
export const dynamic = 'force-dynamic';

const PRICE_BATCH = 60;

export async function GET(req: NextRequest) {
  if (!moogoldConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }

  // Verified gaming catalog: category 50 (Direct Top-Up, 500+ titles).
  const fallback = String(process.env.MOOGOLD_GAMING_CATEGORY_ID || '50');

  if (req.nextUrl.searchParams.get('category_id')) {
    const categoryId = req.nextUrl.searchParams.get('category_id') as string;
    const rate = await resolveFxRateNgn();

    // 1) Snapshot first.
    let products: MgProduct[] = [];
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
        const fresh = await mgListProducts(categoryId);
        if (fresh.length) {
          products = fresh;
          try {
            await saveProducts(categoryId, fresh);
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
        providerNotice: mgLastError() || 'provider returned no products',
      });
    }

    // 3) "From" prices for the first batch from cached details. Provider
    //    detail calls happen only when a product's snapshot is older than
    //    the grid window (7 days), capped at 8 per request so a busy hour
    //    can never blow the Fixie budget. Others show "View prices" until
    //    their turn arrives.
    let providerCalls = 0;
    const GRID_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const priced = await Promise.all(
      products.slice(0, PRICE_BATCH).map(async (p: MgProduct) => {
        let detail: MgProductDetail | null = null;
        try {
          const c = await cachedDetail(p.id);
          if (c && detailFresh(c.syncedAt, GRID_TTL_MS)) detail = c.detail;
        } catch {
          // ignore cache read errors
        }
        if (!detail && providerCalls < 8) {
          providerCalls += 1;
          try {
            detail = await mgProductDetail(p.id);
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
          fromNgn: prices.length ? gamingRetailNgn(Math.min(...prices), rate) : null,
        };
      }),
    );
    const rest = products.slice(PRICE_BATCH).map((p) => ({ id: p.id, name: p.name, image: null, fromNgn: null }));
    return NextResponse.json({ ok: true, categoryId, rate, products: [...priced, ...rest] });
  }

  let categories = await mgCategories();
  if (!categories.length) {
    categories = [{ id: fallback, name: 'All Games' }];
  }
  const rate = await resolveFxRateNgn();
  return NextResponse.json({ ok: true, rate, categories });
}
