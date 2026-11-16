import { NextRequest, NextResponse } from 'next/server';
import { getSyncedLivePlansForNetwork } from '@/lib/data-plan-sync';

export const dynamic = 'force-dynamic';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

/**
 * GET /api/v1/data/plans?network=mtn
 * Returns curated plans, filtered against live 247API:
 *  - missing plan_ids are hidden
 *  - retail auto-adjusts so locked ₦ margin stays the same when cost moves
 */
export async function GET(req: NextRequest) {
  const networkParam = req.nextUrl.searchParams.get('network')?.toLowerCase();
  const network =
    networkParam && NETWORKS.has(networkParam) ? networkParam : 'mtn';

  const { plans, source, hidden } = await getSyncedLivePlansForNetwork(network);

  return NextResponse.json({
    ok: true,
    network,
    plans,
    source,
    hidden,
  });
}
