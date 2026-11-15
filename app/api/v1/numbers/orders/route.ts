import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
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

function mapVnStatus(raw: unknown): 'waiting' | 'received' | 'completed' | 'cancelled' {
  const st = String(raw || 'waiting').toLowerCase();
  if (st === 'received') return 'received';
  if (st === 'completed' || st === 'done' || st === 'success') return 'completed';
  if (st === 'cancelled' || st === 'canceled' || st === 'expired' || st === 'refunded') return 'cancelled';
  return 'waiting';
}

/**
 * GET /api/v1/numbers/orders
 * Returns the signed-in user's virtual number orders from vn_orders (server history).
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
      'vn_orders',
      `user_id=eq.${userId}&order=created_at.desc&limit=100&select=id,provider,activation_id,phone_number,service_code,country_code,charged_ngn,status,sms_code,created_at,expires_at`,
    )) as Array<Record<string, unknown>>;

    if (!Array.isArray(rows)) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const LIFETIME_MS = 20 * 60 * 1000;
    const CANCEL_LOCK_MS = 2 * 60 * 1000;

    const orders = rows.map((r) => {
      const createdAt = String(r.created_at || new Date().toISOString());
      const createdMs = Date.parse(createdAt) || Date.now();
      const dbExpires = r.expires_at != null ? Date.parse(String(r.expires_at)) : NaN;

      return {
        id: String(r.id || r.activation_id || ''),
        number: String(r.phone_number || ''),
        service: String(r.service_code || ''),
        serviceId: String(r.service_code || ''),
        country: String(r.country_code || ''),
        poolTitle: 'Virtual number',
        status: mapVnStatus(r.status),
        otp: r.sms_code != null ? String(r.sms_code) : undefined,
        priceNgn: Number(r.charged_ngn) || 0,
        expiresAt: Number.isFinite(dbExpires) ? dbExpires : createdMs + LIFETIME_MS,
        cancelAvailableAt: createdMs + CANCEL_LOCK_MS,
        createdAt,
        provider: String(r.provider || 'grizzly'),
        providerOrderId: r.activation_id != null ? String(r.activation_id) : undefined,
        refunded: false,
      };
    });

    return NextResponse.json({ ok: true, orders, count: orders.length });
  } catch (e) {
    console.warn('[numbers/orders]', e);
    return NextResponse.json({ ok: true, orders: [], error: 'Failed to load orders' });
  }
}
