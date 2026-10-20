import { NextResponse } from 'next/server';
import {
  isClubKonnectConfigured,
  getClubKonnectBalance,
} from '@/lib/providers/clubkonnect';

/** GET /api/v1/providers/clubkonnect/balance — diagnose ClubKonnect credentials + wallet */
export async function GET() {
  if (!isClubKonnectConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'ClubKonnect env not configured' },
      { status: 503 },
    );
  }

  try {
    const wallet = await getClubKonnectBalance();
    return NextResponse.json({
      ok: true,
      provider: 'clubkonnect',
      name: wallet.name,
      balance: wallet.balance,
      walletRaw: wallet.walletRaw,
      status: wallet.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
