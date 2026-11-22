import { NextRequest, NextResponse } from 'next/server';
import { sbInsert, sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MIN_AMOUNT_NGN = 1;

/** XixaPay bank codes (docs) */
const XIXA_BANKS: Record<string, { code: string; name: string }> = {
  opay: { code: '100004', name: 'OPay' },
  palmpay: { code: '20867', name: 'PalmPay' },
  safehaven: { code: '29007', name: 'Safe Haven MFB' },
  kolomoni: { code: '20987', name: 'Kolomoni MFB' },
};

/** PayVessel 9PSB */
const PAYVESSEL_9PSB = { code: '120001', name: '9Payment Service Bank' };
const PAYVESSEL_STATIC_FEE_NGN = 50;

function xixapayBase() {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
}

function payvesselBase() {
  return (process.env.PAYVESSEL_BASE_URL || 'https://api.payvessel.com').replace(/\/$/, '');
}

function xixapayFeePercent(): number {
  const n = Number(process.env.XIXAPAY_FEE_PERCENT);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

function amountToSendFromWallet(walletAmount: number, feePercent: number): {
  amountToSend: number;
  feeNgn: number;
} {
  const feeNgn = Math.max(0, Math.ceil((walletAmount * feePercent) / 100));
  return { amountToSend: walletAmount + feeNgn, feeNgn };
}

function toNgPhone(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '08000000000';
  if (d.startsWith('0') && d.length >= 11) return d.slice(0, 11);
  if (d.startsWith('234') && d.length >= 13) return `0${d.slice(3, 13)}`;
  const last10 = d.slice(-10);
  if (last10.length === 10) return `0${last10}`;
  return d.padStart(11, '0').slice(0, 11);
}

function phoneCandidates(raw: string): string[] {
  const d = raw.replace(/\D/g, '');
  const out = new Set<string>();
  if (!d) return [];
  out.add(d);
  out.add(`+${d}`);
  if (d.startsWith('234') && d.length >= 13) {
    out.add(`0${d.slice(3)}`);
    out.add(d.slice(3));
  }
  if (d.startsWith('0') && d.length >= 11) {
    out.add(`+234${d.slice(1)}`);
    out.add(`234${d.slice(1)}`);
  }
  const last10 = d.slice(-10);
  if (last10.length === 10) {
    out.add(`+234${last10}`);
    out.add(`234${last10}`);
    out.add(`0${last10}`);
  }
  return [...out];
}

async function tryResolveUserId(
  req: NextRequest,
  body: { userId?: string; email?: string; phone?: string; contact?: string },
): Promise<string | null> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey) return null;

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  let userId = (body.userId || '').trim();

  if (token && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) userId = u.id;
      }
    } catch {
      /* ignore */
    }
  }

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  async function fetchId(query: string): Promise<string | null> {
    const res = await fetch(`${base}/rest/v1/profiles?${query}&select=id&limit=1`, {
      headers: hdr,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ id?: string }>;
    return rows[0]?.id || null;
  }

  if (userId) {
    const id = await fetchId(`id=eq.${userId}`);
    if (id) return id;
  }

  const emailIn = (body.email || '').trim().toLowerCase();
  if (emailIn) {
    const id = await fetchId(`email=eq.${encodeURIComponent(emailIn)}`);
    if (id) return id;
  }

  const phoneRaw = body.phone || body.contact || '';
  for (const p of phoneCandidates(phoneRaw)) {
    const id = await fetchId(`phone=eq.${encodeURIComponent(p)}`);
    if (id) return id;
  }
  const last10 = phoneRaw.replace(/\D/g, '').slice(-10);
  if (last10.length >= 9) {
    const id = await fetchId(`phone=like.*${last10}`);
    if (id) return id;
  }

  return userId || null;
}

function pickXixaAccount(raw: Record<string, unknown>) {
  const data = (raw?.data as Record<string, unknown>) || raw;
  const bankAccounts = (data.bankAccounts || data.accounts || raw.bankAccounts || []) as Array<
    Record<string, unknown>
  >;
  const first = bankAccounts[0] || {};
  const customer = (data.customer || raw.customer || {}) as Record<string, unknown>;

  const accountNumber = String(
    first.accountNumber ||
      first.account_number ||
      data.accountNumber ||
      data.account_number ||
      data.virtualAccountNumber ||
      (data.account as Record<string, unknown> | undefined)?.number ||
      '',
  ).replace(/\D/g, '');

  const accountName = String(
    first.accountName ||
      first.account_name ||
      data.accountName ||
      data.account_name ||
      (data.account as Record<string, unknown> | undefined)?.name ||
      '',
  );
  const bankName = String(
    first.bankName || first.bank_name || data.bankName || data.bank_name || data.bank || '',
  );
  const providerCustomerId = String(
    customer.customer_id || customer.id || data.customer_id || data.customerId || '',
  );
  const expireAt = first.expire_at || first.expireAt || data.expire_at || data.expireAt || null;

  const feeFromProvider = Number(
    first.fee ?? first.charge ?? data.fee ?? data.charge ?? data.serviceFee ?? NaN,
  );

  return {
    accountNumber,
    accountName,
    bankName,
    providerCustomerId,
    expireAt,
    feeFromProvider: Number.isFinite(feeFromProvider) ? feeFromProvider : null,
  };
}

