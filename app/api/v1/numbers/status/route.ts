import { NextRequest, NextResponse } from 'next/server';
import { fivesim, grizzly, pvapins, smsbower } from '@/lib/providers';
import { tvVerificationDetails, tvVerificationSms } from '@/lib/providers/textverified';
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
    } else if (provider === 'textverified') {
      const det = await tvVerificationDetails(providerOrderId);
      const state = String(det?.state || '').toLowerCase();
      if (det && det.number) {
        const msgs = await tvVerificationSms(det.number);
        let code: string | null = null;
        for (const m of msgs || []) {
          const r = m as Record<string, unknown>;
          const direct = String(r.parsedCode ?? r.parsed_code ?? '').trim();
          const content = String(r.smsContent ?? r.sms_content ?? '');
          const mset = content.match(/\b(\d{4,8})\b/);
          const found = direct || (mset ? mset[1] : '');
          if (found) { code = found; break; }
        }
        if (code) { otp = code; status = 'received'; } else { status = 'waiting'; }
      } else if (state === 'completed') {
        status = 'received'; // completed without a readable SMS yet
      } else if (state === 'expired') {
        status = 'expired';
      } else if (state === 'cancelled') {
        status = 'cancelled';
      } else {
        status = 'waiting';
      }
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
          phone_number?: string | null;
          service_code?: string | null;
          country_code?: string | null;
          charged_ngn?: number | null;
          status?: string | null;
        } | null = null;
        let matchedTable = 'vn_orders';

        if (orderId) {
          try {
            const rows = (await sbSelect(
              'vn_orders',
              `id=eq.${encodeURIComponent(orderId)}&select=id,user_id,phone_number,service_code,country_code,charged_ngn,status&limit=1`,
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
              `activation_id=eq.${encodeURIComponent(providerOrderId)}&select=id,user_id,phone_number,service_code,country_code,charged_ngn,status&limit=1`,
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
                phone_number: rows[0].phone,
                service_code: rows[0].service,
                country_code: rows[0].country,
                charged_ngn: rows[0].amount,
                status: rows[0].status,
              };
              matchedTable = 'number_orders';
            }
          } catch {
            /* ignore */
          }
        }

        let emailDispatched = false;

        const targetUserId = existingOrder?.user_id;
        // vn_orders has no raw/meta column: send the delivery email only on the
        // waiting -> received transition so polling never re-sends it.
        const firstDelivery = String(existingOrder?.status || '').toLowerCase() !== 'received';
        if (targetUserId && firstDelivery) {
          try {
            const mail = await sendVirtualNumberDeliveredReceipt({
              userId: targetUserId,
              orderId: existingOrder?.id || orderId || providerOrderId,
              phone: existingOrder?.phone_number || '',
              service: existingOrder?.service_code || 'Virtual Number',
              country: existingOrder?.country_code || undefined,
              amountNgn: Number(existingOrder?.charged_ngn || 0),
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
          sms_code: otp,
          status: 'received',
          updated_at: new Date().toISOString(),
        };

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
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
