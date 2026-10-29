import { NextRequest, NextResponse } from 'next/server';
import { isSmmConfigured, smmCancelOrder, smmGetStatus } from '@/lib/providers/smm-orders';
import { supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

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

async function creditRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: description,
    }),
  });
}

/**
 * POST /api/v1/boost/cancel
 * Body: { orderId, amount?, userId? }
 * JAP action=cancel with orders=id. Refunds wallet when amount provided and cancel accepted.
 */
export async function POST(req: NextRequest) {
  if (!isSmmConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Boost provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    orderId?: string | number;
    amount?: number;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = body.orderId;
  if (orderId == null || String(orderId).trim() === '') {
    return NextResponse.json({ ok: false, error: 'orderId is required' }, { status: 400 });
  }

  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in to cancel an order.' },
      { status: 401 },
    );
  }

  try {
    const st = await smmGetStatus(orderId);
    const status = String(st.status || '').toLowerCase();
    if (status === 'completed' || status === 'partial') {
      return NextResponse.json(
        {
          ok: false,
          error: `Order is already ${st.status} and cannot be cancelled`,
          status: st.status,
        },
        { status: 400 },
      );
    }
  } catch {
    // Provider may not return status; continue to cancel attempt
  }

  try {
    const result = await smmCancelOrder(orderId);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Provider did not accept cancel for this order (may not support cancel, or already processing)',
          provider: result.raw,
        },
        { status: 400 },
      );
    }

    const amount = Number(body.amount);
    let refunded = false;
    if (supabaseConfigured() && Number.isFinite(amount) && amount > 0) {
      await creditRetailWallet(
        userId,
        amount,
        `boost-cancel-${orderId}-${Date.now()}`,
        `Refund — Cancelled boost order #${orderId} · ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      );
      refunded = true;
    }

    return NextResponse.json({
      ok: true,
      orderId: String(orderId),
      cancelled: true,
      refunded,
      message: refunded
        ? `Order #${orderId} cancelled and ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} refunded`
        : `Order #${orderId} cancel requested with provider`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Cancel failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
