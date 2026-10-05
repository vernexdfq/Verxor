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

export async function signUpWithEmail(opts: {
  email: string;
  password: string;
  fullName: string;
  phoneE164: string;
  phoneCountry: string;
  pin: string;
}) {
  const sb = getSupabaseBrowser();
  if (!sb) return { error: 'Supabase is not configured' };

  const { data, error } = await sb.auth.signUp({
    email: opts.email,
    password: opts.password,
    options: {
      data: {
        full_name: opts.fullName,
        phone: opts.phoneE164,
        phone_country: opts.phoneCountry,
      },
    },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Could not create account' };

  await sb.from('profiles').upsert(
    {
      id: data.user.id,
      full_name: opts.fullName,
      phone: opts.phoneE164,
      email: opts.email,
      phone_country: opts.phoneCountry,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (data.session) {
    const pinRes = await sb.rpc('set_transaction_pin', { p_pin: opts.pin });
    if (pinRes.error) {
      const pinRes2 = await sb.rpc('set_transaction_pin', { new_pin: opts.pin });
      if (pinRes2.error) {
        return {
          error: `Account created but PIN could not be saved: ${pinRes2.error.message}`,
          user: data.user,
          session: data.session,
        };
      }
    }
  }

  return { user: data.user, session: data.session, error: null as string | null };
}

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabaseBrowser();
  if (!sb) return { error: 'Supabase is not configured' };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { session: data.session, user: data.user, error: null as string | null };
}

/** Phone + password via API (resolves phone → email server-side). */
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
  const sb = getSupabaseBrowser();
  const access_token = (body as { access_token?: string }).access_token;
  const refresh_token = (body as { refresh_token?: string }).refresh_token;
  if (sb && access_token && refresh_token) {
    const { error } = await sb.auth.setSession({ access_token, refresh_token });
    if (error) return { error: error.message };
    return { error: null as string | null };
  }
  const email = (body as { email?: string }).email;
  if (email) {
    return signInWithEmail(email, password);
  }
  return { error: 'Sign in failed' };
}

export async function signOutAuth() {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function verifyPinRpc(pin: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  let { data, error } = await sb.rpc('verify_transaction_pin', { input_pin: pin });
  if (error) {
    const second = await sb.rpc('verify_transaction_pin', { p_pin: pin });
    data = second.data;
    error = second.error;
  }
  if (error) return { ok: false, error: error.message };
  return { ok: data === true };
}

export async function setPinRpc(pin: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  if (!sb) return { ok: false, error: 'Supabase is not configured' };
  let { error } = await sb.rpc('set_transaction_pin', { p_pin: pin });
  if (error) {
    const second = await sb.rpc('set_transaction_pin', { new_pin: pin });
    error = second.error;
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resetPinWithPassword(opts: {
  email?: string;
  phone?: string;
  password: string;
  newPin: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (opts.email) {
    const r = await signInWithEmail(opts.email, opts.password);
    if (r.error) return { ok: false, error: 'Incorrect password' };
  } else if (opts.phone) {
    const r = await signInWithPhone(opts.phone, opts.password);
    if (r.error) return { ok: false, error: 'Incorrect password' };
  } else {
    return { ok: false, error: 'Missing account identifier' };
  }
  return setPinRpc(opts.newPin);
}
