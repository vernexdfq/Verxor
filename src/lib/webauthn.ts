'use client';

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabledLocally(): boolean {
  try { return typeof window !== 'undefined' && localStorage.getItem('verxor-biometric-enabled') === '1'; }
  catch { return false; }
}

export function getStoredCredentialId(): string | null {
  try { return typeof window !== 'undefined' ? localStorage.getItem('verxor-webauthn-cred-id') : null; }
  catch { return null; }
}

export function clearBiometricLocal(): void {
  try {
    localStorage.removeItem('verxor-biometric-enabled');
    localStorage.removeItem('verxor-webauthn-cred-id');
  } catch {}
}

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Biometric request failed.');
  return body;
}

export type EnrollResult =
  | { ok: true; credentialId: string }
  | { ok: false; reason: 'unsupported' | 'cancelled' | 'failed'; message: string };

export async function enrollPlatformBiometric(_userId: string, _displayName: string, accessToken: string): Promise<EnrollResult> {
  if (!(await isPlatformBiometricAvailable())) {
    return { ok: false, reason: 'unsupported', message: 'This device does not support fingerprint or Face ID in this browser.' };
  }
  if (!window.isSecureContext) {
    return { ok: false, reason: 'unsupported', message: 'Biometrics require a secure HTTPS connection.' };
  }
  try {
    const optionsBody = await jsonOrThrow(await fetch('/api/auth/webauthn/register-options', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceLabel: /Android/i.test(navigator.userAgent) ? 'Android device' : /iPhone|iPad/i.test(navigator.userAgent) ? 'Apple device' : 'This device' }),
    }));
    const credential = await startRegistration({ optionsJSON: optionsBody.options });
    const verified = await jsonOrThrow(await fetch('/api/auth/webauthn/register-verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: credential,
        expectedChallenge: optionsBody.options.challenge,
        deviceLabel: optionsBody.deviceLabel,
      }),
    }));
    if (!verified.ok) throw new Error('Device registration was not confirmed.');
    try {
      localStorage.setItem('verxor-biometric-enabled', '1');
      localStorage.setItem('verxor-webauthn-cred-id', credential.id);
    } catch {}
    return { ok: true, credentialId: credential.id };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'AbortError') {
      return { ok: false, reason: 'cancelled', message: 'Biometric setup was cancelled.' };
    }
    return { ok: false, reason: 'failed', message: err instanceof Error ? err.message : 'Could not enable biometrics. Use your PIN and try again.' };
  }
}

export async function authenticateWithBiometric(): Promise<Record<string, unknown>> {
  if (!(await isPlatformBiometricAvailable())) throw new Error('Fingerprint or Face ID is not available on this device.');
  if (!window.isSecureContext) throw new Error('Biometrics require a secure HTTPS connection.');
  const optionsBody = await jsonOrThrow(await fetch('/api/auth/webauthn/login-options', { method: 'POST' }));
  const response = await startAuthentication({ optionsJSON: optionsBody.options });
  return await jsonOrThrow(await fetch('/api/auth/webauthn/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response, expectedChallenge: optionsBody.options.challenge }),
  }));
}