function pickPayvesselAccount(raw: Record<string, unknown>) {
  const data = (raw?.data as Record<string, unknown>) || raw;
  const banksRaw = data.banks ?? data.accounts ?? data.bankAccounts ?? raw.banks;
  let first: Record<string, unknown> = {};
  if (Array.isArray(banksRaw)) first = (banksRaw[0] as Record<string, unknown>) || {};
  else if (banksRaw && typeof banksRaw === 'object') first = banksRaw as Record<string, unknown>;
  else first = data;

  const accountNumber = String(
    first.accountNumber || first.account_number || data.accountNumber || data.account_number || '',
  ).replace(/\D/g, '');
  const accountName = String(
    first.accountName || first.account_name || data.accountName || data.account_name || '',
  );
  const bankName = String(
    first.bankName || first.bank_name || data.bankName || data.bank_name || PAYVESSEL_9PSB.name,
  );
  const trackingReference = String(
    first.trackingReference || first.tracking_reference || data.trackingReference || '',
  );
  return { accountNumber, accountName, bankName, trackingReference };
}

async function findExistingStatic9psb(userId: string) {
  if (!supabaseConfigured()) return null;
  try {
    const rows = await sbSelect(
      'virtual_accounts',
      `user_id=eq.${userId}&provider=eq.payvessel&account_type=eq.static&bank_code=eq.${PAYVESSEL_9PSB.code}&order=created_at.desc&limit=1`,
    );
    if (!Array.isArray(rows) || !rows[0]?.account_number) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      bankName: String(row.bank_name || PAYVESSEL_9PSB.name),
      accountNumber: String(row.account_number),
      accountName: String(row.account_name || 'Verxor User'),
      amountNgn: null as number | null,
      amountToSend: null as number | null,
      feeNgn: PAYVESSEL_STATIC_FEE_NGN,
      feeNote: `₦${PAYVESSEL_STATIC_FEE_NGN} flat fee per deposit`,
      bankCode: PAYVESSEL_9PSB.code,
      providerId: '9psb',
      accountType: 'static' as const,
      externalRef: String(row.external_ref || ''),
      expireAt: null as string | null,
      reused: true,
    };
  } catch (e) {
    console.error('[funding/generate] lookup static 9psb', e);
    return null;
  }
}

