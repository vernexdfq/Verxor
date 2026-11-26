import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';
import { s2tConfigured, s2tOrderStatus } from '@/lib/providers/shop2topup';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/partner/gaming-orders[?ref=...]
 * Panel-key auth. The child panel's gaming top-up orders with live
 * Shop2TopUp status sync (processing -> completed), so the panel can show
 * its own customers delivery status. If the provider cancels/refunds an
 * order, the panel reseller wallet is credited back automatically.
 */

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

export async function GET(req: NextRequest) {
  try {
    const panel = await resolvePanelClient(req).catch(() => null);
    const userId = (panel?.walletUserId || '').trim();
    if (!panel || !userId) {
      return NextResponse.json(
        { ok: false, error: 'unauthorized', reason: 'Missing or invalid panel API key' },
        { status: 401 },
      );
    }
    const base = supabaseBase();
    const headers = serviceHeaders();
    if (!base || !headers) {
      return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
    }

    const refFilter = (req.nextUrl.searchParams.get('ref') || '').trim();
    let url =
      `${base}/rest/v1/gaming_orders?user_id=eq.${encodeURIComponent(userId)}` +
      `&order=created_at.desc&limit=50` +
      `&select=id,ref,provider_order_id,product_name,variation_name,quantity,total_ngn,status,message,created_at,updated_at`;
    if (refFilter) url += `&ref=eq.${encodeURIComponent(refFilter)}`;

    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, error: 'query_failed', detail: t.slice(0, 160) }, { status: 502 });
    }
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    const providerReady = s2tConfigured();

    // Live status sync for in-flight orders (capped for speed).
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

      await fetch(`${base}/rest/v1/gaming_orders?id=eq.${encodeURIComponent(String(r.id))}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: next, updated_at: new Date().toISOString() }),
      }).catch(() => null);

      if (terminal === 'refunded') {
        const amount = Number(r.total_ngn) || 0;
        const ref = String(r.ref || '');
        await creditResellerWallet(userId, amount, `refund-${ref}`);
        r.status = next;
        r.message = 'The provider cancelled this order. The panel wallet has been refunded.';
        void notifyAdmin(
          `↩️ Panel gaming order refunded by provider\n${String(r.product_name || '')} · ref ${ref} · ₦${amount.toLocaleString('en-NG')}\nPanel wallet: ${userId}`,
        );
      } else {
        r.status = next;
      }
    }

    const orders = rows.map((r) => ({
      id: String(r.id || ''),
      ref: String(r.ref || ''),
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
    console.warn('[partner/gaming-orders]', e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: 'server_error', detail }, { status: 500 });
  }
}
