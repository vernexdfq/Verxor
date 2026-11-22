/**
 * GET /api/v1/accounts/orders — My Logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';
import { buildAccountDownloadUrl } from '@/lib/accounts-download';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, queryUserId?: string): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const fallback = String(queryUserId || '').trim();

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
        /* ignore */
      }
    }

    // Try decoding JWT sub claim if access token is recently expired
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && typeof payload.sub === 'string' && payload.sub.length > 10) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const base = supabaseBase();
          if (serviceKey && base) {
            const check = await fetch(
              `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(payload.sub)}&select=id&limit=1`,
              {
                headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
                cache: 'no-store',
              },
            );
            if (check.ok) {
              const rows = (await check.json()) as Array<{ id: string }>;
              if (rows?.[0]?.id) return rows[0].id;
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Fallback to validated queryUserId
  if (fallback) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const base = supabaseBase();
    if (serviceKey && base) {
      try {
        const check = await fetch(
          `${base}/rest/v1/profiles?id=eq.${encodeURIComponent(fallback)}&select=id&limit=1`,
          {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            cache: 'no-store',
          },
        );
        if (check.ok) {
          const rows = (await check.json()) as Array<{ id: string }>;
          if (rows?.[0]?.id) return rows[0].id;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const queryUserId = req.nextUrl.searchParams.get('userId') || undefined;
    const userId = await resolveUserId(req, queryUserId);
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized. Sign in to view your orders.' }, { status: 401 });
    }
    if (!supabaseConfigured()) {
      return NextResponse.json({ ok: true, orders: [], total: 0 });
    }

    const rows = await sbSelect(
      'account_orders',
      `user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`,
    );

    const orders = Array.isArray(rows)
      ? rows.map((order: Record<string, unknown>) => ({
          ...order,
          downloadUrl: order.id ? buildAccountDownloadUrl(String(order.id)) : undefined,
        }))
      : [];

    return NextResponse.json({
      ok: true,
      orders,
      total: orders.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load orders';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
