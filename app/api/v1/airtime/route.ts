import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  purchaseAirtime as purchaseClubKonnectAirtime,
  type CkNetworkSlug,
} from '@/lib/providers/clubkonnect';
import {
  isSmeConfigured,
  purchaseAirtime as purchaseSmeAirtime,
  type SmeNetworkSlug,
} from '@/lib/providers/smeapi';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

export async function POST(req: NextRequest) {
  const ckReady = isClubKonnectConfigured();
  const smeReady = isSmeConfigured();

  if (!ckReady && !smeReady) {
    return NextResponse.json(
      { ok: false, error: 'Airtime provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    network?: string;
    phone?: string;
    amount?: number;
    ported?: boolean;
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

  const phone = String(body.phone || '');
  const ref = body.ref;
  let lastError = 'Airtime purchase failed';

  // Primary: ClubKonnect (best airtime discounts — especially Glo/9mobile)
  if (ckReady) {
    try {
      const result = await purchaseClubKonnectAirtime({
        network: network as CkNetworkSlug,
        phone,
        amount,
        ref,
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
      lastError = err instanceof Error ? err.message : lastError;
      // Fall through to SMEAPI if available
      if (!smeReady) {
        return NextResponse.json({ ok: false, error: lastError }, { status: 502 });
      }
    }
  }

  // Fallback: SMEAPI
  if (smeReady) {
    try {
      const result = await purchaseSmeAirtime({
        network: network as SmeNetworkSlug,
        phone,
        amount,
        ported: Boolean(body.ported),
        ref,
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
          provider: 'smeapi',
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
      return NextResponse.json({ ok: false, error: lastError }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, error: lastError }, { status: 502 });
}
