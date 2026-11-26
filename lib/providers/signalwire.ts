/**
 * SignalWire LaML REST client (Twilio-compatible API).
 *
 * Env (set in Vercel):
 *   SIGNALWIRE_SPACE       e.g. "yourcompany.signalwire.com"
 *   SIGNALWIRE_PROJECT_ID  the SignalWire project id
 *   SIGNALWIRE_API_TOKEN   the project API token
 *
 * All requests use HTTP Basic auth (ProjectId:ApiToken).
 */

export type SwAvailableNumber = {
  e164: string;
  friendly: string;
  region?: string;
  capabilities?: { voice?: boolean; sms?: boolean };
};

export type SwOwnedNumber = {
  sid: string;
  e164: string;
  friendly: string;
};

export function swConfigured(): boolean {
  const space = (process.env.SIGNALWIRE_SPACE || '').trim();
  const project = (process.env.SIGNALWIRE_PROJECT_ID || '').trim();
  const token = (process.env.SIGNALWIRE_API_TOKEN || '').trim();
  return Boolean(space && project && token);
}

function swCredentials() {
  const space = (process.env.SIGNALWIRE_SPACE || '').trim();
  const project = (process.env.SIGNALWIRE_PROJECT_ID || '').trim();
  const token = (process.env.SIGNALWIRE_API_TOKEN || '').trim();
  if (!space || !project || !token) throw new Error('SignalWire is not configured');
  const auth = Buffer.from(`${project}:${token}`).toString('base64');
  return { base: `https://${space}/api/laml/2010-04-01/Accounts/${project}`, auth };
}

async function swRequest<T>(
  path: string,
  init?: { method?: string; body?: Record<string, string> },
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const { base, auth } = swCredentials();
  let body: string | undefined;
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
  };
  if (init?.body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(init.body).toString();
  }
  const res = await fetch(`${base}${path}`, {
    method: init?.method || 'GET',
    headers,
    body,
    cache: 'no-store',
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, status: res.status, data: null, error: text.slice(0, 300) };
  }
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, data: null, error: 'Invalid JSON from SignalWire' };
  }
}

function friendlyE164(e164: string): string {
  const n = e164.replace(/[^\d+]/g, '');
  const m = n.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+1 (${m[1]}) ${m[2]}-${m[3]}`;
  return n;
}

function typePath(type: string): string {
  if (/toll/i.test(type)) return 'TollFree';
  if (/mobile/i.test(type)) return 'Mobile';
  return 'Local';
}

/** Search available numbers for purchase. */
export async function swAvailable(opts: {
  country: string;
  type: string;
  areaCode?: string;
  limit?: number;
}): Promise<{ ok: boolean; numbers?: SwAvailableNumber[]; error?: string }> {
  const params = new URLSearchParams();
  params.set('PageSize', String(Math.max(1, Math.min(30, opts.limit || 15))));
  if (opts.areaCode && /^\d{2,6}$/.test(opts.areaCode)) params.set('AreaCode', opts.areaCode);
  const r = await swRequest<{
    available_phone_numbers?: Array<{
      phone_number?: string;
      region?: string;
      iso_country?: string;
      capabilities?: Record<string, boolean>;
    }>;
  }>(`/AvailablePhoneNumbers/${encodeURIComponent(opts.country || 'US')}/${typePath(opts.type)}.json?${params}`);
  if (!r.ok || !r.data) return { ok: false, error: r.error || 'Search failed' };
  const numbers = (r.data.available_phone_numbers || []).map((n) => ({
    e164: String(n.phone_number || ''),
    friendly: friendlyE164(String(n.phone_number || '')),
    region: n.region || undefined,
    capabilities: {
      voice: n.capabilities?.voice !== false,
      sms: n.capabilities?.sms !== false,
    },
  })).filter((n) => n.e164);
  return { ok: true, numbers };
}

/** Buy (provision) a specific number. */
export async function swBuyNumber(e164: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const r = await swRequest<{ sid?: string; phone_number?: string }>('/IncomingPhoneNumbers.json', {
    method: 'POST',
    body: { PhoneNumber: e164 },
  });
  if (!r.ok || !r.data?.sid) {
    const msg = r.error || 'The number could not be purchased';
    return { ok: false, error: /2144|not available|capacity/i.test(msg) ? 'That number was just taken. Search again and pick another.' : msg };
  }
  return { ok: true, sid: String(r.data.sid) };
}

/** Release a number back to the provider. */
export async function swReleaseNumber(sid: string): Promise<boolean> {
  const r = await swRequest(`/IncomingPhoneNumbers/${encodeURIComponent(sid)}.json`, {
    method: 'DELETE',
  });
  return r.ok;
}

/** List numbers currently owned by the project. */
export async function swListOwned(): Promise<SwOwnedNumber[]> {
  const r = await swRequest<{
    incoming_phone_numbers?: Array<{ sid?: string; phone_number?: string }>;
  }>('/IncomingPhoneNumbers.json?PageSize=50');
  if (!r.ok || !r.data) return [];
  return (r.data.incoming_phone_numbers || [])
    .filter((n) => n.sid && n.phone_number)
    .map((n) => ({
      sid: String(n.sid),
      e164: String(n.phone_number),
      friendly: friendlyE164(String(n.phone_number)),
    }));
}
