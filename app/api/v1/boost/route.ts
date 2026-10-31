import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Temporary stub while full route is restored — fails closed. */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { ok: false, error: 'Boost route restoring — please retry in a moment' },
    { status: 503 },
  );
}
