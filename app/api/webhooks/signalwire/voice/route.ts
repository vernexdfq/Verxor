import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/signalwire/voice
 * SignalWire LaML voice webhook (set as the Voice URL on a rented number).
 * Voice calling flows (per-minute billing, outbound dialing) are not built
 * yet; this answers politely and hangs up so callers are never left hanging
 * and the number stays reachable/registered.
 */

export async function POST() {
  const laml =
    '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="woman">This number is not accepting calls right now. Please send a text message instead.</Say><Hangup/></Response>';
  return new NextResponse(laml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'SignalWire voice webhook. POST here from your number settings.' });
}
