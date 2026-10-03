import { NextRequest, NextResponse } from 'next/server';
import { buyIntoPool, configuredProviders } from '@/lib/providers';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * Buy OTP number into a public pool.
 * Body: { poolId, product, country?, userId? }
 *
 * Pool ids:
 *   usa-economy | usa-standard | worldwide-economy | worldwide-standard
 *   usa-fast | usa-premium | worldwide-fast | worldwide-premium
 *
 * Provider cost bands (USD):
 *   <0.5 economy | 0.5–<1 standard | 1–<2 fast | ≥2 premium
 */
export async function POST(req: NextRequest) {
  if (configuredProviders().length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No number providers configured' },
      { status: 503 },
    );
  }

  let body: {
    poolId?: string;
    product?: string;
    country?: string;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const poolId = (body.poolId || '').toLowerCase();
  const product = (body.product || 'whatsapp').toLowerCase();
  const country = body.country?.toLowerCase();

  const validPools = new Set([
    'usa-economy',
    'usa-standard',
    'worldwide-economy',
    'worldwide-standard',
    'usa-fast',
    'usa-premium',
    'worldwide-fast',
    'worldwide-premium',
  ]);

  if (!validPools.has(poolId)) {
    return NextResponse.json({ ok: false, error: 'Invalid poolId' }, { status: 400 });
  }

  try {
    const order = await buyIntoPool({ poolId, product, country });

    let savedId: string | null = null;
    if (supabaseConfigured() && body.userId) {
      try {
        const rows = await sbInsert('number_orders', {
          user_id: body.userId,
          provider: order.provider,
          provider_order_id: order.providerOrderId,
          phone: order.phone,
          country: country || (poolId.startsWith('usa') ? 'usa' : 'worldwide'),
          product,
          pool_id: poolId,
          server_lane: order.server,
          tier: order.tier,
          cost_usd: order.costUsd,
          price_usd: order.sellUsd,
          status: order.status === 'active' || order.status === 'PENDING' ? 'waiting' : 'waiting',
          raw: order.raw ?? {},
        });
        savedId = Array.isArray(rows) ? rows[0]?.id : null;
      } catch {
        // Order still returned; ledger can retry
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId,
        providerOrderId: order.providerOrderId,
        phone: order.phone,
        status: 'waiting',
        server: order.server,
        tier: order.tier,
        poolId: order.poolId,
        customerPriceUsd: order.sellUsd,
        customerPriceNgn: order.sellNgn,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
