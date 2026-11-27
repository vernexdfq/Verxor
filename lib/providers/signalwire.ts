/**
 * SignalWire LaML REST client (Twilio-compatible API).
 *
 * Env (hosting / Vercel / Netlify):
 *   SIGNALWIRE_SPACE       e.g. "yourcompany.signalwire.com" (no https://)
 *   SIGNALWIRE_PROJECT_ID  the SignalWire project id
 *   SIGNALWIRE_API_TOKEN   the project API token
 *   NEXT_PUBLIC_SITE_URL or APP_URL  public https origin for webhooks
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
  const space = (process.env.SIGNALWIRE_SPACE || process.env.SIGNALWIRE_SPACE_URL || '').trim();
  const project = (process.env.SIGNALWIRE_PROJECT_ID || '').trim();
  const token = (process.env.SIGNALWIRE_API_TOKEN || '').trim();
  return Boolean(space && project && token);
}

function swSpaceHost(): string {
  let space = (process.env.SIGNALWIRE_SPACE || process.env.SIGNALWIRE_SPACE_URL || '').trim();
  space = space.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return space;
}

function swCredentials() {
  const space = swSpaceHost();
  const project = (process.env.SIGNALWIRE_PROJECT_ID || '').trim();
  const token = (process.env.SIGNALWIRE_API_TOKEN || '').trim();
  if (!space || !project || !token) throw new Error('SignalWire is not configured');
  const auth = Buffer.from(`${project}:${token}`).toString('base64');
  return { base: `https://${space}/api/laml/2010-04-01/Accounts/${project}`, auth };
}

/** Public site origin used to point numbers at our webhooks. */
export function publicSiteOrigin(): string {
  const raw =
    (process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      '').trim();
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, '');
}

export function defaultSmsWebhookUrl(): string {
  const origin = publicSiteOrigin();
  return origin ? `${origin}/api/webhooks/signalwire/sms` : '';
}

export function defaultVoiceWebhookUrl(): string {
  const origin = publicSiteOrigin();
  return origin ? `${origin}/api/webhooks/signalwire/voice` : '';
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

/**
 * Buy (provision) a number and point SMS + Voice at our webhooks when configured.
 * SmsUrl / VoiceUrl can be overridden; otherwise we use NEXT_PUBLIC_SITE_URL/APP_URL.
 */
export async function swBuyNumber(
  e164: string,
  opts?: { smsUrl?: string; voiceUrl?: string },
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const body: Record<string, string> = { PhoneNumber: e164 };
  const smsUrl = (opts?.smsUrl || defaultSmsWebhookUrl()).trim();
  const voiceUrl = (opts?.voiceUrl || defaultVoiceWebhookUrl()).trim();
  if (smsUrl) {
    body.SmsUrl = smsUrl;
    body.SmsMethod = 'POST';
  }
  if (voiceUrl) {
    body.VoiceUrl = voiceUrl;
    body.VoiceMethod = 'POST';
  }
  const r = await swRequest<{ sid?: string; phone_number?: string }>('/IncomingPhoneNumbers.json', {
    method: 'POST',
    body,
  });
  if (!r.ok || !r.data?.sid) {
    const msg = r.error || 'The number could not be purchased';
    return {
      ok: false,
      error: /2144|not available|capacity/i.test(msg)
        ? 'That number was just taken. Search again and pick another.'
        : msg,
    };
  }
  return { ok: true, sid: String(r.data.sid) };
}

/** Update an owned number's SMS / Voice webhook URLs. */
export async function swUpdateNumberWebhooks(
  sid: string,
  opts?: { smsUrl?: string; voiceUrl?: string },
): Promise<boolean> {
  const body: Record<string, string> = {};
  const smsUrl = (opts?.smsUrl || defaultSmsWebhookUrl()).trim();
  const voiceUrl = (opts?.voiceUrl || defaultVoiceWebhookUrl()).trim();
  if (smsUrl) {
    body.SmsUrl = smsUrl;
    body.SmsMethod = 'POST';
  }
  if (voiceUrl) {
    body.VoiceUrl = voiceUrl;
    body.VoiceMethod = 'POST';
  }
  if (!Object.keys(body).length) return false;
  const r = await swRequest(`/IncomingPhoneNumbers/${encodeURIComponent(sid)}.json`, {
    method: 'POST',
    body,
  });
  return r.ok;
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
