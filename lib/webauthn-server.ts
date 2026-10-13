import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON, WebAuthnCredential } from '@simplewebauthn/server';
import { NextResponse } from 'next/server';

type Row = Record<string, any>;

function config() {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const rpID = process.env.WEBAUTHN_RP_ID;
  const origin = process.env.WEBAUTHN_ORIGIN;
  if (!base || !key || !anon || !rpID || !origin) return null;
  return { base, key, anon, rpID, origin };
}

export function webauthnConfigResponse() {
  return NextResponse.json({ error: 'Biometric login is not configured on the server.' }, { status: 503 });
}

export async function readJson(req: Request) {
  try { return await req.json() as Row; } catch { return {}; }
}

export async function sbRequest<T = Row[]>(path: string, init: RequestInit = {}): Promise<T> {
  const c = config();
  if (!c) throw new Error('WEBAUTHN_NOT_CONFIGURED');
  const res = await fetch(`${c.base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`SUPABASE_${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : []) as T;
}

export async function requireUser(req: Request) {
  const c = config();
  if (!c) throw new Error('WEBAUTHN_NOT_CONFIGURED');
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const res = await fetch(`${c.base}/auth/v1/user`, {
    headers: { apikey: c.anon, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return await res.json() as { id: string; email?: string };
}

export function getWebAuthnConfig() {
  const c = config();
  if (!c) throw new Error('WEBAUTHN_NOT_CONFIGURED');
  return { rpID: c.rpID, origin: c.origin };
}

export async function saveChallenge(challenge: string, purpose: 'registration' | 'authentication', userId: string | null) {
  await sbRequest('webauthn_challenges', {
    method: 'POST',
    body: JSON.stringify({ challenge, purpose, user_id: userId, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() }),
  });
}

export async function consumeChallenge(challenge: string, purpose: 'registration' | 'authentication', userId: string | null) {
  const q = new URLSearchParams({
    challenge: `eq.${challenge}`,
    purpose: `eq.${purpose}`,
    consumed_at: 'is.null',
    expires_at: `gt.${new Date().toISOString()}`,
    select: 'id,user_id',
  });
  q.set('user_id', userId ? `eq.${userId}` : 'is.null');
  const rows = await sbRequest<Row[]>(`webauthn_challenges?${q.toString()}`);
  if (!rows[0]) return false;
  const updated = await sbRequest<Row[]>(`webauthn_challenges?id=eq.${encodeURIComponent(rows[0].id)}&consumed_at=is.null&select=id`, {
    method: 'PATCH',
    body: JSON.stringify({ consumed_at: new Date().toISOString() }),
  });
  return updated.length === 1;
}

export async function findCredentials(userId?: string) {
  const q = new URLSearchParams({ select: 'id,user_id,credential_id,public_key,counter,transports,device_label' });
  if (userId) q.set('user_id', `eq.${userId}`);
  return await sbRequest<Row[]>(`webauthn_credentials?${q.toString()}`);
}

export type { AuthenticationResponseJSON, RegistrationResponseJSON, WebAuthnCredential };
export { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse };
