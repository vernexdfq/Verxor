import { NextRequest, NextResponse } from 'next/server';
import { getMessage, parseOtpMessage } from '@/lib/providers/anymessage';
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
        p_description: 'Refund — expired email address',
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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  try {
    if (isUuid) {
      const rows = (await sbSelect(
        'email_orders',
        'id=eq.' + encodeURIComponent(orderId) + '&select=id,user_id,provider_order_id,status,message,charged_ngn,audience&limit=1',
      )) as Array<Record<string, unknown>>;
      row = rows?.[0];
    }
    if (!row) {
      const rows = (await sbSelect(
        'email_orders',
        'provider_order_id=eq.' + encodeURIComponent(orderId) + '&select=id,user_id,provider_order_id,status,message,charged_ngn,audience&limit=1',
      )) as Array<Record<string, unknown>>;
      row = rows?.[0];
    }
  } catch (err) {
    console.warn('[email-otp/message] select failed:', err);
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
  }
  if (String(row.user_id) !== userId) {
    return NextResponse.json({ ok: false, error: 'Not your order' }, { status: 403 });
  }

  const internalId = String(row.id || orderId);
  const providerOrderId = String(row.provider_order_id || '');
  const status = String(row.status || 'waiting');
  const priceNgn = Number(row.charged_ngn) || 0;

  if (status === 'received' && row.message) {
    const parsed = parseOtpMessage({ message: String(row.message), value: String(row.message) });
    return NextResponse.json({
      ok: true,
      status: 'received',
      code: parsed.code,
      message: String(row.message),
      link: parsed.link,
    });
  }
  if (status === 'cancelled') {
    return NextResponse.json({ ok: true, status: 'cancelled', message: null });
  }

  try {
    const m = await getMessage(providerOrderId);

    if (m.status === 'success') {
      const parsed = parseOtpMessage(m);
      const displayText = parsed.cleanText || parsed.code || 'OTP received';

      try {
        await sbUpdate(
          'email_orders',
          { id: internalId },
          { status: 'received', message: displayText, updated_at: new Date().toISOString() },
        );
      } catch (err) {
        console.warn('[email-otp/message] DB update failed:', err);
      }

      return NextResponse.json({
        ok: true,
        status: 'received',
        code: parsed.code,
        message: displayText,
        link: parsed.link,
      });
    }

    const note = String(m.value || '').toLowerCase();
    if (note === 'wait message' || !note) {
      return NextResponse.json({ ok: true, status: 'waiting', message: null });
    }

    if (note.includes('canceled') || note.includes('cancelled') || note.includes('no activation')) {
      try {
        await sbUpdate(
          'email_orders',
          { id: internalId },
          { status: 'cancelled', updated_at: new Date().toISOString() },
        );
      } catch {}

      if (priceNgn > 0) {
        await creditRetailWallet(userId, priceNgn, 'refund-email-expired-' + providerOrderId).catch(() => null);
      }

      return NextResponse.json({
        ok: true,
        status: 'cancelled',
        message: null,
        note: 'Email session expired without receiving an OTP. Your wallet has been refunded.',
      });
    }

    return NextResponse.json({ ok: true, status: 'waiting', message: null, providerNote: m.value || null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider error';
    return NextResponse.json({ ok: true, status: 'waiting', message: null, error: msg });
  }
}
