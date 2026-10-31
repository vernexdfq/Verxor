import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  purchaseAirtime as purchaseClubKonnect,
  getClubKonnectBalance,
  type CkNetworkSlug,
} from '@/lib/providers/clubkonnect';
import {
  isApi247Configured,
  purchaseAirtime247,
  healthCheck247,
  type Api247NetworkSlug,
} from '@/lib/providers/api247';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { sendAirtimeReceipt, sendDataReceipt } from '@/lib/email/receipts';
import { resolvePanelClient, panelAllowsAirtime, getPanelAdminEmail } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

const NETWORKS = new Set(['mtn', 'glo', '9mobile', 'airtel']);

const NETWORK_LABEL: Record<string, string> = {
  mtn: 'MTN',
  glo: 'Glo',
  '9mobile': '9mobile',
  airtel: 'Airtel',
};

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

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

/** Partner / child-panel wholesale balance (reseller_wallet). */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  await fetch(`${base}/rest/v1/reseller_wallet`, {
    method: 'POST',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: userId, balance: 0 }),
  }).catch(() => null);
  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!balRes.ok) throw new Error(`Reseller balance read failed: ${balRes.status}`);
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  if (prev < amount) throw new Error('INSUFFICIENT_BALANCE');
  const next = Math.round((prev - amount) * 100) / 100;
  const up = await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }
  try {
    await fetch(`${base}/rest/v1/wallet_ledger`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'purchase',
        amount_ngn: -Math.abs(amount),
        currency: 'NGN',
        reference,
        meta: { type: 'airtime', product: 'airtime', wallet: 'reseller' },
      }),
    });
  } catch {
    /* best-effort ledger */
  }
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!balRes.ok) return;
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  const next = Math.round((prev + amount) * 100) / 100;
  await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });
  try {
    await fetch(`${base}/rest/v1/wallet_ledger`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'refund',
        amount_ngn: Math.abs(amount),
        currency: 'NGN',
        reference,
        meta: { type: 'airtime', product: 'airtime', wallet: 'reseller' },
      }),
    });
  } catch {
    /* best-effort */
  }
}

async function debitRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
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
      p_description: description,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) {
      throw new Error('INSUFFICIENT_BALANCE');
    }
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
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
      p_description: description,
    }),
  }).catch(() => null);
}

/** GET /api/v1/airtime — provider health */
export async function GET() {
  const ckReady = isClubKonnectConfigured();
  const api247Ready = isApi247Configured();
  let api247: unknown = null;
  if (api247Ready) {
    try {
      api247 = await healthCheck247();
    } catch (e) {
      api247 = { ok: false, error: e instanceof Error ? e.message : 'health failed' };
    }
  }
  let ckBalance: unknown = null;
  if (ckReady) {
    try {
      ckBalance = await getClubKonnectBalance();
    } catch (e) {
      ckBalance = { ok: false, error: e instanceof Error ? e.message : 'balance failed' };
    }
  }
  return NextResponse.json({
    ok: true,
    providers: { api247: api247Ready, clubkonnect: ckReady },
    api247,
    clubkonnect: ckBalance,
  });
}

/**
 * POST /api/v1/airtime
 * Retail user OR panel key (reseller_wallet) → 247API → ClubKonnect → refund on fail
 */
