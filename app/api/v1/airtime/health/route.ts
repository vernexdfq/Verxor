import { NextResponse } from 'next/server';
import { isApi247Configured, healthCheck247 } from '@/lib/providers/api247';
import {
  isClubKonnectConfigured,
  getClubKonnectBalance,
} from '@/lib/providers/clubkonnect';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/airtime/health
 * Read-only diagnostics. Does NOT buy airtime or debit any wallet.
 */
export async function GET() {
  const result: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    providers: {} as Record<string, unknown>,
  };

  // 247API
  if (isApi247Configured()) {
    try {
      const h = await healthCheck247();
      (result.providers as any).api247 = h;
      if (!h.ok) result.ok = false;
    } catch (e) {
      (result.providers as any).api247 = {
        ok: false,
        configured: true,
        error: e instanceof Error ? e.message : 'check failed',
      };
      result.ok = false;
    }
  } else {
    (result.providers as any).api247 = {
      ok: false,
      configured: false,
      error: 'API_247_KEY not set',
    };
    result.ok = false;
  }

  // ClubKonnect (backup)
  if (isClubKonnectConfigured()) {
    try {
      const bal = await getClubKonnectBalance();
      (result.providers as any).clubkonnect = {
        ok: true,
        configured: true,
        wallet: bal.balance,
        name: bal.name,
        status: bal.status,
      };
    } catch (e) {
      (result.providers as any).clubkonnect = {
        ok: false,
        configured: true,
        error: e instanceof Error ? e.message : 'check failed',
      };
    }
  } else {
    (result.providers as any).clubkonnect = {
      ok: false,
      configured: false,
      error: 'CLUBKONNECT_USER_ID / CLUBKONNECT_API_KEY not set',
    };
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
