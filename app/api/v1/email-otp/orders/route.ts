import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

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
 * GET /api/v1/email-otp/orders
 * The signed-in user's purchased email addresses.
 */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required', orders: [] }, { status: 401 });
  }
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: true, orders: [], message: 'Wallet backend not configured' });
  }
  try {
    const rows = (await sbSelect(
      'email_orders',
      'user_id=eq.' + encodeURIComponent(userId) + '&order=created_at.desc&limit=100&select=id,provider_order_id,email_address,site,domain,cost_usd,charged_ngn,audience,status,message,created_at',
    )) as Array<Record<string, unknown>>;
    const orders = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: String(r.id || ''),
      providerOrderId: String(r.provider_order_id || ''),
      email: String(r.email_address || ''),
      site: String(r.site || ''),
      domain: String(r.domain || ''),
      priceNgn: Number(r.charged_ngn) || 0,
      costUsd: Number(r.cost_usd) || 0,
      audience: String(r.audience || 'retail'),
      status: String(r.status || 'waiting'),
      message: r.message != null ? String(r.message) : undefined,
      createdAt: String(r.created_at || ''),
    }));
    return NextResponse.json({ ok: true, orders, count: orders.length });
  } catch (e) {
    console.warn('[email-otp/orders]', e);
    return NextResponse.json({ ok: true, orders: [], error: 'Failed to load orders (is the email_orders table created?)' });
  }
}
