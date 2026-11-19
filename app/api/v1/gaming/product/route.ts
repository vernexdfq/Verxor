import { NextRequest, NextResponse } from 'next/server';
import { mgProductDetail, mgServerList, moogoldConfigured } from '@/lib/providers/moogold';
import { gamingRetailNgn, resolveFxRateNgn } from '@/lib/gaming-pricing';

/**
 * GET /api/v1/gaming/product?product_id=<id>
 *   → product detail for the buy sheet: denominations with NGN retail
 *     prices (Naira only), stock state, required form fields, and the
 *     server list when the product needs one.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!moogoldConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }
  const productId = (req.nextUrl.searchParams.get('product_id') || '').trim();
  if (!productId) {
    return NextResponse.json({ ok: false, error: 'Missing product_id' }, { status: 400 });
  }

  const detail = await mgProductDetail(productId);
  if (!detail) {
    return NextResponse.json({ ok: false, error: 'Product not available right now. Try again in a moment.' }, { status: 404 });
  }

  const rate = await resolveFxRateNgn();

  // Server / region picker only when the product requires that field.
  const needsServers = detail.fields.some((f) => /server|region/i.test(f.field));
  const servers = needsServers ? await mgServerList(productId) : [];

  return NextResponse.json({
    ok: true,
    rate,
    product: {
      id: detail.id,
      name: detail.name,
      image: detail.image,
      fields: detail.fields,
      variations: detail.variations.map((v) => ({
        id: v.id,
        name: v.name,
        priceNgn: gamingRetailNgn(v.priceUsd, rate),
        inStock: v.inStock !== false,
      })),
      servers,
    },
  });
}
