import { NextRequest, NextResponse } from 'next/server';
import {
  textverifiedConfigured,
  tvCreateRental,
  tvRentalPriceUsd,
  TV_DURATIONS,
  type TvRentalDuration,
} from '@/lib/providers/textverified';
import { rentSmsRetailNgn, rentSmsPanelNgn } from '@/lib/rentsms-pricing';
import { notifyAdmin } from '@/lib/notify';
import {
  resolvePanelClient,
  panelAllowsRentSms,
  getPanelAdminEmails,
} from '@/lib/panel-auth';
import { sendPanelAdminOrderAlert, sendRentSmsPanelCustomerReceipt } from '@/lib/email/receipts';

/**
 * POST /api/v1/rent-sms/purchase
 *   { serviceName, duration, userId }
 *
 * Retail customer flow: live USD price check → wallet debit (₦) → Textverified
 * rental created → stored in rent_sms_rentals → number returned. On provider
 * failure the debit is refunded and the admin line is pinged. The price is
 * re-quoted server-side, so a stale client quote can't undercharge.
 *
 * Child-panel flow (x-panel-key): priced at the PANEL tier, debits the panel's
 * reseller_wallet, saved with audience='panel', the panel admin gets an order
 * alert and the panel customer an email receipt (customerEmail in body).
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

async function debitRetailWallet(userId: string, amount: number, reference: string, description: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const res = await fetch(`${base}/rest/v1/rpc/debit_wallet`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditRetailWallet(userId: string, amount: number, reference: string, description: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
  }).catch(() => null);
}

/** Child-panel wholesale wallet (reseller_wallet). */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const res = await fetch(`${base}/rest/v1/rpc/debit_reseller_wallet`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/insufficient/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  await fetch(`${base}/rest/v1/rpc/credit_reseller_wallet`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference }),
  }).catch(() => null);
}

