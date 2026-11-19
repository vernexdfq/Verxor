import { NextRequest, NextResponse } from 'next/server';
import {
  mgCategories,
  mgLastError,
  mgListProducts,
  mgProductDetail,
  moogoldConfigured,
  type MgProduct,
} from '@/lib/providers/moogold';
import { gamingRetailNgn, resolveFxRateNgn } from '@/lib/gaming-pricing';

/**
 * GET /api/v1/gaming/catalog
 *   → categories + gaming products (with live retail "from" Naira prices,
 *     progressively cached). Prices are NAIRA ONLY.
 * GET /api/v1/gaming/catalog?category_id=<id>
 *   → products for one category (first 60 priced; the rest show on open).
 *
 * If the provider's category list is unavailable, the MOOGOLD_GAMING_CATEGORY_ID
 * env var (default 1) is used as a single "Gaming Top-Up" category.
 */
export const dynamic = 'force-dynamic';

const PRICE_BATCH = 60;

export async function GET(req: NextRequest) {
  if (!moogoldConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }

  const fallback = String(process.env.MOOGOLD_GAMING_CATEGORY_ID || '1');

  if (req.nextUrl.searchParams.get('category_id')) {
    const categoryId = req.nextUrl.searchParams.get('category_id') as string;
    const products = await mgListProducts(categoryId);
    const rate = await resolveFxRateNgn();
    const priced = await Promise.all(
      products.slice(0, PRICE_BATCH).map(async (p: MgProduct) => {
        const detail = await mgProductDetail(p.id);
        const prices = (detail?.variations || []).map((v) => v.priceUsd).filter((x) => x > 0);
        return {
          id: p.id,
          name: p.name,
          image: detail?.image || null,
          fromNgn: prices.length ? gamingRetailNgn(Math.min(...prices), rate) : null,
        };
      }),
    );
    const rest = products.slice(PRICE_BATCH).map((p) => ({ id: p.id, name: p.name, fromNgn: null }));
    if (!products.length) {
      return NextResponse.json({ ok: true, categoryId, rate, products: [], providerNotice: mgLastError() || 'provider returned no products' });
    }
    return NextResponse.json({ ok: true, categoryId, rate, products: [...priced, ...rest] });
  }

  let categories = await mgCategories();
  if (!categories.length) {
    categories = [{ id: fallback, name: 'Gaming Top-Up' }];
  }
  const rate = await resolveFxRateNgn();
  return NextResponse.json({ ok: true, rate, categories });
}
