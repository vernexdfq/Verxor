/**
 * SMSBower activation API (sms-activate compatible).
 * https://smsbower.online/stubs/handler_api.php
 */

const BASE = 'https://smsbower.online/stubs/handler_api.php';

function apiKey(): string {
  const key = process.env.SMSBOWER_API_KEY;
  if (!key) throw new Error('SMSBOWER_API_KEY is not configured');
  return key;
}

async function bower(params: Record<string, string>) {
  const q = new URLSearchParams({ api_key: apiKey(), ...params });
  const res = await fetch(`${BASE}?${q.toString()}`, { cache: 'no-store' });
  return res.text();
}

export async function getBalance(): Promise<number> {
  const text = await bower({ action: 'getBalance' });
  const m = text.match(/ACCESS_BALANCE:([0-9.]+)/i);
  return m ? Number(m[1]) : 0;
}

export async function getPrices(service?: string, country?: string) {
  const params: Record<string, string> = { action: 'getPrices' };
  if (service) params.service = service;
  if (country) params.country = country;
  const text = await bower(params);
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
}) {
  const params: Record<string, string> = {
    action: 'getNumber',
    service: opts.service,
    country: opts.country,
  };
  if (opts.maxPrice != null) params.maxPrice = String(opts.maxPrice);
  const text = await bower(params);
  const m = text.match(/ACCESS_NUMBER:(\d+):(\d+)/i);
  if (!m) throw new Error(`SmsBower getNumber failed: ${text.slice(0, 120)}`);
  return { id: m[1], phone: m[2], raw: text };
}

export async function getStatus(id: string) {
  return bower({ action: 'getStatus', id });
}

export async function setStatus(id: string, status: string) {
  return bower({ action: 'setStatus', id, status });
}

export function isConfigured() {
  return Boolean(process.env.SMSBOWER_API_KEY);
}
