import { NextRequest, NextResponse } from 'next/server';
import { getMessage } from '@/lib/providers/anymessage';
import { sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
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

/**
 * GET /api/v1/email-otp/message?orderId=... 
 * Polls AnyMessage for the OTP / inbox content of the user's own order.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  const orderId = (req.nextUrl.searchParams.get('orderId') || '').trim();
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'orderId required' }, { status: 400 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Wallet backend not configured' }, { status: 503 });
  }

  let row: Record<string, unknown> | undefined;
  try {
    const rows = (await sbSelect(
      'email_orders',
      'id=eq.' + encodeURIComponent(orderId) + '&select=id,user_id,provider_order_id,status,message&limit=1',
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

  const providerOrderId = String(row.provider_order_id || '');
  const status = String(row.status || 'waiting');

  if (status === 'received' && row.message) {
    return NextResponse.json({ ok: true, status: 'received', message: String(row.message) });
  }
  if (status === 'cancelled') {
    return NextResponse.json({ ok: true, status: 'cancelled', message: null });
  }

  try {
    const m = await getMessage(providerOrderId);
    const text = m.status === 'success' ? String(m.message || m.value || '') : '';
    if (m.status === 'success' && text) {
      try {
        await sbUpdate('email_orders', { id: orderId }, { status: 'received', message: text, updated_at: new Date().toISOString() });
      } catch {
        /* best effort */
      }
      return NextResponse.json({ ok: true, status: 'received', message: text });
    }
    return NextResponse.json({ ok: true, status: 'waiting', message: null, providerStatus: m.status, providerNote: m.value || null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider error';
    return NextResponse.json({ ok: true, status: 'waiting', message: null, error: msg });
  }
}
