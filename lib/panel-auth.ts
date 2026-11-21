/**
 * Child-panel API authentication.
 *
 * Accepts either:
 *   Authorization: Bearer vx_panel_<hex>
 *   X-Api-Key: vx_panel_<hex>
 *
 * Resolves against public.api_clients (key hash) or env VERXOR_PANEL_API_KEY.
 * Optional meta.wallet_user_id links debits to a Verxor wallet.
 */

import { createHash } from 'crypto';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export type PanelClient = {
  id: string;
  name: string;
  markupPercent: number;
  allowedProducts: string[];
  walletUserId: string | null;
  ownerEmail: string | null;
  source: 'db' | 'env';
};

function extractPanelKey(req: Request): string | null {
  const xKey = req.headers.get('x-api-key') || req.headers.get('X-Api-Key');
  if (xKey && xKey.trim().startsWith('vx_panel_')) return xKey.trim();
  const auth = req.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token.startsWith('vx_panel_')) return token;
  }
  return null;
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

const CORE_VTU_PRODUCTS = [
  'virtual_numbers',
  'vn',
  'boost',
  'smm',
  'airtime',
  'data',
  'electricity',
  'tv',
  'cable',
  'vtu',
];

export async function resolvePanelClient(req: Request): Promise<PanelClient | null> {
  const key = extractPanelKey(req);
  if (!key) return null;

  const envKey = (process.env.VERXOR_PANEL_API_KEY || '').trim();
  if (envKey && key === envKey) {
    return {
      id: 'env-panel',
      name: process.env.VERXOR_PANEL_NAME || 'Child Panel',
      markupPercent: Number(process.env.VERXOR_PANEL_MARKUP_PCT || 15) || 15,
      allowedProducts: ['*'],
      walletUserId: (process.env.VERXOR_PANEL_WALLET_USER_ID || '').trim() || null,
      ownerEmail: (
        (process.env.VERXOR_PANEL_ADMIN_EMAIL || process.env.VERXOR_PANEL_OWNER_EMAIL || '')
          .trim()
          .toLowerCase() || null
      ),
      source: 'env',
    };
  }

  if (!supabaseConfigured()) return null;

  try {
    const keyHash = hashKey(key);
    const rows = (await sbSelect(
      'api_clients',
      `api_key_hash=eq.${encodeURIComponent(keyHash)}&is_active=eq.true&select=id,name,markup_percent,allowed_products,meta&limit=1`,
    )) as Array<{
      id: string;
      name?: string;
      markup_percent?: number;
      allowed_products?: string[] | null;
      meta?: Record<string, unknown> | null;
    }>;

    const row = rows?.[0];
    if (!row) return null;

    const meta = (row.meta || {}) as Record<string, unknown>;
    const walletUserId =
      typeof meta.wallet_user_id === 'string'
        ? meta.wallet_user_id
        : typeof meta.walletUserId === 'string'
          ? meta.walletUserId
          : null;
    const ownerEmail =
      typeof meta.owner_email === 'string'
        ? meta.owner_email.trim().toLowerCase()
        : typeof meta.ownerEmail === 'string'
          ? meta.ownerEmail.trim().toLowerCase()
          : null;

    let allowed = Array.isArray(row.allowed_products)
      ? row.allowed_products.map((p) => String(p).toLowerCase())
      : [];

    const next = new Set(allowed);
    if (
      allowed.length === 0 ||
      allowed.includes('*') ||
      allowed.includes('all') ||
      allowed.includes('virtual_numbers') ||
      allowed.includes('vn')
    ) {
      for (const p of CORE_VTU_PRODUCTS) next.add(p);
      next.add('airtime');
      next.add('data');
      next.add('boost');
      next.add('electricity');
      next.add('tv');
      next.add('cable');
    }
    allowed = Array.from(next);

    return {
      id: row.id,
      name: row.name || 'Child Panel',
      markupPercent: Number(row.markup_percent ?? 15) || 15,
      allowedProducts: allowed,
      walletUserId,
      ownerEmail,
      source: 'db',
    };
  } catch (e) {
    console.warn('[panel-auth] resolve failed', e);
    return null;
  }
}

