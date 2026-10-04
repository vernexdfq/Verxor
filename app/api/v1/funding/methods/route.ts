import { NextResponse } from 'next/server';

/**
 * Funding bank accounts for the Fund page.
 * Returns empty until a payment provider is connected.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    banks: [],
  });
}
