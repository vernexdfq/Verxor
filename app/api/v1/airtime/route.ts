import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  purchaseAirtime,
  type CkNetworkSlug,
} from '@/lib/providers/clubkonnect';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

export async function POST(req: NextRequest) {
  if (!isClubKonnectConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Airtime provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    network?: string;
    phone?: string;
    amount?: number;
    ref?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const network = String(body.network || '').toLowerCase();
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 50) {
    return NextResponse.json(
      { ok: false, error: 'Minimum airtime is ₦50' },
      { status: 400 },
    );
  }

  try {
    const result = await purchaseAirtime({
      network: network as CkNetworkSlug,
      phone: String(body.phone || ''),
      amount,
      ref: body.ref,
    });
    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        status: result.status,
        phone: result.phone,
        amount: result.amount,
        network: result.network,
        message: result.message,
        provider: 'clubkonnect',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Airtime purchase failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
