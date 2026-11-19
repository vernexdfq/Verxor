/**
 * Verxor Rent-for-SMS pricing (Textverified rentals).
 *
 * Price = provider USD cost × audience multiplier × the live global USD→NGN
 * rate (the same admin daily rate Virtual Number and Email OTP use).
 *
 * Multipliers are stored in admin_settings key `rent_sms_markups` (JSON) and
 * editable in Admin → Pricing → Rent SMS. Percentage multipliers (not flat
 * markups) so they scale across 1-day to 1-year rentals automatically.
 *
 * USD is never shown to customers; Naira only.
 */

import { resolveFxRateNgn } from './gaming-pricing';

export const RENT_SMS_DEFAULT_MULTIPLIERS = { retail: 1.5, api: 1.3 };

export type RentSmsMultipliers = { retail: number; api: number };

export async function resolveRentSmsMultipliers(): Promise<RentSmsMultipliers> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(
        `${base}/rest/v1/admin_settings?key=eq.rent_sms_markups&select=value&limit=1`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string }>;
        const parsed = rows[0]?.value ? JSON.parse(rows[0].value) : null;
        const num = (v: unknown, d: number) => (Number(v) >= 1 ? Number(v) : d);
        return {
          retail: num(parsed?.retail, RENT_SMS_DEFAULT_MULTIPLIERS.retail),
          api: num(parsed?.api, RENT_SMS_DEFAULT_MULTIPLIERS.api),
        };
      }
    } catch {
      /* fall through to defaults */
    }
  }
  return { ...RENT_SMS_DEFAULT_MULTIPLIERS };
}

/** Retail Naira price at the live rate. */
export async function rentSmsRetailNgn(costUsd: number): Promise<number> {
  const [multipliers, rate] = await Promise.all([resolveRentSmsMultipliers(), resolveFxRateNgn()]);
  return rentSmsNgn(costUsd, multipliers.retail, rate);
}

/** API / Child-Panel Naira price at the live rate. */
export async function rentSmsApiNgn(costUsd: number): Promise<number> {
  const [multipliers, rate] = await Promise.all([resolveRentSmsMultipliers(), resolveFxRateNgn()]);
  return rentSmsNgn(costUsd, multipliers.api, rate);
}

export function rentSmsNgn(costUsd: number, multiplier: number, rateNgn: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  return Math.round(costUsd * multiplier * rateNgn);
}
