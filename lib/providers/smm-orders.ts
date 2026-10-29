/**
 * SMM order / status / cancel (JustAnotherPanel API v2 compatible).
 * Docs: https://justanotherpanel.com/api
 * Example: https://justanotherpanel.com/example.txt
 *
 * POST application/x-www-form-urlencoded to panel URL with:
 *   key, action=add|status|cancel|balance|services
 * Add: service, link, quantity  → { order: number }
 * Status: order  → { charge, start_count, status, remains, currency }
 * Cancel: orders (comma-separated) → [{ order, cancel: 1 | { error } }]
 * Balance: → { balance, currency }
 *
 * Credentials: SMM_PANEL_API_KEY (primary), then JUSTANOTHER_API_KEY / YOYOMEDIA_API_KEY.
 */
import { fetchSmmCatalog, type BoostService } from '@/lib/providers/smm';

function getSmmCredentials(): { url: string; key: string } {
  const url = (
    process.env.SMM_PANEL_API_URL ||
    process.env.JUSTANOTHER_API_URL ||
    process.env.JUSTANOTHERPANEL_API_URL ||
    process.env.YOYOMEDIA_API_URL ||
    'https://justanotherpanel.com/api/v2'
  ).replace(/\/$/, '');
  const key = (
    process.env.SMM_PANEL_API_KEY ||
    process.env.JUSTANOTHER_API_KEY ||
    process.env.JUSTANOTHERPANEL_API_KEY ||
    process.env.YOYOMEDIA_API_KEY ||
    ''
  ).trim();
  return { url, key };
}

export function isSmmConfigured(): boolean {
  return Boolean(getSmmCredentials().key);
}

async function smmPost(body: Record<string, string>): Promise<unknown> {
  const { url, key } = getSmmCredentials();
  if (!key) throw new Error('SMM provider not configured');

  const form = new URLSearchParams({ key, ...body });
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Verxor/1.0 (SMM Gateway)',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('SMM provider timed out');
    }
    throw new Error(err?.message || 'SMM provider unreachable');
  }

  const raw = await res.text();
  if (!raw?.trim()) throw new Error('SMM provider empty response');
  if (raw.trim().startsWith('<')) {
    throw new Error('SMM provider returned HTML instead of JSON');
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`SMM invalid JSON: ${raw.slice(0, 120)}`);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data;
}

export type SmmAddResult = {
  order: number;
  charge?: string;
  currency?: string;
};

export type SmmStatusResult = {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency?: string;
};

/** action=add — service, link, quantity → { order } */
export async function smmAddOrder(params: {
  service: number | string;
  link: string;
  quantity: number;
}): Promise<SmmAddResult> {
  const data = await smmPost({
    action: 'add',
    service: String(params.service),
    link: params.link,
    quantity: String(params.quantity),
  });
  const obj = data as { order?: number | string; charge?: string; currency?: string };
  if (obj.order == null) throw new Error('SMM add: missing order id');
  return {
    order: Number(obj.order),
    charge: obj.charge,
    currency: obj.currency,
  };
}

/** action=status — order → status payload */
export async function smmGetStatus(orderId: number | string): Promise<SmmStatusResult> {
  const data = await smmPost({
    action: 'status',
    order: String(orderId),
  });
  return data as SmmStatusResult;
}

/**
 * action=cancel — orders (comma ids)
 * Response: [{ order, cancel: 1 }] success, or cancel: { error: "..." }
 */
export async function smmCancelOrder(orderId: number | string): Promise<{
  ok: boolean;
  cancel: number | string;
  raw: unknown;
}> {
  const data = await smmPost({
    action: 'cancel',
    orders: String(orderId),
  });
  if (Array.isArray(data) && data.length > 0) {
    const row = data[0] as {
      order?: number;
      cancel?: number | string | { error?: string };
    };
    const cancelVal = row.cancel;
    if (cancelVal && typeof cancelVal === 'object' && 'error' in cancelVal) {
      throw new Error(String((cancelVal as { error?: string }).error || 'Cancel rejected'));
    }
    // JAP returns cancel: 1 on success (number or string "1")
    const ok = cancelVal === 1 || cancelVal === '1';
    return { ok, cancel: (ok ? cancelVal : 0) as number | string, raw: data };
  }
  if (data && typeof data === 'object') {
    const row = data as { cancel?: number | string; error?: string };
    if (row.error) throw new Error(String(row.error));
    const ok = row.cancel === 1 || row.cancel === '1';
    return { ok, cancel: row.cancel ?? 0, raw: data };
  }
  return { ok: false, cancel: 0, raw: data };
}

export async function smmGetBalance(): Promise<{ balance: string; currency: string }> {
  const data = await smmPost({ action: 'balance' });
  const obj = data as { balance?: string; currency?: string };
  return {
    balance: obj.balance || '0',
    currency: obj.currency || 'USD',
  };
}

/** Live catalog lookup — never trust client price */
export async function smmFindService(providerId: number | string): Promise<BoostService | null> {
  const catalog = await fetchSmmCatalog();
  if (!catalog.ok) return null;
  const id = String(providerId);
  return catalog.services.find((s) => s.id === id || String(s.providerId) === id) || null;
}
