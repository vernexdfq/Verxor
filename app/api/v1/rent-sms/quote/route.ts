import { NextRequest, NextResponse } from 'next/server';
import {
  textverifiedConfigured,
  tvRentalPriceUsd,
  TV_DURATIONS,
  type TvRentalDuration,
} from '@/lib/providers/textverified';
import { rentSmsRetailNgn, rentSmsPanelNgn, rentSmsApiNgn, resolveRentSmsTiers, tierForCost } from '@/lib/rentsms-pricing';
import { resolvePanelClient, panelAllowsRentSms } from '@/lib/panel-auth';

/**
 * POST /api/v1/rent-sms/quote
 *   { serviceName, duration }  → { ok, priceNgn, durationLabel, available }
 *
 * Live price check: asks Textverified the USD cost for this service+duration,
 * then applies the retail multiplier × the live rate. Used by the buy sheet
 * AND the general-rental ladder (frontend calls it per duration).
 *
 * With a valid x-panel-key: prices at the PANEL tier instead, and the retail
 * price is also returned as retailPriceNgn for reference.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { serviceName?: string; duration?: string; areaCode?: boolean };
  const serviceName = String(body.serviceName || '').trim();
  const duration = String(body.duration || '').trim() as TvRentalDuration;
  if (!serviceName || !TV_DURATIONS.some((d) => d.id === duration)) {
    return NextResponse.json({ ok: false, error: 'Missing service or duration' }, { status: 400 });
  }
  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsRentSms(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to use Rent-for-SMS.' },
      { status: 403 },
    );
  }
  const isPanel = Boolean(panel);
  const price = await tvRentalPriceUsd({ serviceName, duration, isRenewable: false, areaCode: Boolean(body.areaCode) });
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
  if (isPanel) {
    const panelNgn = await rentSmsPanelNgn(price.priceUsd);
    if (!panelNgn) {
      return NextResponse.json({ ok: false, error: 'Could not compute the price. Try again.' }, { status: 500 });
    }
    // Which of the 5 USD-cost tiers this rental falls in (1–5), so the child
    // panel can apply its own tiered markup on its wholesale charge.
    const tierList = await resolveRentSmsTiers();
    const tierMatch = tierForCost(tierList, price.priceUsd);
    const tier = tierList.indexOf(tierMatch) + 1;
    return NextResponse.json({
      ok: true,
      priceNgn: panelNgn,
      retailPriceNgn: priceNgn,
      tier: tier > 0 ? tier : 1,
      audience: 'panel',
      durationLabel: label,
      serviceName,
    });
  }
  const apiNgn = await rentSmsApiNgn(price.priceUsd).catch(() => 0);
  return NextResponse.json({
    ok: true,
    priceNgn,
    apiPriceNgn: apiNgn || undefined,
    audience: 'retail',
    durationLabel: label,
    serviceName,
  });
}
