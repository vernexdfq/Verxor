import { NextRequest, NextResponse } from 'next/server';
import { sbInsert, sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const BANK_MAP: Record<string, { code: string; name: string }> = {
  palmpay: { code: '20867', name: 'PalmPay' },
  opay: { code: '100004', name: 'OPay' },
  safehaven: { code: '29007', name: 'Safehaven' },
  kolomoni: { code: '20987', name: 'Kolomoni MFB' },
  '20867': { code: '20867', name: 'PalmPay' },
  '100004': { code: '100004', name: 'OPay' },
  '29007': { code: '29007', name: 'Safehaven' },
  '20987': { code: '20987', name: 'Kolomoni MFB' },
};

function xixapayBase() {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
}

async function resolveUser(
  req: NextRequest,
  body: { userId?: string; email?: string; phone?: string },
): Promise<{ id: string; email: string; phone: string; name: string } | null> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey) return null;

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  let userId = body.userId || '';

  if (token && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string; email?: string };
        if (u.id) userId = u.id;
      }
    } catch {
      /* ignore */
    }
  }

  if (!userId && !body.email && !body.phone) return null;

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  type Profile = {
    id: string;
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
  };

  let profile: Profile | null = null;

  if (userId) {
    const res = await fetch(
      `${base}/rest/v1/profiles?id=eq.${userId}&select=id,email,phone,full_name&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      const rows = (await res.json()) as Profile[];
      profile = rows[0] || null;
    }
  }

  if (!profile && body.email) {
    const res = await fetch(
      `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(body.email.toLowerCase())}&select=id,email,phone,full_name&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      const rows = (await res.json()) as Profile[];
      profile = rows[0] || null;
    }
  }

  if (!profile) return null;

  return {
    id: profile.id,
    email: (profile.email || body.email || `${profile.id}@verxor.local`).toLowerCase(),
    phone: (profile.phone || body.phone || '08000000000').replace(/\D/g, '').slice(-11) || '08000000000',
    name: (profile.full_name || 'Verxor User').trim() || 'Verxor User',
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secret = process.env.XIXAPAY_SECRET_KEY;
  const businessId = process.env.XIXAPAY_BUSINESS_ID;

  if (!apiKey || !secret || !businessId) {
    return NextResponse.json(
      { ok: false, message: 'XixaPay is not configured. Add XIXAPAY_* env vars.' },
      { status: 503 },
    );
  }

  let body: {
    providerId?: string;
    bankCode?: string;
    amount?: number;
    amountNgn?: number;
    userId?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const providerKey = String(body.providerId || body.bankCode || 'palmpay').toLowerCase();
  const bank = BANK_MAP[providerKey];
  if (!bank) {
    return NextResponse.json({ ok: false, message: 'Unknown bank / provider' }, { status: 400 });
  }

  const amount = Number(body.amountNgn ?? body.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { ok: false, message: 'Enter an amount of at least ₦100 to generate a one-time account' },
      { status: 400 },
    );
  }

  const user = await resolveUser(req, body);
  if (!user) {
    return NextResponse.json(
      { ok: false, message: 'Sign in required to generate a virtual account' },
      { status: 401 },
    );
  }

  const externalRef = `vx-${user.id.slice(0, 8)}-${Date.now()}`;
  const callbackUrl =
    process.env.XIXAPAY_CALLBACK_URL ||
    process.env.NEXT_PUBLIC_APP_URL
      ? `${(process.env.XIXAPAY_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/api/webhooks/xixapay`
      : undefined;

  // Dynamic VA — no BVN/NIN required; amount is required by XixaPay
  const payload: Record<string, unknown> = {
    email: user.email,
    name: body.name || user.name,
    phoneNumber: user.phone.startsWith('0') ? user.phone : `0${user.phone.slice(-10)}`,
    bankCode: [bank.code],
    businessId,
    accountType: 'dynamic',
    amount,
    externalReference: externalRef,
  };
  if (callbackUrl) payload.callbackUrl = callbackUrl;

  let xixapayRes: Response;
  try {
    xixapayRes = await fetch(`${xixapayBase()}/api/v1/createVirtualAccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[funding/generate] xixapay network', e);
    return NextResponse.json(
      { ok: false, message: 'Could not reach payment provider. Try again.' },
      { status: 502 },
    );
  }

  const rawText = await xixapayRes.text().catch(() => '');
  let raw: any = {};
  try {
    raw = JSON.parse(rawText);
  } catch {
    raw = { raw: rawText };
  }

  if (!xixapayRes.ok) {
    console.error('[funding/generate] xixapay error', xixapayRes.status, rawText.slice(0, 500));
    const msg =
      raw?.message ||
      raw?.error ||
      raw?.data?.message ||
      `Provider error (${xixapayRes.status})`;
    return NextResponse.json({ ok: false, message: String(msg) }, { status: 502 });
  }

  // Normalize response fields (XixaPay shapes can vary)
  const data = raw?.data || raw;
  const accountNumber =
    data.accountNumber ||
    data.account_number ||
    data.virtualAccountNumber ||
    data.account?.number ||
    data.accounts?.[0]?.accountNumber ||
    data.accounts?.[0]?.account_number ||
    '';
  const accountName =
    data.accountName ||
    data.account_name ||
    data.account?.name ||
    data.accounts?.[0]?.accountName ||
    user.name;
  const bankName =
    data.bankName ||
    data.bank_name ||
    data.bank ||
    data.accounts?.[0]?.bankName ||
    bank.name;
  const providerCustomerId =
    data.customer_id || data.customerId || data.customer?.id || null;

  if (!accountNumber) {
    console.error('[funding/generate] no account number in response', rawText.slice(0, 800));
    return NextResponse.json(
      {
        ok: false,
        message: 'Provider returned no account number. Check XixaPay dashboard / response format.',
        debug: process.env.NODE_ENV === 'development' ? raw : undefined,
      },
      { status: 502 },
    );
  }

  if (supabaseConfigured()) {
    try {
      await sbInsert('virtual_accounts', {
        user_id: user.id,
        provider: 'xixapay',
        bank_code: bank.code,
        bank_name: bankName,
        account_number: String(accountNumber),
        account_name: String(accountName),
        account_type: 'dynamic',
        amount_ngn: amount,
        external_ref: externalRef,
        provider_customer_id: providerCustomerId ? String(providerCustomerId) : null,
        raw,
      });
    } catch (e) {
      console.error('[funding/generate] save VA', e);
      // Still return the account to the user even if DB write fails
    }
  }

  return NextResponse.json({
    ok: true,
    account: {
      bankName,
      accountNumber: String(accountNumber),
      accountName: String(accountName),
      amountNgn: amount,
      bankCode: bank.code,
      providerId: providerKey,
      externalRef,
    },
  });
}
