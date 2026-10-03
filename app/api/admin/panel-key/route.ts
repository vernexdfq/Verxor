import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

/**
 * Generate a child-panel API key (Vernex day-one).
 * Requires ADMIN_PASSWORD in body for a minimal gate until full session cookies land.
 * Returns plaintext key once — store on Vernex as VERXOR_PANEL_API_KEY + VERXOR_API_BASE.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    password?: string;
    panelName?: string;
  };

  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || body.password !== expected) {
    return NextResponse.json({ ok: false, reason: 'Unauthorized' }, { status: 401 });
  }

  const name = (body.panelName || 'Vernex').trim() || 'Vernex';
  const raw = `vx_panel_${randomBytes(24).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);

  // Persistence via Supabase can be wired next; key is issued for env handoff now.
  return NextResponse.json({
    ok: true,
    panel: {
      name,
      apiKey: raw,
      apiKeyPrefix: prefix,
      apiKeyHash: hash,
      baseUrl: 'https://verxor.com/api/v1',
      envHint: {
        VERXOR_API_BASE: 'https://verxor.com/api/v1',
        VERXOR_PANEL_API_KEY: raw,
      },
      note: 'Copy the key now. It is shown once. Add both env vars on the child panel (Vernex) host.',
    },
  });
}
