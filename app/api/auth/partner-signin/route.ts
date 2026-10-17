import { NextResponse } from 'next/server';

/**
 * Partner sign-in: email OR phone + account password.
 * Returns tokens + profile. Client enters Partner Fund only (reseller_wallet).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password || '');
    const emailIn = String(body.email || '').trim().toLowerCase();
    const phoneRaw = String(body.phone || '').replace(/\D/g, '');

    if (!password || (!emailIn && phoneRaw.length < 8)) {
      return NextResponse.json(
        { error: 'Email or phone and password are required' },
        { status: 400 },
      );
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    let email = emailIn;
    let profile: {
      id: string;
      email?: string | null;
      phone?: string | null;
      full_name?: string | null;
      name?: string | null;
      phone_country?: string | null;
    } | null = null;

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    if (email) {
      const res = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,phone,full_name,name,phone_country&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows[0]) profile = rows[0];
      }
    }

    if (!profile && phoneRaw) {
      const variants = new Set<string>();
      variants.add(phoneRaw);
      variants.add(`+${phoneRaw}`);
      if (phoneRaw.startsWith('234') && phoneRaw.length >= 13) {
        variants.add(`0${phoneRaw.slice(3)}`);
        variants.add(`+${phoneRaw}`);
      }
      if (phoneRaw.startsWith('0')) {
        variants.add(`+234${phoneRaw.slice(1)}`);
        variants.add(`234${phoneRaw.slice(1)}`);
      }
      const last10 = phoneRaw.slice(-10);
      if (last10.length === 10) {
        variants.add(`+234${last10}`);
        variants.add(`0${last10}`);
      }
      for (const p of variants) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone,full_name,name,phone_country&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (!res.ok) continue;
        const rows = await res.json();
        if (rows[0]) {
          profile = rows[0];
          break;
        }
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'No account found. Create a normal account first, then use Partner login.' },
        { status: 404 },
      );
    }

    email = (profile.email || email || '').trim().toLowerCase();
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
        { error: 'This account has no email. Sign in with email or contact support.' },
        { status: 400 },
      );
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }
    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    try {
      await fetch(`${base}/rest/v1/reseller_wallet`, {
        method: 'POST',
        headers: {
          ...hdr,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: profile.id, balance: 0 }),
      });
    } catch {
      /* ignore */
    }

    let balanceNgn = 0;
    try {
      const balRes = await fetch(
        `${base}/rest/v1/reseller_wallet?user_id=eq.${profile.id}&select=balance&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (balRes.ok) {
        const rows = await balRes.json();
        balanceNgn = Number(rows[0]?.balance) || 0;
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email,
      phone: profile.phone || null,
      fullName: profile.full_name || profile.name || '',
      phoneCountry: profile.phone_country || 'NG',
      balanceNgn,
      mode: 'partner',
    });
  } catch (e) {
    console.error('[auth/partner-signin]', e);
    return NextResponse.json({ error: 'Partner sign in failed' }, { status: 500 });
  }
}
