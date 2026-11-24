import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return serviceKey ? { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } : null;
}

type StoredOtp = {
  code?: string;
  email?: string;
  userId?: string;
  expiresAt?: number;
  tries?: number;
};

function parseOtpValue(raw: unknown): StoredOtp | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return null;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as StoredOtp;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    let body: {
      email?: string;
      phone?: string;
      identifier?: string;
      code?: string;
      otp?: string;
      password?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const rawInput = String(body.email || body.phone || body.identifier || '').trim().toLowerCase();
    const code = String(body.code || body.otp || '').replace(/\D/g, '');
    const password = String(body.password || body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (code.length !== 6) {
      return NextResponse.json({ error: 'Please enter the 6-digit verification code' }, { status: 400 });
    }
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match. Please re-enter.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const base = supabaseBase();
    const hdr = dbHeaders();
    if (!base || !hdr) {
      return NextResponse.json({ error: 'Auth backend is not configured' }, { status: 503 });
    }

    // Step 1: Look up by code directly
    let matchedRow: { key: string; value?: unknown } | null = null;
    const codeRes = await fetch(
      `${base}/rest/v1/admin_settings?key=eq.pwdotp:code:${encodeURIComponent(code)}&select=key,value&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (codeRes.ok) {
      const rows = (await codeRes.json().catch(() => [])) as Array<{ key: string; value?: unknown }>;
      if (rows.length > 0 && rows[0]) matchedRow = rows[0];
    }

    // Step 2: Fallback lookup by email / user ID
    if (!matchedRow && rawInput) {
      const candidates = [`pwdotp:email:${rawInput}`];
      let profileId = '';
      if (rawInput.includes('@')) {
        const pRes = await fetch(
          `${base}/rest/v1/profiles?email=ilike.${encodeURIComponent(rawInput)}&select=id&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (pRes.ok) {
          const pRows = (await pRes.json().catch(() => [])) as Array<{ id: string }>;
          if (pRows[0]?.id) profileId = pRows[0].id;
        }
      }
      if (profileId) {
        candidates.push(`pwdotp:user:${profileId}`);
        candidates.push(`pwdotp:${profileId}`);
      }

      for (const candKey of candidates) {
        if (matchedRow) break;
        const candRes = await fetch(
          `${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(candKey)}&select=key,value&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (candRes.ok) {
          const candRows = (await candRes.json().catch(() => [])) as Array<{ key: string; value?: unknown }>;
          if (candRows[0]) matchedRow = candRows[0];
        }
      }
    }

    if (!matchedRow) {
      return NextResponse.json({ error: 'This code has expired or is invalid. Please request a new code.' }, { status: 400 });
    }

    const otp = parseOtpValue(matchedRow.value);
    if (!otp || !otp.code) {
      return NextResponse.json({ error: 'This code has expired. Please request a new code.' }, { status: 400 });
    }

    const now = Date.now();
    const expiry = Number(otp.expiresAt) || 0;
    if (expiry > 0 && now > expiry) {
      return NextResponse.json({ error: 'This code has expired. Please request a new code.' }, { status: 400 });
    }

    if (otp.code !== code) {
      return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 400 });
    }

    // Resolve userId to update Supabase Auth
    let targetUserId = otp.userId || '';
    let targetEmail = otp.email || rawInput;

    if (!targetUserId && targetEmail) {
      const pRes = await fetch(
        `${base}/rest/v1/profiles?email=ilike.${encodeURIComponent(targetEmail)}&select=id,email&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (pRes.ok) {
        const pRows = (await pRes.json().catch(() => [])) as Array<{ id: string; email?: string }>;
        if (pRows[0]?.id) {
          targetUserId = pRows[0].id;
          if (pRows[0].email) targetEmail = pRows[0].email;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User account could not be resolved' }, { status: 404 });
    }

    // Update the password in Supabase Auth via Admin API
    const updRes = await fetch(`${base}/auth/v1/admin/users/${targetUserId}`, {
      method: 'PUT',
      headers: { ...hdr, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      cache: 'no-store',
    });

    if (!updRes.ok) {
      const errText = await updRes.text().catch(() => '');
      console.error('[auth/reset-password] admin update failed', errText);
      return NextResponse.json({ error: 'Could not update password. Please try again.' }, { status: 500 });
    }

    // Clean up all related OTP entries
    const keysToDelete = [
      `pwdotp:code:${code}`,
      `pwdotp:email:${targetEmail.toLowerCase()}`,
      `pwdotp:user:${targetUserId}`,
      `pwdotp:${targetUserId}`,
      matchedRow.key,
    ];

    for (const k of keysToDelete) {
      fetch(`${base}/rest/v1/admin_settings?key=eq.${encodeURIComponent(k)}`, {
        method: 'DELETE',
        headers: hdr,
        cache: 'no-store',
      }).catch(() => {});
    }

    // Send security notification email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && targetEmail) {
      const from = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'Verxor Security <no-reply@verxor.com>';
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: targetEmail,
          subject: 'Verxor Security Alert: Password Updated',
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table style="max-width:500px;background:#FFF;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);overflow:hidden;">
        <tr>
          <td style="height:4px;background:#1877F2;"></td>
        </tr>
        <tr><td style="padding:28px 28px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;width:44px;">
                <img src="https://www.verxor.com/brand/verxor-logo-electric.png" alt="Verxor" width="40" height="40" style="display:block;border-radius:10px;object-fit:cover;" />
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <span style="font-size:18px;font-weight:800;color:#0B1F4D;display:block;">Verxor</span>
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748B;">Security Advisory</span>
              </td>
            </tr>
          </table>
          <hr style="border:0;border-top:1px solid #F1F5F9;margin:18px 0;" />
          <h2 style="color:#0B1F4D;margin:0 0 12px;font-size:18px;font-weight:700;">Password Changed Successfully</h2>
          <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
            The password for your Verxor account (<strong>${targetEmail}</strong>) was successfully reset. You can now use your new password to log in.
          </p>
          <div style="background:#FEF2F2;border:1px solid #FEE2E2;border-radius:10px;padding:14px;margin:0 0 18px;">
            <p style="margin:0;font-size:12px;color:#991B1B;line-height:1.5;">
              <strong>Didn't make this change?</strong> If you did not authorize this password update, please contact our security team immediately at <a href="mailto:security@verxor.com" style="color:#DC2626;font-weight:600;">security@verxor.com</a>.
            </p>
          </div>
          <p style="color:#94A3B8;font-size:11px;margin:0;text-align:center;">&copy; 2026 Verxor Technologies. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
        }),
      }).catch((e) => console.warn('[auth/reset-password] alert email error', e));
    }

    return NextResponse.json({ ok: true, message: 'Password updated successfully' });
  } catch (e) {
    console.error('[auth/reset-password]', e);
    return NextResponse.json({ error: 'Could not reset password. Please try again.' }, { status: 500 });
  }
}
