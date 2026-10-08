import { NextRequest, NextResponse } from 'next/server';
import {
  isSmeConfigured,
  listDataPlans,
  type SmeNetworkSlug,
} from '@/lib/providers/smeapi';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

export async function GET(req: NextRequest) {
  if (!isSmeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Data provider not configured' },
      { status: 503 },
    );
  }

  const networkParam = req.nextUrl.searchParams.get('network')?.toLowerCase();
  const network =
    networkParam && NETWORKS.has(networkParam)
      ? (networkParam as SmeNetworkSlug)
      : undefined;

  try {
    const plans = await listDataPlans(network);
    return NextResponse.json({
      ok: true,
      plans: plans.map((p) => ({
        id: p.id,
        networkId: p.network_id,
        network: p.network.toLowerCase() === 'airtel' ? 'airtel' : p.network.toLowerCase(),
        name: p.name,
        type: p.type,
        days: p.days,
        price: p.price,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load plans';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
