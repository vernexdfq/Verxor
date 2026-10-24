/**
 * 247API — primary airtime provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 *
 * Env:
 *   API_247_KEY (required)
 *   API_247_BASE_URL (optional, default https://247api.com.ng/api)
 *
 * LIVE network IDs (GET /get-networks?service=airtime):
 *   MTN=1  Glo=2  9mobile=3  Airtel=4
 *
 * Dashboard plan discounts:
 *   Plan 10 MTN 4%  |  Plan 1 MTN 3%  |  Plan 2 Glo 10%
 *   Plan 3 9mobile 3%  |  Plan 4 Airtel 3.10%
 */

export type Api247NetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

export const API247_NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  airtel: 4,
};

export interface Api247PlanConfig {
  networkId: number;
  planId?: number;
}

/** Preferred plan_id per network (MTN uses 10 for 4% cashback) */
export const API247_PLANS: Record<Api247NetworkSlug, Api247PlanConfig> = {
  mtn: { networkId: 1, planId: 10 },
  glo: { networkId: 2, planId: 2 },
  '9mobile': { networkId: 3, planId: 3 },
  airtel: { networkId: 4, planId: 4 },
};

function baseUrl(): string {
  let raw =
    process.env.API_247_BASE_URL ||
    process.env.API247_BASE_URL ||
    'https://247api.com.ng/api';
  raw = raw.trim().replace(/\/$/, '');
  // User may set https://247api.com.ng — ensure /api suffix
  if (!/\/api$/i.test(raw)) {
    raw = `${raw}/api`;
  }
  return raw;
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
  if (['fail', 'failed', 'error', 'false', 'rejected'].includes(statusStr)) return false;
  if (data.success === false || data.ok === false) return false;
  if (['success', 'successful', 'ok', 'true', '200'].includes(statusStr)) return true;
  if (data.success === true || data.ok === true) return true;
  const msg = String(data.message ?? data.response ?? data.api_response ?? '').toLowerCase();
  return msg.includes('successful') || msg.includes('sent to') || msg.includes('delivered');
}

function extractErrorMessage(data: any, status: number): string {
  if (!data) return `247API HTTP ${status}`;
  if (typeof data === 'string') return data.slice(0, 280);
  const parts: string[] = [];
  for (const f of ['message', 'response', 'api_response', 'msg', 'error', 'detail']) {
    const val = data[f];
    if (typeof val === 'string' && val.trim()) {
      const t = val.trim();
      if (!parts.includes(t)) parts.push(t);
    }
  }
  if (parts.length) return parts.join(' — ').slice(0, 280);
  if (data.raw) return String(data.raw).slice(0, 280);
  return `247API HTTP ${status}`;
}

async function postAirtime(body: Record<string, unknown>): Promise<{
  status: number;
  data: any;
}> {
  const token = cleanToken();
  const url = `${baseUrl()}/airtime`;

  const doFetch = (auth: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Verxor/1.0',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

  let res = await doFetch(`Token ${token}`);
  let text = await res.text().catch(() => '');
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 400) };
  }

  if (res.status === 401) {
    res = await doFetch(`Bearer ${token}`);
    text = await res.text().catch(() => '');
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 400) };
    }
  }

  return { status: res.status, data };
}

/**
 * Purchase airtime — fast path.
 * MTN: plan_id 10 (4%) then plain VTU once if needed.
 * Does not buy unless the app calls this function.
 */
export async function purchaseAirtime247(opts: {
  network: Api247NetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
  planId?: number;
}) {
  const planConfig = API247_PLANS[opts.network];
  if (!planConfig) throw new Error(`Invalid network: ${opts.network}`);

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }

  const phone = normalizeNgPhone(opts.phone);
  const baseRef = (opts.ref || makeRef('AT247')).slice(0, 30);
  const preferredPlan = opts.planId ?? planConfig.planId;

  // Fast: preferred plan first, then one plain VTU (docs body)
  const attempts: { planId?: number; ref: string }[] = [];
  if (preferredPlan != null) {
    attempts.push({ planId: preferredPlan, ref: baseRef });
  }
  attempts.push({
    planId: undefined,
    ref: preferredPlan != null ? `${baseRef}_V`.slice(0, 36) : baseRef,
  });

  let lastError = '247API airtime failed';

  for (const attempt of attempts) {
    const body: Record<string, unknown> = {
      network: planConfig.networkId,
      phone,
      amount: String(amount),
      type: 'VTU',
      'request-id': attempt.ref,
    };
    if (attempt.planId != null) body.plan_id = attempt.planId;

    const { status, data } = await postAirtime(body);

    if (isSuccess(data)) {
      return {
        ref: String(data?.['request-id'] || data?.request_id || attempt.ref),
        status: 'successful' as const,
        phone,
        amount,
        network: opts.network,
        planId: attempt.planId ?? null,
        message: String(
          data?.message || data?.response || data?.api_response || 'Airtime purchase successful',
        ),
        provider: 'api247' as const,
        raw: data,
      };
    }

    lastError = extractErrorMessage(data, status);

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

/** Read-only: key + wallet + networks. Never purchases. */
export async function healthCheck247(): Promise<{
  ok: boolean;
  configured: boolean;
  baseUrl: string;
  wallet?: number;
  canUseApi?: boolean;
  networks?: { id: number; network: string }[];
  error?: string;
}> {
  if (!isApi247Configured()) {
    return {
      ok: false,
      configured: false,
      baseUrl: baseUrl(),
      error: 'API_247_KEY missing in environment',
    };
  }

  const token = cleanToken();
  const base = baseUrl();

  try {
    const userRes = await fetch(`${base}/user`, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const userText = await userRes.text();
    let userData: any = null;
    try {
      userData = userText ? JSON.parse(userText) : null;
    } catch {
      userData = null;
    }

    if (!userRes.ok || userData?.status === 'fail') {
      return {
        ok: false,
        configured: true,
        baseUrl: base,
        error: `User check failed HTTP ${userRes.status}: ${userText.slice(0, 200)}`,
      };
    }

    const netRes = await fetch(`${base}/get-networks?service=airtime`, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const netText = await netRes.text();
    let networks: any[] = [];
    try {
      const parsed = JSON.parse(netText);
      networks = Array.isArray(parsed) ? parsed : parsed?.data || [];
    } catch {
      networks = [];
    }

    const wallet = Number(userData?.wallet ?? userData?.balance ?? userData?.user?.wallet ?? 0);

    return {
      ok: true,
      configured: true,
      baseUrl: base,
      wallet,
      canUseApi: Boolean(userData?.user?.can_use_api ?? true),
      networks: networks.map((n) => ({
        id: Number(n.id),
        network: String(n.network || n.name || ''),
      })),
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      baseUrl: base,
      error: e instanceof Error ? e.message : 'Health check failed',
    };
  }
}
