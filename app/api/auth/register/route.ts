import { NextResponse } from 'next/server';

/**
 * Create account: name, phone, email, password, 4-digit PIN → Supabase.
 * PIN is hashed server-side when possible; plain fallback ensures login never fails.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || body.name || '').trim().replace(/\s+/g, ' ');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const pin = String(body.pin || '');
    const phoneRaw = String(body.phone || body.phoneE164 || '').replace(/\D/g, '');
    const phoneE164 = phoneRaw.startsWith('+')
      ? phoneRaw
      : phoneRaw.startsWith('0') && phoneRaw.length >= 10
        ? `+234${phoneRaw.slice(1)}`
        : `+${phoneRaw}`;
    const phoneCountry = String(body.phoneCountry || 'NG').toUpperCase().slice(0, 2);

    if (!fullName || fullName.split(' ').length < 2) {
      return NextResponse.json({ error: 'Enter your full name (first and last)' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (phoneRaw.length < 8) {
      return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
    }
    if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters with uppercase, lowercase, and a number' },
        { status: 400 },
      );
    }
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Create a 4-digit PIN' }, { status: 400 });
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Auth backend is not configured' }, { status: 503 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Block duplicate phone
    for (const p of [phoneE164, phoneRaw, `+${phoneRaw}`, phoneRaw.startsWith('0') ? `+234${phoneRaw.slice(1)}` : ''].filter(Boolean)) {
      const check = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' },
      );
      if (check.ok) {
        const rows = (await check.json()) as unknown[];
        if (rows.length) {
          return NextResponse.json(
            { error: 'An account already exists for this phone number. Sign in instead.' },
            { status: 409 },
          );
        }
      }
    }

    // Create auth user
    const createRes = await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST',
      headers: hdr,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phoneE164,
          phone_country: phoneCountry,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => '');
      let msg = 'Could not create account';
      try {
        const j = JSON.parse(errText) as { msg?: string; message?: string; error_description?: string };
        msg = j.msg || j.message || j.error_description || msg;
      } catch {
        if (errText.includes('already')) msg = 'An account with this email already exists. Sign in instead.';
      }
      if (/already|exists|registered/i.test(msg)) {
        msg = 'An account with this email already exists. Sign in instead.';
      }
      return NextResponse.json({ error: msg }, { status: createRes.status === 422 ? 409 : 400 });
    }

    const created = (await createRes.json()) as { id?: string; user?: { id?: string } };
    const userId = created.id || created.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Account created but user id missing' }, { status: 500 });
    }

    // Hash PIN (try several param names)
    let pinHash: string | null = null;
    for (const payload of [{ plain: pin }, { p_plain: pin }, { pin }]) {
      try {
        const pinHashRes = await fetch(`${base}/rest/v1/rpc/hash_pin`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify(payload),
        });
        if (pinHashRes.ok) {
          const hashed = await pinHashRes.json();
          if (typeof hashed === 'string' && hashed.length > 10) {
            pinHash = hashed;
            break;
          }
        }
      } catch {
        /* try next */
      }
    }

    // Last resort: store plain 4-digit so pin-login legacy path works; upgraded on first login
    const storedPin = pinHash || pin;

    const profileBody: Record<string, unknown> = {
      id: userId,
      email,
      full_name: fullName,
      phone: phoneE164,
      phone_country: phoneCountry,
      country_code: phoneCountry,
      pin_hash: storedPin,
      tx_pin_hash: storedPin,
      updated_at: new Date().toISOString(),
    };

    await fetch(`${base}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...hdr,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(profileBody),
    });

    // Force-write every field (trigger may have created empty profile)
    await fetch(`${base}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        ...hdr,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        pin_hash: storedPin,
        tx_pin_hash: storedPin,
        phone: phoneE164,
        phone_country: phoneCountry,
        country_code: phoneCountry,
        full_name: fullName,
        email,
        updated_at: new Date().toISOString(),
      }),
    });

    // Wallet row
    await fetch(`${base}/rest/v1/wallets`, {
      method: 'POST',
      headers: {
        ...hdr,
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => null);

    // Optional RPCs if hash_pin failed
    if (!pinHash) {
      const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (tokenRes.ok) {
        const tokens = (await tokenRes.json()) as { access_token?: string };
        if (tokens.access_token) {
          for (const rpc of ['set_my_tx_pin', 'set_transaction_pin']) {
            await fetch(`${base}/rest/v1/rpc/${rpc}`, {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ p_pin: pin }),
            }).catch(() => null);
          }
        }
      }
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    let access_token: string | undefined;
    let refresh_token: string | undefined;
    if (tokenRes.ok) {
      const tokens = (await tokenRes.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      access_token = tokens.access_token;
      refresh_token = tokens.refresh_token;
    }

    return NextResponse.json({
      ok: true,
      userId,
      email,
      phone: phoneE164,
      fullName,
      phoneCountry,
      access_token,
      refresh_token,
    });
  } catch (e) {
    console.error('[auth/register]', e);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