async function saveRental(row: Record<string, unknown>): Promise<boolean> {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return false;
  const res = await fetch(`${base}/rest/v1/rent_sms_rentals`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
    cache: 'no-store',
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  if (!textverifiedConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.' },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as {
    serviceName?: string;
    duration?: string;
    userId?: string;
    areaCode?: string | null;
    customerEmail?: string;
    customerName?: string;
    retailPriceNgn?: number;
  };
  const serviceName = String(body.serviceName || '').trim();
  const duration = String(body.duration || '').trim() as TvRentalDuration;
  if (!serviceName || !TV_DURATIONS.some((d) => d.id === duration)) {
    return NextResponse.json({ ok: false, error: 'Missing service or duration' }, { status: 400 });
  }
  // Custom area code: 3 US digits, or null/absent for a random area code.
  const areaCodeRaw = String(body.areaCode || '').trim();
  const areaCode = /^\d{3}$/.test(areaCodeRaw) ? areaCodeRaw : '';

  const panel = await resolvePanelClient(req);
  if (panel && !panelAllowsRentSms(panel)) {
    return NextResponse.json(
      { ok: false, error: 'This panel key is not allowed to use Rent-for-SMS.' },
      { status: 403 },
    );
  }

  let userId = await resolveUserId(req, body.userId);
  if (panel) {
    userId = panel.walletUserId || userId;
  }
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: panel ? 'Panel wallet user is not linked.' : 'Sign in to rent a number.' },
      { status: 401 },
    );
  }
  const isPanel = Boolean(panel);

  // Server-side re-quote: never trust a client-sent price.
  const price = await tvRentalPriceUsd({ serviceName, duration, isRenewable: false, areaCode: Boolean(areaCode) });
  if (!price.ok || !price.priceUsd) {
    return NextResponse.json(
      { ok: false, error: price.error || 'That option is not available right now. Try another duration.' },
      { status: 404 },
    );
  }
  const totalNgn = isPanel ? await rentSmsPanelNgn(price.priceUsd) : await rentSmsRetailNgn(price.priceUsd);
  if (!totalNgn || totalNgn <= 0) {
    return NextResponse.json({ ok: false, error: 'Could not compute the price. Try again.' }, { status: 500 });
  }

  const durationLabel = TV_DURATIONS.find((d) => d.id === duration)?.label || duration;
  const debitRef = `rsm-${(userId || 'panel').slice(0, 8)}-${Date.now()}`;
  const desc = `Rent SMS · ${serviceName} · ${durationLabel}${areaCode ? ` · AC ${areaCode}` : ''}`;

  let debited = false;
  try {
    if (isPanel) {
      await debitResellerWallet(userId, totalNgn, debitRef);
    } else {
      await debitRetailWallet(userId, totalNgn, debitRef, desc);
    }
    debited = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        {
          ok: false,
          error: isPanel
            ? 'Insufficient panel wholesale balance. Fund the partner wallet first.'
            : `Insufficient wallet balance. Fund your wallet and try again — total is ₦${totalNgn.toLocaleString('en-NG')}.`,
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const rental = await tvCreateRental({ serviceName, duration, isRenewable: false, areaCode: areaCode || undefined });
  if (!rental.ok || !rental.reservationId) {
    if (debited) {
      if (isPanel) {
        await creditResellerWallet(userId, totalNgn, `refund-${debitRef}`);
      } else {
        await creditRetailWallet(userId, totalNgn, `refund-${debitRef}`, `Refund (rental failed) · ${desc}`);
      }
    }
    void notifyAdmin(
      `⚠️ Verxor rent-SMS order FAILED (wallet refunded)\n${serviceName} · ${durationLabel} · ₦${totalNgn.toLocaleString('en-NG')}\nError: ${rental.error}\nCustomer: ${userId}`,
    );
    return NextResponse.json(
      { ok: false, error: rental.error || 'The rental failed. Your wallet has been refunded.' },
      { status: 503 },
    );
  }

  const customerEmail = (body.customerEmail || '').trim();
  const customerName = (body.customerName || '').trim();
  const panelCustomerLabel = customerName || customerEmail || 'Child panel customer';
  const panelNote = isPanel
    ? `Panel: ${panel?.name || 'child panel'} · Customer: ${panelCustomerLabel}${customerEmail ? ` <${customerEmail}>` : ''}`
    : '';

  // Best-effort persist (the rental exists at the provider either way).
  const saved = await saveRental({
    user_id: userId,
    provider: 'textverified',
    provider_reservation_id: rental.reservationId,
    service_name: serviceName,
    duration,
    number: rental.e164 || '',
    cost_usd: price.priceUsd,
    charged_ngn: totalNgn,
    audience: isPanel ? 'panel' : 'retail',
    status: 'active',
    message: panelNote || `Retail rental · ${desc}`,
    ends_at: rental.endsAt ? new Date(rental.endsAt).toISOString() : null,
  });
  if (!saved) {
    void notifyAdmin(
      `⚠️ Verxor rent-SMS order created but NOT stored in the rentals table (${serviceName} · ${durationLabel} · res ${rental.reservationId}). Run supabase/rent-sms.sql if the table is missing.`,
    );
  }

  if (isPanel && panel) {
    // Panel admin order alert (best-effort, never fails the order).
    void (async () => {
      try {
        const adminEmails = await getPanelAdminEmails(panel);
        const customerPaidNgn = Number((body as Record<string, unknown>).retailPriceNgn ?? 0);
        await sendPanelAdminOrderAlert(adminEmails, {
          panelName: panel.name,
          adminEmail: adminEmails,
          customerName: panelCustomerLabel,
          customerEmail: customerEmail || undefined,
          service: `Rent-for-SMS (${serviceName} · ${durationLabel})`,
          orderId: String(rental.reservationId ?? debitRef),
          wholesaleAmountNgn: totalNgn,
          customerPaidNgn: customerPaidNgn > totalNgn ? customerPaidNgn : undefined,
          details: [
            { label: 'Customer', value: panelCustomerLabel },
            { label: 'Service', value: serviceName },
            { label: 'Duration', value: durationLabel },
            { label: 'Number', value: rental.e164 || '(pending)' },
            ...(areaCode ? [{ label: 'Area code', value: areaCode }] : []),
          ],
          date: new Date(),
        });
      } catch (err) {
        console.warn('[email] Rent-SMS panel admin alert failed:', err);
      }
    })();

    // Customer receipt (best-effort; only when the panel supplied an email).
    if (customerEmail) {
      const paid = Number((body as Record<string, unknown>).retailPriceNgn ?? totalNgn);
      void sendRentSmsPanelCustomerReceipt(customerEmail, {
        status: 'successful',
        amountNgn: paid,
        reference: String(rental.reservationId ?? debitRef),
        customerName: customerName || undefined,
        details: [
          { label: 'Service', value: serviceName },
          { label: 'Duration', value: durationLabel },
          { label: 'Phone number', value: rental.e164 || '(pending)' },
          ...(areaCode ? [{ label: 'Area code', value: areaCode }] : []),
        ],
        date: new Date(),
      }).then((mail) => {
        if (!mail.ok) console.warn('[email] Rent-SMS customer receipt not sent:', mail.error);
      });
    }
  }

  return NextResponse.json({
    ok: true,
    rental: {
      ref: debitRef,
      reservationId: rental.reservationId,
      number: rental.e164 || '',
      endsAt: rental.endsAt || null,
      serviceName,
      duration,
      durationLabel,
      totalNgn,
    },
    audience: isPanel ? 'panel' : 'retail',
    panel: panel ? { id: panel.id, name: panel.name } : null,
  });
}
