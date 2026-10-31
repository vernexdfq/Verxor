/**
 * Child-panel API authentication.
 *
 * Accepts:
 *   Authorization: Bearer vx_panel_<hex>
 *   X-Api-Key: vx_panel_<hex>
 *
 * Resolves against public.api_clients (key hash) or env VERXOR_PANEL_API_KEY.
 * Optional meta.wallet_user_id links debits to a Verxor wallet.
 */
import { createHash } from 'crypto';
import { sbSelect, supabaseConfigured } from './supabase-admin';

export type PanelClient = {
  id: string;
  name: string;
  markupPercent: number;
  allowedProducts: string[];
  walletUserId: string | null;
  ownerEmail: string | null;
  source: 'db' | 'env';
};

function extractApiKey(req: Request): string | null {
  const xKey = req.headers.get('x-api-key') || req.headers.get('x-verxor-key');
  if (xKey && xKey.trim().startsWith('vx_panel_')) return xKey.trim();

  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token.startsWith('vx_panel_')) return token;
  }
  return null;
}

function hashKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

const DEFAULT_ALLOWED_PRODUCTS = ['virtual_numbers', 'boost', 'smm'];

export async function resolvePanelClient(req: Request): Promise<PanelClient | null> {
  const apiKey = extractApiKey(req);
  if (!apiKey) return null;

  const envKey = (process.env.VERXOR_PANEL_API_KEY || '').trim();
  if (envKey && apiKey === envKey) {
    return {
      id: 'env-panel',
      name: process.env.VERXOR_PANEL_NAME || 'Child Panel',
      markupPercent: Number(process.env.VERXOR_PANEL_MARKUP_PCT || 15) || 15,
      allowedProducts: DEFAULT_ALLOWED_PRODUCTS,
      walletUserId: (process.env.VERXOR_PANEL_WALLET_USER_ID || '').trim() || null,
      ownerEmail: (process.env.VERXOR_PANEL_ADMIN_EMAIL || process.env.VERXOR_PANEL_OWNER_EMAIL || '').trim().toLowerCase() || null,
      source: 'env',
    };
  }

  if (!supabaseConfigured()) return null;

  try {
    const keyHash = hashKey(apiKey);
    const rows = (await sbSelect(
      'api_clients',
      `api_key_hash=eq.${encodeURIComponent(keyHash)}&is_active=eq.true&select=id,name,markup_percent,allowed_products,meta&limit=1`,
    )) as Array<{
      id: string;
      name: string;
      markup_percent?: number;
      allowed_products?: string[];
      meta?: { wallet_user_id?: string; walletUserId?: string; owner_email?: string; ownerEmail?: string };
    }>;

    const row = rows?.[0];
    if (!row) return null;

    const meta = row.meta || {};
    const walletUserId = (meta.wallet_user_id || meta.walletUserId || '').trim() || null;
    const ownerEmail = (meta.owner_email || meta.ownerEmail || '').trim().toLowerCase() || null;

    const fromDb = Array.isArray(row.allowed_products) ? row.allowed_products : null;
    // Empty / missing array → full partner catalog. Legacy rows that only listed
    // virtual_numbers still receive boost (same partner relationship).
    let allowedProducts = fromDb && fromDb.length > 0 ? fromDb : DEFAULT_ALLOWED_PRODUCTS;
    const lower = allowedProducts.map((p) => p.toLowerCase());
    if (
      lower.includes('virtual_numbers') ||
      lower.includes('vn')
    ) {
      const next = new Set(allowedProducts.map(String));
      if (!lower.includes('boost')) next.add('boost');
      if (!lower.includes('smm')) next.add('smm');
      allowedProducts = Array.from(next);
    }

    return {
      id: row.id,
      name: row.name,
      markupPercent: Number(row.markup_percent ?? 15) || 15,
      allowedProducts,
      walletUserId,
      ownerEmail,
      source: 'db',
    };
  } catch {
    return null;
  }
}

export function panelAllowsVirtualNumbers(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn') ||
    allowed.includes('*') ||
    allowed.includes('all')
  );
}

export function panelAllowsBoost(panel: PanelClient): boolean {
  const allowed = panel.allowedProducts.map((p) => p.toLowerCase());
  return (
    allowed.length === 0 ||
    allowed.includes('boost') ||
    allowed.includes('smm') ||
    allowed.includes('*') ||
    allowed.includes('all') ||
    // Partner panels already approved for virtual numbers can place boost orders.
    allowed.includes('virtual_numbers') ||
    allowed.includes('vn')
  );
}

/**
 * Resolves the admin/owner email address for a child panel.
 * Checks panel.ownerEmail, then profiles table via walletUserId, then server env.
 */
export async function getPanelAdminEmail(panel: PanelClient): Promise<string | null> {
  if (panel.ownerEmail) return panel.ownerEmail;

  if (panel.walletUserId && supabaseConfigured()) {
    try {
      const rows = (await sbSelect(
        'profiles',
        `id=eq.${encodeURIComponent(panel.walletUserId)}&select=email&limit=1`,
      )) as Array<{ email?: string | null }>;
      const email = rows?.[0]?.email?.trim().toLowerCase();
      if (email) return email;
    } catch {
      /* optional lookup */
    }
  }

  const fallback = (process.env.ADMIN_EMAIL || process.env.VERXOR_PANEL_ADMIN_EMAIL || '').trim().toLowerCase();
  return fallback || null;
}
