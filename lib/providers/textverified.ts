/**
 * Textverified provider client — Rent-for-SMS (US mobile, non-VoIP).
 *
 * Auth (per the official Textverified Python client / API v2):
 *   POST https://www.textverified.com/api/pub/v2/auth
 *     headers: X-API-KEY, X-API-USERNAME          → { token, expiresAt }
 *   All other calls: Authorization: Bearer <token>
 *
 * Rentals model:
 *   - service_name from GET /api/pub/v2/services (or 'allservices')
 *   - durations: oneDay|threeDay|sevenDay|fourteenDay|thirtyDay|ninetyDay|oneYear
 *   - pricing:  POST /api/pub/v2/pricing/rentals
 *     { serviceName, areaCode, numberType: 'mobile', capability: 'sms',
 *       isRenewable, duration, alwaysOn? }
 *   - create:   POST /api/pub/v2/reservations/rental
 *     { allowBackOrderReservations, duration, isRenewable, numberType,
 *       serviceName, capability, alwaysOn?, areaCodeSelectOption? }
 *     → response is a follow-up action (GET reservation details) with the e164.
 *   - list:     GET /api/pub/v2/reservations/rental/renewable|nonrenewable
 *   - sms:      GET /api/pub/v2/sms
 *
 * Env: TEXTVERIFIED_API_KEY, TEXTVERIFIED_USERNAME.
 * Keys are server-side only; never exposed to clients.
 */

const TV_BASE = 'https://www.textverified.com';

/* ---------- config ---------- */

export function textverifiedConfigured(): boolean {
  return Boolean(
    (process.env.TEXTVERIFIED_API_KEY || '').trim() &&
      (process.env.TEXTVERIFIED_USERNAME || process.env.TEXTVERIFIED_API_USERNAME || '').trim(),
  );
}

/* ---------- bearer token cache ---------- */

type TvToken = { token: string; expiresAt: number };
let tvTokenCache: TvToken | null = null;
let tvLastErrorValue = '';

export function tvLastError(): string {
  return tvLastErrorValue;
}

async function tvAuthToken(): Promise<string> {
  const apiKey = (process.env.TEXTVERIFIED_API_KEY || '').trim();
  const username = (
    process.env.TEXTVERIFIED_USERNAME ||
    process.env.TEXTVERIFIED_API_USERNAME ||
    ''
  ).trim();
  if (!apiKey || !username) throw new Error('Verification provider not configured');

  if (tvTokenCache && tvTokenCache.expiresAt > Date.now() + 30_000) {
    return tvTokenCache.token;
  }
  const res = await fetch(`${TV_BASE}/api/pub/v2/auth`, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'X-API-USERNAME': username },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    tvLastErrorValue = `Provider auth failed: HTTP ${res.status}: ${text.slice(0, 180)}`;
    throw new Error(tvLastErrorValue);
  }
  const data = (await res.json()) as { token?: string; expiresAt?: string };
  if (!data.token) {
    tvLastErrorValue = 'Provider auth returned no token';
    throw new Error(tvLastErrorValue);
  }
  const expiresAt = data.expiresAt ? Date.parse(data.expiresAt) : Date.now() + 55 * 60_000;
  tvTokenCache = { token: data.token, expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 55 * 60_000 };
  return data.token;
}

/* ---------- core request ---------- */

