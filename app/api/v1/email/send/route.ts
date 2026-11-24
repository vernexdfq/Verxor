import { NextRequest, NextResponse } from 'next/server';
import { resolvePanelClient } from '@/lib/panel-auth';
import { sendEmail } from '@/lib/email/resend';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/email/send
 * Authenticated email dispatch endpoint for child panels (e.g. vernexdigital).
 * Requires child panel API key (Bearer vx_panel_... or X-Api-Key) or admin authorization.
 */
export async function POST(req: NextRequest) {
  const panel = await resolvePanelClient(req);
  const internalSecret = req.headers.get('x-internal-secret') || '';
  const expectedSecret = process.env.ADMIN_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const isAuthorized = Boolean(panel) || (Boolean(expectedSecret) && internalSecret === expectedSecret);
  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized email relay' }, { status: 401 });
  }

  let body: {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { from, to, subject, html, text } = body;
  if (!to || !subject || !html) {
    return NextResponse.json({ ok: false, error: 'Missing required fields: to, subject, html' }, { status: 400 });
  }

  // Security check: Only allow sending from verified domains on our Resend account
  // e.g. verxor.com and vernexdigital.com
  const allowedDomains = ['verxor.com', 'vernexdigital.com'];
  if (from) {
    const fromDomainMatch = from.match(/@([a-zA-Z0-9.-]+)>?$/);
    const fromDomain = fromDomainMatch?.[1]?.toLowerCase();
    if (fromDomain && !allowedDomains.some((d) => fromDomain === d || fromDomain.endsWith(`.${d}`))) {
      return NextResponse.json({ ok: false, error: `Unauthorized sender domain: ${fromDomain}` }, { status: 403 });
    }
  }

  const res = await sendEmail({
    from,
    to,
    subject,
    html,
    text,
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: res.id });
}
