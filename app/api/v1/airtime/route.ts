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
import {
  resolvePanelClient,
  panelAllowsAirtime,
  getPanelAdminEmail,
  panelAirtimeDebitAmount,
  panelAirtimeDiscountPct,
  PANEL_AIRTIME_DISCOUNT_PCT,
} from '@/lib/panel-auth';

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

function formatNaira(n: number) {
  return `₦${Number(n).toLocaleString('en-NG')}`;
}

/** Partner / child-panel wholesale balance (reseller_wallet). */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const res = await fetch(`${base}/rest/v1/rpc/debit_reseller_wallet`, {
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
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/insufficient/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_reseller_wallet`, {
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
    }),
  }).catch(() => null);
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
    if (/insufficient/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
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
    pricing: {
      panelDiscountPct: PANEL_AIRTIME_DISCOUNT_PCT,
      note: 'Child panels: MTN 2%, Airtel 2%, Glo 6%, 9mobile 2%. Retail users pay face value.',
    },
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
    return NextResponse.json({ ok: false, error: 'Airtime provider not configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const network = String(body.network || '').toLowerCase().trim();
  if (!NETWORKS.has(network)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid network. Use mtn, glo, airtel, or 9mobile.' },
      { status: 400 },
    );
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

  let userId = await resolveUserId(req, body.userId as string | undefined);
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
  const panelDiscountPct = useReseller ? panelAirtimeDiscountPct(network) : 0;
  const debitAmount = useReseller ? panelAirtimeDebitAmount(amount, network) : amount;
  const panelDiscountNgn = useReseller
    ? Math.round((amount - debitAmount) * 100) / 100
    : 0;
  const successTitle = `${netLabel} airtime purchase of ${formatNaira(amount)} was successful`;
  const debitDesc = `${netLabel} airtime purchase of ${formatNaira(amount)}`;
  const debitRef = body.ref || `at-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
  let debited = false;

  try {
    if (useReseller) {
      await debitResellerWallet(userId, debitAmount, debitRef);
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
        balanceDebited: debitAmount,
        faceAmount: amount,
        panelDiscountPct: useReseller ? panelDiscountPct : 0,
        panelDiscountNgn: useReseller ? panelDiscountNgn : 0,
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
        balanceDebited: debitAmount,
        faceAmount: amount,
        panelDiscountPct: useReseller ? panelDiscountPct : 0,
        panelDiscountNgn: useReseller ? panelDiscountNgn : 0,
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
      await creditResellerWallet(userId, debitAmount, `refund-${debitRef}`);
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