async function createXixaDynamic(
  providerId: 'opay' | 'palmpay' | 'safehaven' | 'kolomoni',
  opts: {
    email: string;
    name: string;
    phone: string;
    walletAmount: number;
    userId: string;
  },
) {
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secret = process.env.XIXAPAY_SECRET_KEY;
  const businessId = process.env.XIXAPAY_BUSINESS_ID;
  if (!apiKey || !secret || !businessId) {
    return {
      error: NextResponse.json(
        { ok: false, message: 'XixaPay is not configured. Check XIXAPAY_* env vars.' },
        { status: 503 },
      ),
    };
  }

  const bank = XIXA_BANKS[providerId];
  const feePercent = xixapayFeePercent();
  const { amountToSend, feeNgn } = amountToSendFromWallet(opts.walletAmount, feePercent);

  const externalRef = `vx-${providerId}-${opts.userId.slice(0, 8)}-${Date.now()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://verxor.com').replace(/\/$/, '');
  const callbackUrl =
    process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
    `${appUrl}/api/webhooks/xixapay/virtual-account`;

  const payload: Record<string, unknown> = {
    email: opts.email,
    name: opts.name.slice(0, 80),
    phoneNumber: opts.phone,
    bankCode: [bank.code],
    businessId,
    accountType: 'dynamic',
    amount: amountToSend,
    externalReference: externalRef,
    callbackUrl,
  };

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
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    console.error('[funding/generate] xixapay network', e);
    return {
      error: NextResponse.json(
        { ok: false, message: 'Could not reach payment provider. Try again.' },
        { status: 503 },
      ),
    };
  }

  const rawText = await xixapayRes.text().catch(() => '');
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    raw = { raw: rawText.slice(0, 200) };
  }

  if (
    !xixapayRes.ok ||
    raw.status === 'fail' ||
    String(raw.message || '').includes('API Key is not active')
  ) {
    console.error('[funding/generate] xixapay error', xixapayRes.status, rawText.slice(0, 500));
    const msg =
      (typeof raw.message === 'string' && raw.message) ||
      (typeof raw.error === 'string' && raw.error) ||
      `Provider error (${xixapayRes.status})`;
    return { error: NextResponse.json({ ok: false, message: String(msg) }, { status: 503 }) };
  }

  const picked = pickXixaAccount(raw);
  if (!picked.accountNumber) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          message:
            'Provider returned no account number. Confirm XixaPay credentials and dynamic accounts.',
        },
        { status: 503 },
      ),
    };
  }

  const feeFinal =
    picked.feeFromProvider != null && picked.feeFromProvider >= 0
      ? Math.round(picked.feeFromProvider)
      : feeNgn;
  const amountToSendFinal =
    picked.feeFromProvider != null ? opts.walletAmount + feeFinal : amountToSend;

  if (supabaseConfigured()) {
    try {
      await sbInsert('virtual_accounts', {
        user_id: opts.userId,
        provider: 'xixapay',
        bank_code: bank.code,
        bank_name: picked.bankName || bank.name,
        account_number: String(picked.accountNumber),
        account_name: String(picked.accountName || opts.name),
        account_type: 'dynamic',
        amount_ngn: opts.walletAmount,
        external_ref: externalRef,
        provider_customer_id: picked.providerCustomerId || null,
        raw: {
          ...raw,
          expire_at: picked.expireAt,
          amount_to_send: amountToSendFinal,
          fee_ngn: feeFinal,
          fee_percent: feePercent,
        },
      });
    } catch (e) {
      console.error('[funding/generate] save VA', e);
    }
  }

  return {
    ok: true as const,
    account: {
      bankName: picked.bankName || bank.name,
      accountNumber: String(picked.accountNumber),
      accountName: String(picked.accountName || opts.name),
      amountNgn: opts.walletAmount,
      amountToSend: amountToSendFinal,
      feeNgn: feeFinal,
      feeNote: 'Includes bank processing fee',
      bankCode: bank.code,
      providerId,
      accountType: 'dynamic' as const,
      externalRef,
      expireAt: picked.expireAt ? String(picked.expireAt) : null,
    },
  };
}

async function createPayvesselStatic9psb(opts: {
  email: string;
  name: string;
  phone: string;
  userId: string;
}) {
  const existing = await findExistingStatic9psb(opts.userId);
  if (existing) {
    return { ok: true as const, account: existing };
  }

  const apiKey = process.env.PAYVESSEL_API_KEY;
  const secret = process.env.PAYVESSEL_SECRET_KEY;
  const businessId = process.env.PAYVESSEL_BUSINESS_ID;
  if (!apiKey || !secret || !businessId) {
    return {
      error: NextResponse.json(
        { ok: false, message: 'PayVessel is not configured. Check PAYVESSEL_* env vars.' },
        { status: 503 },
      ),
    };
  }

  const payload = {
    email: opts.email,
    name: opts.name.slice(0, 80),
    phoneNumber: opts.phone,
    bankcode: [PAYVESSEL_9PSB.code],
    account_type: 'STATIC',
    businessid: businessId,
  };

  let res: Response;
  try {
    res = await fetch(`${payvesselBase()}/pms/api/external/request/customerReservedAccount/`, {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'api-secret': secret.replace(/^Bearer\s+/i, '').trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    console.error('[funding/generate] payvessel network', e);
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return {
      error: NextResponse.json(
        {
          ok: false,
          message: timedOut
            ? 'PayVessel took too long to respond. Try again in a moment.'
            : 'Could not reach PayVessel. Try again.',
        },
        { status: 503 },
      ),
    };
  }

  const rawText = await res.text().catch(() => '');
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    raw = { raw: rawText.slice(0, 200) };
  }

  if (!res.ok || raw.status === false) {
    console.error('[funding/generate] payvessel error', res.status, rawText.slice(0, 500));
    const msg =
      (typeof raw.message === 'string' && raw.message) ||
      (typeof raw.error === 'string' && raw.error) ||
      (rawText ? `PayVessel error (${res.status}): ${rawText.slice(0, 140)}` : `PayVessel error (${res.status})`);
    return { error: NextResponse.json({ ok: false, message: String(msg) }, { status: 503 }) };
  }

  const picked = pickPayvesselAccount(raw);
  if (!picked.accountNumber) {
    return {
      error: NextResponse.json(
        { ok: false, message: 'PayVessel returned no account number.' },
        { status: 503 },
      ),
    };
  }

  const externalRef = `pv-9psb-${opts.userId.slice(0, 8)}`;

  if (supabaseConfigured()) {
    try {
      await sbInsert('virtual_accounts', {
        user_id: opts.userId,
        provider: 'payvessel',
        bank_code: PAYVESSEL_9PSB.code,
        bank_name: picked.bankName || PAYVESSEL_9PSB.name,
        account_number: String(picked.accountNumber),
        account_name: String(picked.accountName || opts.name),
        account_type: 'static',
        amount_ngn: null,
        external_ref: externalRef,
        provider_customer_id: picked.trackingReference || null,
        raw: { ...raw, fee_ngn: PAYVESSEL_STATIC_FEE_NGN },
      });
    } catch (e) {
      console.error('[funding/generate] save payvessel VA', e);
    }
  }

  return {
    ok: true as const,
    account: {
      bankName: picked.bankName || PAYVESSEL_9PSB.name,
      accountNumber: String(picked.accountNumber),
      accountName: String(picked.accountName || opts.name),
      amountNgn: null as number | null,
      amountToSend: null as number | null,
      feeNgn: PAYVESSEL_STATIC_FEE_NGN,
      feeNote: `₦${PAYVESSEL_STATIC_FEE_NGN} flat fee per deposit`,
      bankCode: PAYVESSEL_9PSB.code,
      providerId: '9psb',
      accountType: 'static' as const,
      externalRef,
      expireAt: null as string | null,
      reused: false,
    },
  };
}

export async function POST(req: NextRequest) {
  let body: {
    providerId?: string;
    bankCode?: string;
    amount?: number;
    amountNgn?: number;
    userId?: string;
    email?: string;
    phone?: string;
    contact?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const providerId = String(body.providerId || 'opay').toLowerCase();

  const email = (body.email || '').trim().toLowerCase();
  const phoneRaw = body.phone || body.contact || '';
  const name = (body.name || 'Verxor User').trim() || 'Verxor User';
  const phone = toNgPhone(phoneRaw);

  if (!email && !phoneRaw) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Missing account details. Log out, sign in again with PIN, then try Generate Account.',
      },
      { status: 401 },
    );
  }

  const customerEmail =
    email ||
    (phoneRaw ? `user${phone.replace(/\D/g, '').slice(-10)}@verxor.local` : `guest@verxor.local`);

  const userId = await tryResolveUserId(req, body);
  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Please log in again so we can link the account to your wallet.',
      },
      { status: 401 },
    );
  }

  if (providerId === '9psb' || providerId === 'payvessel') {
    const result = await createPayvesselStatic9psb({
      email: customerEmail,
      name,
      phone,
      userId,
    });
    if ('error' in result && result.error) return result.error;
    return NextResponse.json({ ok: true, account: result.account });
  }

  if (
    providerId === 'opay' ||
    providerId === 'palmpay' ||
    providerId === 'safehaven' ||
    providerId === 'kolomoni'
  ) {
    const amount = Math.round(Number(body.amountNgn ?? body.amount));
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT_NGN) {
      return NextResponse.json(
        { ok: false, message: 'Enter the amount you want to fund.' },
        { status: 400 },
      );
    }

    // Bank-facing name is always ours, never the provider's
    const firstName = (name.split(/\s+/)[0] || 'User').replace(/[^\w\- ]/g, '') || 'User';
    const displayName = `Verxor - ${firstName}`;

    const dynamicOpts = {
      email: customerEmail,
      name: displayName,
      phone,
      walletAmount: amount,
      userId,
    };

    const result = await createXixaDynamic(providerId, dynamicOpts);

    // If the requested bank will not generate, switch to another XixaPay bank
    // (Safe Haven first, then Kolomoni). We never silently fall back to OPay.
    if ('error' in result && result.error) {
      for (const fb of ['safehaven', 'kolomoni'] as const) {
        const alt = await createXixaDynamic(fb, dynamicOpts);
        if (!('error' in alt)) {
          return NextResponse.json({
            ok: true,
            account: alt.account,
            fallbackFrom: providerId,
          });
        }
      }
    }

    if ('error' in result && result.error) return result.error;
    return NextResponse.json({ ok: true, account: result.account });
  }

  return NextResponse.json(
    { ok: false, message: 'Unknown funding provider. Use opay, palmpay, 9psb, safehaven, or kolomoni.' },
    { status: 400 },
  );
}
