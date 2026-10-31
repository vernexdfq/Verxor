import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { isSmmConfigured, smmGetStatus } from '@/lib/providers/smm-orders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

type LedgerRow = {
  id?: string;
  kind?: string;
  amount_ngn?: number | null;
  amount_usd?: number | null;
  reference?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string;
  description?: string | null;
};

function mapStatus(raw: unknown): 'pending' | 'processing' | 'completed' | 'canceled' {
  const s = String(raw || '').toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel') || s.includes('refund')) return 'canceled';
  if (s.includes('pending')) return 'pending';
  if (s.includes('progress') || s.includes('processing') || s.includes('partial')) return 'processing';
  if (!s.trim()) return 'pending';
  return 'processing';
}

function isJapId(id: string): boolean {
  return /^\d+$/.test(String(id || '').trim());
}

/**
 * GET /api/v1/boost/orders
 * Returns boost orders for the signed-in user from wallet_ledger.
 * Prefers numeric JustAnotherPanel order ids (support ID).
 * Live-syncs status from JAP so Completed / Pending / Processing match the provider.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required', orders: [] }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: true, orders: [], message: 'Wallet backend not configured' });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: true, orders: [] });
  }

  try {
    const qs = new URLSearchParams({
      user_id: `eq.${userId}`,
      order: 'created_at.desc',
      limit: '150',
      select: 'id,kind,amount_ngn,amount_usd,reference,meta,created_at',
    });
    const url = `${base}/rest/v1/wallet_ledger?${qs.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('[boost/orders] ledger fetch failed', res.status, t.slice(0, 200));
      return NextResponse.json({ ok: true, orders: [] });
    }
    const rows = (await res.json()) as LedgerRow[];
    if (!Array.isArray(rows)) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    type OrderOut = {
      id: string;
      serviceId: string;
      serviceTitle: string;
      platform: string;
      targetUrl: string;
      quantity: number;
      amount: number;
      status: string;
      createdAt: string;
      charge?: string;
      remains?: number;
      startCount?: string;
      currency?: string;
      source: string;
      ledgerId?: string;
    };

    const orders: OrderOut[] = [];
    const seen = new Set<string>();

    for (const r of rows) {
      const meta = (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>;
      const ref = String(r.reference || '');
      const kind = String(r.kind || '').toLowerCase();
      const isBoostMeta = String(meta.type || meta.product || '').toLowerCase() === 'boost';
      const isBoostRef =
        ref.startsWith('boost-') ||
        ref.startsWith('boost-order-') ||
        ref.startsWith('refund-boost-');
      const desc = String(meta.description || meta.title || meta.serviceTitle || r.description || '');
      const isBoostDesc = /boost/i.test(desc) || /boost/i.test(String(meta.service || ''));
      if (!isBoostMeta && !isBoostRef && !isBoostDesc) continue;
      if (kind === 'refund' || ref.startsWith('refund-')) continue;

      const providerOrderId = String(
        meta.providerOrderId || meta.provider_order_id || meta.orderId || meta.order_id || '',
      ).trim();
      let id = providerOrderId;
      if (!id && ref.startsWith('boost-order-')) {
        id = ref.replace(/^boost-order-/, '');
      }
      if (!id) id = ref || String(r.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const amount = Math.abs(Number(r.amount_ngn ?? meta.amountNgn ?? 0));
      orders.push({
        id,
        serviceId: String(meta.serviceId || meta.service_id || ''),
        serviceTitle: String(meta.serviceTitle || meta.title || meta.service || desc || 'Boost'),
        platform: String(meta.platform || meta.platformName || ''),
        targetUrl: String(meta.link || meta.targetUrl || ''),
        quantity: Number(meta.quantity || 0) || 0,
        amount,
        status: mapStatus(meta.status),
        createdAt: String(r.created_at || new Date().toISOString()),
        charge: meta.charge != null ? String(meta.charge) : undefined,
        remains: meta.remains != null ? Number(meta.remains) : undefined,
        startCount: meta.startCount != null ? String(meta.startCount) : undefined,
        currency: 'NGN',
        source: 'server',
        ledgerId: r.id ? String(r.id) : undefined,
      });
    }

    if (isSmmConfigured()) {
      const toSync = orders.filter((o) => isJapId(o.id) && o.status !== 'canceled').slice(0, 25);
      await Promise.all(
        toSync.map(async (o) => {
          try {
            const st = await smmGetStatus(o.id);
            const next = mapStatus(st.status);
            o.status = next;
            if (st.charge != null) o.charge = String(st.charge);
            if (st.remains != null && st.remains !== '') {
              const n = Number(st.remains);
              if (Number.isFinite(n)) o.remains = n;
            }
            if (st.start_count != null) o.startCount = String(st.start_count);
            if (st.currency) o.currency = String(st.currency);

            if (o.ledgerId && serviceKey) {
              void fetch(`${base}/rest/v1/wallet_ledger?id=eq.${encodeURIComponent(o.ledgerId)}`, {
                method: 'PATCH',
                headers: {
                  apikey: serviceKey,
                  Authorization: `Bearer ${serviceKey}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=minimal',
                },
                body: JSON.stringify({
                  meta: {
                    type: 'boost',
                    product: 'boost',
                    providerOrderId: o.id,
                    orderId: o.id,
                    serviceId: o.serviceId,
                    serviceTitle: o.serviceTitle,
                    title: o.serviceTitle,
                    platform: o.platform,
                    link: o.targetUrl,
                    quantity: o.quantity,
                    amountNgn: o.amount,
                    status: next,
                    charge: o.charge,
                    remains: o.remains,
                    startCount: o.startCount,
                  },
                }),
              }).catch(() => {});
            }
          } catch (e) {
            console.warn('[boost/orders] JAP status failed for', o.id, e);
          }
        }),
      );
    }

    // Prefer real JAP order ids for support (numeric). Drop bare debit-ref rows
    // when a JAP-id row exists for the same amount within ±2 minutes.
    const japRows = orders.filter((o) => isJapId(o.id));
    const debitOnly = orders.filter((o) => !isJapId(o.id));
    const keptDebit: typeof orders = [];
    for (const d of debitOnly) {
      const t = Date.parse(d.createdAt) || 0;
      const covered = japRows.some((j) => {
        const jt = Date.parse(j.createdAt) || 0;
        return Math.abs(j.amount - d.amount) < 0.02 && Math.abs(jt - t) < 120_000;
      });
      if (!covered) keptDebit.push(d);
    }
    const finalOrders = [...japRows, ...keptDebit].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );

    return NextResponse.json({ ok: true, orders: finalOrders, count: finalOrders.length });
  } catch (e) {
    console.warn('[boost/orders]', e);
    return NextResponse.json({ ok: true, orders: [], error: 'Failed to load orders' });
  }
}
