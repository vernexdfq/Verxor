/**
 * 247API — primary airtime provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 *
 * Env (checked in order of common convention):
 *   API_247_KEY, API247_KEY, API_247_API_KEY, API247_API_KEY,
 *   API_247_TOKEN, API247_TOKEN, API_247_SECRET, API247_SECRET,
 *   API_247, API247
 *
 * Networks (verified live from GET /get-networks?service=airtime):
 *   1 = MTN
 *   2 = Airtel
 *   3 = Glo
 *   4 = 9mobile
 */

export type Api247NetworkSlug = 'mtn' | 'airtel' | 'glo' | '9mobile';

/** Official 247API Network IDs */
export const API247_NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  airtel: 2,
  glo: 3,
  '9mobile': 4,
};

function baseUrl(): string {
  const raw =
    process.env.API_247_BASE_URL ||
    process.env.API247_BASE_URL ||
    'https://247api.com.ng/api';
  return raw.replace(/\/$/, '');
}

function rawApiKey(): string {
  const key =
    process.env.API_247_KEY ||
    process.env.API247_KEY ||
    process.env.API_247_API_KEY ||
    process.env.API247_API_KEY ||
    process.env.API_247_TOKEN ||
    process.env.API247_TOKEN ||
    process.env.API_247_SECRET ||
    process.env.API247_SECRET ||
    process.env.API_247 ||
    process.env.API247;

  if (!key) throw new Error('API_247_KEY is not configured in environment');
  return key.trim();
}

export function isApi247Configured(): boolean {
  return Boolean(
    process.env.API_247_KEY ||
    process.env.API247_KEY ||
    process.env.API_247_API_KEY ||
    process.env.API247_API_KEY ||
    process.env.API_247_TOKEN ||
    process.env.API247_TOKEN ||
    process.env.API_247_SECRET ||
    process.env.API247_SECRET ||
    process.env.API_247 ||
    process.env.API247,
  );
}

function cleanToken(): string {
  const raw = rawApiKey();
  // Strip any leading "Token " or "Bearer " prefix if user added it into the env variable
  return raw.replace(/^(Token|Bearer)\s+/i, '').trim();
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

function makeRef(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${t}${r}`.slice(0, 36);
}

function isSuccess(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const s = String(data.status ?? data.Status ?? data.code ?? '').toLowerCase();
  if (['success', 'successful', 'ok', 'true', '200'].includes(s)) return true;
  if (data.success === true || data.ok === true) return true;

  const msg = String(data.message ?? data.response ?? data.api_response ?? '').toLowerCase();
  if (msg.includes('successful') || msg.includes('sent to') || msg.includes('delivered')) {
    return true;
  }
  return false;
}

async function postAirtime(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  data: any;
}> {
  const token = cleanToken();
  const url = `${baseUrl()}/airtime`;

  // 1) Primary header specified by 247API docs: Token <key>
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Verxor/1.0',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  let text = await res.text().catch(() => '');
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }

  // 2) If 401 unauthorized with Token prefix, retry with Bearer prefix as documented in JS SDK
  if (res.status === 401) {
    const retryRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Verxor/1.0',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const retryText = await retryRes.text().catch(() => '');
    let retryData: any = null;
    try {
      retryData = retryText ? JSON.parse(retryText) : null;
    } catch {
      retryData = { raw: retryText.slice(0, 400) };
    }
    return { ok: retryRes.ok, status: retryRes.status, data: retryData };
  }

  return { ok: res.ok, status: res.status, data };
}

/**
 * Purchase airtime via 247API POST /airtime
 */
export async function purchaseAirtime247(opts: {
  network: Api247NetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
  bypass?: boolean;
}) {
  const networkId = API247_NETWORK_ID[opts.network];
  if (!networkId) throw new Error(`Invalid network: ${opts.network}`);

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }

  const phone = normalizeNgPhone(opts.phone);
  const requestId = (opts.ref || makeRef('AT247')).slice(0, 36);

  const body: Record<string, unknown> = {
    network: networkId,
    phone,
    amount: String(amount),
    type: 'VTU',
    'request-id': requestId,
    bypass: opts.bypass ?? false,
  };

  const { data, status } = await postAirtime(body);

  if (isSuccess(data)) {
    return {
      ref: String(data?.['request-id'] || data?.request_id || requestId),
      status: 'successful' as const,
      phone,
      amount,
      network: opts.network,
      message: String(
        data?.message ||
          data?.response ||
          data?.api_response ||
          'Airtime purchase successful',
      ),
      provider: 'api247' as const,
      raw: data,
    };
  }

  let errorMsg = String(
    data?.message ||
      data?.response ||
      data?.api_response ||
      data?.msg ||
      data?.error ||
      data?.raw ||
      `247API error HTTP ${status}`,
  );

  // If failed due to validation check and bypass was false, retry once with bypass: true
  if (
    !body.bypass &&
    /validation|invalid phone|phone number|network|mismatch|port/i.test(errorMsg)
  ) {
    body.bypass = true;
    const retry = await postAirtime(body);
    if (isSuccess(retry.data)) {
      return {
        ref: String(retry.data?.['request-id'] || retry.data?.request_id || requestId),
        status: 'successful' as const,
        phone,
        amount,
        network: opts.network,
        message: String(
          retry.data?.message ||
            retry.data?.response ||
            retry.data?.api_response ||
            'Airtime purchase successful',
        ),
        provider: 'api247' as const,
        raw: retry.data,
      };
    }

    errorMsg = String(
      retry.data?.message ||
        retry.data?.response ||
        retry.data?.api_response ||
        retry.data?.msg ||
        retry.data?.error ||
        errorMsg,
    );
  }

  throw new Error(errorMsg);
}

/**
 * Check 247API user details and wallet balance via GET /api/user
 */
export async function queryUser247(): Promise<{
  ok: boolean;
  wallet?: string;
  balance?: string;
  user?: any;
  raw?: any;
}> {
  if (!isApi247Configured()) {
    throw new Error('API_247_KEY is not configured');
  }

  const token = cleanToken();
  const url = `${baseUrl()}/user`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }

  return {
    ok: res.ok,
    wallet: data?.wallet || data?.user?.wallet,
    balance: data?.balance,
    user: data?.user,
    raw: data,
  };
}
