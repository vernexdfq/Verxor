import { NextRequest, NextResponse } from 'next/server';
import { fivesim, grizzly, pvapins, smsbower } from '@/lib/providers';
import { sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

/**
 * Poll OTP status.
 * Query: ?provider=pvapins|fivesim|grizzly|smsbower&providerOrderId=...
 */
export async function GET(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get('provider') || '').toLowerCase();
  const providerOrderId = req.nextUrl.searchParams.get('providerOrderId') || '';
  const orderId = req.nextUrl.searchParams.get('orderId') || '';

  if (!provider || !providerOrderId) {
    return NextResponse.json({ ok: false, error: 'provider and providerOrderId required' }, { status: 400 });
  }

  try {
    let otp: string | null = null;
    let status = 'waiting';

    if (provider === 'fivesim') {
      const data = await fivesim.checkOrder(providerOrderId);
      status = String(data?.status || 'waiting').toLowerCase();
      const sms = data?.sms;
      if (Array.isArray(sms) && sms[0]?.code) otp = String(sms[0].code);
      else if (data?.code) otp = String(data.code);
    } else if (provider === 'pvapins') {
      const data = await pvapins.getOrder(providerOrderId);
      status = String(data?.status || 'waiting').toLowerCase();
      otp = data?.otpCode ? String(data.otpCode) : null;
    } else if (provider === 'grizzly') {
      const text = await grizzly.getStatus(providerOrderId);
      // STATUS_OK:123456
      const m = text.match(/STATUS_OK:([0-9A-Za-z-]+)/);
      if (m) {
        otp = m[1];
        status = 'received';
      } else if (/STATUS_WAIT/i.test(text)) status = 'waiting';
      else if (/STATUS_CANCEL/i.test(text)) status = 'cancelled';
    } else if (provider === 'smsbower') {
      const text = await smsbower.getStatus(providerOrderId);
      const m = text.match(/STATUS_OK:([0-9A-Za-z-]+)/);
      if (m) {
        otp = m[1];
        status = 'received';
      } else if (/STATUS_WAIT/i.test(text)) status = 'waiting';
      else if (/STATUS_CANCEL/i.test(text)) status = 'cancelled';
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 });
    }

    if (otp && supabaseConfigured() && orderId) {
      try {
        await sbUpdate(
          'number_orders',
          { id: orderId },
          { otp_code: otp, status: 'received', updated_at: new Date().toISOString() },
        );
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      ok: true,
      status: otp ? 'received' : status,
      otp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Status check failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
