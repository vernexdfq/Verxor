import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** Flat fee on static 9PSB deposits when payload has no settlement amount */
const PAYVESSEL_STATIC_FEE_NGN = 50;

function verifyPayvesselSignature(rawBody: string, headerSig: string | null, secret: string): boolean {
  if (!headerSig) return false;
  try {
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(headerSig.replace(/^sha512=/i, '').trim());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYVESSEL_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig =
    req.headers.get('payvessel-http-signature') ||
    req.headers.get('http_payvessel_http_signature') ||
    req.headers.get('x-payvessel-signature') ||
    req.headers.get('x-signature') ||
    req.headers.get('signature');

  const skipVerify = process.env.PAYVESSEL_SKIP_WEBHOOK_VERIFY === '1';
  if (!skipVerify && sig && !verifyPayvesselSignature(rawBody, sig, secret)) {
    console.warn('[payvessel] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info('[payvessel] payload', JSON.stringify(body).slice(0, 2000));

  const event = String(body.event || body.type || '').toLowerCase();
  const order = body.order || {};
  const transaction = body.transaction || body.data || {};
  const customer = body.customer || {};
  const virtual =
    body.virtual_account ||
    body.virtualAccount ||
    body.reserved_account ||
    body.account ||
    transaction.virtual_account ||
    {};

  const status = String(
    transaction.status || order.status || body.status || '',
  ).toLowerCase();

  const isCreditEvent =
    event.includes('success') ||
    event.includes('reserved_account.credit') ||
    event.includes('transaction.success') ||
    status.includes('success') ||
    status === 'completed' ||
    status === 'paid' ||
    status === 'successful';

  if (!isCreditEvent && !event) {
    // Accept payloads without event if amount present
  } else if (!isCreditEvent) {
    console.info('[payvessel] ignored event', event, status);
    return NextResponse.json({ status: 'ignored' });
  }

  const amountPaid = Number(
    order.amount ??
      transaction.amount ??
      body.amount ??
      virtual.amount ??
      0,
  );
  const settlement = Number(
    order.settlement_amount ??
      transaction.settlement_amount ??
      body.settlement_amount ??
      NaN,
  );
  const feeFromPayload = Number(order.fee ?? transaction.fee ?? body.fee ?? NaN);

  const transactionId = String(
    transaction.reference ||
      transaction.id ||
      body.reference ||
      body.transaction_id ||
      body.id ||
      '',
  );

  const accountNumberRaw = String(
    virtual.accountNumber ||
      virtual.account_number ||
      body.accountNumber ||
      body.account_number ||
      transaction.account_number ||
      transaction.accountNumber ||
      '',
  );
  const accountDigits = digitsOnly(accountNumberRaw);
  const customerEmail = String(
    customer.email || body.customer_email || transaction.customer_email || '',
  ).toLowerCase();
  const trackingRef = String(
    virtual.trackingReference ||
      virtual.tracking_reference ||
      body.trackingReference ||
      '',
  );

  if (!transactionId || !(amountPaid > 0 || settlement > 0)) {
    console.warn('[payvessel] missing fields', { transactionId, amountPaid, settlement });
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  let creditAmount: number;
  if (Number.isFinite(settlement) && settlement > 0) {
    creditAmount = Math.round(settlement * 100) / 100;
  } else if (Number.isFinite(feeFromPayload) && feeFromPayload >= 0) {
    creditAmount = Math.round((amountPaid - feeFromPayload) * 100) / 100;
  } else {
    creditAmount = Math.round((amountPaid - PAYVESSEL_STATIC_FEE_NGN) * 100) / 100;
  }

  if (creditAmount <= 0) {
    return NextResponse.json({
      status: 'below_fee',
      message: 'Deposit amount too low after fee',
    });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  let userId: string | null = null;

  try {
    if (accountDigits) {
      let rows = await sbSelect(
        'virtual_accounts',
        `account_number=eq.${encodeURIComponent(accountDigits)}&order=created_at.desc&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;

      if (!userId && accountDigits.length >= 8) {
        const tail = accountDigits.slice(-10);
        rows = await sbSelect(
          'virtual_accounts',
          `account_number=like.*${tail}&order=created_at.desc&limit=1`,
        );
        if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;
      }
    }

    if (!userId && trackingRef) {
      const rows = await sbSelect(
        'virtual_accounts',
        `provider_customer_id=eq.${encodeURIComponent(trackingRef)}&order=created_at.desc&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;
    }

    if (!userId && customerEmail) {
      const rows = await sbSelect(
        'profiles',
        `email=eq.${encodeURIComponent(customerEmail)}&select=id&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]?.id) userId = rows[0].id;
    }
  } catch (e) {
    console.error('[payvessel] lookup', e);
  }

  if (!userId) {
    console.error('[payvessel] user not found', {
      accountDigits,
      customerEmail,
      trackingRef,
      transactionId,
    });
    return NextResponse.json({ status: 'user_not_found' });
  }

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const rpc = await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_amount: creditAmount,
        p_reference: `payvessel:${transactionId}`,
        p_description: `Wallet funding via PayVessel (${accountDigits || 'bank transfer'})`,
      }),
    });

    if (!rpc.ok) {
      const t = await rpc.text().catch(() => '');
      console.error('[payvessel] credit failed', rpc.status, t.slice(0, 400));
      return NextResponse.json({ error: 'Credit failed', detail: t.slice(0, 200) }, { status: 500 });
    }

    const newBal = await rpc.json();
    console.info('[payvessel] credited', {
      userId,
      amountPaid,
      creditAmount,
      newBal,
      transactionId,
    });
    return NextResponse.json({
      status: 'ok',
      balance: newBal,
      amount_paid: amountPaid,
      credited: creditAmount,
    });
  } catch (e) {
    console.error('[payvessel] error', e);
    return NextResponse.json({ error: 'Credit error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'payvessel-webhook',
    ready: Boolean(process.env.PAYVESSEL_SECRET_KEY),
    static_fee_ngn: PAYVESSEL_STATIC_FEE_NGN,
  });
}
