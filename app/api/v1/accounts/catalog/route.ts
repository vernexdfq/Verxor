import { NextRequest, NextResponse } from 'next/server';
import { fetchFacebookCatalog } from '@/lib/providers/accszone';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/v1/accounts/catalog
 * Query:
 *   platform=Facebook (default, only Facebook live for now)
 *   refresh=1 force upstream re-fetch
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get('platform') || 'Facebook').trim();
    const forceRefresh =
      searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

    if (platform.toLowerCase() !== 'facebook') {
      return NextResponse.json(
        {
          ok: false,
          source: 'empty',
          platform,
          rate: Number(process.env.USD_NGN_RATE || 1380),
          updatedAt: new Date().toISOString(),
          subtypes: [],
          offers: [],
          total: 0,
          inStock: 0,
          error: `Live catalogue for ${platform} is not enabled yet. Facebook is live.`,
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const catalog = await fetchFacebookCatalog({ forceRefresh });

    if (!catalog.ok) {
      const isMissingConfig = catalog.error?.toLowerCase().includes('not configured');
      return NextResponse.json(catalog, {
        status: isMissingConfig ? 503 : 502,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error while fetching accounts catalog';
    return NextResponse.json(
      {
        ok: false,
        source: 'error',
        platform: 'Facebook',
        rate: Number(process.env.USD_NGN_RATE || 1380),
        updatedAt: new Date().toISOString(),
        subtypes: [],
        offers: [],
        total: 0,
        inStock: 0,
        error: message,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
