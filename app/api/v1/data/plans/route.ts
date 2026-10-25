import { NextRequest, NextResponse } from 'next/server';
import { catalogForNetwork, toLivePlan } from '@/lib/data-catalog';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

/**
 * GET /api/v1/data/plans?network=mtn
 * Returns curated catalog (retail prices). Only networks/tabs we have locked.
 */
export async function GET(req: NextRequest) {
  const networkParam = req.nextUrl.searchParams.get('network')?.toLowerCase();
  const network =
    networkParam && NETWORKS.has(networkParam) ? networkParam : 'mtn';

  const curated = catalogForNetwork(network).map(toLivePlan);

  return NextResponse.json({
    ok: true,
    network,
    plans: curated,
    source: 'catalog',
  });
}
