import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { findCredentials, getWebAuthnConfig, saveChallenge, webauthnConfigResponse } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cfg = getWebAuthnConfig();
    const credentials = await findCredentials();
    if (!credentials.length) {
      return NextResponse.json({ error: 'No biometric device is registered. Sign in with your PIN and register this device in Security settings.' }, { status: 404 });
    }
    const options = await generateAuthenticationOptions({
      rpID: cfg.rpID,
      allowCredentials: credentials.map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
      userVerification: 'required',
      timeout: 60000,
    });
    await saveChallenge(options.challenge, 'authentication', null);
    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    console.error('[webauthn/login-options]', error);
    return NextResponse.json({ error: 'Biometric login is temporarily unavailable.' }, { status: 500 });
  }
}
