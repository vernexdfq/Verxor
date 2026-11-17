import { NextRequest, NextResponse } from 'next/server';
import { cancelEmail } from '@/lib/providers/anymessage';
import { sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
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

async function creditRetailWallet(userId: string, amount: number, reference: string): Promise<boolean> {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return false;
  try {
    const res = await fetch(base + '/rest/v1/rpc/credit_wallet', {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_amount: amount,
        p_reference: reference,
        p_description: 'Refund — cancelled email address',
      }),
    });
    if (res.ok) return true;
    const t = await res.text().catch(() => '');
    return /duplicate|unique|already/i.test(t);
  } catch {
    return false;
  }
}

/**
 * POST /api/v1/email-otp/cancel  { orderId, userId? }
 * Cancels a waiting email order and refunds the wallet.
 */
export async function POST(req: NextRequest) {
  let body: { orderId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const orderId = String(body.orderId || '').trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'orderId required' }, { status: 400 });
  }
  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Wallet backend not configured' }, { status: 503 });
  }

  let row: Record<string, unknown> | undefined;
  try {
    const rows = (await sbSelect(
      'email_orders',
      'id=eq.' + encodeURIComponent(orderId) + '&select=id,user_id,provider_order_id,status,charged_ngn&limit=1',
    )) as Array<Record<string, unknown>>;
    row = rows?.[0];
  } catch {
    return NextResponse.json({ ok: false, error: 'Order not found (is the email_orders table created?)' }, { status: 404 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }
  if (String(row.user_id) !== userId) {
    return NextResponse.json({ ok: false, error: 'Not your order' }, { status: 403 });
  }
  const status = String(row.status || 'waiting');
  if (status !== 'waiting') {
    return NextResponse.json({ ok: false, error: 'Only waiting orders can be cancelled' }, { status: 409 });
  }

  const providerOrderId = String(row.provider_order_id || '');
  try {
    await cancelEmail(providerOrderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'cancel failed';
    if (!/not found|no order|already/i.test(msg)) {
      return NextResponse.json({ ok: false, error: 'Provider cancel failed: ' + msg }, { status: 502 });
    }
  }

  try {
    await sbUpdate('email_orders', { id: orderId }, { status: 'cancelled', updated_at: new Date().toISOString() });
  } catch {
    /* best effort */
  }

  const priceNgn = Number(row.charged_ngn) || 0;
  const refunded = await creditRetailWallet(userId, priceNgn, 'refund-email-cancel-' + providerOrderId);

  return NextResponse.json({ ok: true, cancelled: true, refunded, priceNgn });
}
