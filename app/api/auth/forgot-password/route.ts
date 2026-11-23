import { NextResponse } from 'next/server';

function maskEmail(em: string): string {
  const parts = em.split('@');
  if (parts.length !== 2) return em;
  const [name, domain] = parts;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

/**
 * Forgot password step 1: send a 6-digit OTP to the account email via Resend.
 * Supports email or phone lookup.
 * The OTP is stored in admin_settings with a 10-minute expiry.
 * Never reveals whether the account exists.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawInput = String(body.email || body.identifier || '').trim();
    if (!rawInput) {
      return NextResponse.json({ error: 'Enter your email address or phone number' }, { status: 400 });
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
        { error: 'Email delivery service is currently unavailable. Please contact support.' },
        { status: 503 },
      );
    }

    const hdr = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    let profile: { id: string; email?: string; phone?: string; full_name?: string } | null = null;
    let resolvedEmail = '';

    if (rawInput.includes('@')) {
      resolvedEmail = rawInput.toLowerCase();
      const profRes = await fetch(
        `${base}/rest/v1/profiles?email=eq.${encodeURIComponent(resolvedEmail)}&select=id,email,phone,full_name&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; phone?: string; full_name?: string }>;
        profile = rows[0] || null;
      }
    } else {
      // Look up by phone number (clean digits, Nigerian or international)
      const cleanPhone = rawInput.replace(/\D/g, '');
      const profRes = await fetch(
        `${base}/rest/v1/profiles?phone=eq.${encodeURIComponent(cleanPhone)}&select=id,email,phone,full_name&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; phone?: string; full_name?: string }>;
        profile = rows[0] || null;
        if (profile?.email) {
          resolvedEmail = profile.email.toLowerCase();
        }
      }
    }

    if (!profile || !resolvedEmail) {
      // Do not reveal whether account exists; pretend code was dispatched
      return NextResponse.json({ sent: true, maskedEmail: rawInput.includes('@') ? maskEmail(rawInput) : 'your email' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpKey = `pwdotp:${profile.id}`;
    const value = {
      code,
      email: resolvedEmail,
      expiresAt: Date.now() + 10 * 60 * 1000,
      tries: 0,
    };

    const upsertRes = await fetch(`${base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...hdr, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: otpKey, value }),
      cache: 'no-store',
    });
    if (!upsertRes.ok) {
      return NextResponse.json({ error: 'Could not generate reset code' }, { status: 500 });
    }

    const from = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'Verxor <no-reply@verxor.com>';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: resolvedEmail,
        subject: `Your Verxor Reset Code: ${code}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verxor Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:18px;border:1px solid #E2E8F0;box-shadow:0 12px 32px -12px rgba(15,23,42,0.08);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:28px 28px 18px;border-bottom:1px solid #F1F5F9;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background:#1877F2;border-radius:10px;width:38px;height:38px;text-align:center;vertical-align:middle;">
                    <span style="color:#FFFFFF;font-weight:900;font-size:20px;line-height:38px;display:inline-block;">V</span>
                  </td>
                  <td style="padding-left:10px;text-align:left;">
                    <span style="font-size:20px;font-weight:800;letter-spacing:-0.03em;color:#0B1F4D;display:block;">Verxor</span>
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#64748B;display:block;">Security Center</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:28px;">
              <h2 style="margin:0 0 10px;font-size:20px;font-weight:700;color:#0B1F4D;text-align:center;">Password Reset Code</h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;text-align:center;">
                We received a request to reset your Verxor password. Enter the 6-digit verification code below to proceed:
              </p>
              
              <!-- Code Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F0F6FF;border:1px solid #BFDBFE;border-radius:14px;margin:16px 0 20px;">
                <tr>
                  <td style="padding:22px 16px;text-align:center;">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#1877F2;display:inline-block;padding-left:8px;">${code}</span>
                    <div style="margin-top:8px;font-size:12px;font-weight:600;color:#64748B;">Valid for 10 minutes</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748B;text-align:center;">
                After verifying this code on Verxor, you will be prompted to enter and confirm your new password.
              </p>

              <!-- Security Notice -->
              <div style="background:#F8FAFC;border-radius:10px;border-left:3px solid #94A3B8;padding:12px 14px;margin-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.45;color:#475569;">
                  <strong>Didn't request this?</strong> If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged. Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background:#F8FAFC;border-top:1px solid #F1F5F9;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748B;">
                Need help? Contact <a href="mailto:support@verxor.com" style="color:#1877F2;text-decoration:none;font-weight:600;">support@verxor.com</a>
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                &copy; ${new Date().getFullYear()} Verxor. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      }),
    });

    if (!emailRes.ok) {
      console.error('[auth/forgot-password] Resend delivery error', await emailRes.text().catch(() => ''));
      return NextResponse.json(
        { error: 'Could not send verification code at this time. Please try again shortly.' },
        { status: 503 },
      );
    }

    return NextResponse.json({
      sent: true,
      resolvedEmail,
      maskedEmail: maskEmail(resolvedEmail),
    });
  } catch (e) {
    console.error('[auth/forgot-password]', e);
    return NextResponse.json({ error: 'Could not send reset code' }, { status: 500 });
  }
}
