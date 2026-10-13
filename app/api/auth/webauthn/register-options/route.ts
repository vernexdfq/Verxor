import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { findCredentials, getWebAuthnConfig, readJson, requireUser, saveChallenge, webauthnConfigResponse, sbRequest } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in again before registering this device.' }, { status: 401 });
    const body = await readJson(req);
    const cfg = getWebAuthnConfig();
    const profile = await sbRequest<Array<{ full_name?: string; email?: string }>>(
      `profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,email&limit=1`,
    );
    const credentials = await findCredentials(user.id);
    const options = await generateRegistrationOptions({
      rpName: 'Verxor',
      rpID: cfg.rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email || profile[0]?.email || user.id,
      userDisplayName: profile[0]?.full_name || user.email || 'Verxor user',
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      excludeCredentials: credentials.map((c: any) => ({
        id: c.credential_id,
        transports: c.transports || [],
      })),
      timeout: 60000,
    });
    await saveChallenge(options.challenge, 'registration', user.id);
    return NextResponse.json({ options, deviceLabel: String(body.deviceLabel || 'This device').slice(0, 80) });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    console.error('[webauthn/register-options]', error);
    return NextResponse.json({ error: 'Could not start device registration.' }, { status: 500 });
  }
}
