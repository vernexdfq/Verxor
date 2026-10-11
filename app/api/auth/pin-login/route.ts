import { NextResponse } from 'next/server';

/**
 * Primex-style login: phone OR email + 4-digit PIN → session tokens.
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

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

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

    async function fetchProfile(query: string): Promise<Profile | null> {
      const res = await fetch(
        `${base}/rest/v1/profiles?${query}&select=id,email,phone,full_name,phone_country,country_code,pin_hash,tx_pin_hash&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (!res.ok) return null;
      const rows = (await res.json()) as Profile[];
      return rows[0] || null;
    }

    if (phoneRaw) {
      // Build candidate formats: +234..., 234..., last 10 digits, etc.
      const candidates = new Set<string>();
      candidates.add(`+${phoneRaw}`);
      candidates.add(phoneRaw);
      if (phoneRaw.startsWith('234') && phoneRaw.length >= 13) {
        candidates.add(`0${phoneRaw.slice(3)}`);
        candidates.add(phoneRaw.slice(3));
      }
      if (phoneRaw.startsWith('0') && phoneRaw.length >= 11) {
        candidates.add(`+234${phoneRaw.slice(1)}`);
        candidates.add(`234${phoneRaw.slice(1)}`);
      }
      // last 10 digits (Nigerian national without leading 0)
      const last10 = phoneRaw.slice(-10);
      if (last10.length === 10) {
        candidates.add(`+234${last10}`);
        candidates.add(`234${last10}`);
        candidates.add(`0${last10}`);
      }

      for (const p of candidates) {
        profile = await fetchProfile(`phone=eq.${encodeURIComponent(p)}`);
        if (profile) break;
      }

      // Fallback: ilike on trailing digits
      if (!profile && last10.length >= 9) {
        profile = await fetchProfile(`phone=like.*${last10}`);
      }
    }

    if (!profile && emailIn) {
      profile = await fetchProfile(`email=eq.${encodeURIComponent(emailIn)}`);
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

    // Verify PIN — try both PostgREST param styles
    let pinOk = false;
    for (const payload of [
      { plain: pin, hashed: storedHash },
      { p_plain: pin, p_hashed: storedHash },
    ]) {
      const verifyRes = await fetch(`${base}/rest/v1/rpc/verify_pin`, {
        method: 'POST',
        headers: { ...hdr, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (verifyRes.ok) {
        const result = await verifyRes.json();
        if (result === true) {
          pinOk = true;
          break;
        }
      }
    }

    if (!pinOk) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    let email = (profile.email || emailIn || '').trim().toLowerCase();
    if (!email) {
      const userRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
        headers: hdr,
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
      headers: { ...hdr, 'Content-Type': 'application/json' },
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
        { headers: hdr, cache: 'no-store' },
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
