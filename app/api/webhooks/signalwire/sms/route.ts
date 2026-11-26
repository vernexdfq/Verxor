import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/signalwire/sms
 * SignalWire LaML SMS webhook (set as the Message URL on a rented number in
 * the SignalWire dashboard). Inbound SMS for an active rented line is stored
 * so the owner sees it in the Messages tab. The LaML response is empty:
 * we accept and store without auto-replying.
 */

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

const LAML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let from = '';
  let to = '';
  let body = '';
  let sid = '';
  try {
    let params: URLSearchParams;
    if (contentType.includes('application/json')) {
      const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      params = new URLSearchParams();
      for (const [k, v] of Object.entries(j)) params.set(k, String(v ?? ''));
    } else {
      const form = await req.text().catch(() => '');
      params = new URLSearchParams(form);
    }
    from = (params.get('From') || '').trim();
    to = (params.get('To') || '').trim();
    body = (params.get('Body') || '').trim();
    sid = (params.get('MessageSid') || params.get('SmsSid') || '').trim();
  } catch {
    /* parse failure — acknowledge so SignalWire does not retry */
  }

  if (to) {
    const base = supabaseBase();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (base && serviceKey) {
      try {
        const q = await fetch(
          `${base}/rest/v1/rented_lines?e164=eq.${encodeURIComponent(to)}&status=eq.active` +
            `&select=id,user_id,e164&order=created_at.desc&limit=1`,
          {
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
            cache: 'no-store',
          },
        );
        if (q.ok) {
          const rows = (await q.json()) as Array<{ id?: string; user_id?: string }>;
          const line = rows?.[0];
          if (line) {
            await fetch(`${base}/rest/v1/rent_line_messages`, {
              method: 'POST',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id: String(line.user_id || ''),
                line_id: String(line.id || ''),
                from_e164: from,
                to_e164: to,
                body: body || '',
                direction: 'inbound',
                provider_message_id: sid || null,
              }),
            }).catch(() => null);
          }
        }
      } catch {
        /* storage hiccup — still 200 so the provider does not retry-storm */
      }
    }
  }

  // Unknown numbers: accept silently (no retry storm, no data leak).
  return new NextResponse(LAML_EMPTY, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  // Health probe.
  return NextResponse.json({ ok: true, message: 'SignalWire SMS webhook. POST here from your number settings.' });
}
