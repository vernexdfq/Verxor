import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { sbInsert, sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // Panel keys are not Supabase JWTs
  if (token && !token.startsWith('vx_panel_')) {
    const base = supabaseBase();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (base && anon) {
      try {
        const res = await fetch(`${base}/auth/v1/user`, {
          headers: { apikey: anon, Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const u = (await res.json()) as { id?: string };
          if (u.id) return u.id;
        }
      } catch {
        /* fall through */
      }
    }
  }
  if (bodyUserId) return bodyUserId;
  return null;
}

async function creditWallet(
  userId: string,
  amount: number,
  reference: string,
): Promise<{ ok: boolean; detail?: string }> {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) {
    return { ok: false, detail: 'wallet backend not configured or amount=0' };
  }

  let rpcDetail = '';
  try {
    const res = await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_amount: amount,
        p_reference: reference,
        p_description: 'Refund — Cancelled Virtual Number',
      }),
    });
    if (res.ok) return { ok: true, detail: 'rpc' };
    const t = await res.text().catch(() => '');
    if (/duplicate|unique|already/i.test(t)) {
      return { ok: true, detail: 'rpc-idempotent' };
    }
    rpcDetail = `${res.status}:${t.slice(0, 180)}`;
  } catch (e) {
    rpcDetail = e instanceof Error ? e.message : 'rpc error';
  }

  try {
    const rows = (await sbSelect(
      'wallets',
      `user_id=eq.${encodeURIComponent(userId)}&select=balance_ngn&limit=1`,
    )) as Array<{ balance_ngn: number }>;
    const current = Number(rows?.[0]?.balance_ngn) || 0;
    const next = Math.round((current + amount) * 100) / 100;
    await sbUpdate('wallets', { user_id: userId }, { balance_ngn: next, updated_at: new Date().toISOString() });
    try {
      await sbInsert('wallet_ledger', {
        user_id: userId,
        kind: 'refund',
        amount_usd: 0,
        amount_ngn: amount,
        currency: 'NGN',
        balance_after_usd: 0,
        reference,
        meta: { source: 'vn-cancel', fallback: true, rpcDetail },
      });
    } catch {
      /* ledger optional */
    }
    return { ok: true, detail: `fallback:${rpcDetail}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fallback failed';
    return { ok: false, detail: `rpc=${rpcDetail}; fallback=${msg}` };
  }
}

/**
 * Cancel a waiting activation on Grizzly (status=8) and refund the user/panel wallet.
 * Body: { providerOrderId, orderId?, priceNgn?, userId? }
 * Auth: retail JWT or child-panel API key (linked wallet).
 */
export async function POST(req: NextRequest) {
  let body: {
    providerOrderId?: string;
    orderId?: string;
    priceNgn?: number;
    userId?: string;
    provider?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const providerOrderId = String(body.providerOrderId || '').trim();
  const orderId = String(body.orderId || '').trim();
  const priceNgn = Number(body.priceNgn) || 0;
  const provider = String(body.provider || 'grizzly').toLowerCase();

  if (!providerOrderId) {
    return NextResponse.json({ ok: false, error: 'providerOrderId required' }, { status: 400 });
  }

  const panel = await resolvePanelClient(req);
  let userId = await resolveUserId(req, body.userId);
  if (!userId && panel?.walletUserId) {
    userId = panel.walletUserId;
  }

  let providerOk = false;
  let earlyDenied = false;
  let providerRaw = '';
  if (provider === 'grizzly' && grizzly.isConfigured()) {
    try {
      providerRaw = await grizzly.setStatus(providerOrderId, '8');
      earlyDenied = /EARLY_CANCEL_DENIED/i.test(providerRaw);
      if (/ACCESS_CANCEL/i.test(providerRaw) || /STATUS_CANCEL/i.test(providerRaw)) {
        providerOk = true;
      } else if (/NO_ACTIVATION/i.test(providerRaw)) {
        providerOk = true;
      } else if (earlyDenied) {
        providerOk = false;
      } else {
        providerOk = true;
      }
    } catch (e) {
      providerRaw = e instanceof Error ? e.message : 'cancel failed';
    }
  } else {
    providerOk = true;
  }

  if (earlyDenied) {
    return NextResponse.json({
      ok: false,
      cancelled: false,
      earlyDenied: true,
      providerOk: false,
      providerRaw: providerRaw.slice(0, 120),
      refunded: false,
      error: 'Cancel not available yet. Wait for the lock timer.',
    });
  }

  if (supabaseConfigured()) {
    const patch = { status: 'cancelled', updated_at: new Date().toISOString() };
    for (const table of ['vn_orders', 'number_orders'] as const) {
      try {
        if (orderId) {
          await sbUpdate(table, { id: orderId }, patch);
        } else if (providerOrderId) {
          const rows = (await sbSelect(
            table,
            `provider_order_id=eq.${encodeURIComponent(providerOrderId)}&select=id&limit=1`,
          )) as Array<{ id: string }>;
          if (rows?.[0]?.id) await sbUpdate(table, { id: rows[0].id }, patch);
        }
      } catch {
        /* table may not exist / row missing */
      }
    }
  }

  let refunded = false;
  let refundDetail: string | undefined;
  if (!userId) {
    refundDetail = 'no userId (not logged in / panel wallet not linked)';
  } else if (priceNgn <= 0) {
    refundDetail = 'priceNgn is 0';
  } else if (!supabaseConfigured()) {
    refundDetail = 'supabase not configured';
  } else {
    const ref = `refund-vn-cancel-${providerOrderId}`;
    const result = await creditWallet(userId, priceNgn, ref);
    refunded = result.ok;
    refundDetail = result.detail;
  }

  return NextResponse.json({
    ok: true,
    cancelled: true,
    earlyDenied: false,
    providerOk,
    providerRaw: providerRaw.slice(0, 120),
    refunded,
    refundDetail,
    userId: userId ? `${userId.slice(0, 8)}…` : null,
    priceNgn,
    panel: panel ? { id: panel.id, name: panel.name } : null,
  });
}