export function panelAllowsVirtualNumbers(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

export function panelAllowsBoost(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('boost') ||
    allowed.includes('smm') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

export function panelAllowsAirtime(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('airtime') ||
    allowed.includes('vtu') ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

/** Data / SME / gifting bundles (child panel + API keys). */
export function panelAllowsData(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('data') ||
    allowed.includes('sme') ||
    allowed.includes('vtu') ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

/** Gaming top-ups (MooGold) for child panels. */
export function panelAllowsGaming(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.includes('gaming') ||
    allowed.includes('games') ||
    allowed.includes('topup') ||
    allowed.includes('top-up') ||
    allowed.includes('vtu') ||
    allowed.includes('*') ||
    allowed.includes('all')
  );
}

/** Electricity bill payment (ClubKonnect) for child panels. */
export function panelAllowsElectricity(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('electricity') ||
    allowed.includes('power') ||
    allowed.includes('disco') ||
    allowed.includes('vtu') ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

/** Cable TV (DStv / GOtv / StarTimes) for child panels. */
export function panelAllowsTv(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('tv') ||
    allowed.includes('cable') ||
    allowed.includes('cabletv') ||
    allowed.includes('dstv') ||
    allowed.includes('gotv') ||
    allowed.includes('vtu') ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn') ||
    panelAllowsElectricity(panel)
  );
}

export const PANEL_ELECTRICITY_DISCOUNT_PCT = 0.3;
export const CK_ELECTRICITY_DISCOUNT_PCT = 0.5;

export function panelElectricityDebitAmount(faceAmount: number): number {
  const face = Math.round(Number(faceAmount));
  if (!Number.isFinite(face) || face <= 0) return 0;
  const debit = face * (1 - PANEL_ELECTRICITY_DISCOUNT_PCT / 100);
  return Math.round(debit * 100) / 100;
}

export const PANEL_TV_DISCOUNT_PCT = 0.5;
export const CK_TV_DISCOUNT_PCT = 1.0;

export function panelTvDebitAmount(faceAmount: number): number {
  const face = Math.round(Number(faceAmount));
  if (!Number.isFinite(face) || face <= 0) return 0;
  const debit = face * (1 - PANEL_TV_DISCOUNT_PCT / 100);
  return Math.round(debit * 100) / 100;
}

export const PANEL_AIRTIME_DISCOUNT_PCT: Record<string, number> = {
  mtn: 2,
  airtel: 2,
  glo: 6,
  '9mobile': 2,
};

export function panelAirtimeDiscountPct(network: string): number {
  const key = String(network || '').toLowerCase().trim();
  return PANEL_AIRTIME_DISCOUNT_PCT[key] ?? 0;
}

export function panelAirtimeDebitAmount(faceAmount: number, network: string): number {
  const face = Math.round(Number(faceAmount));
  if (!Number.isFinite(face) || face <= 0) return 0;
  const pct = panelAirtimeDiscountPct(network);
  const debit = face * (1 - pct / 100);
  return Math.round(debit * 100) / 100;
}

export const DEFAULT_CHILD_PANEL_ADMIN_EMAILS: readonly string[] = [
  'prozydata@gmail.com',
  'vernexdfq@gmail.com',
  'support@vernexdigital.com',
  'admin@vernexdigital.com',
];

export async function getPanelAdminEmails(panel?: PanelClient | null): Promise<string[]> {
  const set = new Set<string>(DEFAULT_CHILD_PANEL_ADMIN_EMAILS.map((e) => e.trim().toLowerCase()));

  if (panel?.ownerEmail) {
    for (const e of panel.ownerEmail.split(/[,;\s]+/)) {
      const clean = e.trim().toLowerCase();
      if (clean && clean.includes('@')) set.add(clean);
    }
  }

  if (panel?.walletUserId && supabaseConfigured()) {
    try {
      const rows = (await sbSelect(
        'profiles',
        `id=eq.${encodeURIComponent(panel.walletUserId)}&select=email&limit=1`,
      )) as Array<{ email?: string }>;
      const email = (rows?.[0]?.email || '').trim().toLowerCase();
      if (email && email.includes('@')) set.add(email);
    } catch {
      /* ignore */
    }
  }

  const envList = (process.env.VERXOR_PANEL_ADMIN_EMAIL || process.env.VERXOR_PANEL_OWNER_EMAIL || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  for (const e of envList) set.add(e);

  return Array.from(set);
}

export async function getPanelAdminEmail(panel: PanelClient): Promise<string | null> {
  const emails = await getPanelAdminEmails(panel);
  return emails.length > 0 ? emails.join(', ') : null;
}
