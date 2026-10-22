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

/**
 * Airtime routing (phase 1 — 247API primary, test first):
 *   ALL networks → 247API first (MTN uses plan_id 10 then standard VTU)
 *   ClubKonnect → backup only if 247 fails or is not configured
 *
 * Later (when ClubKonnect is re-enabled as specialty):
 *   9mobile primary ClubKonnect → fallback 247
 *   MTN/Glo/Airtel primary 247 → fallback ClubKonnect
 */
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
  const tried: string[] = [];

  // 1) Primary: 247API (MTN plan_id 10 → fallback standard VTU inside provider)
  if (api247Ready) {
    tried.push('api247');
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
          planId: result.planId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '247API failed';
      errors.push(`api247: ${message}`);
    }
  }

  // 2) Backup: ClubKonnect (only if primary failed or not configured)
  if (ckReady) {
    tried.push('clubkonnect');
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

  return NextResponse.json(
    {
      ok: false,
      error: errors.join(' | ') || 'Airtime purchase failed',
      tried,
    },
    { status: 502 },
  );
}
