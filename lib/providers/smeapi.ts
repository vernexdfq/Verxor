/**
 * SMEAPI client (server-only) — airtime + data.
 * Auth: Authorization: Token <SMEAPI_KEY>
 * Base: SMEAPI_URL (default https://smeapi.com.ng/api)
 */

export type SmeNetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** SMEAPI network ids from live dataplans */
export const SME_NETWORK_ID: Record<SmeNetworkSlug, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  airtel: 4,
};

export type SmeDataPlan = {
  id: number;
  network_id: number;
  network: string;
  name: string;
  type: string;
  days: string;
  price: number;
};

function baseUrl(): string {
  const raw = (process.env.SMEAPI_URL || 'https://smeapi.com.ng/api').replace(/\/$/, '');
  return raw;
}

function apiKey(): string {
  const key = process.env.SMEAPI_KEY;
  if (!key) throw new Error('SMEAPI_KEY is not configured');
  return key;
}

export function isSmeConfigured(): boolean {
  return Boolean(process.env.SMEAPI_KEY);
}

async function smeFetch(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: any }> {
  const method = opts.method || 'GET';
  const url = `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Token ${apiKey()}`,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  let data: any = null;
  const text = await res.text().catch(() => '');
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

function isSuccessPayload(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  const s = String(data.status ?? data.Status ?? '').toLowerCase();
  if (s === 'success' || s === 'successful' || s === 'order_completed') return true;
  if (s === 'fail' || s === 'failed' || s === 'error') return false;
  if (typeof data.msg === 'string' && /successful|success/i.test(data.msg) && s !== 'fail') {
    return true;
  }
  return false;
}

function errorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  return (
    data.msg ||
    data.message ||
    data.error ||
    data.description ||
    fallback
  );
}

/** Provider wallet balance (₦). */
export async function getSmeBalance(): Promise<{ name: string; balance: number }> {
  const { data } = await smeFetch('/user/');
  if (!isSuccessPayload(data) && data?.balance == null) {
    throw new Error(errorMessage(data, 'Failed to read SMEAPI balance'));
  }
  const raw = String(data.balance ?? '0').replace(/,/g, '');
  return {
    name: String(data.name || ''),
    balance: Number(raw) || 0,
  };
}

/** Live data plans at reseller price. */
export async function listDataPlans(network?: SmeNetworkSlug): Promise<SmeDataPlan[]> {
  const { data } = await smeFetch('/dataplans/');
  if (!isSuccessPayload(data) || !Array.isArray(data.data)) {
    throw new Error(errorMessage(data, 'Failed to load data plans'));
  }
  let rows = data.data as SmeDataPlan[];
  if (network) {
    const nid = SME_NETWORK_ID[network];
    rows = rows.filter((p) => Number(p.network_id) === nid);
  }
  return rows.map((p) => ({
    id: Number(p.id),
    network_id: Number(p.network_id),
    network: String(p.network),
    name: String(p.name),
    type: String(p.type || 'SME'),
    days: String(p.days || ''),
    price: Number(p.price) || 0,
  }));
}

export function makeRef(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

export async function purchaseAirtime(opts: {
  network: SmeNetworkSlug;
  phone: string;
  amount: number;
  ported?: boolean;
  airtimeType?: string;
  ref?: string;
}) {
  const network = SME_NETWORK_ID[opts.network];
  if (!network) throw new Error('Invalid network');
  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 100) {
    throw new Error('Minimum airtime is ₦100');
  }
  if (amount > 50000) throw new Error('Maximum airtime is ₦50,000');

  const phone = normalizeNgPhone(opts.phone);
  const ref = opts.ref || makeRef('AT');

  const { data } = await smeFetch('/airtime/', {
    method: 'POST',
    body: {
      network,
      phone,
      amount,
      airtime_type: opts.airtimeType || 'VTU',
      ported_number: Boolean(opts.ported),
      ref,
    },
  });

  if (!isSuccessPayload(data)) {
    throw new Error(errorMessage(data, 'Airtime purchase failed'));
  }

  return {
    ref,
    status: 'successful' as const,
    phone,
    amount,
    network: opts.network,
    message: errorMessage(data, 'Airtime purchase successful'),
    raw: data,
  };
}

export async function purchaseData(opts: {
  network: SmeNetworkSlug;
  phone: string;
  dataPlanId: number;
  ported?: boolean;
  ref?: string;
}) {
  const network = SME_NETWORK_ID[opts.network];
  if (!network) throw new Error('Invalid network');
  const data_plan = Number(opts.dataPlanId);
  if (!Number.isFinite(data_plan) || data_plan <= 0) {
    throw new Error('Invalid data plan');
  }

  const phone = normalizeNgPhone(opts.phone);
  const ref = opts.ref || makeRef('DATA');

  const { data } = await smeFetch('/data/', {
    method: 'POST',
    body: {
      network,
      data_plan,
      phone,
      ported_number: Boolean(opts.ported),
      ref,
    },
  });

  if (!isSuccessPayload(data)) {
    throw new Error(errorMessage(data, 'Data purchase failed'));
  }

  return {
    ref,
    status: 'successful' as const,
    phone,
    dataPlanId: data_plan,
    network: opts.network,
    message: errorMessage(data, 'Data purchase successful'),
    raw: data,
  };
}

/** Query transaction by our unique ref. */
export async function queryStatus(ref: string) {
  const { data } = await smeFetch('/status/', {
    method: 'POST',
    body: { ref },
  });
  return data;
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
