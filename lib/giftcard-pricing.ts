/**
 * Verxor gift-card standalone FX rates (Denny's master pricing).
 *
 * Gift cards are DECOUPLED from the global USD→NGN rate: three dedicated
 * rates stored in admin_settings key `gift_card_rates` (JSON), editable in
 * Admin → Pricing → Gift Cards.
 *
 *   retail  ₦1,460/$1  — what customers pay (Buy Gift Card grid)
 *   api     ₦1,415/$1  — API users / Child Panel wholesale
 *   trade   ₦1,200/$1  — buy-back rate when customers sell cards to Verxor
 *
 * USD amounts are never shown to customers; Naira only.
 */

export const GIFT_CARD_DEFAULT_RATES = { retail: 1460, api: 1415, trade: 1200 };

export type GiftCardRates = { retail: number; api: number; trade: number };

export async function resolveGiftCardRates(): Promise<GiftCardRates> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(
        `${base}/rest/v1/admin_settings?key=eq.gift_card_rates&select=value&limit=1`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string }>;
        const parsed = rows[0]?.value ? JSON.parse(rows[0].value) : null;
        const num = (v: unknown, d: number) => (Number(v) > 0 ? Number(v) : d);
        return {
          retail: num(parsed?.retail, GIFT_CARD_DEFAULT_RATES.retail),
          api: num(parsed?.api, GIFT_CARD_DEFAULT_RATES.api),
          trade: num(parsed?.trade, GIFT_CARD_DEFAULT_RATES.trade),
        };
      }
    } catch {
      /* fall through to defaults */
    }
  }
  return { ...GIFT_CARD_DEFAULT_RATES };
}

/** Retail Naira price for a gift card at the standalone retail rate. */
export function giftCardRetailNgn(baseUsd: number, rates: GiftCardRates): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return Math.round(baseUsd * rates.retail);
}

/** API / Child-Panel Naira price (for panel/API users later). */
export function giftCardApiNgn(baseUsd: number, rates: GiftCardRates): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return Math.round(baseUsd * rates.api);
}

/** Buy-back Naira payout for a customer selling a card to Verxor. */
export function giftCardTradeNgn(faceUsd: number, rates: GiftCardRates): number {
  if (!Number.isFinite(faceUsd) || faceUsd <= 0) return 0;
  return Math.round(faceUsd * rates.trade);
}
