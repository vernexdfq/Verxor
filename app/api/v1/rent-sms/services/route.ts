import { NextResponse } from 'next/server';
import { tvServices, textverifiedConfigured } from '@/lib/providers/textverified';

/**
 * GET /api/v1/rent-sms/services
 *   → the Textverified service list (for the Service Rental picker).
 *   Cached in-process for 1 hour; sorted A–Z.
 */
export const dynamic = 'force-dynamic';

let cache: { at: number; names: string[] } | null = null;
const TTL = 60 * 60 * 1000; // provider lists change rarely; hour cache so nothing reloads all the time

export async function GET() {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ok: true, services: cache.names });
  }
  const { services, error } = await tvServices();
  if (!services.length) {
    return NextResponse.json(
      { ok: false, error: error || 'Could not load the service list right now.' },
      { status: 503 },
    );
  }
  const names = services.map((s) => s.serviceName).sort((a, b) => a.localeCompare(b));
  cache = { at: Date.now(), names };
  return NextResponse.json({ ok: true, services: names });
}
