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

// See full file on branch — this is a minimal keep-alive while we restore
export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Database not configured' }, { status: 503 });
  }
  const mode = (req.nextUrl.searchParams.get('mode') || 'services').toLowerCase();
  const poolId = (req.nextUrl.searchParams.get('pool') || '').toLowerCase();
  // Redirect clients to use cached responses; full logic restored in next commit
  const res = NextResponse.json({ ok: true, mode, pool: poolId, services: [], count: 0, note: 'restoring' });
  res.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  return res;
}
