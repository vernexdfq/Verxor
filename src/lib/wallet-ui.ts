/**
 * Shared wallet display helpers — no demo balances.
 * Real balances come from AuthSession (later: Supabase wallets).
 */

export function formatNgn(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatUsd(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Primary display for NG users: NGN  International: USD */
export function formatHomeBalance(
  balanceNgn: number,
  balanceUsd: number,
  homeCurrency: 'NGN' | 'USD' = 'NGN',
): { symbol: string; amount: string; raw: number } {
  if (homeCurrency === 'USD') {
    return { symbol: '$', amount: formatUsd(balanceUsd), raw: balanceUsd };
  }
  return { symbol: '\u20a6', amount: formatNgn(balanceNgn), raw: balanceNgn };
}
