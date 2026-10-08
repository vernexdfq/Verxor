import { NextRequest, NextResponse } from 'next/server';
import { isSmeConfigured, queryStatus } from '@/lib/providers/smeapi';

export async function POST(req: NextRequest) {
  if (!isSmeConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'VTU provider not configured' },
      { status: 503 },
    );
  }

  let body: { ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const ref = String(body.ref || '').trim();
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'ref is required' }, { status: 400 });
  }

  try {
    const data = await queryStatus(ref);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status query failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
