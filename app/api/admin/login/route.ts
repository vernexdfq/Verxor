import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple operator gate. Set ADMIN_PASSWORD on Vercel.
 * Client keeps a session flag in sessionStorage after success.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD || '';

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'ADMIN_PASSWORD is not set on the server. Add it in Vercel env (Secret), redeploy, then sign in.',
      },
      { status: 503 },
    );
  }

  if (!body.password || body.password !== expected) {
    return NextResponse.json({ ok: false, reason: 'Invalid password' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, role: 'admin' });
}
