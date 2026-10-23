/**
 * 247API — primary airtime provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 * Pricing portal: https://247api.com.ng/pricing
 *
 * Env (checked in order of common convention):
 *   API_247_KEY, API247_KEY, API_247_API_KEY, API247_API_KEY,
 *   API_247_TOKEN, API247_TOKEN, API_247_SECRET, API247_SECRET,
 *   API_247, API247
 *
 * Live Network IDs (from GET /get-networks?service=airtime):
 *   MTN = 1, Airtel = 2, Glo = 3, 9mobile = 4
 *
 * Dashboard Plan IDs (from https://247api.com.ng/pricing):
 *   MTN:
 *     Plan ID 10: MTN VTU Airtime — 4.00% cashback / discount (preferred)
 *     Plan ID 1:  MTN VTU Airtime — 3.00% discount (standard)
 *   Glo:
 *     Plan ID 2:  Glo VTU Airtime — 10.00% discount
 *   9mobile:
 *     Plan ID 3:  9mobile VTU Airtime — 3.00% discount
 *   Airtel:
 *     Plan ID 4:  Airtel VTU Airtime — 3.10% discount
 */

export type Api247NetworkSlug = 'mtn' | 'airtel' | 'glo' | '9mobile';

/** Official 247API Network IDs */
export const API247_NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  airtel: 2,
  glo: 3,
  '9mobile': 4,
};

/** Plan configuration from 247API pricing portal */
export interface Api247PlanConfig {
  networkId: number;
  planId: number;
  fallbackPlanId?: number;
  altNetworkId?: number;
}

export const API247_PLANS: Record<Api247NetworkSlug, Api247PlanConfig> = {
  mtn: { networkId: 1, planId: 10, fallbackPlanId: 1, altNetworkId: 10 },
  glo: { networkId: 3, planId: 2, altNetworkId: 2 },
  '9mobile': { networkId: 4, planId: 3, altNetworkId: 3 },
  airtel: { networkId: 2, planId: 4, altNetworkId: 4 },
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

  const statusStr = String(data.status ?? data.Status ?? data.code ?? '').toLowerCase();
  // Failure takes strict priority over substring matches
  if (['fail', 'failed', 'error', 'false', 'rejected'].includes(statusStr)) {
    return false;
  }
  if (data.success === false || data.ok === false) {
    return false;
  }

  // Explicit positive status
  if (['success', 'successful', 'ok', 'true', '200'].includes(statusStr)) {
    return true;
  }
  if (data.success === true || data.ok === true) {
    return true;
  }

  // Message substring check
  const msg = String(data.message ?? data.response ?? data.api_response ?? '').toLowerCase();
  if (msg.includes('successful') || msg.includes('sent to') || msg.includes('delivered')) {
    return true;
  }
  return false;
}

function extractErrorMessage(data: any, status: number): string {
  if (!data) return `247API error (HTTP ${status})`;
  if (typeof data === 'string') return data.slice(0, 300);

  const parts: string[] = [];
  const fields = ['message', 'response', 'api_response', 'msg', 'error', 'detail'];
  for (const f of fields) {
    const val = data[f];
    if (typeof val === 'string' && val.trim().length > 0) {
      const trimmed = val.trim();
      if (!parts.includes(trimmed)) {
        parts.push(trimmed);
      }
    }
  }

  if (parts.length > 0) {
    return parts.join(' — ');
  }
  if (data.raw) {
    return String(data.raw).slice(0, 300);
  }
  return `247API error (HTTP ${status})`;
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
 *
 * Supports preferred plan IDs matching https://www.247api.com.ng/pricing:
 * - MTN: Plan 10 (4% discount) primary, Plan 1 (3%) fallback
 * - Glo: Plan 2 (10% discount)
 * - 9mobile: Plan 3 (3% discount)
 * - Airtel: Plan 4 (3.10% discount)
 */
export async function purchaseAirtime247(opts: {
  network: Api247NetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
  planId?: number;
  bypass?: boolean;
}) {
  const planConfig = API247_PLANS[opts.network];
  if (!planConfig) throw new Error(`Invalid network: ${opts.network}`);

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }

  const phone = normalizeNgPhone(opts.phone);
  const baseRef = (opts.ref || makeRef('AT247')).slice(0, 30);

  // Build ordered attempts:
  // 1) Preferred plan (e.g. Plan 10 for MTN 4% discount) with standard network ID
  // 2) Preferred plan with alternative network ID (in case backend maps network to plan_id)
  // 3) Fallback plan if available (e.g. Plan 1 for MTN 3%)
  // 4) Clean VTU payload without plan parameters
  interface Attempt {
    network: number;
    planId?: number;
    label: string;
  }

  const attempts: Attempt[] = [];

  const targetPlan = opts.planId ?? planConfig.planId;
  attempts.push({
    network: planConfig.networkId,
    planId: targetPlan,
    label: `network ${planConfig.networkId} + plan ${targetPlan}`,
  });

  if (planConfig.altNetworkId != null && planConfig.altNetworkId !== planConfig.networkId) {
    attempts.push({
      network: planConfig.altNetworkId,
      planId: targetPlan,
      label: `network ${planConfig.altNetworkId} + plan ${targetPlan}`,
    });
  }

  if (planConfig.fallbackPlanId != null && planConfig.fallbackPlanId !== targetPlan) {
    attempts.push({
      network: planConfig.networkId,
      planId: planConfig.fallbackPlanId,
      label: `fallback plan ${planConfig.fallbackPlanId}`,
    });
  }

  // Final fallback: standard VTU with no plan parameter
  attempts.push({
    network: planConfig.networkId,
    planId: undefined,
    label: `standard VTU network ${planConfig.networkId}`,
  });

  let lastError = '247API airtime failed';

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const attemptRef = i === 0 ? baseRef : `${baseRef}_R${i}`.slice(0, 36);

    const body: Record<string, unknown> = {
      network: attempt.network,
      phone,
      amount: String(amount),
      type: 'VTU',
      bypass: opts.bypass ?? true, // skip number validation to prevent false negatives on ported lines
      'request-id': attemptRef,
      request_id: attemptRef,
    };

    if (attempt.planId != null) {
      body.plan_id = attempt.planId;
      body.plan = attempt.planId;
      body.planId = attempt.planId;
    }

    const { data, status } = await postAirtime(body);

    if (isSuccess(data)) {
      return {
        ref: String(data?.['request-id'] || data?.request_id || attemptRef),
        status: 'successful' as const,
        phone,
        amount,
        network: opts.network,
        planId: attempt.planId ?? null,
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

    lastError = extractErrorMessage(data, status);

    // Terminal errors where retrying other plans is futile
    if (
      status === 401 ||
      /insufficient|wallet balance|low balance|fund your wallet|invalid token|expired token|unauthorized|user not found/i.test(
        lastError,
      )
    ) {
      break;
    }
  }

  throw new Error(lastError);
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

  let res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
  }

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
