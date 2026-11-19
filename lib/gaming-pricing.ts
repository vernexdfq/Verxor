/**
 * Verxor gaming/gift-card pricing rules (Denny's master pricing).
 *
 * Base FX rate: the live admin rate stored in admin_settings (`usd_ngn_rate`,
 * ₦1,380 by default), NOT the static env rate — the same "one daily rate"
 * principle the admin Overview controls.
 *
 * Gaming top-ups: percentage multipliers on the MooGold USD cost by tier.
 * Gift cards: standalone FX rates, decoupled from the global rate (later).
 */

export const GAMING_DEFAULT_FX = 1380;

type Tier = { maxUsd: number; retail: number; api: number; label: string };

/** Tier multipliers — retail and API/Child-Panel profit per base-USD band. */
export const GAMING_TIERS: Tier[] = [
  { maxUsd: 1.0, retail: 1.25, api: 1.12, label: 'Micro Packs' },
  { maxUsd: 4.99, retail: 1.15, api: 1.07, label: 'Small Packs' },
  { maxUsd: 24.99, retail: 1.1, api: 1.05, label: 'Standard Packs' },
  { maxUsd: Number.POSITIVE_INFINITY, retail: 1.07, api: 1.03, label: 'High-Value Packs' },
];

function tierFor(baseUsd: number): Tier {
  return GAMING_TIERS.find((t) => baseUsd <= t.maxUsd) ?? GAMING_TIERS[GAMING_TIERS.length - 1];
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Retail customer USD price for a MooGold base cost. */
export function gamingRetailUsd(baseUsd: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return round2(baseUsd * tierFor(baseUsd).retail);
}

/** API / Child-Panel USD price for a MooGold base cost. */
export function gamingApiUsd(baseUsd: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0) return 0;
  return round2(baseUsd * tierFor(baseUsd).api);
}

/**
 * Current live USD→NGN rate: admin_settings `usd_ngn_rate`, falling back to
 * the env rate and then to the ₦1,380 base rule.
 */
export async function resolveFxRateNgn(): Promise<number> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && serviceKey) {
    try {
      const res = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{ value?: string | number }>;
        const rate = Number(rows[0]?.value);
        if (Number.isFinite(rate) && rate > 0) return rate;
      }
    } catch {
      /* fall through to env */
    }
  }
  const envRate = Number(process.env.USD_NGN_RATE);
  return Number.isFinite(envRate) && envRate > 0 ? envRate : GAMING_DEFAULT_FX;
}

/** Retail Naira price for a MooGold base USD cost at the given/live rate. */
export function gamingRetailNgn(baseUsd: number, rateNgn: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0 || !Number.isFinite(rateNgn) || rateNgn <= 0) return 0;
  return Math.round(baseUsd * tierFor(baseUsd).retail * rateNgn);
}

/** API/Child-Panel Naira price (used for panel pricing later). */
export function gamingApiNgn(baseUsd: number, rateNgn: number): number {
  if (!Number.isFinite(baseUsd) || baseUsd <= 0 || !Number.isFinite(rateNgn) || rateNgn <= 0) return 0;
  return Math.round(baseUsd * tierFor(baseUsd).api * rateNgn);
}

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
