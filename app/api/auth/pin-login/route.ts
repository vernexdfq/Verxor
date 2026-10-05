import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

function env(name: string) {
  return (process.env[name] || '').trim();
}

function baseUrl() {
  return (
    env('SUPABASE_URL') ||
    env('NEXT_PUBLIC_SUPABASE_URL') ||
    ''
  ).replace(/\/$/, '');
}

function serviceKey() {
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

function anonKey() {
  return env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
}

type ProfileHit = {
  id: string;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  pin_hash?: string | null;
  phone_country?: string | null;
  balance_ngn?: number | null;
  balance_usd?: number | null;
  username?: string | null;
};

async function findProfile(
  base: string,
  service: string,
  opts: { phone?: string; email?: string },
): Promise<ProfileHit | null> {
  const select =
    'id,email,phone,full_name,pin_hash,phone_country,balance_ngn,balance_usd,username';

  if (opts.email) {
    const em = opts.email.trim().toLowerCase();
    const res = await fetch(
      `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(em)}&select=${select}&limit=1`,
      {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
        cache: 'no-store',
      },
    );
    if (res.ok) {
      const rows = (await res.json()) as ProfileHit[];
      if (rows[0]) return rows[0];
    }
  }

  if (opts.phone) {
    const digits = opts.phone.replace(/\D/g, '');
    const variants = Array.from(
      new Set([
        opts.phone.startsWith('+') ? opts.phone : `+${digits}`,
        digits,
        `+${digits}`,
      ]),
    );
    for (const p of variants) {
      const res = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=${select}&limit=1`,
        {
          headers: { apikey: service, Authorization: `Bearer ${service}` },
          cache: 'no-store',
        },
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as ProfileHit[];
      if (rows[0]) return rows[0];
    }
  }

  return null;
}

async function sessionForEmail(
  base: string,
  service: string,
  anon: string,
  email: string,
): Promise<{ access_token?: string; refresh_token?: string; error?: string }> {
  // Magic-link style session without sending email
  const linkRes = await fetch(`${base}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'magiclink', email }),
  });

  if (!linkRes.ok) {
    const text = await linkRes.text().catch(() => '');
    console.error('[pin-login] generate_link', linkRes.status, text.slice(0, 200));
    return { error: 'Could not start session' };
  }

  const linkBody = (await linkRes.json()) as {
    hashed_token?: string;
    email_otp?: string;
    properties?: { hashed_token?: string; email_otp?: string };
  };
  const token_hash =
    linkBody.hashed_token ||
    linkBody.properties?.hashed_token ||
    linkBody.email_otp ||
    linkBody.properties?.email_otp;

  if (!token_hash) {
    return { error: 'Could not start session' };
  }

  const verifyRes = await fetch(`${base}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      token_hash,
    }),
  });

  if (!verifyRes.ok) {
    // Fallback: try type email
    const verify2 = await fetch(`${base}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email',
        token_hash,
      }),
    });
    if (!verify2.ok) {
      const text = await verifyRes.text().catch(() => '');
      console.error('[pin-login] verify', verifyRes.status, text.slice(0, 200));
      return { error: 'Could not start session' };
    }
    const tokens = (await verify2.json()) as {
      access_token?: string;
      refresh_token?: string;
    };
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  const tokens = (await verifyRes.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

/**
 * Primex / OPay style login: phone OR email + 4-digit PIN.
 * No password on the login screen.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin = String(body.pin || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim().toLowerCase();

    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Enter your 4-digit PIN' }, { status: 400 });
    }
    if (!phone && !email) {
      return NextResponse.json({ error: 'Phone or email required' }, { status: 400 });
    }

    const base = baseUrl();
    const service = serviceKey();
    const anon = anonKey();
    if (!base || !service || !anon) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    const profile = await findProfile(base, service, { phone, email });
    if (!profile) {
      return NextResponse.json(
        { error: 'Incorrect PIN or account not found' },
        { status: 401 },
      );
    }

    if (!profile.pin_hash) {
      return NextResponse.json(
        {
          error:
            'PIN is not set for this account. Use Forgot PIN with your password, or create a new account.',
        },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(pin, profile.pin_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    let accountEmail = (profile.email || email || '').trim().toLowerCase();
    if (!accountEmail) {
      const userRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
        cache: 'no-store',
      });
      if (userRes.ok) {
        const u = (await userRes.json()) as { email?: string };
        accountEmail = (u.email || '').trim().toLowerCase();
      }
    }
    if (!accountEmail) {
      return NextResponse.json(
        { error: 'This account has no email on file' },
        { status: 400 },
      );
    }

    const session = await sessionForEmail(base, service, anon, accountEmail);
    if (session.error || !session.access_token || !session.refresh_token) {
      return NextResponse.json(
        { error: session.error || 'Could not start session' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      profile: {
        id: profile.id,
        email: accountEmail,
        phone: profile.phone,
        full_name: profile.full_name,
        username: profile.username,
        phone_country: profile.phone_country,
        balance_ngn: profile.balance_ngn ?? 0,
        balance_usd: profile.balance_usd ?? 0,
      },
    });
  } catch (e) {
    console.error('[auth/pin-login]', e);
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
  }
}
