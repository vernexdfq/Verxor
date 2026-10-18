import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient, panelAllowsVirtualNumbers } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
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

async function debitWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const res = await fetch(`${base}/rest/v1/rpc/debit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Virtual number purchase',
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function creditWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return;
  await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Refund: number purchase failed',
    }),
  });
}

/**
 * Buy a virtual number (Grizzly).
 * Auth: retail JWT or child-panel API key (vx_panel_*) with linked wallet.
 * Refunds wallet if provider fails after debit.
 */
export async function POST(req: NextRequest) {
  if (!grizzly.isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Grizzly SMS is not configured' },
      { status: 503 },
    );
  }

  let body: {
    service?: string;
    country?: string;
    maxPriceUsd?: number;
    poolId?: string;
    priceNgn?: number;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const service = (body.service || '').trim().toLowerCase();
  const country = String(body.country || '').trim();
  const maxPriceUsd = Number(body.maxPriceUsd);
  const poolId = (body.poolId || '').toLowerCase();
  const priceNgn = Number(body.priceNgn) || 0;

  if (!service || !country) {
    return NextResponse.json(
      { ok: false, error: 'service and country are required' },
      { status: 400 },
    );
  }
  if (!Number.isFinite(maxPriceUsd) || maxPriceUsd <= 0) {
    return NextResponse.json(
      { ok: false, error: 'maxPriceUsd must be a positive number' },
      { status: 400 },
    );
  }

  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsVirtualNumbers(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to buy virtual numbers' },
      { status: 403 },
    );
  }

  let userId = await resolveUserId(req, body.userId);
  if (!userId && panel?.walletUserId) {
    userId = panel.walletUserId;
  }

  if (!userId && !panel) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in or pass a child-panel API key.' },
      { status: 401 },
    );
  }
  if (panel && !userId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Panel wallet not linked. Regenerate the panel key with ownerEmail, or set meta.wallet_user_id / VERXOR_PANEL_WALLET_USER_ID.',
      },
      { status: 402 },
    );
  }

  const debitRef = `vn-buy-${panel ? `panel-${panel.id}` : userId}-${Date.now()}`;
  let debited = false;

  if (priceNgn > 0 && userId && supabaseConfigured()) {
    try {
      await debitWallet(userId, priceNgn, debitRef);
      debited = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          { ok: false, error: 'Insufficient wallet balance. Fund the panel wallet first.' },
          { status: 402 },
        );
      }
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  } else if (priceNgn > 0 && !userId) {
    return NextResponse.json(
      { ok: false, error: 'Cannot charge: no wallet user for this request' },
      { status: 402 },
    );
  }

  try {
    const maxPrice = Math.round((maxPriceUsd + 0.01) * 100) / 100;

    const result = await grizzly.getNumber({
      service,
      country,
      maxPrice,
    });

    const phone = result.phone.startsWith('+') ? result.phone : `+${result.phone}`;

    let savedId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const rows = await sbInsert('vn_orders', {
          user_id: userId || null,
          provider: 'grizzly',
          provider_order_id: String(result.id),
          phone,
          service,
          country,
          pool_id: poolId || null,
          price_ngn: priceNgn,
          status: 'waiting',
          raw: {
            access: result.raw,
            debitRef: debited ? debitRef : null,
            panelId: panel?.id || null,
            panelName: panel?.name || null,
          },
        });
        if (Array.isArray(rows) && rows[0]?.id) savedId = String(rows[0].id);
      } catch {
        /* order row optional */
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId || result.id,
        providerOrderId: String(result.id),
        phone,
        service,
        country,
        poolId: poolId || null,
        priceNgn,
        status: 'waiting',
        panel: panel ? { id: panel.id, name: panel.name } : null,
      },
    });
  } catch (err) {
    if (debited && userId) {
      await creditWallet(userId, priceNgn, `refund-${debitRef}`);
    }
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
