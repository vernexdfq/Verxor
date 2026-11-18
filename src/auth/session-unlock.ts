/**
 * Persistent soft session unlock.
 * "Remember me" keeps the user signed in for 30 days (localStorage);
 * when it is off the session lives in sessionStorage and dies with the tab.
 * Explicit logout clears both stores.
 */

export const SESSION_UNLOCK_KEY = 'verxor-session-unlock';
export const SESSION_PROFILE_KEY = 'verxor-session-profile';
export const SESSION_TOKENS_KEY = 'verxor-session-tokens';
export const REMEMBER_KEY = 'verxor-remember-me';

const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function ls(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function ss(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getRememberPreference(): boolean {
  const s = ls();
  if (!s) return true;
  try {
    return s.getItem(REMEMBER_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRememberPreference(remember: boolean) {
  const s = ls();
  if (!s) return;
  try {
    s.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* ignore */
  }
  // When switching modes, migrate any existing session to the right store.
  const from = remember ? ss() : ls();
  const to = remember ? ls() : ss();
  if (!from || !to) return;
  try {
    for (const key of [SESSION_UNLOCK_KEY, SESSION_PROFILE_KEY, SESSION_TOKENS_KEY]) {
      const raw = from.getItem(key);
      if (raw) {
        to.setItem(key, raw);
        from.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Where new session data should be written. */
function pickStore(): Storage | null {
  return getRememberPreference() ? ls() : ss();
}

function readUnlock(): { at: number; persistent: boolean } | null {
  const l = ls();
  if (l) {
    try {
      const raw = l.getItem(SESSION_UNLOCK_KEY);
      if (raw) {
        const at = Number(raw);
        if (Number.isFinite(at) && at > 0) {
          if (Date.now() - at > REMEMBER_MS) {
            clearSessionUnlock();
            return null;
          }
          return { at, persistent: true };
        }
      }
    } catch {
      /* ignore */
    }
  }
  const s = ss();
  if (s) {
    try {
      const raw = s.getItem(SESSION_UNLOCK_KEY);
      if (raw) {
        const at = Number(raw);
        if (Number.isFinite(at) && at > 0) return { at, persistent: false };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function touchSessionUnlock() {
  const s = pickStore();
  if (!s) return;
  try {
    s.setItem(SESSION_UNLOCK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isSessionUnlocked(): boolean {
  return readUnlock() !== null;
}

export function clearSessionUnlock() {
  for (const s of [ls(), ss()]) {
    if (!s) continue;
    try {
      s.removeItem(SESSION_UNLOCK_KEY);
      s.removeItem(SESSION_PROFILE_KEY);
      s.removeItem(SESSION_TOKENS_KEY);
    } catch {
      /* ignore */
    }
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
  const s = pickStore();
  if (!s) return;
  try {
    s.setItem(SESSION_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
  touchSessionUnlock();
}

export function loadSessionProfile(): StoredSessionProfile | null {
  if (!isSessionUnlocked()) return null;
  const raw1 = ss()?.getItem(SESSION_PROFILE_KEY) || '';
  const raw2 = ls()?.getItem(SESSION_PROFILE_KEY) || '';
  const raw = raw1 || raw2;
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as StoredSessionProfile;
    if (!p || typeof p.name !== 'string' || typeof p.contact !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}

export function saveSessionTokens(tokens: { access_token?: string; refresh_token?: string }) {
  if (!tokens.access_token && !tokens.refresh_token) return;
  const s = pickStore();
  if (!s) return;
  try {
    s.setItem(SESSION_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    /* ignore */
  }
}

export function loadSessionTokens(): { access_token?: string; refresh_token?: string } | null {
  if (!isSessionUnlocked()) return null;
  const raw1 = ss()?.getItem(SESSION_TOKENS_KEY) || '';
  const raw2 = ls()?.getItem(SESSION_TOKENS_KEY) || '';
  const raw = raw1 || raw2;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { access_token?: string; refresh_token?: string };
  } catch {
    return null;
  }
}
