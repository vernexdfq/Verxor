import { NextResponse } from 'next/server';

/**
 * Forgot password step 2: verify the emailed 6-digit OTP code.
 * If valid, returns ok: true so the client can present the new password & confirm password fields.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body.email || body.identifier || '').trim().toLowerCase();
    const code = String(body.code || body.otp || '').replace(/\D/g, '');

    if (!rawInput) {
      return NextResponse.json({ error: 'Email address or phone number is required' }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: 'Enter the 6-digit code sent to your email' }, { status: 400 });
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

    let profile: { id: string; email?: string } | null = null;
    if (rawInput.includes('@')) {
      const profRes = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(rawInput)}&select=id,email&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string }>;
        profile = rows[0] || null;
      }
    } else {
      const cleanPhone = rawInput.replace(/\D/g, '');
      const profRes = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(cleanPhone)}&select=id,email&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string }>;
        profile = rows[0] || null;
      }
    }

    if (!profile) {
      return NextResponse.json({ error: 'Incorrect or expired verification code' }, { status: 400 });
    }

    const otpKey = `pwdotp:${profile.id}`;
    const otpRes = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(otpKey)}&select=key,value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!otpRes.ok) {
      return NextResponse.json({ error: 'Could not verify code' }, { status: 500 });
    }

    const otpRows = (await otpRes.json().catch(() => [])) as Array<{
      key: string;
      value?: { code?: string; expiresAt?: number; tries?: number; email?: string };
    }>;
    const otp = otpRows[0]?.value;

    if (!otp || !otp.code || !otp.expiresAt || Date.now() > otp.expiresAt) {
      return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
    }

    if ((otp.tries || 0) >= 5) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 429 });
    }

    if (otp.code !== code) {
      const newTries = (otp.tries || 0) + 1;
      await fetch(`${base}/rest/v1/admin_settings`, {
        method: 'POST',
        headers: { ...hdr, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({ key: otpKey, value: { ...otp, tries: newTries } }),
        cache: 'no-store',
      }).catch(() => {});
      const left = Math.max(0, 5 - newTries);
      return NextResponse.json(
        { error: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      verified: true,
      email: profile.email || rawInput,
    });
  } catch (e) {
    console.error('[auth/verify-reset-code]', e);
    return NextResponse.json({ error: 'Could not verify code' }, { status: 500 });
  }
}
