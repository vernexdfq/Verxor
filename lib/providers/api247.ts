/**
 * 247API — primary airtime provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 * Pricing: https://www.247api.com.ng/pricing (dashboard Plan IDs)
 *
 * Env (any of these):
 *   API_247_KEY | API247_KEY | API247_API_KEY | API_247_API_KEY
 *   API_247_BASE_URL | API247_BASE_URL  (default https://247api.com.ng/api)
 *
 * ── LIVE network IDs (GET /get-networks?service=airtime) ──
 *   MTN = 1 | Glo = 2 | 9mobile = 3 | Airtel = 4
 *   (Official docs sample swaps Glo/Airtel — ALWAYS trust live API.)
 *
 * ── Dashboard Plan IDs (pricing portal / YOUR PRICE) ──
 *   Plan 10  MTN VTU   4.00%  ← preferred for MTN
 *   Plan 1   MTN VTU   3.00%  ← MTN fallback
 *   Plan 2   Glo VTU  10.00%
 *   Plan 3   9mobile   3.00%
 *   Plan 4   Airtel    3.10%
 *
 * Purchase body (docs):
 *   network (int), phone, amount, type=VTU, request-id?
 * Optional: plan_id (used so MTN hits the 4% product)
 */

export type Api247NetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** LIVE network IDs — verified 2026-10-24 against production API */
export const API247_NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  airtel: 4,
};

export interface Api247PlanConfig {
  /** LIVE network id for POST /airtime */
  networkId: number;
  /** Preferred dashboard plan_id (MTN 10 = 4%) */
  planId?: number;
  /** Fallback dashboard plan_id if preferred fails */
  fallbackPlanId?: number;
}

export const API247_PLANS: Record<Api247NetworkSlug, Api247PlanConfig> = {
  // MTN: Plan 10 (4%) first, then Plan 1 (3%) / plain VTU
  mtn: { networkId: 1, planId: 10, fallbackPlanId: 1 },
  // Glo / 9mobile / Airtel: network id = dashboard plan id
  glo: { networkId: 2, planId: 2 },
  '9mobile': { networkId: 3, planId: 3 },
  airtel: { networkId: 4, planId: 4 },
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
      process.env.API_247 ||
      process.env.API247,
  );
}

function cleanToken(): string {
  return rawApiKey().replace(/^(Token|Bearer)\s+/i, '').trim();
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
  if (['fail', 'failed', 'error', 'false', 'rejected'].includes(statusStr)) {
    return false;
  }
  if (data.success === false || data.ok === false) return false;

  if (['success', 'successful', 'ok', 'true', '200'].includes(statusStr)) return true;
  if (data.success === true || data.ok === true) return true;

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
  for (const f of ['message', 'response', 'api_response', 'msg', 'error', 'detail']) {
    const val = data[f];
    if (typeof val === 'string' && val.trim()) {
      const t = val.trim();
      if (!parts.includes(t)) parts.push(t);
    }
  }
  if (parts.length) return parts.join(' — ');
  if (data.raw) return String(data.raw).slice(0, 300);
  return `247API error (HTTP ${status})`;
}

async function postAirtime(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  data: any;
}> {
  const token = cleanToken();
  const url = `${baseUrl()}/airtime`;

  // Docs: Authorization: Token <key> (JS examples also accept Bearer)
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
 * MTN always tries plan_id 10 (4%) first, then plan_id 1 / plain VTU.
 * No airtime is purchased by this module during deploy — only when the app calls it.
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

  type Attempt = { network: number; planId?: number; label: string };
  const attempts: Attempt[] = [];

  const preferredPlan = opts.planId ?? planConfig.planId;

  // 1) Preferred plan (MTN → 10)
  if (preferredPlan != null) {
    attempts.push({
      network: planConfig.networkId,
      planId: preferredPlan,
      label: `network ${planConfig.networkId} plan_id ${preferredPlan}`,
    });
  }

  // 2) Fallback plan (MTN → 1)
  if (
    planConfig.fallbackPlanId != null &&
    planConfig.fallbackPlanId !== preferredPlan
  ) {
    attempts.push({
      network: planConfig.networkId,
      planId: planConfig.fallbackPlanId,
      label: `network ${planConfig.networkId} plan_id ${planConfig.fallbackPlanId}`,
    });
  }

  // 3) Docs-only payload: network + amount + type (no plan_id)
  attempts.push({
    network: planConfig.networkId,
    planId: undefined,
    label: `network ${planConfig.networkId} standard VTU`,
  });

  let lastError = '247API airtime failed';

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const attemptRef = i === 0 ? baseRef : `${baseRef}_R${i}`.slice(0, 36);

    // Docs body fields only + optional plan_id
    const body: Record<string, unknown> = {
      network: attempt.network,
      phone,
      amount: String(amount),
      type: 'VTU',
      'request-id': attemptRef,
    };
    if (opts.bypass != null) body.bypass = opts.bypass;
    if (attempt.planId != null) body.plan_id = attempt.planId;

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

    // Stop retrying on auth / wallet problems
    if (
      status === 401 ||
      /insufficient|wallet balance|low balance|fund your wallet|invalid token|unauthorized/i.test(
        lastError,
      )
    ) {
      break;
    }
  }

  throw new Error(lastError);
}

/** Read-only wallet check — does not purchase */
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
