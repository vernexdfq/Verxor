import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  purchaseAirtime as purchaseClubKonnect,
  type CkNetworkSlug,
} from '@/lib/providers/clubkonnect';
import {
  isApi247Configured,
  purchaseAirtime247,
  type Api247NetworkSlug,
} from '@/lib/providers/api247';
import { supabaseConfigured } from '@/lib/supabase-admin';

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
  });
}

/**
 * Airtime purchase:
 *   Auth → debit wallet → 247API (primary) → ClubKonnect (backup) → refund on provider fail
 *
 * History title example:
 *   "MTN airtime purchase of ₦200 was successful"
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
  const userId = await resolveUserId(req, body.userId);

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in to buy airtime.' },
      { status: 401 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured' },
      { status: 503 },
    );
  }

  const netLabel = NETWORK_LABEL[network] || network.toUpperCase();
  const successTitle = `${netLabel} airtime purchase of ${formatNaira(amount)} was successful`;
  const debitDesc = `${netLabel} airtime purchase of ${formatNaira(amount)}`;
  const debitRef = body.ref || `at-${userId.slice(0, 8)}-${Date.now()}`;
  let debited = false;

  try {
    await debitRetailWallet(userId, amount, debitRef, debitDesc);
    debited = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: 'Insufficient wallet balance. Fund your wallet first.' },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const errors: string[] = [];
  const tried: string[] = [];

  // 1) Primary: 247API
  if (api247Ready) {
    tried.push('api247');
    try {
      const result = await purchaseAirtime247({
        network: network as Api247NetworkSlug,
        phone,
        amount,
        ref: debitRef,
      });
      return NextResponse.json({
        ok: true,
        order: {
          ref: result.ref,
          status: result.status,
          phone: result.phone,
          amount: result.amount,
          network: result.network,
          message: successTitle,
          provider: 'api247',
          title: successTitle,
        },
        balanceDebited: amount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '247API failed';
      errors.push(`api247: ${message}`);
    }
  }

  // 2) Backup: ClubKonnect
  if (ckReady) {
    tried.push('clubkonnect');
    try {
      const result = await purchaseClubKonnect({
        network: network as CkNetworkSlug,
        phone,
        amount,
        ref: debitRef,
      });
      return NextResponse.json({
        ok: true,
        order: {
          ref: result.ref,
          status: result.status,
          phone: result.phone,
          amount: result.amount,
          network: result.network,
          message: successTitle,
          provider: 'clubkonnect',
          title: successTitle,
        },
        balanceDebited: amount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ClubKonnect failed';
      errors.push(`clubkonnect: ${message}`);
    }
  }

  // Provider failed after debit → refund
  if (debited) {
    await creditRetailWallet(
      userId,
      amount,
      `refund-${debitRef}`,
      `Refund — ${debitDesc}`,
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: errors.join(' | ') || 'Airtime purchase failed',
      tried,
      refunded: debited,
    },
    { status: 502 },
  );
}
