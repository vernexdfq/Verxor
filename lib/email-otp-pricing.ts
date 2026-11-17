import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';
import { apiKeyFromRequest, isApiUser, isChildPanelUser, loadVnPricing } from '@/lib/vn-pricing';

/**
 * VERXOR Email OTP pricing — single source of truth.
 *
 * Price = (provider USD cost + flat audience markup) x base_naira_rate, rounded.
 *
 * Rounding rule (owner decision):
 *  - below the band: keep the real price
 *  - inside the band (above 450 up to 500): snap to 500
 *  - above 500: keep the real price — NO hard ceiling
 *
 * Audiences (same detection as Virtual Numbers):
 *  - retail: customers buying on verxor.com (default)
 *  - api:    users toggled as API user in admin, or vx_api_* keys
 *  - panel:  child panels (vx_panel_* keys) and users toggled as Child Panel
 *
 * The quantity endpoint prices with this module on every request; there is no
 * client-supplied price anywhere.
 */

export type EmailOtpAudience = 'retail' | 'api' | 'panel';
export type EmailOtpMarkups = { retail: number; api: number; panel: number };

export const DEFAULT_EMAIL_OTP_MARKUPS: EmailOtpMarkups = {
  retail: 0.25,
  api: 0.18,
  panel: 0.12,
};

let cache: { at: number; markups: EmailOtpMarkups } | null = null;

/** Markups live in admin_settings key 'email_otp_markups' (JSON). 15s cache. */
export async function loadEmailOtpMarkups(): Promise<EmailOtpMarkups> {
  if (!supabaseConfigured()) return DEFAULT_EMAIL_OTP_MARKUPS;
  if (cache && Date.now() - cache.at < 15000) return cache.markups;
  try {
    const rows = (await sbSelect(
      'admin_settings',
      'key=eq.email_otp_markups&select=value&limit=1',
    )) as Array<{ value?: string }>;
    const parsed = rows?.[0]?.value ? JSON.parse(rows[0].value) : null;
    const num = (v: unknown, d: number) => (Number(v) > 0 ? Number(v) : d);
    const markups: EmailOtpMarkups = {
      retail: num(parsed?.retail, DEFAULT_EMAIL_OTP_MARKUPS.retail),
      api: num(parsed?.api, DEFAULT_EMAIL_OTP_MARKUPS.api),
      panel: num(parsed?.panel, DEFAULT_EMAIL_OTP_MARKUPS.panel),
    };
    cache = { at: Date.now(), markups };
    return markups;
  } catch {
    return DEFAULT_EMAIL_OTP_MARKUPS;
  }
}

/** The one rounding rule. Band 450-500 snaps to 500; above 500 stays real. */
export function emailOtpPriceNgn(costUsd: number, markupUsd: number, rate: number): number {
  const ngn = Math.round((costUsd + markupUsd) * rate);
  if (ngn > 450 && ngn <= 500) return 500;
  return ngn;
}

/** Audience + markup + rate for a request. Rate = the single daily rate. */
export async function resolveEmailOtpPricing(
  req: Request,
): Promise<{ audience: EmailOtpAudience; markup: number; rate: number }> {
  const key = apiKeyFromRequest(req);
  const uid = (req.headers.get('x-vx-user') || '').trim();
  let audience: EmailOtpAudience = 'retail';
  if (key.startsWith('vx_panel_')) audience = 'panel';
  else if (key.startsWith('vx_api_')) audience = 'api';
  else if (uid && (await isChildPanelUser(uid))) audience = 'panel';
  else if (uid && (await isApiUser(uid))) audience = 'api';

  const [markups, pricing] = await Promise.all([loadEmailOtpMarkups(), loadVnPricing()]);
  return { audience, markup: markups[audience], rate: pricing.rate };
}
