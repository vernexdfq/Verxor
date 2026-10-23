import { NextResponse } from 'next/server';
import { isApi247Configured, queryUser247 } from '@/lib/providers/api247';

/** GET /api/v1/providers/api247/balance — diagnose 247API credentials + wallet */
export async function GET() {
  if (!isApi247Configured()) {
    return NextResponse.json(
      { ok: false, error: '247API env not configured' },
      { status: 503 },
    );
  }

  try {
    const res = await queryUser247();
    return NextResponse.json({
      ok: true,
      provider: 'api247',
      wallet: res.wallet,
      balance: res.balance,
      user: res.user,
      status: res.ok ? 'connected' : 'error',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Balance check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