export async function POST(req: NextRequest) {
  const ckReady = isClubKonnectConfigured();
  const api247Ready = isApi247Configured();

  if (!ckReady && !api247Ready) {
    return NextResponse.json(
      { ok: false, error: 'Airtime provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    network?: string;
    phone?: string;
    amount?: number;
    ref?: string;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const network = String(body.network || '').toLowerCase();
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    return NextResponse.json(
      { ok: false, error: 'Minimum airtime is ₦50' },
      { status: 400 },
    );
  }
  if (amount > 50000) {
    return NextResponse.json(
      { ok: false, error: 'Maximum airtime is ₦50,000' },
      { status: 400 },
    );
  }

  const phone = String(body.phone || '');
  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsAirtime(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to purchase airtime.' },
      { status: 403 },
    );
  }

  let userId = await resolveUserId(req, body.userId);
  if (panel) {
    userId = panel.walletUserId || userId;
  }
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: panel ? 'Panel wallet user is not linked.' : 'Unauthorized. Sign in to buy airtime.',
      },
      { status: 401 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured' },
      { status: 503 },
    );
  }

  const useReseller = Boolean(panel);
  const netLabel = NETWORK_LABEL[network] || network.toUpperCase();
  const successTitle = `${netLabel} airtime purchase of ${formatNaira(amount)} was successful`;
  const debitDesc = `${netLabel} airtime purchase of ${formatNaira(amount)}`;
  const debitRef = body.ref || `at-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
  let debited = false;

  try {
    if (useReseller) {
      await debitResellerWallet(userId, amount, debitRef);
    } else {
      await debitRetailWallet(userId, amount, debitRef, debitDesc);
    }
    debited = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        {
          ok: false,
          error: useReseller
            ? 'Insufficient panel wholesale balance. Fund the partner wallet first.'
            : 'Insufficient wallet balance. Fund your wallet first.',
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const errors: string[] = [];

  if (api247Ready) {
    try {
      const result = await purchaseAirtime247({
        network: network as Api247NetworkSlug,
        phone,
        amount,
        ref: debitRef,
      });
      if (!useReseller) {
        await sendAirtimeReceipt(userId, {
          status: 'successful',
          amountNgn: amount,
          reference: result.ref || debitRef,
          details: [
            { label: 'Network', value: netLabel },
            { label: 'Mobile number', value: phone },
          ],
        }).then((mail) => {
          if (!mail.ok) console.warn('[email] Airtime receipt not sent:', mail.error);
        });
      }
      return NextResponse.json({
        ok: true,
        order: {
          ref: result.ref,
          status: result.status,
          phone: result.phone,
          amount: result.amount,
          network: result.network,
          message: successTitle,
          title: successTitle,
        },
        balanceDebited: amount,
        walletMode: useReseller ? 'reseller_wallet' : 'retail',
        panel: panel ? { id: panel.id, name: panel.name } : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '247API failed';
      errors.push(`api247: ${message}`);
    }
  }

  if (ckReady) {
    try {
      const result = await purchaseClubKonnect({
        network: network as CkNetworkSlug,
        phone,
        amount,
        ref: debitRef,
      });
      if (!useReseller) {
        await sendAirtimeReceipt(userId, {
          status: 'successful',
          amountNgn: amount,
          reference: result.ref || debitRef,
          details: [
            { label: 'Network', value: netLabel },
            { label: 'Mobile number', value: phone },
          ],
        }).then((mail) => {
          if (!mail.ok) console.warn('[email] Airtime receipt not sent:', mail.error);
        });
      }
      return NextResponse.json({
        ok: true,
        order: {
          ref: result.ref,
          status: result.status,
          phone: result.phone,
          amount: result.amount,
          network: result.network,
          message: successTitle,
          title: successTitle,
        },
        balanceDebited: amount,
        walletMode: useReseller ? 'reseller_wallet' : 'retail',
        panel: panel ? { id: panel.id, name: panel.name } : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ClubKonnect failed';
      errors.push(`clubkonnect: ${message}`);
    }
  }

  if (debited) {
    if (useReseller) {
      await creditResellerWallet(userId, amount, `refund-${debitRef}`);
    } else {
      await creditRetailWallet(userId, amount, `refund-${debitRef}`, `Refund — ${debitDesc}`);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: (
        errors.join(' | ').replace(/(api247|clubkonnect|smeplug|provider|upstream):\s*/gi, '').trim() ||
        'Airtime service is temporarily unavailable for this network. Please try again shortly.'
      ),
      refunded: debited,
    },
    { status: 502 },
  );
}
