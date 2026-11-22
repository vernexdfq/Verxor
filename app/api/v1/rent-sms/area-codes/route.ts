import { NextResponse } from 'next/server';
import { textverifiedConfigured, tvAreaCodes } from '@/lib/providers/textverified';

/**
 * GET /api/v1/rent-sms/area-codes
 *   → the live Textverified US area-code list ({ code, place }).
 *   Cached in-process for 10 minutes; sorted by code.
 */
export const dynamic = 'force-dynamic';

let cache: { at: number; codes: { code: string; place: string }[] } | null = null;
const TTL = 10 * 60 * 1000;

export async function GET() {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ ok: true, areaCodes: cache.codes });
  }
  const { areaCodes, error } = await tvAreaCodes();
  if (!areaCodes.length) {
    return NextResponse.json(
      { ok: false, error: error || 'Could not load the area-code list right now.' },
      { status: 503 },
    );
  }
  const codes = areaCodes
    .map((a) => ({ code: a.code, place: a.place }))
    .sort((a, b) => a.code.localeCompare(b.code));
  cache = { at: Date.now(), codes };
  return NextResponse.json({ ok: true, areaCodes: codes });
}
