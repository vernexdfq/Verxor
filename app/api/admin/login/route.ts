import { NextRequest, NextResponse } from 'next/server';

/**
 * Operator gate for Verxor admin console.
 * Set ADMIN_PASSWORD on Vercel (and locally in .env.local).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { password?: string };
    const password = typeof body.password === 'string' ? body.password : '';
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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'Bad request' }, { status: 400 });
  }
}
