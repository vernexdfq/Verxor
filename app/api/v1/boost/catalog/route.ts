import { NextRequest, NextResponse } from 'next/server';
import { fetchSmmCatalog } from '@/lib/providers/smm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

    const catalog = await fetchSmmCatalog({ forceRefresh });

    if (!catalog.ok) {
      // Differentiate missing server configuration (503) from upstream provider failure (502)
      const isMissingConfig = catalog.error?.toLowerCase().includes('not configured');
      const statusCode = isMissingConfig ? 503 : 502;

      return NextResponse.json(catalog, {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        source: 'error',
        rate: 1380,
        updatedAt: new Date().toISOString(),
        totalPlatforms: 0,
        totalServices: 0,
        platforms: [],
        services: [],
        error: err?.message || 'Internal error while fetching SMM catalog',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
