/**
 * GrizzlySMS activation API (sms-activate compatible).
 * https://api.grizzlysms.com/stubs/handler_api.php
 */

const BASE = 'https://api.grizzlysms.com/stubs/handler_api.php';

function apiKey(): string {
  const key = process.env.GRIZZLYSMS_API_KEY;
  if (!key) throw new Error('GRIZZLYSMS_API_KEY is not configured');
  return key;
}

async function grizzly(params: Record<string, string>) {
  const q = new URLSearchParams({ api_key: apiKey(), ...params });
  const res = await fetch(`${BASE}?${q.toString()}`, { cache: 'no-store' });
  const text = await res.text();
  return text;
}

export async function getBalance(): Promise<number> {
  const text = await grizzly({ action: 'getBalance' });
  // ACCESS_BALANCE:12.34
  const m = text.match(/ACCESS_BALANCE:([0-9.]+)/i);
  return m ? Number(m[1]) : 0;
}

/** getPrices — may return JSON or colon format depending on version. */
export async function getPrices(service?: string, country?: string) {
  const params: Record<string, string> = { action: 'getPrices' };
  if (service) params.service = service;
  if (country) params.country = country;
  const text = await grizzly(params);
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function getNumber(opts: {
  service: string;
  country: string;
  maxPrice?: number;
  minPrice?: number;
}) {
  const params: Record<string, string> = {
    action: 'getNumber',
    service: opts.service,
    country: opts.country,
  };
  if (opts.maxPrice != null) params.maxPrice = String(opts.maxPrice);
  if (opts.minPrice != null) params.minPrice = String(opts.minPrice);
  const text = await grizzly(params);
  // ACCESS_NUMBER:id:phone
  const m = text.match(/ACCESS_NUMBER:(\d+):(\d+)/i);
  if (!m) throw new Error(`Grizzly getNumber failed: ${text.slice(0, 120)}`);
  return { id: m[1], phone: m[2], raw: text };
}

export async function getStatus(id: string) {
  return grizzly({ action: 'getStatus', id });
}

export async function setStatus(id: string, status: string) {
  return grizzly({ action: 'setStatus', id, status });
}

export function isConfigured() {
  return Boolean(process.env.GRIZZLYSMS_API_KEY);
}
