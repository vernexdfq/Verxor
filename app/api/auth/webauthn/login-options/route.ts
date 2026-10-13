import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getWebAuthnConfig, saveChallenge, webauthnConfigResponse } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const cfg = getWebAuthnConfig();

    // Use discoverable credentials (resident passkeys) so this public endpoint
    // never enumerates or returns credential IDs belonging to other users.
    const options = await generateAuthenticationOptions({
      rpID: cfg.rpID,
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
