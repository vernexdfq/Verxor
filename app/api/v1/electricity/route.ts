import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  verifyElectricityMeter,
  purchaseElectricity,
  getClubKonnectBalance,
  type CkDiscoSlug,
  type CkMeterType,
  CK_DISCO_LABEL,
} from '@/lib/providers/clubkonnect';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient } from '@/lib/panel-auth';

export const dynamic = 'force-dynamic';

const DISCOS = new Set([
  'eko',
  'ikeja',
  'abuja',
  'kano',
  'ph',
  'jos',
  'ibadan',
  'kaduna',
  'enugu',
  'benin',
  'yola',
  'aba',
]);

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
  }).catch(() => null);
}

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
        meta: { type: 'electricity', product: 'electricity', wallet: 'reseller' },
      }),
    });
  } catch {
    /* best-effort */
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
        meta: { type: 'electricity', product: 'electricity', wallet: 'reseller' },
      }),
    });
  } catch {
    /* best-effort */
  }
}

/** GET /api/v1/electricity — provider health + disco list */
export async function GET() {
  const ckReady = isClubKonnectConfigured();
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
    providers: { clubkonnect: ckReady },
    clubkonnect: ckBalance,
    discos: Object.entries(CK_DISCO_LABEL).map(([id, label]) => ({ id, label })),
  });
}

/**
 * POST /api/v1/electricity
 * body.action = 'verify' | 'pay' (default pay)
 */
export async function POST(req: NextRequest) {
  if (!isClubKonnectConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Electricity provider not configured' },
      { status: 503 },
    );
  }

  let body: {
    action?: string;
    disco?: string;
    meterType?: string;
    meterNo?: string;
    amount?: number;
    phone?: string;
    ref?: string;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const action = String(body.action || 'pay').toLowerCase();
  const disco = String(body.disco || '').toLowerCase() as CkDiscoSlug;
  if (!DISCOS.has(disco)) {
    return NextResponse.json({ ok: false, error: 'Invalid electricity company' }, { status: 400 });
  }

  const meterTypeRaw = String(body.meterType || 'prepaid').toLowerCase();
  const meterType: CkMeterType = meterTypeRaw === 'postpaid' ? 'postpaid' : 'prepaid';
  const meterNo = String(body.meterNo || '').replace(/\D/g, '');

  if (action === 'verify') {
    const result = await verifyElectricityMeter({ disco, meterType, meterNo });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      customerName: result.customerName,
      disco,
      meterType,
      meterNo,
    });
  }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 500) {
    return NextResponse.json(
      { ok: false, error: 'Minimum electricity payment is ₦500' },
      { status: 400 },
    );
  }
  if (amount > 100000) {
    return NextResponse.json(
      { ok: false, error: 'Maximum electricity payment is ₦100,000' },
      { status: 400 },
    );
  }

  const phone = String(body.phone || '');
  if (!phone) {
    return NextResponse.json(
      { ok: false, error: 'Phone number is required for electricity payment' },
      { status: 400 },
    );
  }

  const panel = await resolvePanelClient(req);
  let userId = await resolveUserId(req, body.userId);
  if (panel) {
    userId = panel.walletUserId || userId;
  }
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: panel ? 'Panel wallet user is not linked.' : 'Unauthorized. Sign in to pay electricity.',
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
  const discoLabel = CK_DISCO_LABEL[disco] || disco;
  const typeLabel = meterType === 'prepaid' ? 'Prepaid' : 'Postpaid';
  const debitDesc = `${discoLabel} ${typeLabel} · ${meterNo} · ₦${amount.toLocaleString('en-NG')}`;
  const debitRef = body.ref || `el-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
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

  try {
    const result = await purchaseElectricity({
      disco,
      meterType,
      meterNo,
      amount,
      phone,
      ref: debitRef,
    });

    const successTitle =
      meterType === 'prepaid'
        ? result.token
          ? `Token ready · ₦${amount.toLocaleString('en-NG')} · ${discoLabel}`
          : `Prepaid order received · ₦${amount.toLocaleString('en-NG')} · ${discoLabel}`
        : `Bill paid · ₦${amount.toLocaleString('en-NG')} · ${discoLabel}`;

    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        orderId: result.orderId,
        status: result.status,
        meterNo: result.meterNo,
        amount: result.amount,
        disco: result.disco,
        meterType: result.meterType,
        token: result.token,
        customerName: result.customerName,
        message: successTitle,
        title: successTitle,
      },
      balanceDebited: amount,
      walletMode: useReseller ? 'reseller_wallet' : 'retail',
      panel: panel ? { id: panel.id, name: panel.name } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ClubKonnect electricity failed';
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
        error: message.replace(/^(clubkonnect):\s*/i, '').trim() || 'Electricity payment failed',
        refunded: debited,
      },
      { status: 502 },
    );
  }
}
