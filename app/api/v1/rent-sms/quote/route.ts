import { NextRequest, NextResponse } from 'next/server';
import {
  textverifiedConfigured,
  tvRentalPriceUsd,
  TV_DURATIONS,
  type TvRentalDuration,
} from '@/lib/providers/textverified';
import { rentSmsRetailNgn } from '@/lib/rentsms-pricing';

/**
 * POST /api/v1/rent-sms/quote
 *   { serviceName, duration }  → { ok, priceNgn, durationLabel, available }
 *
 * Live price check: asks Textverified the USD cost for this service+duration,
 * then applies the retail multiplier × the live rate. Used by the buy sheet
 * AND the general-rental ladder (frontend calls it per duration).
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { serviceName?: string; duration?: string };
  const serviceName = String(body.serviceName || '').trim();
  const duration = String(body.duration || '').trim() as TvRentalDuration;
  if (!serviceName || !TV_DURATIONS.some((d) => d.id === duration)) {
    return NextResponse.json({ ok: false, error: 'Missing service or duration' }, { status: 400 });
  }
  const price = await tvRentalPriceUsd({ serviceName, duration, isRenewable: false });
  if (!price.ok || !price.priceUsd) {
    return NextResponse.json(
      { ok: false, error: price.error || 'No price available for that option right now.' },
      { status: 404 },
    );
  }
  const priceNgn = await rentSmsRetailNgn(price.priceUsd);
  if (!priceNgn) {
    return NextResponse.json({ ok: false, error: 'Could not compute the price. Try again.' }, { status: 500 });
  }
  const label = TV_DURATIONS.find((d) => d.id === duration)?.label || duration;
  return NextResponse.json({ ok: true, priceNgn, durationLabel: label, serviceName });
}
