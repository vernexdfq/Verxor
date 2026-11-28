import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/me/profile — update the signed-in user's full name + username.
 * Phone and email are NOT editable here (admin-only, per Verxor policy).
 * Username is unique server-side (profiles.username, case-insensitive).
 * Auth: Bearer Supabase access token.
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Auth backend is not configured' }, { status: 503 });
  }

  let body: { fullName?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const username = String(body.username || '').trim().toLowerCase();

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ ok: false, error: 'Enter your full name (at least 2 characters)' }, { status: 400 });
  }
  if (!/^[a-z0-9._]{3,20}$/.test(username)) {
    return NextResponse.json({ ok: false, error: 'Username must be 3-20 letters, numbers, . or _' }, { status: 400 });
  }

  try {
    // Resolve the caller from their access token
    const meRes = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!meRes.ok) {
      return NextResponse.json({ ok: false, error: 'Session expired. Sign in again.' }, { status: 401 });
    }
    const me = (await meRes.json()) as { id?: string };
    if (!me?.id) {
      return NextResponse.json({ ok: false, error: 'Session expired. Sign in again.' }, { status: 401 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Server-side uniqueness: any OTHER user holding this username?
    const takenRes = await fetch(
      `${base}/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id,username&limit=5`,
      { headers: hdr, cache: 'no-store' },
    );
    if (takenRes.ok) {
      const rows = (await takenRes.json()) as Array<{ id: string }>;
      const other = (rows || []).find((r) => String(r.id) !== String(me.id));
      if (other) {
        return NextResponse.json({ ok: false, error: 'That username is already taken. Try another.' }, { status: 409 });
      }
    }

    const patchRes = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(String(me.id))}`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify({ full_name: fullName, username, updated_at: new Date().toISOString() }),
    });
    if (!patchRes.ok) {
      const t = await patchRes.text().catch(() => '');
      // Unique index violation → friendly message
      if (/duplicate key|unique|23505/i.test(t)) {
        return NextResponse.json({ ok: false, error: 'That username is already taken. Try another.' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: 'Could not save. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fullName, username });
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not save. Please try again.' }, { status: 500 });
  }
}

/**
 * DELETE /api/me/profile — self-service account deletion ("type DELETE" flow).
 * Wipes every trace of the signed-in user, same as the admin delete-account:
 * orders, wallet + ledger, notifications, biometric credentials, flags,
 * the profile row and finally the Supabase AUTH user (so the credentials,
 * including any PIN hash, stop existing). Irreversible.
 * Auth: Bearer Supabase access token — only the owner can delete themselves.
 */
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Auth backend is not configured' }, { status: 503 });
  }

  // Resolve the caller's user id from their own token.
  let userId = '';
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
    }
    const u = (await res.json()) as { id?: string };
    userId = String(u.id || '');
  } catch {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });
  }

  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const del = async (table: string, filter: string): Promise<boolean> => {
    try {
      const res = await fetch(`${base}/rest/v1/${table}?${filter}`, {
        method: 'DELETE',
        headers: hdr,
        cache: 'no-store',
      });
      // 404 = table does not exist on this project — nothing to delete.
      return res.ok || res.status === 404;
    } catch {
      return false;
    }
  };
  const uid = encodeURIComponent(userId);

  const tables: Array<[string, string]> = [
    ['number_orders', `user_id=eq.${uid}`],
    ['gaming_orders', `user_id=eq.${uid}`],
    ['email_orders', `user_id=eq.${uid}`],
    ['service_orders', `user_id=eq.${uid}`],
    ['rented_lines', `user_id=eq.${uid}`],
    ['rent_line_messages', `user_id=eq.${uid}`],
    ['rent_sms_rentals', `user_id=eq.${uid}`],
    ['virtual_cards', `user_id=eq.${uid}`],
    ['virtual_accounts', `user_id=eq.${uid}`],
    ['notifications', `user_id=eq.${uid}`],
    ['referral_rewards', `user_id=eq.${uid}`],
    ['webauthn_credentials', `user_id=eq.${uid}`],
    ['webauthn_challenges', `user_id=eq.${uid}`],
    ['service_access', `user_id=eq.${uid}`],
    ['child_panels', `user_id=eq.${uid}`],
    ['reseller_wallet', `user_id=eq.${uid}`],
    ['wallet_ledger', `user_id=eq.${uid}`],
    ['transactions', `user_id=eq.${uid}`],
    ['wallets', `user_id=eq.${uid}`],
    ['admin_audit_log', `user_id=eq.${uid}`],
    ['profiles', `id=eq.${uid}`],
  ];

  const failures: string[] = [];
  for (const [table, filter] of tables) {
    if (!(await del(table, filter))) failures.push(table);
  }

  // Remove from admin flag lists (banned/frozen/api user ids).
  for (const key of ['banned_users', 'frozen_users', 'api_users']) {
    try {
      const rowRes = await fetch(`${base}/rest/v1/admin_settings?key=eq.${key}&select=value&limit=1`, {
        headers: hdr,
        cache: 'no-store',
      });
      if (rowRes.ok) {
        const rows = (await rowRes.json()) as Array<{ value?: string }>;
        const parsed = rows[0]?.value ? JSON.parse(rows[0].value) : [];
        if (Array.isArray(parsed) && parsed.includes(userId)) {
          const next = parsed.filter((v: unknown) => String(v) !== userId);
          await fetch(`${base}/rest/v1/admin_settings?key=eq.${key}`, {
            method: 'PATCH',
            headers: { ...hdr, Prefer: 'return=minimal', 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: JSON.stringify(next), updated_at: new Date().toISOString() }),
            cache: 'no-store',
          });
        }
      }
    } catch {
      /* best effort */
    }
  }

  // Chat: delete the user's messages, then their conversations.
  try {
    const convRes = await fetch(`${base}/rest/v1/chat_conversations?user_id=eq.${uid}&select=id&limit=500`, {
      headers: hdr,
      cache: 'no-store',
    });
    if (convRes.ok) {
      const convs = (await convRes.json()) as Array<{ id: string }>;
      if (convs.length) {
        const ids = convs.map((c) => `"${c.id}"`).join(',');
        await del('chat_messages', `conversation_id=in.(${ids})`);
      }
    }
    await del('chat_conversations', `user_id=eq.${uid}`);
  } catch {
    /* best effort */
  }

  // Finally remove the Supabase AUTH user so the credentials (email, phone,
  // PIN) no longer exist and cannot be used to sign in again.
  try {
    const authDel = await fetch(`${base}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE',
      headers: hdr,
      cache: 'no-store',
    });
    if (!authDel.ok && authDel.status !== 404) failures.push('auth_user');
  } catch {
    failures.push('auth_user');
  }

  if (failures.length) {
    console.error('[me/profile DELETE] partial failures for', userId, failures.join(','));
    return NextResponse.json(
      { ok: false, error: 'Your account could not be fully deleted. Contact support.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
