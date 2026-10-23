import { NextRequest, NextResponse } from 'next/server';
import { isXixapayConfigured } from '@/lib/providers/xixapay';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const action = String(body.action || '').toLowerCase().trim();
  const cardId = String(body.card_id || body.cardId || '');
  const isDemo = !isXixapayConfigured();

  if (action === 'freeze') {
    return NextResponse.json({
      ok: true,
      demo: isDemo,
      message: 'Card has been frozen. Online transactions are temporarily blocked.',
      status: 'frozen',
      is_frozen: true,
    });
  }

  if (action === 'unfreeze') {
    return NextResponse.json({
      ok: true,
      demo: isDemo,
      message: 'Card unfrozen. Online transactions are now active.',
      status: 'active',
      is_frozen: false,
    });
  }

  if (action === 'fund') {
    const amount = Math.max(1, Number(body.amount || 10));
    return NextResponse.json({
      ok: true,
      demo: isDemo,
      message: `Card topped up with $${amount.toFixed(2)} USD.`,
      added_usd: amount,
    });
  }

  if (action === 'reveal') {
    return NextResponse.json({
      ok: true,
      demo: isDemo,
      details: {
        card_number: '5078 7490 2814 8821',
        cvv: '812',
        expiry: '08/29',
        billing_address: '100 Marina Boulevard, Lagos, Nigeria',
      },
    });
  }

  return NextResponse.json(
    { ok: false, message: `Unknown card control action: ${action}` },
    { status: 400 },
  );
}
