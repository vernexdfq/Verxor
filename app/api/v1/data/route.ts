import { NextRequest, NextResponse } from 'next/server';
import { isApi247Configured, purchaseData247 } from '@/lib/providers/api247';
import { findCatalogPlan } from '@/lib/data-catalog';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { sendDataReceipt } from '@/lib/email/receipts';

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

/**
 * POST /api/v1/data
 * Auth → resolve catalog plan → debit retail price → 247API purchase → refund on fail
 */
export async function POST(req: NextRequest) {
  if (!isApi247Configured()) {
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

  const network = String(body.network || '').toLowerCase();
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const dataPlanId = Number(body.dataPlanId ?? body.planId);
  if (!Number.isFinite(dataPlanId) || dataPlanId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid data plan' }, { status: 400 });
  }

  const catalog = findCatalogPlan(dataPlanId);
  if (!catalog) {
    return NextResponse.json(
      { ok: false, error: 'This plan is not available yet. Try another bundle.' },
      { status: 400 },
    );
  }

  if (catalog.network !== network) {
    return NextResponse.json(
      { ok: false, error: 'Plan does not match selected network' },
      { status: 400 },
    );
  }

  const amount = Math.round(catalog.retail);
  if (amount < 50) {
    return NextResponse.json({ ok: false, error: 'Invalid plan price' }, { status: 400 });
  }

  const phone = String(body.phone || '');
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
  const planLabel = `${catalog.size} (${catalog.days} day${catalog.days === '1' ? '' : 's'})`;
  const successTitle = `${netLabel} data ${planLabel} purchase of ${formatNaira(amount)} was successful`;
  const debitDesc = `${netLabel} data ${planLabel} of ${formatNaira(amount)}`;
  const debitRef = body.ref || `dt-${userId.slice(0, 8)}-${Date.now()}`;
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
    const result = await purchaseData247({
      planId: catalog.id,
      phone,
      ref: debitRef,
      bypass: true,
    });

    await sendDataReceipt(userId, {
      status: 'successful',
      amountNgn: amount,
      reference: result.ref || debitRef,
      details: [
        { label: 'Network', value: netLabel },
        { label: 'Mobile number', value: phone },
        { label: 'Bundle', value: planLabel },
      ],
    }).then((mail) => { if (!mail.ok) console.warn('[email] Data receipt not sent:', mail.error); });
    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        status: result.status,
        phone: result.phone,
        amount,
        network,
        planId: catalog.id,
        planName: planLabel,
        message: successTitle,
        title: successTitle,
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
    const rawMessage = err instanceof Error ? err.message : 'Data purchase failed';
    const cleanMessage = rawMessage.replace(/(api247|clubkonnect|smeplug|provider|upstream):\s*/gi, '').trim() || 'Data purchase failed. Please try again shortly.';
    return NextResponse.json(
      { ok: false, error: cleanMessage, refunded: debited },
      { status: 502 },
    );
  }
}
