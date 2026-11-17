/**
 * Buy Logs (social accounts) pricing.
 *
 * Retail tiers (provider USD cost):
 *   <= $1.00  -> x3.0
 *   <= $10.00 -> x2.0
 *   >  $10.00 -> x1.4
 * Wholesale (API / child panel) tiers:
 *   <= $1.00  -> x1.5
 *   <= $10.00 -> x1.25
 *   >  $10.00 -> x1.15
 *
 * Retail naira prices round UP to the nearest `roundUpNgn` (default 50).
 * All values are admin-editable via admin_settings key `accounts_markups`
 * and the /api/admin/accounts-pricing route.
 */

import { loadBoostUsdRate } from '@/lib/boost-markups';

export interface AccountsMarkups {
  retail: number[];
  wholesale: number[];
  roundUpNgn: number;
}

export const DEFAULT_ACCOUNTS_MARKUPS: AccountsMarkups = {
  retail: [3.0, 2.0, 1.4],
  wholesale: [1.5, 1.25, 1.15],
  roundUpNgn: 50,
};

const SETTINGS_KEY = 'accounts_markups';
const CACHE_TTL_MS = 15_000;

let cache: { at: number; value: AccountsMarkups } | null = null;

export function accountsTierIndex(costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  if (costUsd <= 1) return 0;
  if (costUsd <= 10) return 1;
  return 2;
}

function parseMarkups(raw: unknown): AccountsMarkups | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const retail = Array.isArray(obj.retail) ? obj.retail.map(Number) : null;
  const wholesale = Array.isArray(obj.wholesale) ? obj.wholesale.map(Number) : null;
  const roundUpNgn = Number(obj.roundUpNgn);
  if (!retail || retail.length < 3 || retail.some((m) => !Number.isFinite(m) || m < 1 || m > 20)) return null;
  if (!wholesale || wholesale.length < 3 || wholesale.some((m) => !Number.isFinite(m) || m < 1 || m > 20)) return null;
  if (!Number.isFinite(roundUpNgn) || roundUpNgn < 1 || roundUpNgn > 1000) return null;
  return { retail: retail.slice(0, 3), wholesale: wholesale.slice(0, 3), roundUpNgn: Math.round(roundUpNgn) };
}

async function readSettingsRow(key: string): Promise<unknown> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}/rest/v1/admin_settings?key=eq.${encodeURIComponent(key)}&select=value`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (serviceKey) headers['apikey'] = serviceKey;
  if (serviceKey) headers['Authorization'] = `Bearer ${serviceKey}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) return null;
  const rows = (await res.json()) as { value?: unknown }[];
  return rows && rows.length > 0 ? rows[0].value : null;
}

export async function loadAccountsMarkups(): Promise<AccountsMarkups> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const raw = await readSettingsRow(SETTINGS_KEY);
    const parsed = parseMarkups(raw);
    if (parsed) {
      cache = { at: Date.now(), value: parsed };
      return parsed;
    }
  } catch {
    // fall through to defaults
  }
  cache = { at: Date.now(), value: DEFAULT_ACCOUNTS_MARKUPS };
  return DEFAULT_ACCOUNTS_MARKUPS;
}

export function invalidateAccountsPricingCache(): void {
  cache = null;
}

export async function loadAccountsUsdRate(): Promise<number> {
  return loadBoostUsdRate();
}

/** Round UP to the nearest `step` naira. step<=1 -> whole naira rounding. */
export function roundUpToNgn(naira: number, step: number): number {
  if (!Number.isFinite(naira) || naira <= 0) return 0;
  const s = Number.isFinite(step) && step > 1 ? Math.round(step) : 1;
  return Math.ceil(naira / s) * s;
}

/** Retail naira price for a provider cost in USD, with round-up rule. */
export function accountsRetailPriceNgn(costUsd: number, markups: AccountsMarkups, rate: number): number {
  const mult = markups.retail[accountsTierIndex(costUsd)] ?? 3.0;
  return roundUpToNgn(costUsd * mult * rate, markups.roundUpNgn);
}

/**
 * Wholesale (API / child panel) unit price, derived from the live retail
 * unit price: providerUsd = retailUnitNgn / rate, then tier multiplier,
 * rounded to the nearest whole naira (no 50-rounding on wholesale).
 */
/** Wholesale unit price straight from the provider cost (exact sheet math). */
export function wholesaleCostUnitNgn(
  costUsd: number,
  rate: number,
  markups: AccountsMarkups,
): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const mult = markups.wholesale[accountsTierIndex(costUsd)] ?? 1.5;
  return Math.max(1, Math.round(costUsd * mult * rate));
}

export function wholesaleAccountsUnitNgn(
  retailUnitNgn: number,
  rate: number,
  markups: AccountsMarkups,
): number {
  if (!Number.isFinite(retailUnitNgn) || retailUnitNgn <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return Math.round(retailUnitNgn);
  const providerUsd = retailUnitNgn / rate;
  const mult = markups.wholesale[accountsTierIndex(providerUsd)] ?? 1.5;
  return Math.max(1, Math.round(providerUsd * mult * rate));
}
