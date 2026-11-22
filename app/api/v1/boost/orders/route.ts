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

async function resolveUserId(req: NextRequest, queryUserId?: string): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // Soft session (same trust model as /api/v1/wallet/balance): a valid token
  // always wins; the stored userId covers users whose access token expired
  // while the 30-day "remember me" session is still active.
  const fallback =
    String(queryUserId || '').trim() ||
    req.nextUrl.searchParams.get('userId')?.trim() ||
    '';
  if (!token) return fallback || null;
  if (token.startsWith('vx_panel_')) return fallback || null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return fallback || null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return fallback || null;
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

function mapStatus(raw: unknown): 'pending' | 'processing' | 'partial' | 'completed' | 'canceled' | 'unresolved' {
  const s = String(raw || '').toLowerCase();
  if (s.includes('unresolved')) return 'unresolved';
  if (s.includes('partial')) return 'partial';
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel') || s.includes('refund')) return 'canceled';
  if (s.includes('pending')) return 'pending';
  if (s.includes('progress') || s.includes('processing')) return 'processing';
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
    // Honest failure: the client keeps its local cache and shows an error,
    // instead of silently rendering an empty history.
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured', orders: [] },
      { status: 503 },
    );
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured', orders: [] },
      { status: 503 },
    );
  }

  try {
    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    };
    const select = 'id,kind,amount_ngn,amount_usd,reference,meta,created_at';

    // Boost-first queries so boost orders can never be pushed out of view by
    // newer non-boost ledger rows (the old single 150-row all-kinds fetch did that).
    // Reference prefixes cover every boost row family:
    //   boost-<uid>-<ts> (retail/panel debit), boost-order-<japId> (provider row),
    //   boost-cancel-<id> (cancel refunds), refund-boost-... (auto refunds).
    const qsBoost = new URLSearchParams({
      user_id: `eq.${userId}`,
      or: '(reference.like.boost-*,reference.like.refund-boost-*)',
      order: 'created_at.desc',
      limit: '1000',
      select,
    });
    const qsKind = new URLSearchParams({
      user_id: `eq.${userId}`,
      kind: 'in.(boost,panel_boost_debit,panel_boost_refund)',
      order: 'created_at.desc',
      limit: '1000',
      select,
    });

    const [boostRes, kindRes] = await Promise.all([
      fetch(`${base}/rest/v1/wallet_ledger?${qsBoost.toString()}`, { headers: hdr, cache: 'no-store' })
        .catch(() => null),
      fetch(`${base}/rest/v1/wallet_ledger?${qsKind.toString()}`, { headers: hdr, cache: 'no-store' })
        .catch(() => null),
    ]);
    if (!boostRes?.ok && !kindRes?.ok) {
      const failed = boostRes ?? kindRes;
      const t = failed ? await failed.text().catch(() => '') : '';
      console.warn('[boost/orders] ledger fetch failed', t.slice(0, 200));
      return NextResponse.json(
        { ok: false, error: 'Could not load your boost orders right now', orders: [] },
        { status: 503 },
      );
    }
    const boostRows = boostRes?.ok ? ((await boostRes.json().catch(() => [])) as LedgerRow[]) : [];
    const kindRows = kindRes?.ok ? ((await kindRes.json().catch(() => [])) as LedgerRow[]) : [];
    const byLedgerId = new Map<string, LedgerRow>();
    for (const r of [...boostRows, ...kindRows]) {
      if (r && !byLedgerId.has(String(r.id))) byLedgerId.set(String(r.id), r);
    }
    const rows = Array.from(byLedgerId.values()) as LedgerRow[];
    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { ok: false, error: 'Could not load your boost orders right now', orders: [] },
        { status: 503 },
      );
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
