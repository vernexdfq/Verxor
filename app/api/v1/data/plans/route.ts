import { NextRequest, NextResponse } from 'next/server';
import { getSyncedPlansForNetwork } from '@/lib/data-plan-sync';
import { toLivePlan } from '@/lib/data-catalog';
import { resolvePanelClient, panelAllowsData } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

function childPriceOf(cost: number | undefined, apiPrice: number, retail: number): number {
  const c = Number(cost);
  if (Number.isFinite(c) && c > 0) return Math.ceil(c * 1.005);
  const a = Number(apiPrice);
  if (Number.isFinite(a) && a > 0) return Math.round(a);
  return Math.round(retail);
}

/**
 * GET /api/v1/data/plans?network=mtn|glo|airtel|9mobile
 * Omit network → all networks.
 *
 * Public: retail prices.
 * Panel (Bearer vx_panel_… / X-Api-Key): price = childPrice (cost+0.5% ceil).
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

  const networks =
    networkParam && NETWORKS.has(networkParam)
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
      const ovChild = Number(p.childPriceOverride);
      const childPrice =
        Number.isFinite(ovChild) && ovChild > 0
          ? Math.round(ovChild)
          : childPriceOf(p.cost, p.apiPrice, p.retail);
      const row = {
        ...live,
        network: p.network,
        size: p.size,
        retail: p.retail,
        childPrice,
        apiPrice: p.apiPrice,
        tab: p.tab,
      };
      if (panel) {
        return { ...row, price: childPrice, walletMode: 'reseller' as const };
      }
      return row;
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
