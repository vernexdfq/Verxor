import { NextResponse } from 'next/server';

/**
 * Forgot password step 2: verify the emailed OTP and set a new password.
 * OTP lives in admin_settings under pwdotp:<userId> with 10-minute expiry,
 * max 5 attempts, and is deleted on success.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || body.otp || '').replace(/\D/g, '');
    const password = String(body.password || body.newPassword || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: 'Enter the 6-digit code from the email' }, { status: 400 });
    }
    if (password.length < 6 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters with uppercase, lowercase, and a number' },
        { status: 400 },
      );
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !serviceKey) {
      return NextResponse.json({ error: 'Auth backend is not configured' }, { status: 503 });
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const profRes = await fetch(
      `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!profRes.ok) {
      return NextResponse.json({ error: 'Could not verify the code' }, { status: 500 });
    }
    const rows = (await profRes.json()) as Array<{ id: string }>;
    const profile = rows[0];
    if (!profile) {
      return NextResponse.json({ error: 'Incorrect or expired code.' }, { status: 400 });
    }

    const otpKey = `pwdotp:${profile.id}`;
    const otpRes = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(otpKey)}&select=key,value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!otpRes.ok) {
      return NextResponse.json({ error: 'Could not verify the code' }, { status: 500 });
    }
    const otpRows = (await otpRes.json()) as Array<{ key: string; value?: { code?: string; expiresAt?: number; tries?: number } }>;
    const otp = otpRows[0]?.value;

    if (!otp || !otp.code || !otp.expiresAt || Date.now() > otp.expiresAt) {
      return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
    }

    if ((otp.tries || 0) >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (otp.code !== code) {
      // Bump the attempt counter (upsert merge keeps expiry).
      await fetch(`${base}/rest/v1/admin_settings`, {
        method: 'POST',
        headers: { ...hdr, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ key: otpKey, value: { ...otp, tries: (otp.tries || 0) + 1 } }),
        cache: 'no-store',
      }).catch(() => {});
      return NextResponse.json(
        { error: `Incorrect code. ${4 - (otp.tries || 0)} attempts left.` },
        { status: 400 },
      );
    }

    // Set the new password on the Auth user.
    const updRes = await fetch(`${base}/auth/v1/admin/users/${profile.id}`, {
      method: 'PUT',
      headers: hdr,
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });
    if (!updRes.ok) {
      console.error('[auth/reset-password] update failed', await updRes.text().catch(() => ''));
      return NextResponse.json({ error: 'Could not save the new password. Try again.' }, { status: 500 });
    }

    // Consume the OTP.
    await fetch(`${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(otpKey)}`, {
      method: 'DELETE',
      headers: hdr,
      cache: 'no-store',
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/reset-password]', e);
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }
}
