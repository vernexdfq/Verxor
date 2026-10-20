/**
 * ClubKonnect (Nellobyte Systems) — airtime primary provider.
 * Auth: UserID + APIKey query params
 * Base: CLUBKONNECT_BASE_URL (default https://www.nellobytesystems.com)
 *
 * Env:
 *   CLUBKONNECT_USER_ID
 *   CLUBKONNECT_API_KEY
 *   CLUBKONNECT_BASE_URL (optional)
 */

export type CkNetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** ClubKonnect MobileNetwork codes from APIAirtimeDiscountV1 */
export const CK_NETWORK_ID: Record<CkNetworkSlug, string> = {
  mtn: '01',
  glo: '02',
  '9mobile': '03',
  airtel: '04',
};

function baseUrl(): string {
  return (process.env.CLUBKONNECT_BASE_URL || 'https://www.nellobytesystems.com').replace(
    /\/$/,
    '',
  );
}

function userId(): string {
  const id = process.env.CLUBKONNECT_USER_ID;
  if (!id) throw new Error('CLUBKONNECT_USER_ID is not configured');
  return id;
}

function apiKey(): string {
  const key = process.env.CLUBKONNECT_API_KEY;
  if (!key) throw new Error('CLUBKONNECT_API_KEY is not configured');
  return key;
}

export function isClubKonnectConfigured(): boolean {
  return Boolean(process.env.CLUBKONNECT_USER_ID && process.env.CLUBKONNECT_API_KEY);
}

