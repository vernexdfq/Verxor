import { NextResponse } from 'next/server';
import { isUserBanned } from '@/lib/access-guard';

/**
 * Password sign-in for phone OR email.
 * Phone: looks up the profile (service role), resolves the Auth email, then
 * does a GoTrue password grant. Email: resolves the profile for display info
 * and does the password grant directly.
 * Returns access/refresh tokens for the browser client to setSession.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phoneRaw = String(body.phone || body.phoneE164 || '').replace(/\D/g, '');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!phoneRaw && !email) {
      return NextResponse.json({ error: 'Phone number or email required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!base || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
    }

    type Profile = {
      id: string;
      email?: string | null;
      phone?: string | null;
      full_name?: string | null;
      phone_country?: string | null;
      country_code?: string | null;
    };

    let profile: Profile | null = null;

    if (phoneRaw) {
      for (const p of [`+${phoneRaw}`, phoneRaw]) {
        const res = await fetch(
          `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(p)}&select=id,email,phone,full_name,phone_country,country_code&limit=1`,
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

    if (!profile && email) {
      const res = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,phone,full_name,phone_country,country_code&limit=1`,
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
        {
          error: phoneRaw
            ? 'No account found for this number. Check the number or create an account.'
            : 'No account found for this email. Check the address or create an account.',
        },
        { status: 404 },
      );
    }

    // Banned by admin: no login, generic message.
    if (await isUserBanned(profile.id)) {
      return NextResponse.json(
        { error: 'Something went wrong. Contact support.' },
        { status: 403 },
      );
    }

    let authEmail = (profile.email || '').trim().toLowerCase();
    if (!authEmail) {
      const userRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        cache: 'no-store',
      });
      if (userRes.ok) {
        const userBody = (await userRes.json()) as { email?: string };
        authEmail = (userBody.email || '').trim().toLowerCase();
      }
    }

    if (!authEmail) {
      return NextResponse.json(
        { error: 'This account has no email on file. Contact support.' },
        { status: 400 },
      );
    }

    const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: authEmail, password }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      userId: profile.id,
      email: authEmail,
      phone: profile.phone || null,
      fullName: profile.full_name || null,
      phoneCountry: profile.phone_country || profile.country_code || null,
    });
  } catch (e) {
    console.error('[auth/password-login]', e);
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 });
  }
}
