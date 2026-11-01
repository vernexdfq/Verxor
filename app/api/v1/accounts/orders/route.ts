/**
 * GET /api/v1/accounts/orders — My Logs
 */

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

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!supabaseConfigured()) {
      return NextResponse.json({ ok: true, orders: [], total: 0 });
    }

    const rows = await sbSelect(
      'account_orders',
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`,
    );

    return NextResponse.json({
      ok: true,
      orders: Array.isArray(rows) ? rows : [],
      total: Array.isArray(rows) ? rows.length : 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load orders';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
