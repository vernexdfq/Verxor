import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { consumeChallenge, findCredentials, getWebAuthnConfig, readJson, sbRequest, webauthnConfigResponse } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

async function issueSession(base: string, serviceKey: string, anonKey: string, email: string) {
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const link = await fetch(`${base}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: hdr, body: JSON.stringify({ type: 'magiclink', email }),
  });
  if (!link.ok) throw new Error('SESSION_LINK_FAILED');
  const data = await link.json() as any;
  const tokenHash = data.properties?.hashed_token || data.hashed_token || '';
  const emailOtp = data.properties?.email_otp || data.email_otp || '';
  let session: any = null;
  if (tokenHash) {
    const res = await fetch(`${base}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
    });
    if (res.ok) session = await res.json();
  }
  if ((!session?.access_token || !session?.refresh_token) && emailOtp) {
    const res = await fetch(`${base}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email, token: emailOtp }),
    });
    if (res.ok) session = await res.json();
  }
  if (!session?.access_token || !session?.refresh_token) throw new Error('SESSION_TOKEN_FAILED');
  return session;
}

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const response = body.response;
    const expectedChallenge = String(body.expectedChallenge || '');
    if (!response || !expectedChallenge) return NextResponse.json({ error: 'Authentication response is incomplete.' }, { status: 400 });
    const cfg = getWebAuthnConfig();
    const credentials = await findCredentials();
    const rawId = String(response.id || '');
    const stored = credentials.find((c: any) => c.credential_id === rawId);
    if (!stored) return NextResponse.json({ error: 'This device is not registered. Use your PIN to sign in.' }, { status: 401 });
    const challengeOk = await consumeChallenge(expectedChallenge, 'authentication', null);
    if (!challengeOk) return NextResponse.json({ error: 'Login expired. Try fingerprint again.' }, { status: 400 });
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: cfg.origin,
      expectedRPID: cfg.rpID,
      credential: {
        id: stored.credential_id,
        publicKey: new Uint8Array(Buffer.from(stored.public_key, 'base64url')),
        counter: Number(stored.counter) || 0,
        transports: stored.transports || [],
      },
      requireUserVerification: true,
    });
    if (!verification.verified) return NextResponse.json({ error: 'Biometric verification failed.' }, { status: 401 });
    const updated = await sbRequest<any[]>(
      `webauthn_credentials?id=eq.${encodeURIComponent(stored.id)}&select=id`,
      { method: 'PATCH', body: JSON.stringify({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }) },
    );
    if (!updated.length) throw new Error('CREDENTIAL_UPDATE_FAILED');

    const c = {
      base: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, ''),
      key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    };
    const profiles = await sbRequest<any[]>(
      `profiles?id=eq.${encodeURIComponent(stored.user_id)}&select=id,email,phone,full_name,country_code&limit=1`,
    );
    const profile = profiles[0];
    if (!profile?.email || !c.base || !c.key || !c.anon) throw new Error('PROFILE_OR_AUTH_CONFIG_MISSING');
    const session = await issueSession(c.base, c.key, c.anon, profile.email);
    const wallets = await sbRequest<any[]>(
      `wallets?user_id=eq.${encodeURIComponent(profile.id)}&select=balance_ngn,balance_usd&limit=1`,
    );
    return NextResponse.json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      email: profile.email,
      phone: profile.phone || null,
      fullName: profile.full_name || '',
      phoneCountry: profile.country_code || 'NG',
      balanceNgn: Number(wallets[0]?.balance_ngn) || 0,
      balanceUsd: Number(wallets[0]?.balance_usd) || 0,
      userId: profile.id,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    console.error('[webauthn/login-verify]', error);
    return NextResponse.json({ error: 'Biometric login failed. Use your PIN instead.' }, { status: 500 });
  }
}
