import { NextRequest, NextResponse } from 'next/server';
import { bandOffer, customerPriceUsd } from '@/lib/pricing';
import { buyActivation } from '@/lib/providers/fivesim';

/**
 * Buy OTP number via 5SIM (Server 1 volume path).
 * Body: { country, product, poolId? }
 * Requires FIVESIM_API_KEY on Vercel.
 */
export async function POST(req: NextRequest) {
  if (!process.env.FIVESIM_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Number provider not configured' },
      { status: 503 },
    );
  }

  let body: { country?: string; product?: string; poolId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const country = (body.country || 'usa').toLowerCase();
  const product = (body.product || 'telegram').toLowerCase();

  try {
    const order = await buyActivation({ country, product });
    const cost = Number(order?.price ?? 0);
    const region = country === 'usa' || country === 'united states' ? 'usa' : 'worldwide';
    const band = bandOffer(cost, region);

    if (!band) {
      return NextResponse.json(
        { ok: false, error: 'Offer exceeds max cost or invalid price', providerCost: cost },
        { status: 422 },
      );
    }

    const sell = customerPriceUsd(cost);

    return NextResponse.json({
      ok: true,
      order: {
        providerOrderId: order?.id,
        phone: order?.phone,
        status: order?.status,
        server: band.server,
        tier: band.tier,
        customerPriceUsd: sell,
        // provider cost kept server-side for ledger; not required on client
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
