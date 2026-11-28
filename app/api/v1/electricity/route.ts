import { NextRequest, NextResponse } from 'next/server';
import { isUserFrozen } from '@/lib/access-guard';
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
import { sendPanelAdminOrderAlert } from '@/lib/email/receipts';
import {
  resolvePanelClient,
  getPanelAdminEmails,
  panelAllowsElectricity,
  panelElectricityDebitAmount,
  PANEL_ELECTRICITY_DISCOUNT_PCT,
  CK_ELECTRICITY_DISCOUNT_PCT,
} from '@/lib/panel-auth';

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

/** Align with ClubKonnect web min (₦1,000). */
const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 200000;

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
        meta: {
          type: 'electricity',
          product: 'electricity',
          wallet: 'reseller',
          panelDiscountPct: PANEL_ELECTRICITY_DISCOUNT_PCT,
        },
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
    pricing: {
      minAmount: MIN_AMOUNT,
      maxAmount: MAX_AMOUNT,
      clubkonnectDiscountPct: CK_ELECTRICITY_DISCOUNT_PCT,
      panelDiscountPct: PANEL_ELECTRICITY_DISCOUNT_PCT,
      verxorMarginPct: Math.round((CK_ELECTRICITY_DISCOUNT_PCT - PANEL_ELECTRICITY_DISCOUNT_PCT) * 100) / 100,
    },
  });
}

/**
 * POST /api/v1/electricity
 * body.action = 'verify' | 'pay' (default pay)
 *
 * Retail: full face amount debited from user wallet.
 * Child panel (vx_panel_*): 0.3% discount on debit; Verxor keeps ~0.2%
 * of ClubKonnect's ~0.5% API discount.
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
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    return NextResponse.json(
      { ok: false, error: `Minimum electricity payment is ₦${MIN_AMOUNT.toLocaleString('en-NG')}` },
      { status: 400 },
    );
  }
  if (amount > MAX_AMOUNT) {
    return NextResponse.json(
      { ok: false, error: `Maximum electricity payment is ₦${MAX_AMOUNT.toLocaleString('en-NG')}` },
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
  if (panel && !panelAllowsElectricity(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to purchase electricity.' },
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
        error: panel ? 'Panel wallet user is not linked.' : 'Unauthorized. Sign in to pay electricity.',
      },
      { status: 401 },
    );
  }

  // Frozen by admin: login is fine, purchases are blocked.
  if (await isUserFrozen(userId)) {
    return NextResponse.json(
      { ok: false, error: 'Your account is frozen. Contact Verxor support to restore access.' },
      { status: 403 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Wallet backend not configured' },
      { status: 503 },
    );
  }

  const useReseller = Boolean(panel);
  /** Face amount sent to ClubKonnect; panel is debited at 0.3% discount. */
  const faceAmount = amount;
  const debitAmount = useReseller ? panelElectricityDebitAmount(faceAmount) : faceAmount;
  const panelDiscountNgn = useReseller
    ? Math.round((faceAmount - debitAmount) * 100) / 100
    : 0;

  const discoLabel = CK_DISCO_LABEL[disco] || disco;
  const typeLabel = meterType === 'prepaid' ? 'Prepaid' : 'Postpaid';
  const debitDesc = `${discoLabel} ${typeLabel} · ${meterNo} · ₦${faceAmount.toLocaleString('en-NG')}`;
  const debitRef = body.ref || `el-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
  let debited = false;

  try {
    if (useReseller) {
      await debitResellerWallet(userId, debitAmount, debitRef);
    } else {
      await debitRetailWallet(userId, debitAmount, debitRef, debitDesc);
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
      amount: faceAmount,
      phone,
      ref: debitRef,
    });

    const successTitle =
      meterType === 'prepaid'
        ? result.token
          ? `Token ready · ₦${faceAmount.toLocaleString('en-NG')} · ${discoLabel}`
          : `Prepaid order received · ₦${faceAmount.toLocaleString('en-NG')} · ${discoLabel}`
        : `Bill paid · ₦${faceAmount.toLocaleString('en-NG')} · ${discoLabel}`;

    if (useReseller && panel) {
      try {
        const adminEmails = await getPanelAdminEmails(panel);
        const retailNgn = Number((body as any)?.retailPriceNgn ?? (body as any)?.customerPaidNgn ?? faceAmount);
        const customerLabel = ((body as any)?.customerName || (body as any)?.customerEmail || '').trim() || 'Child panel customer';

        await sendPanelAdminOrderAlert(adminEmails, {
          panelName: panel.name,
          adminEmail: adminEmails,
          customerName: customerLabel,
          customerEmail: (body as any)?.customerEmail ? String((body as any).customerEmail).trim() : undefined,
          service: `Electricity (${discoLabel} · ${meterType.toUpperCase()})`,
          orderId: result.ref || result.orderId || debitRef,
          wholesaleAmountNgn: debitAmount,
          customerPaidNgn: retailNgn > debitAmount ? retailNgn : undefined,
          details: [
            { label: 'Customer', value: customerLabel },
            { label: 'Provider', value: discoLabel },
            { label: 'Meter No', value: meterNo },
            { label: 'Meter Type', value: meterType.toUpperCase() },
            ...(result.token ? [{ label: 'Token', value: result.token }] : []),
            { label: 'Face amount', value: `₦${faceAmount.toLocaleString('en-NG')}` },
            { label: 'Wholesale discount', value: `${PANEL_ELECTRICITY_DISCOUNT_PCT}% (Saved ₦${panelDiscountNgn.toLocaleString('en-NG')})` },
          ],
          date: new Date(),
        }).then((mail) => {
          if (!mail.ok) console.warn('[email] Electricity panel admin alert not sent:', mail.error);
        });
      } catch (err) {
        console.warn('[email] Electricity panel admin alert dispatch failed:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        orderId: result.orderId,
        status: result.status,
        meterNo: result.meterNo,
        amount: faceAmount,
        disco: result.disco,
        meterType: result.meterType,
        token: result.token,
        customerName: result.customerName,
        message: successTitle,
        title: successTitle,
      },
      balanceDebited: debitAmount,
      faceAmount,
      panelDiscountPct: useReseller ? PANEL_ELECTRICITY_DISCOUNT_PCT : 0,
      panelDiscountNgn,
      walletMode: useReseller ? 'reseller_wallet' : 'retail',
      panel: panel ? { id: panel.id, name: panel.name } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ClubKonnect electricity failed';
    if (debited) {
      if (useReseller) {
        await creditResellerWallet(userId, debitAmount, `refund-${debitRef}`);
      } else {
        await creditRetailWallet(userId, debitAmount, `refund-${debitRef}`, `Refund — ${debitDesc}`);
      }
    }
    return NextResponse.json(
      {
        ok: false,
        error: message.replace(/^(clubkonnect):\s*/i, '').trim() || 'Electricity payment failed',
        refunded: debited,
      },
      { status: 503 },
    );
  }
}
