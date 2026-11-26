import { NextRequest, NextResponse } from 'next/server';
import { S2T_GAME_ARTWORK } from '@/lib/gaming-artwork';
import { s2tConfigured, s2tGameVariants, s2tProductDetail, type S2TProductDetail } from '@/lib/providers/shop2topup';
import { gamingAudienceNgn, loadGamingMarkups, resolveFxRateNgn, resolveGamingAudience } from '@/lib/gaming-pricing';
import { cachedDetail, detailFresh, saveDetail } from '@/lib/gaming-cache';

/**
 * GET /api/v1/gaming/product?product_id=s2t-<categoryId>
 *   → product detail for the buy sheet: denominations with NGN retail
 *     prices (Naira only), stock state, and required form fields
 *     (e.g. Player ID), served from the Shop2TopUp API.
 *
 * Caching: in-memory server cache (15m), Supabase snapshot (12h).
 * Purchases always re-check the provider for live stock and price.
 */
export const dynamic = 'force-dynamic';

type ProductCacheEntry = {
  timestamp: number;
  rate: number;
  audience: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    fields: any[];
    variations: any[];
    servers: any[];
  };
};

const serverProductDetailMemory = new Map<string, ProductCacheEntry>();
const SERVER_PRODUCT_TTL_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!s2tConfigured()) {
    return NextResponse.json({ ok: false, error: 'Gaming provider not configured' }, { status: 503 });
  }
  const productId = (req.nextUrl.searchParams.get('product_id') || '').trim();
  if (!productId) {
    return NextResponse.json({ ok: false, error: 'Missing product_id' }, { status: 400 });
  }

  const audience = await resolveGamingAudience(req);
  const rate = await resolveFxRateNgn();
  const cacheKey = `${productId}:${audience}:${Math.round(rate)}`;

  // 1) Fast in-memory server cache (< 1ms response)
  const memCached = serverProductDetailMemory.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < SERVER_PRODUCT_TTL_MS) {
    return NextResponse.json(
      {
        ok: true,
        rate: memCached.rate,
        audience: memCached.audience,
        product: memCached.product,
        cached: true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      },
    );
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

  if (productId.startsWith('game-') && !detail.image) {
    detail.image = S2T_GAME_ARTWORK[productId.slice(5)] || null;
  }

  // Audience-aware pricing (retail / child panel / API) from admin_settings.
  const markups = await loadGamingMarkups();
  const priceNgn = (usd: number, rateVal: number) => gamingAudienceNgn(usd, audience, markups, rateVal);

  const productPayload = {
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
  };

  serverProductDetailMemory.set(cacheKey, {
    timestamp: Date.now(),
    rate,
    audience,
    product: productPayload,
  });

  return NextResponse.json(
    {
      ok: true,
      rate,
      audience,
      product: productPayload,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    },
  );
}
