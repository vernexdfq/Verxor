import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/signalwire/voice
 * SignalWire LaML voice webhook (set as Voice URL when we buy a number).
 * Stores an inbound call row for Call History, then answers with a short
 * message and hangs up until full outbound/inbound bridging is wired.
 */

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  let from = '';
  let to = '';
  let callSid = '';
  let callStatus = '';
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
    callSid = (params.get('CallSid') || '').trim();
    callStatus = (params.get('CallStatus') || 'ringing').trim();
  } catch {
    /* still respond with LaML */
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
            await fetch(`${base}/rest/v1/rent_line_calls`, {
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
                direction: 'inbound',
                status: callStatus || 'ringing',
                provider_call_id: callSid || null,
                duration_seconds: 0,
              }),
            }).catch(() => null);
          }
        }
      } catch {
        /* still return LaML */
      }
    }
  }

  const laml =
    '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="woman">This Verxor number is not accepting live calls right now. Please send a text message instead.</Say><Hangup/></Response>';
  return new NextResponse(laml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'SignalWire voice webhook. Point number Voice URL here.',
  });
}
