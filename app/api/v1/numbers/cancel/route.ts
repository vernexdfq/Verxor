import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

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
  if (!token) return null;
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

async function creditWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return false;
  try {
    const res = await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
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
        p_description: 'Refund — Cancelled Virtual Number',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Cancel a waiting activation on Grizzly (status=8) and refund the user wallet.
 * Body: { providerOrderId, orderId?, priceNgn?, userId? }
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
  const provider = (body.provider || 'grizzly').toLowerCase();

  if (!providerOrderId) {
    return NextResponse.json({ ok: false, error: 'providerOrderId required' }, { status: 400 });
  }

  const userId = await resolveUserId(req, body.userId);

  // Cancel on Grizzly (sms-activate compatible: status 8 = cancel)
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
        providerOk = true; // already gone on provider
      } else if (earlyDenied) {
        providerOk = false;
      } else {
        // Unknown response — treat as soft success so user is not stuck
        providerOk = true;
      }
    } catch (e) {
      providerRaw = e instanceof Error ? e.message : 'cancel failed';
    }
  } else {
    providerOk = true; // no provider configured — still allow local cancel + refund
  }

  // Do not refund or mark cancelled if provider still locks the activation
  if (earlyDenied) {
    return NextResponse.json({
      ok: false,
      cancelled: false,
      earlyDenied: true,
      providerOk: false,
      providerRaw: providerRaw.slice(0, 120),
      refunded: false,
    });
  }

  // Update DB order if present
  if (supabaseConfigured() && orderId) {
    try {
      await sbUpdate(
        'vn_orders',
        { id: orderId },
        { status: 'cancelled', updated_at: new Date().toISOString() },
      );
    } catch {
      try {
        // fallback by provider_order_id
        const rows = (await sbSelect(
          'vn_orders',
          `provider_order_id=eq.${encodeURIComponent(providerOrderId)}&select=id&limit=1`,
        )) as Array<{ id: string }>;
        if (rows?.[0]?.id) {
          await sbUpdate(
            'vn_orders',
            { id: rows[0].id },
            { status: 'cancelled', updated_at: new Date().toISOString() },
          );
        }
      } catch {
        /* ignore */
      }
    }
  }

  // Refund wallet once
  let refunded = false;
  if (userId && priceNgn > 0 && supabaseConfigured()) {
    const ref = `refund-vn-cancel-${providerOrderId}`;
    refunded = await creditWallet(userId, priceNgn, ref);
  }

  return NextResponse.json({
    ok: true,
    cancelled: true,
    earlyDenied: false,
    providerOk,
    providerRaw: providerRaw.slice(0, 120),
    refunded,
  });
}
