import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { consumeChallenge, getWebAuthnConfig, readJson, requireUser, sbRequest, webauthnConfigResponse } from '../../../../../lib/webauthn-server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Sign in again before registering this device.' }, { status: 401 });
    const body = await readJson(req);
    const response = body.response;
    const expectedChallenge = String(body.expectedChallenge || '');
    if (!response || !expectedChallenge) return NextResponse.json({ error: 'Registration response is incomplete.' }, { status: 400 });
    const cfg = getWebAuthnConfig();
    const validChallenge = await consumeChallenge(expectedChallenge, 'registration', user.id);
    if (!validChallenge) return NextResponse.json({ error: 'Registration expired. Please try again.' }, { status: 400 });
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: cfg.origin,
      expectedRPID: cfg.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Device verification failed.' }, { status: 400 });
    }
    const info = verification.registrationInfo;
    const credential = info.credential;
    const deviceLabel = String(body.deviceLabel || 'This device').slice(0, 80);
    await sbRequest('webauthn_credentials', {
      method: 'POST',
      body: JSON.stringify({
        user_id: user.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: credential.transports || [],
        device_label: deviceLabel,
      }),
    });
    return NextResponse.json({ ok: true, deviceLabel });
  } catch (error) {
    if (error instanceof Error && error.message === 'WEBAUTHN_NOT_CONFIGURED') return webauthnConfigResponse();
    console.error('[webauthn/register-verify]', error);
    return NextResponse.json({ error: 'Could not verify this device.' }, { status: 500 });
  }
}
