import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/v1/statusprobe?code=503 — temporary CDN transparency probe.
 * Returns JSON {"ok":true,"probe":<code>} with the requested HTTP status so we
 * can see which statuses reach the browser unmodified through the CDN layer.
 * Remove after the CDN error-masking investigation (Nov 22, 2026).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('code'));
  const code = Number.isInteger(raw) && raw >= 200 && raw <= 599 ? raw : 200;
  return NextResponse.json({ ok: true, probe: code }, {
    status: code,
    headers: { 'Cache-Control': 'no-store' },
  });
}
