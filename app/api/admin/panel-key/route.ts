import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

/**
 * Generate a Vernex (child panel) API key.
 * Key format: vx_panel_<32 hex chars>
 * Store only a hash if you later persist to Supabase; for day-one we return the raw key once.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string; panelName?: string };
    const password = typeof body.password === 'string' ? body.password : '';
    const panelName = (typeof body.panelName === 'string' && body.panelName.trim()) || 'Vernex';
    const expected = process.env.ADMIN_PASSWORD || '';

    if (!expected) {
      return NextResponse.json(
        { ok: false, reason: 'ADMIN_PASSWORD is not configured on the server' },
        { status: 503 },
      );
    }

    if (!password || password !== expected) {
      return NextResponse.json({ ok: false, reason: 'Invalid password' }, { status: 401 });
    }

    const raw = randomBytes(16).toString('hex');
    const apiKey = `vx_panel_${raw}`;
    const apiKeyPrefix = apiKey.slice(0, 16);
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    return NextResponse.json({
      ok: true,
      panel: {
        name: panelName,
        apiKey,
        apiKeyPrefix,
        keyHash,
        createdAt: new Date().toISOString(),
        envHint: {
          VERXOR_API_BASE: 'https://verxor.com/api/v1',
          VERXOR_PANEL_API_KEY: apiKey,
        },
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: 'Bad request' }, { status: 400 });
  }
}
