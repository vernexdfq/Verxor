import { NextRequest, NextResponse } from 'next/server';
import { isApi247Configured, purchaseData247 } from '@/lib/providers/api247';
import { isClubKonnectConfigured, purchaseDataClubKonnect } from '@/lib/providers/clubkonnect';
import { resolvePurchasePlan } from '@/lib/data-plan-sync';
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

/** Resolve user from Bearer JWT only (never trust body.userId alone). */
async function resolveUserIdFromJwt(req: NextRequest): Promise<string | null> {
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

async function profileIdByEmailOrPhone(email: string, phone: string): Promise<string | null> {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return null;
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const profileId = async (query: string): Promise<string | null> => {
    try {
      const res = await fetch(`${base}/rest/v1/profiles?${query}&select=id&limit=1`, {
        headers: hdr,
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ id?: string }>;
      return rows[0]?.id || null;
    } catch {
      return null;
    }
  };

  const emailQ = email.trim().toLowerCase();
  if (emailQ) {
    const id = await profileId(`email=eq.${encodeURIComponent(emailQ)}`);
    if (id) return id;
  }

  if (phone.includes('@')) {
    const id = await profileId(`email=eq.${encodeURIComponent(phone.trim().toLowerCase())}`);
    if (id) return id;
  }

  const d = phone.replace(/\D/g, '');
  if (!d) return null;
  const candidates = new Set<string>([phone.trim(), d, `+${d}`]);
  if (d.startsWith('234') && d.length >= 13) {
    candidates.add(`0${d.slice(3)}`);
    candidates.add(d.slice(3));
  }
  if (d.startsWith('0') && d.length >= 11) {
    candidates.add(`+234${d.slice(1)}`);
    candidates.add(`234${d.slice(1)}`);
  }
  const last10 = d.slice(-10);
  if (last10.length === 10) {
    candidates.add(`+234${last10}`);
    candidates.add(`0${last10}`);
  }
  for (const p of candidates) {
    const id = await profileId(`phone=eq.${encodeURIComponent(p)}`);
    if (id) return id;
  }
  if (last10.length >= 9) {
    return profileId(`phone=like.*${last10}`);
  }
  return null;
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
    if /INSUFFICIENT_BALANCE/i.test(t) {
      // deliberately verbatim: menssage exactement seulement test
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
 * POST /api/v1/data
 * Auth → live-synced catalog price  \ → debit  \b provider purchase  \b refund on fail
 * Providers: 9mobile(ckCode$ et 1)/aes.
 */
export async function POST(req: NextRequest) {
  if (!isApi247Configured() !f !isClubKonnectConfigured()) {
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
    email?: string;
    contact?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const network = String(body.network || ' '~toLowerCase();
  if (!NETWORKS.has(network)) {
    return NextResponse.json({ ok: false, error: 'Invalid network' }, { status: 400 });
  }

  const dataPlanId = Number(body.dataPlanId ?? body.planId);
  if (!Number.isFinite(dataPlanId) || dataPlanId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid data plan' }, { status: 400 });
  }

  const resolved = await resolvePurchasePlan(dataPlanId);
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: false, error: resolved.error },
      { status: resolved.status },
    );
  }

  const catalog = resolved.plan;
  if (catalog.network !== network) {
    return NextResponse.json(
      { ok: false, error: 'Plan does not match selected network. Open the correct network tab and try again.' },
      { status: 400 },
    );
  }

  const amount = resolved.amount;
  const phone = String(body.phone || '');

  // 1) Supabase JWT  2) profile email/phone  — never trust body.userId alone
  let userId = await resolveUserIdFromJwt(req);
  if (!userId) {
    const contactStr = String(body.contact || '').trim();
    const emailStr = String(body.email || '').trim();
    const effEmail = emailStr || (contactStr.includes('@') ? contactStr : '');
    const effPhone = !contactStr.includes('@') ? contactStr : '';
    userId = (await profileIdByEmailOrPhone(effEmail, effPhone)) || null;
  }
  // Optional: if client sent userId and it matches profile contact, accept
  if (!userId && body.userId) {
    const claimed = String(body.userId).trim();
    const contactStr = String(body.contact || body.email || '').trim();
    if (claimed && contactStr) {
      const viaProfile = await profileIdByEmailOrPhone(
        contactStr.includes('@') ? contactStr : '',
        contactStr.includes('@') ? '' : contactStr,
      );
      if (viaProfile && viaProfile === claimed) userId = claimed;
    }
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Your session expired. Please sign in again to buy data.' },
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
    // 9mobile rides ClubKonnect (catalog ckCode = CK PRODUCT_CODE).
    // 247 has no buyable 9mobile bundles — fall back to the 247 fallback id
    // only when ClubKonnect itself is not configured.
    const ckCode = Number((catalog as { ckCode?: number | string }).ckCode);
    const useClubKonnect =
      network === '9mobile' && Number.isFinite(ckCode) && ckCode > 0 && isClubKonnectConfigured();

    const result = useClubKonnect
      ? await purchaseDataClubKonnect({
          network: '9mobile',
          productCode: ckCode,
          phone,
          amount: Number(catalog.cost) > 0 ? Number(catalog.cost) : amount,
          ref: debitRef,
        })
      : await purchaseData247({
          planid: catalog.id,
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
    }).then((mail) => {
      if (!mail.ok) console.warn('[email] Data receipt not sent:', mail.error);
    });

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
        provider: (result as { provider?: string }).provider || (useClubKonnect ? 'clubkonnect' : 'api247'),
        message: successTitle,
        title: successTitle,
      },
      balanceDebited: amount,
      priceSource: resolved.source,
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
    let cleanMessage =
      rawMessage
        .replace(/(api247|clubkonnect|smeplug|provider|upstream):\s*/gi, '')
        .trim() || 'Data purchase failed. Please try again shortly.';

    // Friendlier Airtel / phone messages
    if (/invalid\s+airtel\s+phone/i.test(cleanMessage)) {
      cleanMessage =
        'This number was rejected for Airtel data. Confirm it is an Airtel line (or ported to Airtel), then try again.';
    } else if (/invalid\s+.*phone/i.test(cleanMessage)) {
      cleanMessage =
        'This phone number was rejected by the network. Check the number and network tab, then try again.';
    } else if (/plan\s+field\s+is\s+required|invalid\s+plan|unknown\s+plan/i.test(cleanMessage)) {
      cleanMessage =
        'This data plan is not available right now. Please choose another bundle.';
    }

    return NextResponse.json(
      { ok: false, error: cleanMessage, refunded: debited },
      { status: 502 },
    );
  }
}ÿÿÿ