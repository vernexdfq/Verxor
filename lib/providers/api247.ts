/**
 * 247API — primary airtime provider.
 * Docs: https://247api.com.ng/documentation/airtime-request
 *
 * Env (any of these work):
 *   API_247_KEY or API247_API_KEY   (required)
 *   API_247_BASE_URL or API247_BASE_URL  (optional, default https://247api.com.ng/api)
 *
 * Networks (live GET /get-networks?service=airtime):
 *   1 = MTN, 2 = Glo, 3 = 9mobile, 4 = Airtel
 *
 * Dashboard plan discounts (YOUR PRICE):
 *   Plan 1  MTN VTU 3.00%
 *   Plan 2  Glo VTU 10.00%
 *   Plan 3  9mobile VTU 3.00%
 *   Plan 4  Airtel VTU 3.10%
 *   Plan 10 MTN VTU 4.00%  ← preferred for MTN
 */

export type Api247NetworkSlug = 'mtn' | 'glo' | '9mobile' | 'airtel';

/** Live network IDs from GET /get-networks?service=airtime */
const NETWORK_ID: Record<Api247NetworkSlug, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  airtel: 4,
};

/** Preferred plan_id when known (MTN 4% product). */
const PREFERRED_PLAN_ID: Partial<Record<Api247NetworkSlug, number>> = {
  mtn: 10,
};

function baseUrl(): string {
  const raw =
    process.env.API_247_BASE_URL ||
    process.env.API247_BASE_URL ||
    'https://247api.com.ng/api';
  return raw.replace(/\/$/, '');
}

function apiKey(): string {
  const key = process.env.API_247_KEY || process.env.API247_API_KEY;
  if (!key) throw new Error('API_247_KEY is not configured');
  return key.trim();
}

export function isApi247Configured(): boolean {
  return Boolean(process.env.API_247_KEY || process.env.API247_API_KEY);
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

async function postAirtime(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  data: any;
}> {
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
  return { ok: res.ok, status: res.status, data };
}

/**
 * Purchase airtime via 247API POST /airtime
 *
 * MTN: tries plan_id 10 first (4% product). On failure, retries without plan_id
 * (standard VTU / plan 1 path).
 */
export async function purchaseAirtime247(opts: {
  network: Api247NetworkSlug;
  phone: string;
  amount: number;
  ref?: string;
  /** Force a specific plan_id; omit to use preferred → fallback logic */
  planId?: number;
}) {
  const networkId = NETWORK_ID[opts.network];
  if (!networkId) throw new Error('Invalid network');

  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error('Minimum airtime is ₦50');
  }

  const phone = normalizeNgPhone(opts.phone);
  const requestId = opts.ref || makeRef('AT247');

  const preferred =
    opts.planId ?? PREFERRED_PLAN_ID[opts.network] ?? undefined;

  const attempts: Array<{ planId?: number; label: string }> = [];
  if (preferred != null) {
    attempts.push({ planId: preferred, label: `plan_id ${preferred}` });
  }
  // Fallback: standard VTU (no plan_id) — dashboard Plan 1 path for MTN
  attempts.push({ planId: undefined, label: 'standard VTU' });

  let lastError = '247API airtime failed';

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    // Unique request-id per attempt so a failed preferred plan does not block retry
    const attemptRef =
      i === 0 ? requestId : `${requestId}F${i}`.slice(0, 36);

    const body: Record<string, unknown> = {
      network: networkId,
      phone,
      amount: String(amount),
      type: 'VTU',
      'request-id': attemptRef,
    };
    if (attempt.planId != null) {
      body.plan_id = attempt.planId;
    }

    const { data, status } = await postAirtime(body);

    if (isSuccess(data)) {
      return {
        ref: String(data?.['request-id'] || data?.request_id || attemptRef),
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
        planId: attempt.planId ?? null,
        raw: data,
      };
    }

    lastError = String(
      data?.message ||
        data?.response ||
        data?.api_response ||
        data?.raw ||
        `247API error HTTP ${status}`,
    );

    // Do not retry on insufficient balance / validation — same result on next attempt
    if (/insufficient|invalid phone|minimum|maximum|not configured/i.test(lastError)) {
      break;
    }
  }

  throw new Error(lastError);
}
