/**
 * Client-side WebAuthn helpers for platform authenticators
 * (fingerprint on Android, Face ID / Touch ID on iPhone).
 *
 * Enrollment proves the device can unlock with biometrics.
 * Full server-side passkey login needs storing publicKey + credentialId in Supabase
 * (see SQL comment in security-page docs).
 */

const STORAGE_ENABLED = 'verxor-biometric-enabled';
const STORAGE_CRED = 'verxor-webauthn-cred-id';

export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlToBuffer(value: string): ArrayBuffer {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomChallenge(length = 32): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabledLocally(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_ENABLED) === '1';
  } catch {
    return false;
  }
}

export function getStoredCredentialId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_CRED);
  } catch {
    return null;
  }
}

export function clearBiometricLocal(): void {
  try {
    localStorage.removeItem(STORAGE_ENABLED);
    localStorage.removeItem(STORAGE_CRED);
  } catch {
    /* ignore */
  }
}

export type EnrollResult =
  | { ok: true; credentialId: string }
  | { ok: false; reason: 'unsupported' | 'cancelled' | 'failed'; message: string };

/**
 * Triggers the OS biometric sheet (fingerprint / Face ID / device PIN fallback)
 * and registers a platform credential on this device.
 */
export async function enrollPlatformBiometric(userId: string, displayName: string): Promise<EnrollResult> {
  const available = await isPlatformBiometricAvailable();
  if (!available) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'This device does not support Face ID or fingerprint for web login.',
    };
  }

  if (!window.isSecureContext) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Biometrics require a secure (HTTPS) connection.',
    };
  }

  const rpId = window.location.hostname;
  const userIdBytes = new TextEncoder().encode(userId.slice(0, 64));

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: {
          name: 'Verxor',
          id: rpId,
        },
        user: {
          id: userIdBytes,
          name: displayName || userId,
          displayName: displayName || 'Verxor user',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { ok: false, reason: 'cancelled', message: 'Biometric setup was cancelled.' };
    }

    const credentialId = bufferToBase64url(credential.rawId);
    try {
      localStorage.setItem(STORAGE_ENABLED, '1');
      localStorage.setItem(STORAGE_CRED, credentialId);
    } catch {
      /* ignore storage errors */
    }

    return { ok: true, credentialId };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'AbortError') {
      return { ok: false, reason: 'cancelled', message: 'Biometric setup was cancelled.' };
    }
    return {
      ok: false,
      reason: 'failed',
      message: 'Could not enable biometrics. Try again or use your PIN.',
    };
  }
}

/**
 * Optional: re-prompt biometrics to confirm the stored credential still works.
 */
export async function verifyPlatformBiometric(): Promise<boolean> {
  const credId = getStoredCredentialId();
  if (!credId || !(await isPlatformBiometricAvailable())) return false;

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64urlToBuffer(credId),
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
