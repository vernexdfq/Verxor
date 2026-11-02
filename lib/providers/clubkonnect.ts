/**
 * ClubKonnect (Nellobyte Systems) — airtime + electricity provider.
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
    INVALID_AMOUNT: 'Invalid amount',
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
    INVALID_METERNO: 'Invalid meter number',
    INVALID_MeterNo: 'Invalid meter number',
    MeterType_NOT_AVAILABLE: 'Selected meter type is not available',
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

  let walletBal: number | null = null;
  try {
    const w = await getClubKonnectBalance();
    walletBal = w.balance;
    if (walletBal < amount * 0.9) {
      throw new Error(
        `ClubKonnect wallet too low (₦${walletBal.toFixed(2)}). Need about ₦${amount} for this purchase — fund wallet first`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('wallet too low')) throw e;
    if (e instanceof Error && /invalid|credential|apikey|userid/i.test(e.message)) throw e;
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

/** ClubKonnect electricity disco codes (from APIElectricityDiscosV1 / docs) */
export type CkDiscoSlug =
  | 'eko'
  | 'ikeja'
  | 'abuja'
  | 'kano'
  | 'ph'
  | 'jos'
  | 'ibadan'
  | 'kaduna'
  | 'enugu'
  | 'benin'
  | 'yola'
  | 'aba';

export const CK_DISCO_CODE: Record<CkDiscoSlug, string> = {
  eko: '01',
  ikeja: '02',
  abuja: '03',
  kano: '04',
  ph: '05',
  jos: '06',
  ibadan: '07',
  kaduna: '08',
  enugu: '09',
  benin: '10',
  yola: '11',
  aba: '12',
};

export const CK_DISCO_LABEL: Record<CkDiscoSlug, string> = {
  eko: 'Eko Electric - EKEDC',
  ikeja: 'Ikeja Electric - IKEDC',
  abuja: 'Abuja Electric - AEDC',
  kano: 'Kano Electric - KEDC',
  ph: 'Port Harcourt Electric - PHEDC',
  jos: 'Jos Electric - JEDC',
  ibadan: 'Ibadan Electric - IBEDC',
  kaduna: 'Kaduna Electric - KAEDC',
  enugu: 'Enugu Electric - EEDC',
  benin: 'Benin Electric - BEDC',
  yola: 'Yola Electric - YEDC',
  aba: 'Aba Electric - APLE',
};

export type CkMeterType = 'prepaid' | 'postpaid';

export const CK_METER_TYPE: Record<CkMeterType, string> = {
  prepaid: '01',
  postpaid: '02',
};

/**
 * Verify electricity meter via APIVerifyElectricityV1.asp
 * ClubKonnect often returns { customer_name: "N/A" } for unknown meters
 * instead of INVALID_METERNO — treat those as failed verification.
 */
export async function verifyElectricityMeter(opts: {
  disco: CkDiscoSlug;
  meterType: CkMeterType;
  meterNo: string;
}): Promise<{ ok: true; customerName: string } | { ok: false; error: string }> {
  const company = CK_DISCO_CODE[opts.disco];
  if (!company) return { ok: false, error: 'Invalid electricity company' };

  const meterNo = String(opts.meterNo).replace(/\D/g, '');
  if (meterNo.length < 8 || meterNo.length > 15) {
    return { ok: false, error: 'Enter a valid meter number' };
  }

  const { data } = await ckGet('APIVerifyElectricityV1.asp', {
    ElectricCompany: company,
    MeterType: CK_METER_TYPE[opts.meterType],
    MeterNo: meterNo,
  });

  const name = String(
    data?.customer_name ?? data?.customerName ?? data?.CustomerName ?? data?.name ?? '',
  ).trim();
  const upper = name.toUpperCase();
  const invalidNames = new Set([
    '',
    'N/A',
    'NA',
    'N.A',
    'N.A.',
    'NULL',
    'UNDEFINED',
    'NONE',
    'UNKNOWN',
    'NOT FOUND',
    'NOT_FOUND',
    'INVALID',
    'INVALID_METERNO',
    'INVALID METERNO',
    'INVALID METER',
    'CUSTOMER NOT FOUND',
  ]);
  if (!name || invalidNames.has(upper) || upper.includes('INVALID') || upper.includes('NOT FOUND')) {
    return { ok: false, error: 'Meter not found. Check the number and try again.' };
  }
  if (/^(MISSING_|INVALID_|ERROR|FAIL)/i.test(name)) {
    return { ok: false, error: errorFromStatus(name, 'Meter verification failed') };
  }
  // Real customer names should contain letters
  if (!/[A-Za-z]{2,}/.test(name)) {
    return { ok: false, error: 'Meter not found. Check the number and try again.' };
  }
  return { ok: true, customerName: name };
}

