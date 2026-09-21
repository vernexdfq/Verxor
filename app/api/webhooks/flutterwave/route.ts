import { NextRequest, NextResponse } from 'next/server';

/**
 * Flutterwave webhook.
 * Verify verif-hash header against FLUTTERWAVE_SECRET_HASH before crediting wallet.
 * Full ledger write lands after Supabase tables exist.
 */
export async function POST(req: NextRequest) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const signature = req.headers.get('verif-hash');
  if (!signature || signature !== secretHash) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // TODO: map successful charge → wallet_ledger credit in Supabase
  console.info('[flutterwave webhook] received', {
    type: typeof body === 'object' && body && 'event' in body ? (body as { event?: string }).event : undefined,
  });

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ service: 'flutterwave-webhook', ready: Boolean(process.env.FLUTTERWAVE_SECRET_HASH) });
}
