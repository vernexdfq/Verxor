import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * TEMPORARY: Manual credit to reseller_wallet for a panel.
 * Auth: vx_panel_* API key (must have linked wallet).
 * Body: { amountNgn: number, note?: string }
 *
 * Use only until XixaPay partner generate is stable.
 * Remove or lock down after OPay path is fixed.
 */
export async function POST(req: NextRequest) {
  try {
    const panel = await resolvePanelClient(req);
    if (!panel) {
      return NextResponse.json(
        { ok: false, message: 'Missing or invalid panel API key.' },
        { status: 401 },
      );
    }

    const userId = (panel.walletUserId || '').trim();
    if (!userId) {
      return NextResponse.json(
        { ok: false, message: 'Panel key has no linked wallet.' },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const amount = Math.round(Number(body.amountNgn ?? body.amount));
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { ok: false, message: 'Minimum manual credit is ₦100.' },
        { status: 400 },
      );
    }
    if (amount > 2_000_000) {
      return NextResponse.json(
        { ok: false, message: 'Amount too large for manual credit.' },
        { status: 400 },
      );
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !serviceKey) {
      return NextResponse.json({ ok: false, message: 'DB not configured.' }, { status: 503 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Ensure row exists
    await fetch(`${base}/rest/v1/reseller_wallet`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId, balance: 0 }),
    }).catch(() => null);

    const balRes = await fetch(
      `${base}/rest/v1/reseller_wallet?user_id=eq.${userId}&select=balance&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!balRes.ok) {
      return NextResponse.json({ ok: false, message: 'Could not read balance.' }, { status: 500 });
    }
    const rows = (await balRes.json()) as Array<{ balance?: number }>;
    const prev = Number(rows[0]?.balance) || 0;
    const next = Math.round((prev + amount) * 100) / 100;

    const up = await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=representation' },
      body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
    });
    if (!up.ok) {
      const t = await up.text().catch(() => '');
      console.error('[partner/manual-credit] patch failed', up.status, t.slice(0, 300));
      return NextResponse.json({ ok: false, message: 'Credit failed.' }, { status: 500 });
    }

    // Audit row
    try {
      await fetch(`${base}/rest/v1/transactions`, {
        method: 'POST',
        headers: { ...hdr, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          kind: 'partner_fund_manual',
          status: 'completed',
          amount,
          meta: {
            mode: 'partner_manual',
            note: String(body.note || 'manual top-up while XixaPay path fixed'),
            panel_id: panel.id,
            panel_name: panel.name,
          },
        }),
      });
    } catch {
      /* ignore */
    }

    console.info('[partner/manual-credit] credited', { userId, amount, next, panel: panel.name });

    return NextResponse.json({
      ok: true,
      mode: 'partner_manual',
      credited: amount,
      balance: next,
      balanceNgn: next,
      panel: { id: panel.id, name: panel.name },
      message: `₦${amount.toLocaleString()} credited to panel wholesale balance.`,
    });
  } catch (e) {
    console.error('[partner/manual-credit]', e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Server error' },
      { status: 500 },
    );
  }
}
