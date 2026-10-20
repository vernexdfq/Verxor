import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  purchaseAirtime as purchaseClubKonnect,
  type CkNetworkSlug,
} from '@/lib/providers/clubkonnect';
import {
  isApi247Configured,
  purchaseAirtime247,
  type Api247NetworkSlug,
} from '@/lib/providers/api247';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

export async function POST(req: NextRequest) {
  const ckReady = isClubKonnectConfigured();
  const api247Ready = isApi247Configured();

  if (!ckReady && !api247Ready) {
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

  const phone = String(body.phone || '');
  const ref = body.ref;
  const errors: string[] = [];

  // 1) Primary: ClubKonnect
  if (ckReady) {
    try {
      const result = await purchaseClubKonnect({
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
      const message = err instanceof Error ? err.message : 'ClubKonnect failed';
      errors.push(`clubkonnect: ${message}`);
    }
  }

  // 2) Backup: 247API (only if primary failed or not configured)
  if (api247Ready) {
    try {
      const result = await purchaseAirtime247({
        network: network as Api247NetworkSlug,
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
          provider: 'api247',
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '247API failed';
      errors.push(`api247: ${message}`);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: errors.join(' | ') || 'Airtime purchase failed',
      tried: [
        ...(ckReady ? ['clubkonnect'] : []),
        ...(api247Ready ? ['api247'] : []),
      ],
    },
    { status: 502 },
  );
}
