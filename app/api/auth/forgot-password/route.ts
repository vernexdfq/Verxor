import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return 'your email';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    let body: { email?: string; phone?: string; identifier?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 });
    }

    const rawInput = (body.email || body.phone || body.identifier || '').trim();
    if (!rawInput) {
      return NextResponse.json({ error: 'Please enter your registered email or phone number' }, { status: 400 });
    }

    const base = supabaseBase();
    const hdr = dbHeaders();
    if (!base || !hdr) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    let profile: { id: string; email?: string; phone?: string; full_name?: string } | null = null;
    let resolvedEmail = '';

    if (rawInput.includes('@')) {
      const cleanEmail = rawInput.toLowerCase();
      // Case-insensitive email query
      const profRes = await fetch(
        `${base}/rest/v1/profiles?email=ilike.${encodeURIComponent(cleanEmail)}&select=id,email,phone,full_name&limit=1`,
        { headers: hdr, cache: 'no-store' },
      );
      if (profRes.ok) {
        const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; phone?: string; full_name?: string }>;
        profile = rows[0] || null;
        if (profile?.email) {
          resolvedEmail = profile.email.toLowerCase();
        }
      }
    } else {
      // Look up by phone number (clean digits, support both +digits and raw digits)
      const cleanDigits = rawInput.replace(/\D/g, '');
      const queries = [
        `phone=eq.${encodeURIComponent(cleanDigits)}`,
        `phone=eq.${encodeURIComponent('+' + cleanDigits)}`,
      ];
      if (cleanDigits.startsWith('234') && cleanDigits.length === 13) {
        queries.push(`phone=eq.${encodeURIComponent('0' + cleanDigits.slice(3))}`);
      } else if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
        queries.push(`phone=eq.${encodeURIComponent('234' + cleanDigits.slice(1))}`);
        queries.push(`phone=eq.${encodeURIComponent('+234' + cleanDigits.slice(1))}`);
      }

      for (const q of queries) {
        if (profile) break;
        const profRes = await fetch(
          `${base}/rest/v1/profiles?${q}&select=id,email,phone,full_name&limit=1`,
          { headers: hdr, cache: 'no-store' },
        );
        if (profRes.ok) {
          const rows = (await profRes.json().catch(() => [])) as Array<{ id: string; email?: string; phone?: string; full_name?: string }>;
          if (rows[0]) {
            profile = rows[0];
            if (profile.email) resolvedEmail = profile.email.toLowerCase();
          }
        }
      }
    }

    if (!profile || !resolvedEmail) {
      // Mask input to prevent user enumeration
      return NextResponse.json({
        sent: true,
        maskedEmail: rawInput.includes('@') ? maskEmail(rawInput) : 'your registered email',
      });
    }

    // Cryptographically secure 6-digit OTP code
    const code = String(crypto.randomInt(100000, 999999));
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity
    const payload = {
      code,
      email: resolvedEmail,
      userId: profile.id,
      expiresAt,
      tries: 0,
      createdAt: Date.now(),
    };

    // Store across redundant lookup keys with JSON stringified payload
    const settingsPayload = [
      { key: `pwdotp:code:${code}`, value: JSON.stringify(payload) },
      { key: `pwdotp:email:${resolvedEmail}`, value: JSON.stringify(payload) },
      { key: `pwdotp:user:${profile.id}`, value: JSON.stringify(payload) },
      { key: `pwdotp:${profile.id}`, value: JSON.stringify(payload) },
    ];

    await fetch(`${base}/rest/v1/admin_settings`, {
      method: 'POST',
      headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(settingsPayload),
      cache: 'no-store',
    });

    // Send email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const from = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'Verxor Security <no-reply@verxor.com>';
      const recipientName = profile.full_name?.trim() || 'Verxor Customer';

      await fetch('https://api.resend.com/emails', {
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
  <title>Verxor Password Reset Code</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background-color:#FFFFFF;border-radius:18px;border:1px solid #E2E8F0;box-shadow:0 12px 32px -8px rgba(15,23,42,0.06);overflow:hidden;">
          
          <!-- Top Accent Security Bar -->
          <tr>
            <td style="height:5px;background:linear-gradient(90deg, #1877F2 0%, #00D4FF 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:32px 32px 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;width:52px;">
                    <img src="https://www.verxor.com/brand/verxor-logo-electric.png" alt="Verxor" width="46" height="46" style="display:block;border-radius:12px;width:46px;height:46px;object-fit:cover;border:0;" />
                  </td>
                  <td style="vertical-align:middle;padding-left:14px;text-align:left;">
                    <span style="font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#0B1F4D;display:block;line-height:1.2;">Verxor</span>
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#64748B;display:block;margin-top:2px;">Security Center</span>
                  </td>
                  <td style="vertical-align:middle;text-align:right;">
                    <span style="display:inline-block;padding:4px 10px;background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:100px;font-size:11px;font-weight:600;color:#334155;">
                      🔒 OTP Verification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;"><hr style="border:0;border-top:1px solid #F1F5F9;margin:0;"></td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:28px 32px 24px 32px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0F172A;line-height:1.3;">
                Password Reset Verification Code
              </h1>
              
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#334155;">
                Hello <strong>${recipientName}</strong>,
              </p>

              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#334155;">
                We received a request to reset the password for your Verxor account. Use the single-use 6-digit verification code below to authorize this change:
              </p>

              <!-- High-Contrast Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#F0F6FF;border:1.5px solid #BFDBFE;border-radius:14px;padding:26px 20px;text-align:center;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1877F2;margin-bottom:8px;">
                      Your Single-Use Verification Code
                    </div>
                    <div style="font-family:'Courier New',Courier,monospace,sans-serif;font-size:38px;font-weight:800;letter-spacing:10px;color:#0B1F4D;margin:0;line-height:1.1;">
                      ${code}
                    </div>
                    <div style="font-size:12px;font-weight:500;color:#64748B;margin-top:10px;">
                      ⏱ Expires in <strong>15 minutes</strong> • Valid for one use only
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#475569;">
                Enter this code in your browser or mobile screen to set and confirm your new password. If your session is still open, return to it now.
              </p>

              <!-- Security Warning Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin:0 0 20px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:4px;">
                      ⚠️ Critical Security Advisory
                    </div>
                    <div style="font-size:12px;line-height:1.5;color:#78350F;">
                      Verxor will <strong>NEVER</strong> contact you via phone call, WhatsApp, or SMS requesting this verification code. Never share this code with anyone, including support staff.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">
                If you did not request this password reset, please disregard this email or report unauthorized access immediately to <a href="mailto:security@verxor.com" style="color:#1877F2;text-decoration:none;font-weight:600;">security@verxor.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:22px 32px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#64748B;">
                Verxor Technologies Limited • Digital Infrastructure & FinTech Services
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                Support: <a href="mailto:support@verxor.com" style="color:#1877F2;text-decoration:none;">support@verxor.com</a> • WhatsApp: 08141620644
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
    }

    return NextResponse.json({
      sent: true,
      maskedEmail: maskEmail(resolvedEmail),
    });
  } catch (err) {
    console.error('[forgot-password] unexpected error', err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
