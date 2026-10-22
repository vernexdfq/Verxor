import { NextRequest, NextResponse } from 'next/server';
import {
  isSmeConfigured,
  purchaseData,
  type SmeNetworkSlug,
} from '@/lib/providers/smeapi';
import { supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const NETWORKS = new Set<SmeNetworkSlug>(['mtn', 'glo', '9mobile', 'airtel']);

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
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
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

export async function POST(req: NextRequest) {
  if (!isSmeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Data provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    network?: string;
    phone?: string;
    dataPlanId?: number | string;
    planId?: number | string;
    amount?: number;
    planName?: string;
    ported?: boolean;
    ref?: string;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const network = String(body.network || '').toLowerCase() as SmeNetworkSlug;
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const dataPlanId = Number(body.dataPlanId ?? body.planId);
  if (!Number.isFinite(dataPlanId) || dataPlanId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid data plan' }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount) || 0);
  if (!Number.isFinite(amount) || amount < 50) {
    return NextResponse.json(
      { ok: false, error: 'Valid plan amount is required (min ₦50)' },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(req, body.userId);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Sign in to buy data.' },
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
  const planLabel = (body.planName || 'data').trim() || 'data';
  const debitDesc = `${netLabel} data purchase of ${formatNaira(amount)} (${planLabel})`;
  const successTitle = `${netLabel} data purchase of ${formatNaira(amount)} was successful`;
  const debitRef = body.ref || `data-${userId.slice(0, 8)}-${Date.now()}`;
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

  try {
    const result = await purchaseData({
      network,
      phone: String(body.phone || ''),
      dataPlanId,
      ported: Boolean(body.ported),
      ref: debitRef,
    });
    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        status: result.status,
        phone: result.phone,
        dataPlanId: result.dataPlanId,
        network: result.network,
        message: successTitle,
        title: successTitle,
        amount,
      },
      balanceDebited: amount,
    });
  } catch (err) {
    if (debited) {
      await creditRetailWallet(
        userId,
        amount,
        `refund-${debitRef}`,
        `Refund — ${debitDesc}`,
      );
    }
    const message = err instanceof Error ? err.message : 'Data purchase failed';
    return NextResponse.json(
      { ok: false, error: message, refunded: debited },
      { status: 502 },
    );
  }
}
