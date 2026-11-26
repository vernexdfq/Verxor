import { NextRequest, NextResponse } from 'next/server';
import { s2tConfigured, s2tOrderStatus } from '@/lib/providers/shop2topup';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

function serviceHeaders(): Record<string, string> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const q = (req.nextUrl.searchParams.get('userId') || '').trim();
  if (q) return q;
  const header = (req.headers.get('x-vx-user') || '').trim();
  if (header) return header;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(base + '/auth/v1/user', {
      headers: { apikey: anon, Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

async function creditRetailWallet(userId: string, amount: number, reference: string, description: string) {
  const base = supabaseBase();
  const headers = serviceHeaders();
  if (!base || !headers || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: description,
    }),
  }).catch(() => null);
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const headers = serviceHeaders();
  if (!base || !headers || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_reseller_wallet`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference }),
  }).catch(() => null);
}

function terminalStatus(s: string): 'completed' | 'refunded' | null {
  const v = s.toLowerCase();
  if (/complet|success|deliver|done/.test(v)) return 'completed';
  if (/refund|cancel|fail|reject|error/.test(v)) return 'refunded';
  return null;
}

/**
 * GET /api/v1/gaming/orders
 * The signed-in user's gaming top-up orders, with live status sync from
 * Shop2TopUp (processing -> completed), refunding the wallet automatically
 * if the provider cancels/refunds an order.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required', orders: [] }, { status: 401 });
  }
  const base = supabaseBase();
  const headers = serviceHeaders();
  if (!base || !headers) {
    return NextResponse.json({ ok: true, orders: [], message: 'Wallet backend not configured' });
  }
  try {
    const res = await fetch(
      `${base}/rest/v1/gaming_orders?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=50` +
        `&select=id,ref,audience,provider_order_id,product_name,variation_name,quantity,total_ngn,status,message,created_at,updated_at`,
      { headers, cache: 'no-store' },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ ok: true, orders: [], error: 'Failed to load orders: ' + t.slice(0, 160) });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const providerReady = s2tConfigured();

    // Sync live status for in-flight orders (cap work per request).
    let syncBudget = 20;
    for (const r of rows) {
      if (syncBudget <= 0) break;
      const status = String(r.status || '');
      const poid = String(r.provider_order_id || '');
      if (status !== 'processing' || !poid || !providerReady) continue;
      syncBudget -= 1;
      const live = await s2tOrderStatus(poid);
      const liveStatus = live?.status ? String(live.status) : '';
      const terminal = terminalStatus(liveStatus);
      if (!terminal && !liveStatus) continue;
      const next = terminal || (liveStatus ? liveStatus.toLowerCase() : status);
      if (next === status && !terminal) continue;

      // Persist the new status.
      await fetch(`${base}/rest/v1/gaming_orders?id=eq.${encodeURIComponent(String(r.id))}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: next, updated_at: new Date().toISOString() }),
      }).catch(() => null);

      if (terminal === 'refunded') {
        const amount = Number(r.total_ngn) || 0;
        const ref = String(r.ref || '');
        const audience = String(r.audience || 'retail');
        if (audience === 'panel') {
          await creditResellerWallet(userId, amount, `refund-${ref}`);
        } else {
          await creditRetailWallet(
            userId,
            amount,
            `refund-${ref}`,
            `Refund (gaming order cancelled by provider) · ${String(r.product_name || '')}`,
          );
        }
        r.status = next;
        r.message = 'The provider cancelled this order. Your wallet has been refunded.';
        void notifyAdmin(
          `↩️ Gaming order refunded by provider\n${String(r.product_name || '')} · ref ${ref} · ₦${amount.toLocaleString('en-NG')}\nCustomer: ${userId}`,
        );
      } else {
        r.status = next;
      }
    }

    const orders = rows.map((r) => ({
      id: String(r.id || ''),
      ref: String(r.ref || ''),
      audience: String(r.audience || 'retail'),
      productName: String(r.product_name || ''),
      variationName: String(r.variation_name || ''),
      quantity: Number(r.quantity) || 1,
      totalNgn: Number(r.total_ngn) || 0,
      status: String(r.status || 'processing'),
      message: r.message != null ? String(r.message) : undefined,
      createdAt: String(r.created_at || ''),
      updatedAt: String(r.updated_at || ''),
    }));
    return NextResponse.json({ ok: true, orders, count: orders.length });
  } catch (e) {
    console.warn('[gaming/orders]', e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: true, orders: [], error: 'Failed to load orders: ' + detail });
  }
}
