import { NextResponse } from 'next/server';

/**
 * Forgot PIN: verify password, set new 4-digit PIN on profile.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone || body.phoneE164 || '').replace(/\D/g, '');
    const emailIn = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const newPin = String(body.newPin || body.pin || '');

    if (!password) {
      return NextResponse.json({ error: 'Enter your account password' }, { status: 400 });
    }
    if (!/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: 'Enter a new 4-digit PIN' }, { status: 400 });
    }
    if (!phoneRaw && !emailIn) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Auth backend is not configured' }, { status: 503 });
    }

    type Profile = {
      id: string;
      email?: string | null;
      phone?: string | null;
    };

    let profile: Profile | null = null;

    if (phoneRaw) {
      for (const p of [`+${phoneRaw}`, phoneRaw]) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone&limit=1`,
          {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            cache: 'no-store',
          },
        );
        if (!res.ok) continue;
        const rows = (await res.json()) as Profile[];
        if (rows[0]) {
          profile = rows[0];
          break;
        }
      }
    }

    if (!profile && emailIn) {
      const res = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(emailIn)}&select=id,email,phone&limit=1`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const rows = (await res.json()) as Profile[];
        if (rows[0]) profile = rows[0];
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 });
    }

    let email = (profile.email || emailIn || '').trim().toLowerCase();
    if (!email) {
      const userRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      if (userRes.ok) {
        const u = (await userRes.json()) as { email?: string };
        email = (u.email || '').trim().toLowerCase();
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'Account has no email on file' }, { status: 400 });
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Incorrect password. Try again.' }, { status: 401 });
    }

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      return NextResponse.json({ error: 'Incorrect password. Try again.' }, { status: 401 });
    }

    const pinHashRes = await fetch(`${base}/rest/v1/rpc/hash_pin`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plain: newPin }),
    });

    let pinHash: string | null = null;
    if (pinHashRes.ok) {
      const hashed = await pinHashRes.json();
      pinHash = typeof hashed === 'string' ? hashed : null;
    }

    if (pinHash) {
      await fetch(`${base}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          pin_hash: pinHash,
          tx_pin_hash: pinHash,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await fetch(`${base}/rest/v1/rpc/set_my_tx_pin`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_pin: newPin }),
      }).catch(() => null);
      await fetch(`${base}/rest/v1/rpc/set_transaction_pin`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_pin: newPin }),
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/reset-pin]', e);
    return NextResponse.json({ error: 'PIN reset failed' }, { status: 500 });
  }
}
