/**
 * SMM order / status / cancel (JustAnotherPanel API v2).
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
 * Credentials (same family as catalog fetch):
 *   SMM_PANEL_API_KEY | JUSTANOTHER_API_KEY | JUSTANOTHERPANEL_API_KEY | YOYOMEDIA_API_KEY
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
        Accept: 'application/json',
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

  if (res.status === 401 || res.status === 403) {
    throw new Error(`SMM provider authentication failed (HTTP ${res.status}). Verify API key.`);
  }
  if (res.status === 429) {
    throw new Error('SMM provider rate limit exceeded. Retry shortly.');
  }
  if (res.status >= 500) {
    throw new Error(`SMM provider unavailable (HTTP ${res.status})`);
  }

  const raw = await res.text();
  if (!raw?.trim()) throw new Error('SMM provider empty response');
  const trimmed = raw.trim();
  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
    throw new Error('SMM provider returned HTML instead of JSON');
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(`SMM invalid JSON: ${trimmed.slice(0, 120)}`);
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

/** action=add — service (numeric id), link, quantity → { order } */
export async function smmAddOrder(params: {
  service: number | string;
  link: string;
  quantity: number;
}): Promise<SmmAddResult> {
  const serviceId = Number(params.service);
  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    throw new Error('Invalid SMM service id');
  }
  const link = String(params.link || '').trim();
  if (!link || link.length < 5) {
    throw new Error('Valid target link is required');
  }
  const quantity = Math.round(Number(params.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new Error('Invalid quantity');
  }

  const data = await smmPost({
    action: 'add',
    service: String(serviceId),
    link,
    quantity: String(quantity),
  });
  const obj = data as { order?: number | string; charge?: string; currency?: string };
  if (obj.order == null || obj.order === '') {
    throw new Error('SMM add: missing order id');
  }
  const orderNum = Number(obj.order);
  if (!Number.isFinite(orderNum) || orderNum <= 0) {
    throw new Error(`SMM add: invalid order id (${String(obj.order)})`);
  }
  return {
    order: orderNum,
    charge: obj.charge,
    currency: obj.currency,
  };
}

/** action=status — order → status payload */
export async function smmGetStatus(orderId: number | string): Promise<SmmStatusResult> {
  const id = String(orderId || '').trim();
  if (!id) throw new Error('orderId is required');
  const data = await smmPost({
    action: 'status',
    order: id,
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
  const id = String(providerId).trim();
  if (!id) return null;
  return (
    catalog.services.find(
      (s) => s.id === id || String(s.providerId) === id || String(s.providerId) === String(Number(id)),
    ) || null
  );
}
