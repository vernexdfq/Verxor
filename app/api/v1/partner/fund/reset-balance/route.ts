import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * TEMPORARY: set reseller_wallet balance to 0 for the panel's linked wallet.
 * Remove after test credit is cleared.
 */
export async function POST(req: NextRequest) {
  try {
    const panel = await resolvePanelClient(req);
    if (!panel?.walletUserId) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const userId = panel.walletUserId.trim();
    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !serviceKey) {
      return NextResponse.json({ ok: false, message: 'DB not configured' }, { status: 503 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    const up = await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: hdr,
      body: JSON.stringify({ balance: 0, updated_at: new Date().toISOString() }),
    });

    if (!up.ok) {
      const t = await up.text().catch(() => '');
      return NextResponse.json(
        { ok: false, message: `Reset failed: ${t.slice(0, 200)}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      balance: 0,
      message: 'Panel wholesale balance reset to ₦0.',
      panel: { id: panel.id, name: panel.name },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'error' },
      { status: 500 },
    );
  }
}
