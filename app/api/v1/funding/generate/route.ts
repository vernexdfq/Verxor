import { NextRequest, NextResponse } from 'next/server';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BANK_MAP: Record<string, { code: string; name: string }> = {
  opay: { code: '100004', name: 'OPay' },
  palmpay: { code: '20867', name: 'PalmPay' },
  '100004': { code: '100004', name: 'OPay' },
  '20867': { code: '20867', name: 'PalmPay' },
};

function xixapayBase() {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
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

function pickAccount(raw: Record<string, unknown>) {
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
  );
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
  const expireAt = first.expire_at || first.expireAt || data.expire_at || null;

  return { accountNumber, accountName, bankName, providerCustomerId, expireAt };
}

async function createVa(opts: {
  apiKey: string;
  secret: string;
  businessId: string;
  bank: { code: string; name: string };
  amount: number;
  name: string;
  email: string;
  phone: string;
  externalRef: string;
  callbackUrl: string;
}): Promise<
  | { ok: true; raw: Record<string, unknown>; accountNumber: string; accountName: string; bankName: string; expireAt: string | null; providerCustomerId: string }
  | { ok: false; message: string; status: number }
> {
  const payload: Record<string, unknown> = {
    email: opts.email,
    name: opts.name.slice(0, 80),
    phoneNumber: opts.phone,
    bankCode: [opts.bank.code],
    businessId: opts.businessId,
    accountType: 'dynamic',
    amount: opts.amount,
    externalReference: opts.externalRef,
    callbackUrl: opts.callbackUrl,
  };

  let xixapayRes: Response;
  try {
    xixapayRes = await fetch(`${xixapayBase()}/api/v1/createVirtualAccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.secret}`,
        'api-key': opts.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[funding/generate] xixapay network', e);
    return { ok: false, message: 'Could not reach payment provider. Try again.', status: 502 };
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
      (xixapayRes.status >= 500
        ? `${opts.bank.name} is temporarily unavailable. Try OPay.`
        : `Provider error (${xixapayRes.status})`);
    return { ok: false, message: String(msg), status: 502 };
  }

  const picked = pickAccount(raw);
  if (!picked.accountNumber) {
    return {
      ok: false,
      message: `${opts.bank.name} returned no account number. Try OPay.`,
      status: 502,
    };
  }

  return {
    ok: true,
    raw,
    accountNumber: picked.accountNumber,
    accountName: picked.accountName || opts.name,
    bankName: picked.bankName || opts.bank.name,
    expireAt: picked.expireAt ? String(picked.expireAt) : null,
    providerCustomerId: picked.providerCustomerId,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.XIXAPAY_API_KEY;
  const secret = process.env.XIXAPAY_SECRET_KEY;
  const businessId = process.env.XIXAPAY_BUSINESS_ID;

  if (!apiKey || !secret || !businessId) {
    return NextResponse.json(
      { ok: false, message: 'XixaPay is not configured. Check XIXAPAY_* env vars on the server.' },
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
    contact?: string;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  let providerKey = String(body.providerId || body.bankCode || 'opay').toLowerCase();
  let bank = BANK_MAP[providerKey];
  if (!bank) {
    return NextResponse.json(
      { ok: false, message: 'Choose PalmPay or OPay only.' },
      { status: 400 },
    );
  }

  const amount = Math.round(Number(body.amountNgn ?? body.amount));
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json(
      { ok: false, message: 'Enter an amount of at least ₦100 to generate a one-time account' },
      { status: 400 },
    );
  }

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
  const externalRef = `vx-${(userId || 'anon').toString().slice(0, 8)}-${Date.now()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.verxor.com').replace(/\/$/, '');
  const callbackUrl =
    process.env.XIXAPAY_VIRTUAL_ACCOUNT_WEBHOOK_URL ||
    `${appUrl}/api/webhooks/xixapay/virtual-account`;

  const common = {
    apiKey,
    secret,
    businessId,
    amount,
    name,
    email: customerEmail,
    phone,
    externalRef,
    callbackUrl,
  };

  let result = await createVa({ ...common, bank });

  // PalmPay often 502/timeouts on XixaPay — auto-fallback to OPay
  if (!result.ok && providerKey === 'palmpay') {
    console.warn('[funding/generate] PalmPay failed, falling back to OPay');
    providerKey = 'opay';
    bank = BANK_MAP.opay;
    result = await createVa({
      ...common,
      bank,
      externalRef: `${externalRef}-opay`,
    });
  }

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  if (supabaseConfigured()) {
    try {
      await sbInsert('virtual_accounts', {
        user_id: userId || null,
        provider: 'xixapay',
        bank_code: bank.code,
        bank_name: result.bankName,
        account_number: String(result.accountNumber),
        account_name: String(result.accountName),
        account_type: 'dynamic',
        amount_ngn: amount,
        external_ref: externalRef,
        provider_customer_id: result.providerCustomerId || null,
        raw: result.raw,
      });
    } catch (e) {
      console.error('[funding/generate] save VA', e);
    }
  }

  return NextResponse.json({
    ok: true,
    account: {
      bankName: result.bankName,
      accountNumber: String(result.accountNumber),
      accountName: String(result.accountName),
      amountNgn: amount,
      bankCode: bank.code,
      providerId: providerKey,
      externalRef,
      expireAt: result.expireAt,
    },
  });
}
