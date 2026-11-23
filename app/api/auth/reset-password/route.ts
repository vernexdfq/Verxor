import { NextResponse } from 'next/server';

/**
 * Forgot password step 3: verify the OTP and set the new password.
 * Deletes the OTP on success and sends a security confirmation email.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body.email || body.identifier || '').trim().toLowerCase();
    const code = String(body.code || body.otp || '').replace(/\D/g, '');
    const password = String(body.password || body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!rawInput) {
      return NextResponse.json({ error: 'Email address or phone number is required' }, { status: 400 });
    }
    if (code.length !== 6) {
      return NextResponse.json({ error: 'Enter the 6-digit code from the email' }, { status: 400 });
    }
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match. Please re-enter.' }, { status: 400 });
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

    let profile: { id: string; email?: string; full_name?: string } | null = null;
    if (rawInput.includes('@')) {
      const profRes = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(rawInput)}&select=id,email,full_name&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; full_name?: string }>;
        profile = rows[0] || null;
      }
    } else {
      const cleanPhone = rawInput.replace(/\D/g, '');
      const profRes = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(cleanPhone)}&select=id,email,full_name&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; full_name?: string }>;
        profile = rows[0] || null;
      }
    }

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
    const otpRows = (await otpRes.json().catch(() => [])) as Array<{
      key: string;
      value?: { code?: string; expiresAt?: number; tries?: number; email?: string };
    }>;
    const otp = otpRows[0]?.value;

    if (!otp || !otp.code || !otp.expiresAt || Date.now() > otp.expiresAt) {
      return NextResponse.json({ error: 'This code has expired. Request a new one.' }, { status: 400 });
    }

    if ((otp.tries || 0) >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 });
    }

    if (otp.code !== code) {
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

    // Set the new password on the Supabase Auth user
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

    // Consume the OTP
    await fetch(`${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(otpKey)}`, {
      method: 'DELETE',
      headers: hdr,
      cache: 'no-store',
    }).catch(() => {});

    // Send security notification email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const userEmail = profile.email || otp.email;
    if (resendKey && userEmail) {
      const from = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'Verxor <no-reply@verxor.com>';
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: userEmail,
          subject: 'Verxor Security Alert: Password Changed',
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table style="max-width:480px;background:#FFF;border-radius:16px;border:1px solid #E2E8F0;padding:28px;">
        <tr><td>
          <h2 style="color:#0B1F4D;margin:0 0 12px;font-size:20px;">Password Changed Successfully</h2>
          <p style="color:#475569;font-size:14px;line-height:1.5;">Your Verxor account password was recently updated. You can now use your new password to sign in.</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#991B1B;"><strong>Didn't make this change?</strong> If you did not update your password, contact us immediately at <a href="mailto:support@verxor.com" style="color:#DC2626;">support@verxor.com</a>.</p>
          </div>
          <p style="color:#94A3B8;font-size:11px;margin:20px 0 0;text-align:center;">&copy; ${new Date().getFullYear()} Verxor. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        }),
      }).catch((err) => console.error('[auth/reset-password] security email failed', err));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/reset-password]', e);
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 });
  }
}
