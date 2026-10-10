/** Soft session unlock — skip PIN for up to 1 hour after a successful unlock. */

export const SESSION_UNLOCK_KEY = 'verxor-session-unlock';
export const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

export function touchSessionUnlock() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_UNLOCK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_UNLOCK_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at) || at <= 0) return false;
    return Date.now() - at < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

export function clearSessionUnlock() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}