/**
 * Pay electricity via APIElectricityV1.asp
 * Do NOT send CallBackURL on this account.
 */
export async function purchaseElectricity(opts: {
  disco: CkDiscoSlug;
  meterType: CkMeterType;
  meterNo: string;
  amount: number;
  phone: string;
  ref?: string;
}) {
  const company = CK_DISCO_CODE[opts.disco];
  if (!company) throw new Error('Invalid electricity company');

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 500) {
    throw new Error('Minimum electricity payment is ₦500');
  }
  if (amount > 200000) throw new Error('Maximum electricity payment is ₦200,000');

  const meterNo = String(opts.meterNo).replace(/\D/g, '');
  if (meterNo.length < 8 || meterNo.length > 15) {
    throw new Error('Enter a valid meter number');
  }

  const phone = normalizeNgPhone(opts.phone);
  const requestId = opts.ref || makeRef('EL');

  let walletBal: number | null = null;
  try {
    const w = await getClubKonnectBalance();
    walletBal = w.balance;
    if (walletBal < amount * 0.9) {
      throw new Error(
        `ClubKonnect wallet too low (₦${walletBal.toFixed(2)}). Need about ₦${amount} — fund wallet first`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('wallet too low')) throw e;
    if (e instanceof Error && /invalid|credential|apikey|userid/i.test(e.message)) throw e;
  }

  const params = {
    ElectricCompany: company,
    MeterType: CK_METER_TYPE[opts.meterType],
    MeterNo: meterNo,
    Amount: amount,
    PhoneNo: phone,
    RequestID: requestId,
  };

  let data: any = (await ckGet('APIElectricityV1.asp', params)).data;
  let status = pickStatus(data);
  let statusCode = data?.statuscode ?? data?.statusCode;

  if (isPaymentNotConfirmed(status)) {
    await sleep(1500);
    data = (await ckGet('APIElectricityV1.asp', params)).data;
    status = pickStatus(data);
    statusCode = data?.statuscode ?? data?.statusCode;
  }

  if (isSuccessStatus(status) || String(statusCode) === '100' || String(statusCode) === '200') {
    return {
      ref: String(data?.requestid || data?.RequestID || data?.orderid || data?.orderId || requestId),
      orderId: String(data?.orderid || data?.orderId || ''),
      status: 'successful' as const,
      meterNo,
      amount,
      disco: opts.disco,
      meterType: opts.meterType,
      token: data?.metertoken || data?.meterToken || data?.token || null,
      customerName: data?.customer_name || data?.customerName || null,
      message: String(data?.remark || data?.message || data?.orderremark || 'Electricity order received'),
      provider: 'clubkonnect' as const,
      raw: data,
    };
  }

  const base = errorFromStatus(
    status,
    `Electricity payment failed (${JSON.stringify(data).slice(0, 160)})`,
  );
  const balNote = walletBal != null ? ` (wallet ₦${walletBal.toFixed(2)})` : '';
  throw new Error(`${base}${balNote}`);
}
