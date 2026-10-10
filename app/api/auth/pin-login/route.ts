import { NextResponse } from 'next/server';

/**
 * Primex-style login: phone OR email + 4-digit PIN → session tokens.
 * Password is NOT required for daily login.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone || body.phoneE164 || '').replace(/\D/g, '');
    const emailIn = String(body.email || '').trim().toLowerCase();
    const pin = String(body.pin || '');

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Enter your 4-digit PIN' }, { status: 400 });
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
      full_name?: string | null;
      phone_country?: string | null;
      country_code?: string | null;
      pin_hash?: string | null;
      tx_pin_hash?: string | null;
    };

    let profile: Profile | null = null;

    if (phoneRaw) {
      for (const p of [`+${phoneRaw}`, phoneRaw]) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone,full_name,phone_country,country_code,pin_hash,tx_pin_hash&limit=1`,
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
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(emailIn)}&select=id,email,phone,full_name,phone_country,country_code,pin_hash,tx_pin_hash&limit=1`,
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
      return NextResponse.json(
        { error: 'No account found. Check your details or create an account.' },
        { status: 404 },
      );
    }

    const storedHash = profile.tx_pin_hash || profile.pin_hash;
    if (!storedHash) {
      return NextResponse.json(
        { error: 'PIN is not set for this account. Use Forgot PIN to set one.' },
        { status: 400 },
      );
    }

    const verifyRes = await fetch(`${base}/rest/v1/rpc/verify_pin`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plain: pin, hashed: storedHash }),
    });

    let pinOk = false;
    if (verifyRes.ok) {
      const result = await verifyRes.json();
      pinOk = result === true;
    } else {
      const alt = await fetch(`${base}/rest/v1/rpc/verify_pin`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_plain: pin, p_hashed: storedHash }),
      });
      if (alt.ok) {
        const result = await alt.json();
        pinOk = result === true;
      }
    }

    if (!pinOk) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'Account has no email on file. Contact support.' },
        { status: 400 },
      );
    }

    const linkRes = await fetch(`${base}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'magiclink', email }),
    });

    if (!linkRes.ok) {
      const t = await linkRes.text().catch(() => '');
      console.error('[auth/pin-login] generate_link', t);
      return NextResponse.json({ error: 'Could not open session. Try again.' }, { status: 500 });
    }

    const linkBody = (await linkRes.json()) as {
      properties?: { hashed_token?: string; email_otp?: string };
      hashed_token?: string;
      email_otp?: string;
    };
    const hashedToken = linkBody.properties?.hashed_token || linkBody.hashed_token || '';
    const emailOtp = linkBody.properties?.email_otp || linkBody.email_otp || '';

    let access_token: string | undefined;
    let refresh_token: string | undefined;

    if (hashedToken) {
      const verifyOtp = await fetch(`${base}/auth/v1/verify`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
      });
      if (verifyOtp.ok) {
        const sess = (await verifyOtp.json()) as { access_token?: string; refresh_token?: string };
        access_token = sess.access_token;
        refresh_token = sess.refresh_token;
      }
    }

    if (!access_token && emailOtp) {
      const verifyOtp = await fetch(`${base}/auth/v1/verify`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email, token: emailOtp }),
      });
      if (verifyOtp.ok) {
        const sess = (await verifyOtp.json()) as { access_token?: string; refresh_token?: string };
        access_token = sess.access_token;
        refresh_token = sess.refresh_token;
      }
    }

    if (!access_token || !refresh_token) {
      console.error('[auth/pin-login] no tokens after magic link');
      return NextResponse.json({ error: 'Could not open session. Try again.' }, { status: 500 });
    }

    let balanceNgn = 0;
    let balanceUsd = 0;
    try {
      const wRes = await fetch(
        `${base}/rest/v1/wallets?user_id=eq.${profile.id}&select=balance_ngn,balance_usd&limit=1`,
        {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
          cache: 'no-store',
        },
      );
      if (wRes.ok) {
        const rows = (await wRes.json()) as Array<{ balance_ngn?: number; balance_usd?: number }>;
        if (rows[0]) {
          balanceNgn = Number(rows[0].balance_ngn) || 0;
          balanceUsd = Number(rows[0].balance_usd) || 0;
        }
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      ok: true,
      access_token,
      refresh_token,
      email,
      phone: profile.phone || (phoneRaw ? `+${phoneRaw}` : null),
      fullName: profile.full_name || '',
      phoneCountry: profile.phone_country || profile.country_code || 'NG',
      balanceNgn,
      balanceUsd,
      userId: profile.id,
    });
  } catch (e) {
    console.error('[auth/pin-login]', e);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
