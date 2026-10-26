/** Server-only Resend email client. Configure RESEND_API_KEY in the deployment environment. */
export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM = 'Verxor <no-reply@verxor.com>';

export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not configured' };

  const to = payload.to.trim();
  if (!EMAIL_RE.test(to)) return { ok: false, error: 'Invalid recipient email address' };
  if (!payload.subject.trim() || payload.subject.length > 180) {
    return { ok: false, error: 'Invalid email subject' };
  }
  if (!payload.html || payload.html.length > 200_000) {
    return { ok: false, error: 'Invalid email content' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
      }),
      signal: AbortSignal.timeout(5_000),
    });

    const result = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!response.ok) {
      return {
        ok: false,
        error: `Resend rejected email (${response.status}): ${result.message || result.name || 'request failed'}`,
      };
    }
    return { ok: true, id: result.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Email request failed',
    };
  }
}
