import { NextRequest, NextResponse } from 'next/server';
import { getSyncedPlansForNetwork } from '@/lib/data-plan-sync';
import { toLivePlan } from '@/lib/data-catalog';
import { resolvePanelClient, panelAllowsData } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

/**
 * GET /api/v1/data/plans?network=mtn|glo|airtel|9mobile
 * Optional: omit network → all networks.
 *
 * Auth:
 *  - Public / retail session: returns retail prices (price / retail).
 *  - Child panel (Bearer vx_panel_… or X-Api-Key): also returns childPrice + apiPrice;
 *    price is set to childPrice for convenience.
 *
 * Never exposes provider cost.
 */
export async function GET(req: NextRequest) {
  const networkParam = req.nextUrl.searchParams.get('network')?.toLowerCase() || '';
  const panel = await resolvePanelClient(req);

  if (panel && !panelAllowsData(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to list data plans.' },
      { status: 403 },
    );
  }

  const networks = networkParam && NETWORKS.has(networkParam)
    ? [networkParam]
    : ['mtn', 'airtel', 'glo', '9mobile'];

  const byNetwork: Record<string, unknown[]> = {};
  let total = 0;
  let hiddenTotal = 0;
  let source: string = 'catalog-fallback';

  for (const network of networks) {
    const { plans, source: src, hidden } = await getSyncedPlansForNetwork(network);
    source = src;
    hiddenTotal += hidden;
    const mapped = plans.map((p) => {
      const live = toLivePlan(p);
      if (panel) {
        return {
          ...live,
          /** Panel convenience: price = child wholesale */
          price: live.childPrice,
          walletMode: 'reseller' as const,
        };
      }
      return live;
    });
    byNetwork[network] = mapped;
    total += mapped.length;
  }

  const body: Record<string, unknown> = {
    ok: true,
    total,
    source,
    hidden: hiddenTotal,
    panel: panel ? { id: panel.id, name: panel.name } : null,
  };

  if (networks.length === 1) {
    body.network = networks[0];
    body.plans = byNetwork[networks[0]];
  } else {
    body.networks = byNetwork;
  }

  return NextResponse.json(body);
}
