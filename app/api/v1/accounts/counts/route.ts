import { NextResponse } from 'next/server';
import { loadCountsSnapshot, liveCountsSnapshot } from '@/lib/providers/accszone';

/**
 * GET /api/v1/accounts/counts
 * Cheap per-platform listing counts for the Buy Logs platform chips:
 * snapshot counts (persisted in admin_settings, no provider calls) overlaid
 * with this instance's fresh in-memory counts. No auth — counts are not
 * sensitive and the chips render before sign-in.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const snapshot = await loadCountsSnapshot();
  const live = liveCountsSnapshot();
  const counts = { ...snapshot, ...live };
  return NextResponse.json(
    { ok: true, counts, total: Object.values(counts).reduce((sum, c) => sum + (c.listings || 0), 0) },
    { headers: { 'Cache-Control': 'public, s-maxage=60' } },
  );
}
