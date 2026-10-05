/**
 * Cloud auth bridge — used by AuthFlow when NEXT_PUBLIC_SUPABASE_* is set.
 */
'use client';

import {
  fetchOwnProfile,
  getAuthSession,
  resetPinWithPassword,
  signInWithEmail,
  signInWithPhone,
  signUpWithEmail,
  supabaseAuthEnabled,
  verifyPinRpc,
  type ProfileRow,
} from '../../lib/supabase/auth';
import {
  displayNational,
  findCountry,
  homeCurrencyFor,
  isVtuEligible,
} from './countries';

export type CloudAuthSession = {
  authenticated: boolean;
  method: 'phone' | 'email';
  contact: string;
  name: string;
  username?: string;
  pin: string;
  password: string;
  phoneCountry?: string;
  dialCode?: string;
  homeCurrency?: 'NGN' | 'USD';
  vtuEligible?: boolean;
  balanceNgn?: number;
  balanceUsd?: number;
  email?: string;
};

export { supabaseAuthEnabled };

export function profileToSession(
  profile: ProfileRow | null,
  fallback: Partial<CloudAuthSession> = {},
): CloudAuthSession {
  const iso = profile?.phone_country || fallback.phoneCountry || 'NG';
  return {
    authenticated: false,
    method: fallback.method || 'phone',
    contact: profile?.phone || fallback.contact || profile?.email || '',
    name: profile?.full_name || fallback.name || '',
    username: profile?.username || fallback.username || '',
    pin: '',
    password: '',
    phoneCountry: iso,
    dialCode: findCountry(iso).dial,
    homeCurrency:
      (profile?.home_currency as 'NGN' | 'USD') ||
      fallback.homeCurrency ||
      homeCurrencyFor(iso),
    vtuEligible: isVtuEligible(iso),
    balanceNgn: profile?.balance_ngn ?? fallback.balanceNgn ?? 0,
    balanceUsd: profile?.balance_usd ?? fallback.balanceUsd ?? 0,
    email: profile?.email || fallback.email || '',
  };
}

export async function cloudBootSession(): Promise<CloudAuthSession | null> {
  if (!supabaseAuthEnabled()) return null;
  const session = await getAuthSession();
  if (!session) return null;
  const profile = await fetchOwnProfile();
  return profileToSession(profile, {
    method: profile?.email ? 'email' : 'phone',
    email: profile?.email || session.user.email || '',
  });
}

export async function cloudSignInPhone(e164: string, password: string) {
  const r = await signInWithPhone(e164, password);
  if (r.error) return { error: r.error };
  const profile = await fetchOwnProfile();
  return {
    session: profileToSession(profile, { method: 'phone', contact: e164 }),
    error: null as string | null,
  };
}

export async function cloudSignInEmail(email: string, password: string) {
  const r = await signInWithEmail(email, password);
  if (r.error) return { error: r.error };
  const profile = await fetchOwnProfile();
  return {
    session: profileToSession(profile, {
      method: 'email',
      email,
      contact: profile?.phone || email,
    }),
    error: null as string | null,
  };
}

export async function cloudSignUp(opts: {
  email: string;
  password: string;
  fullName: string;
  phoneE164: string;
  phoneCountry: string;
  pin: string;
}) {
  return signUpWithEmail(opts);
}

export async function cloudVerifyPin(pin: string) {
  return verifyPinRpc(pin);
}

export async function cloudResetPin(opts: {
  email?: string;
  phone?: string;
  password: string;
  newPin: string;
}) {
  return resetPinWithPassword(opts);
}

export { displayNational, findCountry, homeCurrencyFor, isVtuEligible };
