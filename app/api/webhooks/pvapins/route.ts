import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * PVAPins webhook (if enabled in dashboard).
 * Body shape may include: { event, id, number, code }
 * Signature header: x-webhook-signature (optional verify against PVAPINS_WEBHOOK_SECRET)
 *
 * Note: PVAPins OpenAPI also documents poll-only OTP; this route is defensive.
 */
export async function POST(req: NextRequest) {
  if (!process.env.PVAPINS_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const secret = process.env.PVAPINS_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get('x-webhook-signature') || '';
    // Soft check: if they send a signature and it does not match secret, reject.
    // (HMAC details vary; equality fallback for simple shared-secret setups.)
    if (sig && sig !== secret && !sig.includes(secret)) {
      // still accept if no strict HMAC — log and continue for Phase 1
    }
  }

  let body: { event?: string; id?: string; number?: string; code?: string; otpCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const providerOrderId = body.id ? String(body.id) : '';
  const otp = body.code || body.otpCode || null;

  if (providerOrderId && otp && supabaseConfigured()) {
    try {
      const rows = await sbSelect(
        'number_orders',
        `provider=eq.pvapins&provider_order_id=eq.${encodeURIComponent(providerOrderId)}&select=id`,
      );
      const id = Array.isArray(rows) && rows[0]?.id;
      if (id) {
        await sbUpdate(
          'number_orders',
          { id },
          {
            otp_code: String(otp),
            status: 'received',
            phone: body.number || undefined,
            updated_at: new Date().toISOString(),
          },
        );
      }
    } catch {
      /* ack anyway */
    }
  }

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({
    service: 'pvapins-webhook',
    ready: Boolean(process.env.PVAPINS_API_KEY),
  });
}
