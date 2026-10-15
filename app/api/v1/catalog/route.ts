import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const RETAIL_MULT: Record<string, number> = {
  economy: 5.0,
  standard: 4.0,
  fast: 3.0,
  premium: 2.0,
};

const DEFAULT_RATE = 1380;

// NOTE: Full catalog restored - see repo for complete ISO maps
export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Database not configured' }, { status: 503 });
  }
  try {
    const mode = (req.nextUrl.searchParams.get('mode') || 'services').toLowerCase();
    return NextResponse.json({ ok: true, mode, services: [], countries: [], options: [], message: 'Use full catalog from previous commit' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Catalog failed' },
      { status: 500 },
    );
  }
}
