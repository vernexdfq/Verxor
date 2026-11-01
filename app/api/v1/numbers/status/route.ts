import { NextRequest, NextResponse } from 'next/server';
import { fivesim, grizzly, pvapins, smsbower } from '@/lib/providers';
import { sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';
import { sendVirtualNumberDeliveredReceipt } from '@/lib/email/receipts';

export const dynamic = 'force-dynamic';

/**
 * Poll OTP status.
 * Query: ?provider=pvapins|fivesim|grizzly|smsbower&providerOrderId=...&orderId=...
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
      const m = text.match(/STATUS_OK:([0-9A-Za-z-]+)/);
      if (m) {
        otp = m[1];
        status = 'received';
        try {
          await grizzly.setStatus(providerOrderId, '6');
        } catch {
          /* ignore */
        }
      } else if (/STATUS_WAIT/i.test(text)) status = 'waiting';
      else if (/STATUS_CANCEL/i.test(text)) status = 'cancelled';
    } else if (provider === 'smsbower') {
      const text = await smsbower.getStatus(providerOrderId);
      const m = text.match(/STATUS_OK:([0-9A-Za-z-]+)/);
      if (m) {
        otp = m[1];
        status = 'received';
        try {
          await smsbower.setStatus(providerOrderId, '6');
        } catch {
          /* ignore */
        }
      } else if (/STATUS_WAIT/i.test(text)) status = 'waiting';
      else if (/STATUS_CANCEL/i.test(text)) status = 'cancelled';
    } else {
      return NextResponse.json({ ok: false, error: 'Unknown provider' }, { status: 400 });
    }

    // When OTP is delivered, update order and dispatch customer receipt email
    if (otp && supabaseConfigured()) {
      try {
        let existingOrder: {
          id: string;
          user_id?: string | null;
          phone?: string | null;
          service?: string | null;
          country?: string | null;
          price_ngn?: number | null;
          raw?: any;
        } | null = null;
        let matchedTable = 'vn_orders';

        if (orderId) {
          try {
            const rows = (await sbSelect(
              'vn_orders',
              `id=eq.${encodeURIComponent(orderId)}&select=id,user_id,phone,service,country,price_ngn,raw&limit=1`,
            )) as Array<any>;
            if (Array.isArray(rows) && rows[0]) existingOrder = rows[0];
          } catch {
            /* ignore */
          }
        }

        if (!existingOrder && providerOrderId) {
          try {
            const rows = (await sbSelect(
              'vn_orders',
              `provider_order_id=eq.${encodeURIComponent(providerOrderId)}&select=id,user_id,phone,service,country,price_ngn,raw&limit=1`,
            )) as Array<any>;
            if (Array.isArray(rows) && rows[0]) existingOrder = rows[0];
          } catch {
            /* ignore */
          }
        }

        if (!existingOrder && orderId) {
          try {
            const rows = (await sbSelect(
              'number_orders',
              `id=eq.${encodeURIComponent(orderId)}&select=id,user_id,phone,service,country,amount,raw&limit=1`,
            )) as Array<any>;
            if (Array.isArray(rows) && rows[0]) {
              existingOrder = {
                id: rows[0].id,
                user_id: rows[0].user_id,
                phone: rows[0].phone,
                service: rows[0].service,
                country: rows[0].country,
                price_ngn: rows[0].amount,
                raw: rows[0].raw,
              };
              matchedTable = 'number_orders';
            }
          } catch {
            /* ignore */
          }
        }

        const raw = (existingOrder?.raw && typeof existingOrder.raw === 'object' ? existingOrder.raw : {}) as Record<string, unknown>;
        const emailSent = Boolean(raw.email_sent);
        let emailDispatched = false;

        const targetUserId = existingOrder?.user_id;
        if (targetUserId && !emailSent) {
          try {
            const mail = await sendVirtualNumberDeliveredReceipt({
              userId: targetUserId,
              orderId: existingOrder?.id || orderId || providerOrderId,
              phone: existingOrder?.phone || '',
              service: existingOrder?.service || 'Virtual Number',
              country: existingOrder?.country || undefined,
              amountNgn: Number(existingOrder?.price_ngn || 0),
            });
            if (mail.ok) {
              emailDispatched = true;
            } else {
              console.warn('[email] Virtual number delivered receipt not sent:', mail.error);
            }
          } catch (mailError) {
            console.warn('[email] Virtual number delivery email failed:', mailError);
          }
        }

        const patch: Record<string, unknown> = {
          otp_code: otp,
          status: 'received',
          updated_at: new Date().toISOString(),
        };

        if (emailDispatched) {
          patch.raw = {
            ...raw,
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          };
        }

        const targetId = existingOrder?.id || orderId;
        if (targetId) {
          await sbUpdate(matchedTable, { id: targetId }, patch);
        }
      } catch (dbErr) {
        console.warn('[status] failed to update order or dispatch email:', dbErr);
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
