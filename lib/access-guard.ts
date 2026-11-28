import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * Admin flag lists (banned_users / frozen_users) live in admin_settings as a
 * JSON array of user ids. Shared by login routes (ban) and purchase routes
 * (freeze).
 */

/** Read an admin flag list (JSON array of user ids) from admin_settings. */
export async function adminUserList(key: string): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  try {
    const rows = (await sbSelect('admin_settings', `key=eq.${key}&select=value&limit=1`)) as Array<{
      value?: string;
    }>;
    const raw = rows?.[0]?.value;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** True when the user is on the banned list (login is refused everywhere). */
export async function isUserBanned(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return (await adminUserList('banned_users')).includes(userId);
}

/** True when the user is on the frozen list (logins fine, purchases blocked). */
export async function isUserFrozen(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return (await adminUserList('frozen_users')).includes(userId);
}
