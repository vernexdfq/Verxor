import { NextResponse } from 'next/server';

/**
 * Phone + password sign-in.
 * Looks up profile by phone (service role), resolves Auth user email, signs in.
 * Returns access/refresh tokens for the browser client to setSession.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const password = String(body.password || '');
    if (phone.length < 8 || !password) {
      return NextResponse.json({ error: 'Phone and password required' }, { status: 400 });
    }

    const base = (
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      ''
    )
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    const phoneVariants = [`+${phone}`, phone];
    let profile: { id: string; email?: string | null; phone?: string | null } | null =
      null;

    for (const p of phoneVariants) {
      const res = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          cache: 'no-store',
        },
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<{
        id: string;
        email?: string | null;
        phone?: string | null;
      }>;
      if (rows[0]) {
        profile = rows[0];
        break;
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'No account found for this number. Check the number or create an account.' },
        { status: 404 },
      );
    }

    let email = (profile.email || '').trim().toLowerCase();
    if (!email) {
      const userRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: 'no-store',
      });
      if (userRes.ok) {
        const userBody = (await userRes.json()) as { email?: string };
        email = (userBody.email || '').trim().toLowerCase();
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: 'This account has no email on file. Sign in with email instead.' },
        { status: 400 },
      );
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: 'Incorrect password or account not found.' },
        { status: 401 },
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email,
    });
  } catch (e) {
    console.error('[auth/signin]', e);
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
  }
}