function makeRef(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${t}${r}`.slice(0, 32);
}

function normalizeNgPhone(raw: string): string {
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('234') && clean.length >= 13) {
    clean = '0' + clean.slice(3);
  }
  if (!/^0[7-9]\d{9}$/.test(clean)) {
    throw new Error('Enter a valid 11-digit Nigerian number');
  }
  return clean;
}

async function ckGet(
  endpoint: string,
  params: Record<string, string | number> = {},
): Promise<{ ok: boolean; status: number; data: any }> {
  const qs = new URLSearchParams();
  qs.set('UserID', userId());
  qs.set('APIKey', apiKey());
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v));
  }
  const url = `${baseUrl()}/${endpoint.replace(/^\//, '')}?${qs.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  let data: any = null;
  const text = await res.text().catch(() => '');
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ClubKonnect sometimes returns querystring-style bodies
    data = { raw: text.slice(0, 500), status: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function isSuccessStatus(status: unknown): boolean {
  const s = String(status ?? '').toUpperCase();
  return (
    s === 'ORDER_RECEIVED' ||
    s === 'ORDER_COMPLETED' ||
    s === 'SUCCESS' ||
    s === 'SUCCESSFUL' ||
    s === 'WALLET_SUCCESS' ||
    s.includes('SUCCESS')
  );
}

function errorFromStatus(status: unknown, fallback: string): string {
  const s = String(status ?? '').toUpperCase();
  const map: Record<string, string> = {
    INSUFFICIENT_BALANCE: 'Provider wallet has insufficient balance',
    INVALID_CREDENTIALS: 'ClubKonnect credentials are invalid',
    INVALID_APIKEY: 'ClubKonnect API key is invalid',
    INVALID_USERID: 'ClubKonnect User ID is invalid',
    INVALID_AMOUNT: 'Invalid airtime amount',
    INVALID_MOBILE_NUMBER: 'Invalid phone number',
    INVALID_MOBILE_NETWORK: 'Invalid network selected',
    NETWORK_NOT_SUPPORTED: 'Network not supported by provider',
    DUPLICATE_ORDER: 'Duplicate request — try again with a new reference',
    ORDER_CANCELLED: 'Order was cancelled by provider',
    ORDER_FAILED: 'Provider reported order failed',
    PAYMENT_SAVE_NOT_CONFIRMED_RETRY_SAME_REQUEST_ID:
      'Provider could not confirm payment — check wallet balance and retry',
  };
  if (map[s]) return map[s];
  if (s && s !== 'UNDEFINED' && s !== 'NULL') {
    return s.replace(/_/g, ' ').toLowerCase();
  }
  return fallback;
}

/** Provider wallet balance (₦). */
export async function getClubKonnectBalance(): Promise<{
  name: string;
  balance: number;
  walletRaw: string;
}> {
  const { data } = await ckGet('APIWallet.asp');
  const status = data?.status ?? data?.Status;
  if (!isSuccessStatus(status) && data?.wallet == null) {
    throw new Error(errorFromStatus(status, 'Failed to read ClubKonnect balance'));
  }
  const raw = String(data.wallet ?? '0').replace(/,/g, '');
  const name = [data.firstname, data.lastname].filter(Boolean).join(' ').trim();
  return {
    name,
    balance: Number(raw) || 0,
    walletRaw: raw,
  };
}

/** Live airtime discounts per network. */
export async function getAirtimeDiscounts(): Promise<
  Array<{
    network: CkNetworkSlug;
    id: string;
    discountPercent: number;
    youPayPer100: number;
    minAmount: number;
    maxAmount: number;
  }>
> {
  const { data } = await ckGet('APIAirtimeDiscountV1.asp');
  const nets = data?.MOBILE_NETWORK;
  if (!nets || typeof nets !== 'object') {
    throw new Error('Failed to load ClubKonnect airtime discounts');
  }

  const out: Array<{
    network: CkNetworkSlug;
    id: string;
    discountPercent: number;
    youPayPer100: number;
    minAmount: number;
    maxAmount: number;
  }> = [];

  const mapKey = (key: string): CkNetworkSlug | null => {
    const k = key.toLowerCase();
    if (k === 'mtn') return 'mtn';
    if (k === 'glo') return 'glo';
    if (k === 'airtel') return 'airtel';
    if (k.includes('9mobile') || k === 'm_9mobile') return '9mobile';
    return null;
  };

  for (const [key, rows] of Object.entries(nets)) {
    const slug = mapKey(key);
    if (!slug || !Array.isArray(rows) || !rows[0]) continue;
    const row = rows[0] as any;
    const discountStr = String(row.PRODUCT_DISCOUNT || '0').replace('%', '');
    const discountPercent = Number(discountStr) || 0;
    const youPay = Number(row.PRODUCT_DISCOUNT_AMOUNT);
    out.push({
      network: slug,
      id: String(row.ID || CK_NETWORK_ID[slug]),
      discountPercent,
      youPayPer100: Number.isFinite(youPay) ? youPay * 100 : 100 - discountPercent,
      minAmount: Number(row.MINAMOUNT) || 50,
      maxAmount: Number(row.MAXAMOUNT) || 200000,
    });
  }
  return out;
}

export async function purchaseAirtime(opts: {
  network: CkNetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
}) {
  const mobileNetwork = CK_NETWORK_ID[opts.network];
  if (!mobileNetwork) throw new Error('Invalid network');

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }
  if (amount > 200000) throw new Error('Maximum airtime is ₦200,000');

  const phone = normalizeNgPhone(opts.phone);
  const requestId = opts.ref || makeRef('AT');

  const { data } = await ckGet('APIAirTimeV1.asp', {
    MobileNetwork: mobileNetwork,
    Amount: amount,
    MobileNumber: phone,
    RequestID: requestId,
  });

  const status = data?.status ?? data?.Status ?? data?.raw;
  if (!isSuccessStatus(status)) {
    throw new Error(errorFromStatus(status, 'Airtime purchase failed'));
  }

  return {
    ref: String(data?.requestid || data?.RequestID || requestId),
    status: 'successful' as const,
    phone,
    amount,
    network: opts.network,
    message: String(data?.remark || data?.message || 'Airtime purchase successful'),
    provider: 'clubkonnect' as const,
    raw: data,
  };
}
