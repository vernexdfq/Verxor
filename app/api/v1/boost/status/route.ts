import { NextRequest, NextResponse } from 'next/server';
import { isSmmConfigured, smmGetStatus } from '@/lib/providers/smm-orders';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/boost/status?orderId=123
 * POST { orderId }
 * JAP action=status
 */
async function handle(orderId: string) {
  if (!isSmmConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Boost provider not configured' },
      { status: 503 },
    );
  }
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'orderId is required' }, { status: 400 });
  }
  try {
    const st = await smmGetStatus(orderId);
    return NextResponse.json({
      ok: true,
      orderId,
      status: st.status,
      charge: st.charge,
      startCount: st.start_count,
      remains: st.remains,
      currency: st.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Status check failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get('orderId') || '';
  return handle(orderId);
}

export async function POST(req: NextRequest) {
  let body: { orderId?: string | number } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  return handle(String(body.orderId || ''));
}
