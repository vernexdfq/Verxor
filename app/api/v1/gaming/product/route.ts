import { NextRequest, NextResponse } from 'next/server';
import { s2tConfigured, s2tGameVariants, s2tProductDetail, type S2TProductDetail } from '@/lib/providers/shop2topup';
import { gamingAudienceNgn, loadGamingMarkups, resolveFxRateNgn, resolveGamingAudience } from '@/lib/gaming-pricing';
import { cachedDetail, detailFresh, saveDetail } from '@/lib/gaming-cache';

/**
 * GET /api/v1/gaming/product?product_id=s2t-<categoryId>
 *   → product detail for the buy sheet: denominations with NGN retail
 *     prices (Naira only), stock state, and required form fields
 *     (e.g. Player ID), served from the Shop2TopUp API.
 *
 * Snapshot: details are served from the Supabase snapshot
 * (gaming_product_details) while fresh (12h); the provider is only called
 * on stale/missing snapshots (and the fresh result is saved back).
 * Purchases always re-check the provider for live stock and price.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!s2tConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }
  const productId = (req.nextUrl.searchParams.get('product_id') || '').trim();
  if (!productId) {
    return NextResponse.json({ ok: false, error: 'Missing product_id' }, { status: 400 });
  }

  let detail: S2TProductDetail | null = null;
  try {
    const c = await cachedDetail(productId);
    if (c && detailFresh(c.syncedAt)) detail = c.detail;
  } catch {
    // fall through to provider
  }
  if (!detail) {
    try {
      detail = productId.startsWith('game-')
        ? await s2tGameVariants(productId.slice(5))
        : await s2tProductDetail(productId);
      if (detail) {
        try {
          await saveDetail(detail);
        } catch {
          // non-fatal
        }
      }
    } catch {
      // provider error — keep the honest failure below
    }
  }

  if (!detail) {
    return NextResponse.json(
      { ok: false, error: 'Product not available right now. Try again in a moment.' },
      { status: 404 },
    );
  }

  // Audience-aware pricing (retail / child panel / API) from admin_settings.
  const audience = await resolveGamingAudience(req);
  const markups = await loadGamingMarkups();
  const priceNgn = (usd: number, rate: number) => gamingAudienceNgn(usd, audience, markups, rate);
  const rate = await resolveFxRateNgn();

  return NextResponse.json({
    ok: true,
    rate,
    audience,
    product: {
      id: detail.id,
      name: detail.name,
      image: detail.image || null,
      fields: detail.fields,
      variations: detail.variations.map((v) => ({
        id: v.id,
        name: v.name,
        priceNgn: priceNgn(v.priceUsd, rate),
        inStock: v.inStock !== false,
      })),
      servers: [],
    },
  });
}
