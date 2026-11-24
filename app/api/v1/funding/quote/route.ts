import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FUNDING_FEE_NGN = 50;

/**
 * POST /api/v1/funding/quote
 * Returns the exact amount the customer must transfer for a wallet amount.
 * The markup formula stays on the server; the client only sees final numbers.
 */
export async function POST(req: NextRequest) {
  let body: { providerId?: string; amountNgn?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const providerId = String(body.providerId || '').toLowerCase();
  if (!['opay', 'palmpay', 'safehaven', 'kolomoni'].includes(providerId)) {
    return NextResponse.json({ ok: false, message: 'Unknown funding provider.' }, { status: 400 });
  }

  const amount = Math.round(Number(body.amountNgn));
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ ok: false, message: 'Enter a valid amount.' }, { status: 400 });
  }

  const feeNgn = FUNDING_FEE_NGN;

  return NextResponse.json({
    ok: true,
    walletAmount: amount,
    amountToSend: amount + feeNgn,
  });
}
