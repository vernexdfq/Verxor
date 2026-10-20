/**
 * 247API — airtime backup provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 *
 * Env:
 *   API247_API_KEY   (required)
 *   API247_BASE_URL  (optional, default https://247api.com.ng/api)
 */

export type Api247NetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** Live network IDs from GET /get-networks?service=airtime */
const NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  airtel: 4,
};

function baseUrl(): string {
  return (process.env.API247_BASE_URL || 'https://247api.com.ng/api').replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.API247_API_KEY;
  if (!key) throw new Error('API247_API_KEY is not configured');
  return key.trim();
}

export function isApi247Configured(): boolean {
  return Boolean(process.env.API247_API_KEY);
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

function authHeaders(): HeadersInit {
  return {
    Authorization: `Token ${apiKey()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function isSuccess(data: any): boolean {
  const s = String(data?.status ?? data?.Status ?? '').toLowerCase();
  return s === 'success' || s === 'successful' || s === 'ok';
}

/**
 * Purchase airtime via 247API POST /airtime
 */
export async function purchaseAirtime247(opts: {
  network: Api247NetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
}) {
  const networkId = NETWORK_ID[opts.network];
  if (!networkId) throw new Error('Invalid network');

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }

  const phone = normalizeNgPhone(opts.phone);
  const requestId = opts.ref || makeRef('AT247');

  const body = {
    network: networkId,
    phone,
    amount: String(amount),
    type: 'VTU',
    'request-id': requestId,
  };

  const res = await fetch(`${baseUrl()}/airtime`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  let data: any = null;
  const text = await res.text().catch(() => '');
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }

  if (isSuccess(data)) {
    return {
      ref: String(data?.['request-id'] || data?.request_id || requestId),
      status: 'successful' as const,
      phone,
      amount,
      network: opts.network,
      message: String(
        data?.message || data?.response || data?.api_response || 'Airtime purchase successful',
      ),
      provider: 'api247' as const,
      raw: data,
    };
  }

  const msg = String(
    data?.message || data?.response || data?.api_response || data?.raw || `247API error HTTP ${res.status}`,
  );
  throw new Error(msg);
}
