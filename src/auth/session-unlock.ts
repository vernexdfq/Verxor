/** Persistent soft session unlock.
 * Survives browser refresh and tab close. Explicit logout clears it.
 */

export const SESSION_UNLOCK_KEY = 'verxor-session-unlock';
export const SESSION_PROFILE_KEY = 'verxor-session-profile';
export const SESSION_TOKENS_KEY = 'verxor-session-tokens';
// The user remains unlocked until explicit logout clears this key.

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function touchSessionUnlock() {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SESSION_UNLOCK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isSessionUnlocked(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const raw = s.getItem(SESSION_UNLOCK_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && at > 0;
  } catch {
    return false;
  }
}

export function clearSessionUnlock() {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(SESSION_UNLOCK_KEY);
    s.removeItem(SESSION_PROFILE_KEY);
    s.removeItem(SESSION_TOKENS_KEY);
  } catch {
    /* ignore */
  }
}

export type StoredSessionProfile = {
  name: string;
  contact: string;
  email?: string;
  method: 'phone' | 'email';
  phoneCountry?: string;
  dialCode?: string;
  homeCurrency?: 'NGN' | 'USD';
  vtuEligible?: boolean;
  balanceNgn?: number;
  balanceUsd?: number;
  userId?: string;
};

export function saveSessionProfile(profile: StoredSessionProfile) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
    touchSessionUnlock();
  } catch {
    /* ignore */
  }
}

export function loadSessionProfile(): StoredSessionProfile | null {
  if (!isSessionUnlocked()) return null;
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SESSION_PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredSessionProfile;
    if (!p || typeof p.name !== 'string' || typeof p.contact !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}

export function saveSessionTokens(tokens: { access_token?: string; refresh_token?: string }) {
  const s = storage();
  if (!s) return;
  if (!tokens.access_token && !tokens.refresh_token) return;
  try {
    s.setItem(SESSION_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    /* ignore */
  }
}

export function loadSessionTokens(): { access_token?: string; refresh_token?: string } | null {
  if (!isSessionUnlocked()) return null;
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SESSION_TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { access_token?: string; refresh_token?: string };
  } catch {
    return null;
  }
}
