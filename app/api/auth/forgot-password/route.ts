import { NextResponse } from 'next/server';

/**
 * Forgot password step 1: send a 6-digit OTP to the account email via Resend.
 * The OTP is stored in admin_settings (service role) with a 10-minute expiry.
 * Never reveals whether the account exists.
 *
 * Env: RESEND_API_KEY (required), RESEND_FROM (optional, defaults to Resend sandbox).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!base || !serviceKey) {
      return NextResponse.json({ error: 'Auth backend is not configured' }, { status: 503 });
    }
    if (!resendKey) {
      return NextResponse.json(
        { error: 'Email delivery is not configured yet. Please contact support.' },
        { status: 503 },
      );
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
      return NextResponse.json({ error: 'Could not check the account' }, { status: 500 });
    }
    const rows = (await profRes.json()) as Array<{ id: string }>;
    const profile = rows[0];
    if (!profile) {
      // Do not reveal account existence; pretend an email was sent.
      return NextResponse.json({ sent: true });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpKey = `pwdotp:${profile.id}`;
    const value = { code, expiresAt: Date.now() + 10 * 60 * 1000, tries: 0 };

    const upsertRes = await fetch(`${base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: otpKey, value }),
      cache: 'no-store',
    });
    if (!upsertRes.ok) {
      return NextResponse.json({ error: 'Could not start password reset' }, { status: 500 });
    }

    const from = process.env.RESEND_FROM || 'Verxor <onboarding@resend.dev>';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `Your Verxor verification code: ${code}`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
  <h2 style="color:#0F172A;margin:0 0 8px;">Verxor password reset</h2>
  <p style="color:#475569;font-size:14px;">Use this code to reset your Verxor account password. It expires in 10 minutes.</p>
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
    <span style="font-size:30px;font-weight:700;letter-spacing:6px;color:#1D4ED8;">${code}</span>
  </div>
  <p style="color:#64748B;font-size:12px;">If you did not request this, you can ignore this email and your password stays the same.</p>
</div>`,
      }),
    });

    if (!emailRes.ok) {
      console.error('[auth/forgot-password] resend failed', await emailRes.text().catch(() => ''));
      return NextResponse.json(
        { error: 'Could not send the code right now. Try again shortly.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ sent: true });
  } catch (e) {
    console.error('[auth/forgot-password]', e);
    return NextResponse.json({ error: 'Could not send reset code' }, { status: 500 });
  }
}
