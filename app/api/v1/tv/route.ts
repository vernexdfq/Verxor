import { NextRequest, NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  verifyCableSmartcard,
  purchaseCable,
  getClubKonnectBalance,
  type CkCableProvider,
  CK_CABLE_LABEL,
} from '@/lib/providers/clubkonnect';
import { CABLE_PACKAGES, CABLE_PROVIDERS, findCablePackage } from '@/lib/cable-catalog';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { sendPanelAdminOrderAlert } from '@/lib/email/receipts';
import {
  resolvePanelClient,
  getPanelAdminEmails,
  panelAllowsTv,
  panelTvDebitAmount,
  PANEL_TV_DISCOUNT_PCT,
  CK_TV_DISCOUNT_PCT,
} from '@/lib/panel-auth';

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
        meta: { type: 'cable_tv', product: 'tv', wallet: 'reseller', panelDiscountPct: PANEL_TV_DISCOUNT_PCT },
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
}

/** GET /api/v1/tv — packages + health */
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
    cableProviders: CABLE_PROVIDERS,
    packages: CABLE_PACKAGES,
    pricing: {
      clubkonnectDiscountPct: CK_TV_DISCOUNT_PCT,
      panelDiscountPct: PANEL_TV_DISCOUNT_PCT,
      verxorMarginPct: Math.round((CK_TV_DISCOUNT_PCT - PANEL_TV_DISCOUNT_PCT) * 100) / 100,
    },
  });
}

/**
 * POST /api/v1/tv
 * action: verify | pay
 *
 * Retail: full face amount debited.
 * Child panel (vx_panel_*): 0.5% discount (ClubKonnect gives ~1%, Verxor keeps ~0.5%).
 */
export async function POST(req: NextRequest) {
  if (!isClubKonnectConfigured()) {
    return NextResponse.json({ ok: false, error: 'TV provider not configured' }, { status: 503 });
  }

  let body: {
    action?: string;
    provider?: string;
    packageId?: string;
    packageCode?: string;
    smartCardNo?: string;
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
  const provider = String(body.provider || '').toLowerCase() as CkCableProvider;
  if (!['dstv', 'gotv', 'startimes'].includes(provider)) {
    return NextResponse.json({ ok: false, error: 'Invalid TV provider' }, { status: 400 });
  }

  const smartCardNo = String(body.smartCardNo || '').replace(/\D/g, '');

  if (action === 'verify') {
    const result = await verifyCableSmartcard({ provider, smartCardNo });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      customerName: result.customerName,
      provider,
      smartCardNo,
    });
  }

  const packageId = String(body.packageId || body.packageCode || '').trim();
  const pkg = findCablePackage(provider, packageId);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: 'Invalid or unknown package' }, { status: 400 });
  }

  const phone = String(body.phone || '');
  if (!phone) {
    return NextResponse.json({ ok: false, error: 'Phone number is required' }, { status: 400 });
  }

  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsTv(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to purchase cable TV.' },
      { status: 403 },
    );
  }

  let userId = await resolveUserId(req, body.userId);
  if (panel) userId = panel.walletUserId || userId;
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: panel ? 'Panel wallet user is not linked.' : 'Unauthorized. Sign in to pay TV subscription.',
      },
      { status: 401 },
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Wallet backend not configured' }, { status: 503 });
  }

  const useReseller = Boolean(panel);
  const faceAmount = pkg.price;
  const debitAmount = useReseller ? panelTvDebitAmount(faceAmount) : faceAmount;
  const panelDiscountNgn = useReseller
    ? Math.round((faceAmount - debitAmount) * 100) / 100
    : 0;

  const label = CK_CABLE_LABEL[provider];
  const debitDesc = `${label} ${pkg.name} · ${smartCardNo} · ₦${faceAmount.toLocaleString('en-NG')}`;
  const debitRef = body.ref || `tv-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
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
    const result = await purchaseCable({
      provider,
      packageCode: pkg.ckPackageId,
      smartCardNo,
      phone,
      amount: faceAmount,
      ref: debitRef,
    });

    const successTitle = `${label} ${pkg.name} activated · ₦${faceAmount.toLocaleString('en-NG')}`;

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
          service: `Cable TV (${label} · ${pkg.name})`,
          orderId: result.ref || result.orderId || debitRef,
          wholesaleAmountNgn: debitAmount,
          customerPaidNgn: retailNgn > debitAmount ? retailNgn : undefined,
          details: [
            { label: 'Customer', value: customerLabel },
            { label: 'Provider', value: label },
            { label: 'Package', value: pkg.name },
            { label: 'Smartcard / IUC', value: smartCardNo },
            { label: 'Face amount', value: `₦${faceAmount.toLocaleString('en-NG')}` },
            { label: 'Wholesale discount', value: `${PANEL_TV_DISCOUNT_PCT}% (Saved ₦${panelDiscountNgn.toLocaleString('en-NG')})` },
          ],
          date: new Date(),
        }).then((mail) => {
          if (!mail.ok) console.warn('[email] TV panel admin alert not sent:', mail.error);
        });
      } catch (err) {
        console.warn('[email] TV panel admin alert dispatch failed:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        ref: result.ref,
        orderId: result.orderId,
        status: result.status,
        smartCardNo: result.smartCardNo,
        amount: faceAmount,
        provider: result.provider,
        packageId: pkg.id,
        packageName: pkg.name,
        customerName: result.customerName,
        message: successTitle,
        title: successTitle,
      },
      balanceDebited: debitAmount,
      faceAmount,
      panelDiscountPct: useReseller ? PANEL_TV_DISCOUNT_PCT : 0,
      panelDiscountNgn,
      walletMode: useReseller ? 'reseller_wallet' : 'retail',
      panel: panel ? { id: panel.id, name: panel.name } : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ClubKonnect cable failed';
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
        error: message.replace(/^(clubkonnect):\s*/i, '').trim() || 'Cable subscription failed',
        refunded: debited,
      },
      { status: 503 },
    );
  }
}
