import { NextRequest, NextResponse } from 'next/server';
import {
  mgCategories,
  mgLastError,
  mgListProducts,
  mgProductDetail,
  moogoldConfigured,
  type MgProduct,
} from '@/lib/providers/moogold';
import { giftCardRetailNgn, resolveGiftCardRates } from '@/lib/giftcard-pricing';

/**
 * GET /api/v1/giftcards/catalog
 *   → categories + gift-card products with live retail "from" Naira prices.
 *     Prices use the STANDALONE gift-card FX rate (Admin → Pricing → Gift
 *     Cards), decoupled from the global daily rate. Naira only.
 * GET /api/v1/giftcards/catalog?category_id=<id>
 *   → products for one category (first 60 priced; the rest show on open).
 *
 * Gift card products use MOOGOLD_GIFT_CATEGORY_ID (default '2').
 */
export const dynamic = 'force-dynamic';

const PRICE_BATCH = 60;

export async function GET(req: NextRequest) {
  if (!moogoldConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gift card provider not configured' }, { status: 503 });
  }

  const fallback = String(process.env.MOOGOLD_GIFT_CATEGORY_ID || '2');
  const rates = await resolveGiftCardRates();

  if (req.nextUrl.searchParams.get('category_id')) {
    const categoryId = req.nextUrl.searchParams.get('category_id') as string;
    const products = await mgListProducts(categoryId);
    const priced = await Promise.all(
      products.slice(0, PRICE_BATCH).map(async (p: MgProduct) => {
        const detail = await mgProductDetail(p.id);
        const prices = (detail?.variations || []).map((v) => v.priceUsd).filter((x) => x > 0);
        return {
          id: p.id,
          name: p.name,
          fromNgn: prices.length ? giftCardRetailNgn(Math.min(...prices), rates) : null,
        };
      }),
    );
    const rest = products.slice(PRICE_BATCH).map((p) => ({ id: p.id, name: p.name, fromNgn: null }));
    if (!products.length) {
      return NextResponse.json({ ok: true, categoryId, rate: rates.retail, products: [], providerNotice: mgLastError() || 'provider returned no products' });
    }
    return NextResponse.json({ ok: true, categoryId, rate: rates.retail, products: [...priced, ...rest] });
  }

  let categories = await mgCategories();
  if (!categories.length) {
    categories = [{ id: fallback, name: 'Gift Cards' }];
  }
  return NextResponse.json({ ok: true, rate: rates.retail, categories });
}
