/**
 * ClubKonnect (Nellobyte Systems) — airtime primary provider.
 * Auth: UserID + APIKey query params
 * Base: CLUBKONNECT_BASE_URL (default https://www.nellobytesystems.com)
 *
 * Env:
 *   CLUBKONNECT_USER_ID
 *   CLUBKONNECT_API_KEY
 *   CLUBKONNECT_BASE_URL (optional)
 *
 * Note: Do NOT send CallBackURL — this account returns CALLBACK NOT SUPPORTED.
 */

export type CkNetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** ClubKonnect MobileNetwork codes from official docs */
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
  return id.trim();
}

function apiKey(): string {
  const key = process.env.CLUBKONNECT_API_KEY;
  if (!key) throw new Error('CLUBKONNECT_API_KEY is not configured');
  return key.trim();
}

export function isClubKonnectConfigured(): boolean {
  return Boolean(process.env.CLUBKONNECT_USER_ID && process.env.CLUBKONNECT_API_KEY);
}

function makeRef(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${t}${r}`.slice(0, 30);
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
    if (v === undefined || v === null || v === '') continue;
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
    data = { raw: text.slice(0, 500), status: text.slice(0, 120) };
  }
  return { ok: res.ok, status: res.status, data };
}

function pickStatus(data: any): string {
  return String(data?.status ?? data?.Status ?? data?.orderstatus ?? data?.raw ?? '').trim();
}

function isSuccessStatus(status: unknown): boolean {
  const s = String(status ?? '').toUpperCase();
  return (
    s === 'ORDER_RECEIVED' ||
    s === 'ORDER_COMPLETED' ||
    s === 'ORDER_ONHOLD' ||
    s === 'SUCCESS' ||
    s === 'SUCCESSFUL' ||
    s === 'WALLET_SUCCESS' ||
    s.includes('SUCCESS')
  );
}

function isPaymentNotConfirmed(status: unknown): boolean {
  const s = String(status ?? '').toUpperCase();
  return s.includes('PAYMENT_SAVE_NOT_CONFIRMED');
}

function errorFromStatus(status: unknown, fallback: string): string {
  const s = String(status ?? '').toUpperCase().trim();
  const map: Record<string, string> = {
    INSUFFICIENT_BALANCE: 'ClubKonnect wallet has insufficient balance — fund the wallet',
    INVALID_CREDENTIALS: 'ClubKonnect UserID / APIKey is invalid — regenerate API key and update Vercel env',
    INVALID_APIKEY: 'ClubKonnect API key is invalid',
    INVALID_USERID: 'ClubKonnect User ID is invalid',
    MISSING_CREDENTIALS: 'ClubKonnect credentials missing in request',
    MISSING_USERID: 'ClubKonnect UserID missing',
    MISSING_APIKEY: 'ClubKonnect APIKey missing',
    INVALID_AMOUNT: 'Invalid airtime amount',
    MINIMUM_50: 'Minimum airtime is ₦50',
    INVALID_RECIPIENT: 'Invalid phone number',
    INVALID_MOBILE_NUMBER: 'Invalid phone number',
    INVALID_MOBILE_NETWORK: 'Invalid network selected',
    NETWORK_NOT_SUPPORTED: 'Network not supported by ClubKonnect',
    DUPLICATE_ORDER: 'Duplicate request — try again with a new reference',
    ORDER_CANCELLED: 'Order was cancelled by provider',
    ORDER_FAILED: 'Provider reported order failed',
    'CALLBACK NOT SUPPORTED': 'ClubKonnect rejected CallBackURL',
    PAYMENT_SAVE_NOT_CONFIRMED_RETRY_SAME_REQUEST_ID:
      'ClubKonnect could not confirm wallet debit. Fund wallet, wait 2–5 mins after funding, then retry',
  };
  if (map[s]) return map[s];
  if (s && s !== 'UNDEFINED' && s !== 'NULL' && s !== '[OBJECT OBJECT]') {
    return `ClubKonnect: ${s.replace(/_/g, ' ')}`;
  }
  return fallback;
}

/** Provider wallet balance (₦). */
export async function getClubKonnectBalance(): Promise<{
  name: string;
  balance: number;
  walletRaw: string;
  status: string;
}> {
  const { data } = await ckGet('APIWallet.asp');
  const status = pickStatus(data);
  if (!isSuccessStatus(status) && data?.wallet == null && data?.Wallet == null) {
    throw new Error(errorFromStatus(status, 'Failed to read ClubKonnect balance'));
  }
  const raw = String(data.wallet ?? data.Wallet ?? '0').replace(/,/g, '');
  const name = [data.firstname, data.lastname, data.FirstName, data.LastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    name,
    balance: Number(raw) || 0,
    walletRaw: raw,
    status,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Buy airtime via ClubKonnect APIAirtimeV1.asp
 * On PAYMENT_SAVE_NOT_CONFIRMED, retry once with the SAME RequestID (per ClubKonnect docs).
 */
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

  // Pre-check wallet so user gets a clear message
  let walletBal: number | null = null;
  try {
    const w = await getClubKonnectBalance();
    walletBal = w.balance;
    // MTN/Airtel ~3% discount → need roughly amount * 0.97; use amount as safe floor
    if (walletBal < amount * 0.9) {
      throw new Error(
        `ClubKonnect wallet too low (₦${walletBal.toFixed(2)}). Need about ₦${amount} for this purchase — fund wallet first`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('wallet too low')) throw e;
    // If balance check fails with invalid credentials, surface it
    if (e instanceof Error && /invalid|credential|apikey|userid/i.test(e.message)) throw e;
    // Otherwise continue — purchase will fail with real status
  }

  const params = {
    MobileNetwork: mobileNetwork,
    Amount: amount,
    MobileNumber: phone,
    RequestID: requestId,
  };

  let data: any = (await ckGet('APIAirtimeV1.asp', params)).data;
  let status = pickStatus(data);
  let statusCode = data?.statuscode ?? data?.statusCode;

  // ClubKonnect docs: on PAYMENT_SAVE_NOT_CONFIRMED retry with SAME RequestID
  if (isPaymentNotConfirmed(status)) {
    await sleep(1500);
    data = (await ckGet('APIAirtimeV1.asp', params)).data;
    status = pickStatus(data);
    statusCode = data?.statuscode ?? data?.statusCode;
  }

  if (isSuccessStatus(status) || String(statusCode) === '100' || String(statusCode) === '200') {
    return {
      ref: String(data?.requestid || data?.RequestID || data?.orderid || data?.orderId || requestId),
      status: 'successful' as const,
      phone,
      amount,
      network: opts.network,
      message: String(data?.remark || data?.message || data?.orderremark || 'Airtime order received'),
      provider: 'clubkonnect' as const,
      raw: data,
    };
  }

  const base = errorFromStatus(status, `Airtime purchase failed (${JSON.stringify(data).slice(0, 160)})`);
  const balNote = walletBal != null ? ` (wallet ₦${walletBal.toFixed(2)})` : '';
  throw new Error(`${base}${balNote}`);
}
