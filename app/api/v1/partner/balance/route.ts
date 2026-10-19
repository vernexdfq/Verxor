import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

/**
 * Partner (reseller) balance from public.reseller_wallet only.
 * Auth: vx_panel_* API key (linked wallet) OR Bearer user session.
 */
export async function GET(req: NextRequest) {
  try {
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
    }

    let userId = (req.nextUrl.searchParams.get('userId') || '').trim();

    const panel = await resolvePanelClient(req);
    if (panel?.walletUserId) {
      userId = panel.walletUserId;
    }

    if (!userId) {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      if (token && !token.startsWith('vx_panel_') && anon) {
        try {
          const res = await fetch(`${base}/auth/v1/user`, {
            headers: { apikey: anon, Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const u = (await res.json()) as { id?: string };
            if (u.id) userId = u.id;
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          reason: panel
            ? 'Panel key has no linked wallet'
            : 'Missing panel API key or user session',
        },
        { status: 401 },
      );
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    try {
      await fetch(`${base}/rest/v1/reseller_wallet`, {
        method: 'POST',
        headers: {
          ...hdr,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: userId, balance: 0 }),
      });
    } catch {
      /* ignore */
    }

    const balRes = await fetch(
      `${base}/rest/v1/reseller_wallet?user_id=eq.${userId}&select=balance&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!balRes.ok) {
      return NextResponse.json({ ok: false, error: 'balance_read_failed' }, { status: 500 });
    }
    const rows = await balRes.json();
    const balanceNgn = Number(rows[0]?.balance) || 0;

    return NextResponse.json({
      ok: true,
      balanceNgn,
      balance: balanceNgn,
      mode: 'partner',
      panel: panel ? { id: panel.id, name: panel.name } : null,
    });
  } catch (e) {
    console.error('[partner/balance]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
