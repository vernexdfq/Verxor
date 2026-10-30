/**
 * Live Boost order API helpers (JAP via /api/v1/boost).
 * Used by BoostPage — keeps UI file free of large API wiring.
 */
import { loadSessionProfile, loadSessionTokens } from '../auth/session-unlock';

export type LiveOrderStatus = 'pending' | 'processing' | 'completed' | 'canceled';

export function isJapOrderId(id: string): boolean {
  return /^\d+$/.test(String(id || '').trim());
}

export function mapJapStatus(raw: string | undefined): LiveOrderStatus {
  const s = String(raw || '').toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel') || s.includes('refund')) return 'canceled';
  if (s.includes('partial')) return 'processing';
  if (s.includes('pending')) return 'pending';
  if (s.includes('progress') || s.includes('processing')) return 'processing';
  return 'processing';
}

/** User-facing line when a boost finishes, e.g. "Your TikTok Followers order has been completed" */
export function completionMessage(serviceTitle: string, platform?: string): string {
  const title = String(serviceTitle || 'Boost').trim();
  const short =
    title.length > 48 ? title.slice(0, 45).replace(/\s+\S*$/, '') + '…' : title;
  const plat = String(platform || '').trim();
  if (plat && !short.toLowerCase().includes(plat.toLowerCase())) {
    return `Your ${plat} — ${short} order has been completed`;
  }
  return `Your ${short} order has been completed`;
}

async function authHeaders(): Promise<{
  headers: Record<string, string>;
  userId: string;
}> {
  let accessToken = loadSessionTokens()?.access_token || '';
  let userId = loadSessionProfile()?.userId || '';
  try {
    const { getSupabaseBrowser } = await import('../../lib/supabase/client');
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data: sess } = await sb.auth.getSession();
      if (sess.session?.access_token) accessToken = sess.session.access_token;
      if (sess.session?.user?.id) userId = sess.session.user.id;
    }
  } catch {
    /* optional */
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return { headers, userId };
}

export async function placeBoostOrder(input: {
  serviceId: string;
  link: string;
  quantity: number;
}): Promise<{ ok: true; order: any } | { ok: false; status: number; error: string }> {
  const { headers, userId } = await authHeaders();
  const res = await fetch('/api/v1/boost', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      serviceId: input.serviceId,
      link: input.link,
      quantity: input.quantity,
      userId: userId || undefined,
    }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data.ok) {
    let error = data?.error || 'Boost order failed. Please try again.';
    if (res.status === 401) error = 'Sign in required to place a boost order';
    if (res.status === 402) error = data?.error || 'Insufficient balance — fund your wallet';
    return { ok: false, status: res.status, error };
  }
  return { ok: true, order: data.order };
}

export async function cancelBoostOrder(input: {
  orderId: string;
  amount: number;
}): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const { headers, userId } = await authHeaders();
  const res = await fetch('/api/v1/boost/cancel', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId: input.orderId,
      amount: input.amount,
      userId: userId || undefined,
    }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data?.error || 'Cancel failed — order may already be processing',
    };
  }
  return { ok: true, message: data?.message };
}

export type BoostStatusOrderMeta = {
  platform?: string;
  serviceTitle?: string;
  quantity?: number;
  link?: string;
  amountNgn?: number;
  createdAt?: string;
  notifyCompleted?: boolean;
};

export async function fetchBoostStatus(
  orderId: string,
  meta?: BoostStatusOrderMeta,
): Promise<{
  ok: boolean;
  status?: string;
  charge?: string;
  remains?: string | number;
  startCount?: string;
  currency?: string;
  notified?: boolean;
}> {
  try {
    let res: Response;
    if (meta && meta.notifyCompleted) {
      const { headers, userId } = await authHeaders();
      res = await fetch('/api/v1/boost/status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          notifyCompleted: true,
          platform: meta.platform,
          serviceTitle: meta.serviceTitle,
          quantity: meta.quantity,
          link: meta.link,
          amountNgn: meta.amountNgn,
          createdAt: meta.createdAt,
          userId: userId || undefined,
        }),
      });
    } else {
      res = await fetch(`/api/v1/boost/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      });
    }
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data.ok) return { ok: false };
    return {
      ok: true,
      status: data.status,
      charge: data.charge,
      remains: data.remains,
      startCount: data.startCount,
      currency: data.currency,
      notified: Boolean(data.notified),
    };
  } catch {
    return { ok: false };
  }
}
