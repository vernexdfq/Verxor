import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PayVessel virtual card events (authorizations, settlements, declines, refunds).
 * Acknowledge for now; full card ledger wiring comes with virtual card product.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: unknown = null;
  try {
    body = JSON.parse(rawBody);
  } catch {
    /* ignore */
  }
  console.info('[payvessel/card] event', JSON.stringify(body).slice(0, 1500));
  return NextResponse.json({ status: 'ok', received: true });
}

export async function GET() {
  return NextResponse.json({
    service: 'payvessel-card-webhook',
    ready: true,
  });
}
