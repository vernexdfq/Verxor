import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Card webhook placeholder.
 * Virtual-account funding is handled at /api/webhooks/xixapay/virtual-account.
 * Extend this when card top-ups are enabled.
 */
export async function POST(req: NextRequest) {
  const body = await req.text().catch(() => '');
  console.info('[xixapay/card] received', body.slice(0, 300));
  return NextResponse.json({ status: 'ok', handled: false, message: 'Card webhook acknowledged' });
}

export async function GET() {
  return NextResponse.json({ service: 'xixapay-card-webhook', ready: true });
}
