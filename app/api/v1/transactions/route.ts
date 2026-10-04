import { NextResponse } from 'next/server';

/**
 * User transaction ledger.
 * Empty until wallet_ledger is queried from Supabase.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    items: [],
  });
}