async function tvRequest<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status?: number; error?: string; data?: T }> {
  if (!textverifiedConfigured()) {
    return { ok: false, error: 'Provider is not configured' };
  }
  try {
    const token = await tvAuthToken();
    const res = await fetch(`${TV_BASE}${path}`, {
      method: init.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      cache: 'no-store',
    });
    const raw = await res.text().catch(() => '');
    if (!res.ok) {
      tvLastErrorValue = `Provider HTTP ${res.status}: ${raw.slice(0, 180)}`;
      console.error(`[textverified] ${path}: HTTP ${res.status}: ${raw.slice(0, 180)}`);
      return { ok: false, status: res.status, error: tvLastErrorValue };
    }
    const data = raw ? JSON.parse(raw) : {};
    tvLastErrorValue = '';
    return { ok: true, data: data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    tvLastErrorValue = `Provider network error: ${msg}`;
    console.error(`[textverified] ${path}: ${msg}`);
    return { ok: false, error: tvLastErrorValue };
  }
}

/* ---------- paging helper ---------- */

async function tvListAll<T>(path: string, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  let url = path;
  for (let i = 0; i < maxPages; i++) {
    const res = await tvRequest<{ data?: unknown[] } & Record<string, unknown>>(url);
    if (!res.ok || !res.data) break;
    const body = res.data as Record<string, unknown>;
    const rows = (Array.isArray(body) ? body : (body.data as unknown[]) || []) as T[];
    out.push(...rows);
    const next = (body.next as string | undefined) || (body.action as { href?: string } | undefined)?.href;
    if (!next) break;
    url = next.startsWith('/api') ? next : new URL(next, TV_BASE).pathname;
  }
  return out;
}

/* ---------- account ---------- */

export type TvAccount = { balanceUsd: number };

export async function tvAccount(): Promise<TvAccount | null> {
  const res = await tvRequest<{ currentBalance?: number; username?: string }>('/api/pub/v2/account');
  if (!res.ok || !res.data) return null;
  return { balanceUsd: Number(res.data.currentBalance ?? 0) };
}

/* ---------- services ---------- */

export type TvService = { serviceName: string; supportBackOrder?: number };

export async function tvServices(): Promise<{ services: TvService[]; error?: string }> {
  // GET /api/pub/v2/services requires numberType + reservationType params.
  // Rent-for-SMS serves both one-time (nonrenewable) and renewable rentals,
  // so we union both lists (unique service names).
  const rows: Record<string, unknown>[] = [];
  for (const rtype of ['nonrenewable', 'renewable'] as const) {
    rows.push(...(await tvListAll<Record<string, unknown>>(`/api/pub/v2/services?numberType=mobile&reservationType=${rtype}`)));
  }
  const seen = new Set<string>();
  const services: TvService[] = [];
  for (const r of rows) {
    const serviceName = String(
      r.serviceName ?? r.service_name ?? (r.service as Record<string, unknown> | undefined)?.serviceName ?? '',
    );
    if (!serviceName || seen.has(serviceName)) continue;
    seen.add(serviceName);
    services.push({ serviceName, supportBackOrder: Number(r.supportBackOrder ?? 0) || 0 });
  }
  if (!services.length) {
    return { services: [], error: tvLastError() || 'no services returned' };
  }
  return { services };
}

/** Available US area codes for rentals (live from the provider). */
export type TvAreaCode = { code: string; place: string };

export async function tvAreaCodes(): Promise<{ areaCodes: TvAreaCode[]; error?: string }> {
  const rows = await tvListAll<Record<string, unknown>>('/api/pub/v2/area-codes');
  const areaCodes = rows
    .map((r) => ({
      code: String(r.areaCode ?? r.area_code ?? ''),
      place: String(r.state ?? r.place ?? ''),
    }))
    .filter((a) => a.code && /^\d{3}$/.test(a.code));
  if (!areaCodes.length) {
    return { areaCodes: [], error: tvLastError() || 'no area codes returned' };
  }
  return { areaCodes };
}

/* ---------- pricing & rentals ---------- */

export type TvRentalDuration =
  | 'oneDay'
  | 'threeDay'
  | 'sevenDay'
  | 'fourteenDay'
  | 'thirtyDay'
  | 'ninetyDay'
  | 'oneYear';

export const TV_DURATIONS: { id: TvRentalDuration; label: string; days: number }[] = [
  { id: 'oneDay', label: '1 Day', days: 1 },
  { id: 'threeDay', label: '3 Days', days: 3 },
  { id: 'sevenDay', label: '7 Days', days: 7 },
  { id: 'fourteenDay', label: '14 Days', days: 14 },
  { id: 'thirtyDay', label: '30 Days', days: 30 },
  { id: 'ninetyDay', label: '90 Days', days: 90 },
  { id: 'oneYear', label: '1 Year', days: 365 },
];

/** Live USD price for a rental config (before Verxor markup).
 * areaCode=true asks Textverified to price a specific-area-code number
 * (Custom area code); false prices a random-area-code number. */
export async function tvRentalPriceUsd(opts: {
  serviceName: string;
  duration: TvRentalDuration;
  isRenewable: boolean;
  areaCode?: boolean;
}): Promise<{ ok: boolean; priceUsd?: number; error?: string }> {
  // Textverified service names are lowercase slugs; normalize any casing.
  const serviceName = opts.serviceName.trim().toLowerCase();
  const res = await tvRequest<{ price?: number } & Record<string, unknown>>('/api/pub/v2/pricing/rentals', {
    method: 'POST',
    body: {
      serviceName,
      areaCode: Boolean(opts.areaCode),
      numberType: 'mobile',
      capability: 'sms',
      isRenewable: opts.isRenewable,
      duration: opts.duration,
      alwaysOn: true,
    },
  });
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  const price = Number((res.data as Record<string, unknown>).price ?? (res.data as { price?: number }).price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: 'Provider returned no price for that option' };
  return { ok: true, priceUsd: price };
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Create a rental. Returns e164 number + reservation id + expires info.
 * Uses always-on, non-backorder (fail fast when out of stock) by default.
 * opts.areaCode (3 digits) restricts the number to that US area code. */
export async function tvCreateRental(opts: {
  serviceName: string;
  duration: TvRentalDuration;
  isRenewable: boolean;
  areaCode?: string;
}): Promise<{ ok: boolean; reservationId?: string; e164?: string; endsAt?: string; state?: string; error?: string }> {
  // Textverified service names are lowercase slugs; normalize any casing.
  const serviceName = opts.serviceName.trim().toLowerCase();
  const res = await tvRequest<Record<string, unknown>>('/api/pub/v2/reservations/rental', {
    method: 'POST',
    body: {
      allowBackOrderReservations: false,
      duration: opts.duration,
      isRenewable: opts.isRenewable,
      numberType: 'mobile',
      serviceName,
      capability: 'sms',
      alwaysOn: true,
      ...(opts.areaCode && /^\d{3}$/.test(opts.areaCode)
        ? { areaCodeSelectOption: [opts.areaCode] }
        : {}),
    },
  });
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  // Create returns a reservationSale: { id, reservations: [{ id, serviceName, reservationType }] }.
  const sale = asRecord(res.data);
  const reservations = (Array.isArray(sale.reservations) ? (sale.reservations as unknown[]).map(asRecord) : []);
  const reservation = reservations[0] || {};
  const reservationId = String(reservation.id ?? sale.id ?? '');
  if (!reservationId) return { ok: false, error: 'Provider created the rental but returned no id' };
  // Expand via the details endpoint to get the number.
  const det = await tvRequest<Record<string, unknown>>(`/api/pub/v2/reservations/${reservationId}`);
  if (!det.ok || !det.data) return { ok: true, reservationId, error: det.error ? `${det.error} (created)` : undefined };
  const d = asRecord(det.data);
  return {
    ok: true,
    reservationId: String(d.id ?? reservationId),
    e164: String(d.number ?? ''),
    endsAt: d.endsAt ? String(d.endsAt) : '',
    state: d.state ? String(d.state) : '',
  };
}

/** My rentals (renewable + non-renewable) for the "My Numbers" view. */
export async function tvMyRentals(): Promise<Record<string, unknown>[]> {
  const a = await tvListAll<Record<string, unknown>>('/api/pub/v2/reservations/rental/renewable');
  const b = await tvListAll<Record<string, unknown>>('/api/pub/v2/reservations/rental/nonrenewable');
  return [...a, ...b];
}

/** SMS list (optionally filtered by reservation or destination number). */
export async function tvSms(filter?: { reservationId?: string; to?: string }): Promise<Record<string, unknown>[]> {
  const params: string[] = [];
  if (filter?.reservationId) params.push(`reservationId=${encodeURIComponent(filter.reservationId)}`);
  if (filter?.to) params.push(`to=${encodeURIComponent(filter.to)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return tvListAll<Record<string, unknown>>(`/api/pub/v2/sms${qs}`);
}

/* ============================================================
 * One-time OTP verifications (USA mobile, ~5-minute window).
 * Joins the Verxor USA Virtual Number pools alongside GrizzlySMS.
 * ============================================================ */

/** Services that support one-time verifications (reservationType=verification). */
export async function tvVerificationServices(): Promise<{ services: TvService[]; error?: string }> {
  const rows = await tvListAll<Record<string, unknown>>(
    '/api/pub/v2/services?numberType=mobile&reservationType=verification',
  );
  const seen = new Set<string>();
  const services: TvService[] = [];
  for (const r of rows) {
    const serviceName = String(
      r.serviceName ?? r.service_name ?? (r.service as Record<string, unknown> | undefined)?.serviceName ?? '',
    );
    if (!serviceName || serviceName === 'allservices' || seen.has(serviceName)) continue;
    seen.add(serviceName);
    services.push({ serviceName });
  }
  if (!services.length) {
    return { services: [], error: tvLastError() || 'no verification services returned' };
  }
  return { services };
}

/**
 * One-time verification price (USD) for a service, before buying.
 * areaCode:false / carrier:false = any area code or carrier is fine.
 */
export async function tvVerificationPriceUsd(serviceName: string): Promise<{ ok: boolean; priceUsd?: number; error?: string }> {
  const svc = serviceName.trim().toLowerCase();
  const res = await tvRequest<{ price?: number } & Record<string, unknown>>('/api/pub/v2/pricing/verifications', {
    method: 'POST',
    body: {
      serviceName: svc,
      areaCode: false,
      carrier: false,
      numberType: 'mobile',
      capability: 'sms',
    },
  });
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  const price = Number((res.data as Record<string, unknown>).price ?? 0);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: 'Provider returned no price for ' + svc };
  return { ok: true, priceUsd: price };
}

export type TvVerification = {
  verificationId: string;
  number: string;
  state: string;
  serviceName: string;
  totalCostUsd: number;
  createdAt: string;
};

function mapVerification(d: Record<string, unknown>): TvVerification {
  return {
    verificationId: String(d.id ?? ''),
    number: String(d.number ?? ''),
    state: String(d.state ?? ''),
    serviceName: String(d.serviceName ?? ''),
    totalCostUsd: Number(d.totalCost ?? 0) || 0,
    createdAt: String(d.createdAt ?? ''),
  };
}

/**
 * Buy a one-time verification. Costs API balance and leases a US mobile
 * number for one SMS (~5 minutes). allservices is NOT allowed here.
 */
export async function tvCreateVerification(opts: {
  serviceName: string;
  maxPriceUsd?: number;
}): Promise<{ ok: boolean; verification?: TvVerification; error?: string }> {
  const serviceName = opts.serviceName.trim().toLowerCase();
  const res = await tvRequest<Record<string, unknown>>('/api/pub/v2/verifications', {
    method: 'POST',
    body: {
      serviceName,
      capability: 'sms',
      ...(Number.isFinite(opts.maxPriceUsd) && opts.maxPriceUsd && opts.maxPriceUsd > 0
        ? { maxPrice: opts.maxPriceUsd }
        : {}),
    },
  });
  if (!res.ok || !res.data) return { ok: false, error: res.error };
  // The create response is a follow-up action pointing at the verification details.
  const action = asRecord(res.data);
  let det: Record<string, unknown> | null = null;
  const href = String(action.href ?? '');
  if (href) {
    const r2 = await tvRequest<Record<string, unknown>>(href);
    if (r2.ok && r2.data) det = asRecord(r2.data);
  }
  if (!det || !det.id) {
    // Fall back: expand by id from the action body (or its verification id).
    const id = String(
      action.id ?? (action.verification as Record<string, unknown> | undefined)?.id ?? '',
    );
    if (!id) return { ok: false, error: 'Provider created the verification but returned no id' };
    const r3 = await tvRequest<Record<string, unknown>>(`/api/pub/v2/verifications/${encodeURIComponent(id)}`);
    if (!r3.ok || !r3.data) return { ok: false, error: r3.error || 'Provider created the verification but details fetch failed' };
    det = asRecord(r3.data);
  }
  const v = mapVerification(det);
  if (!v.verificationId) return { ok: false, error: 'Provider returned no verification id' };
  return { ok: true, verification: v };
}

/** Verification details (state: pending | completed | expired | cancelled). */
export async function tvVerificationDetails(verificationId: string): Promise<TvVerification | null> {
  const res = await tvRequest<Record<string, unknown>>(
    `/api/pub/v2/verifications/${encodeURIComponent(verificationId)}`,
  );
  if (!res.ok || !res.data) return null;
  return mapVerification(asRecord(res.data));
}

/** Cancel an unfinished verification (may refund depending on state). */
export async function tvCancelVerification(verificationId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await tvRequest(`/api/pub/v2/verifications/${encodeURIComponent(verificationId)}/cancel`, {
    method: 'POST',
  });
  return { ok: res.ok, error: res.error };
}

/** SMS messages for a verification number (poll for the OTP code). */
export async function tvVerificationSms(toNumber: string): Promise<Record<string, unknown>[]> {
  return tvSms({ to: toNumber });
}
