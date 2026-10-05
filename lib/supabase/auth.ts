'use client';

import { getSupabaseBrowser, isSupabaseBrowserConfigured } from './client';

export type ProfileRow = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  balance_ngn?: number | null;
  balance_usd?: number | null;
  home_currency?: string | null;
  phone_country?: string | null;
};

export function supabaseAuthEnabled() {
  return isSupabaseBrowserConfigured();
}

export async function getAuthSession() {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ?? null;
}

export async function getAuthUser() {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function fetchOwnProfile(): Promise<ProfileRow | null> {
  const sb = getSupabaseBrowser();
  if (!sb) return null;
  const user = await getAuthUser();
  if (!user) return null;
  const { data, error } = await sb
    .from('profiles')
    .select(
      'id, full_name, username, phone, email, balance_ngn, balance_usd, home_currency, phone_country',
    )
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    console.warn('[verxor] profile fetch', error.message);
    return null;
  }
  return data as ProfileRow | null;
}

async function applySessionTokens(access_token?: string, refresh_token?: string) {
  const sb = getSupabaseBrowser();
  if (!sb || !access_token || !refresh_token) return { error: 'No session tokens' };
  const { error } = await sb.auth.setSession({ access_token, refresh_token });
  if (error) return { error: error.message };
  return { error: null as string | null };
}

/** Server signup: confirmed user + pin_hash (no email-confirm wait). */
export async function signUpWithEmail(opts: {
  email: string;
  password: string;
  fullName: string;
  phoneE164: string;
  phoneCountry: string;
  pin: string;
}) {
  if (!isSupabaseBrowserConfigured()) {
    return { error: 'Supabase is not configured' };
  }

  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: opts.email,
      password: opts.password,
      fullName: opts.fullName,
      phone: opts.phoneE164,
      phoneCountry: opts.phoneCountry,
      pin: opts.pin,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    email?: string;
    phone?: string;
  };

  if (!res.ok) {
    return { error: body.error || 'Sign up failed', session: null };
  }

  if (body.access_token && body.refresh_token) {
    const applied = await applySessionTokens(body.access_token, body.refresh_token);
    if (applied.error) {
      return { error: applied.error, session: null };
    }
    const session = await getAuthSession();
    return { error: null as string | null, session, user: session?.user ?? null };
  }

  return { error: null as string | null, session: null, user: null };
}

/** Primex-style: phone or email + 4-digit PIN → session. */
export async function signInWithPin(opts: {
  phone?: string;
  email?: string;
  pin: string;
}) {
  if (!isSupabaseBrowserConfigured()) {
    return { error: 'Supabase is not configured' };
  }

  const res = await fetch('/api/auth/pin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: opts.phone || '',
      email: opts.email || '',
      pin: opts.pin,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    profile?: ProfileRow & { full_name?: string | null };
  };

  if (!res.ok) {
    return { error: body.error || 'Incorrect PIN', profile: null };
  }

  const applied = await applySessionTokens(body.access_token, body.refresh_token);
  if (applied.error) {
    return { error: applied.error, profile: null };
  }

  return {
    error: null as string | null,
    profile: body.profile || null,
  };
}

export async function resetPinWithPassword(opts: {
  email?: string;
  phone?: string;
  password: string;
  newPin: string;
}) {
  if (!isSupabaseBrowserConfigured()) {
    return { ok: false, error: 'Supabase is not configured' };
  }

  const res = await fetch('/api/auth/reset-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: opts.email || '',
      phone: opts.phone || '',
      password: opts.password,
      newPin: opts.newPin,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: body.error || 'Could not reset PIN' };
  }
  return { ok: true, error: null as string | null };
}

export async function signOutAuth() {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.auth.signOut();
}

/** @deprecated Prefer signInWithPin for daily login */
export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return { error: 'Supabase is not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { session: data.session, user: data.user, error: null as string | null };
}

/** @deprecated Prefer signInWithPin */
export async function signInWithPhone(phoneE164: string, password: string) {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneE164, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: (body as { error?: string }).error || 'Sign in failed' };
  }
  const access_token = (body as { access_token?: string }).access_token;
  const refresh_token = (body as { refresh_token?: string }).refresh_token;
  return applySessionTokens(access_token, refresh_token);
}

export async function verifyPinRpc(candidate: string) {
  // Daily unlock after session already exists is not used in Primex flow;
  // PIN login goes through /api/auth/pin-login.
  return { ok: false, error: 'Use PIN login' };
}
