import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/** Flat fee deducted from every successful bank-transfer deposit */
const FUNDING_FEE_NGN = 20;

function verifySignature(rawBody: string, headerSig: string | null, secret: string): boolean {
  if (!headerSig) return false;
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(headerSig.replace(/^sha256=/i, '').trim());
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
  const secret = process.env.XIXAPAY_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig =
    req.headers.get('xixapay') ||
    req.headers.get('x-xixapay-signature') ||
    req.headers.get('x-signature') ||
    req.headers.get('signature');

  const skipVerify = process.env.XIXAPAY_SKIP_WEBHOOK_VERIFY === '1';
  // If signature header is present and wrong → reject. If missing → accept (XixaPay sometimes omits).
  if (!skipVerify && sig && !verifySignature(rawBody, sig, secret)) {
    console.warn('[xixapay/virtual-account] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info('[xixapay/virtual-account] payload keys', Object.keys(body || {}));

  const status = String(
    body.notification_status || body.transaction_status || body.status || '',
  ).toLowerCase();
  const success =
    status.includes('success') ||
    status === 'payment_successful' ||
    status === 'successful' ||
    status === 'paid' ||
    status === '';

  // Some payloads omit status but still carry amount + account — treat as success if amount present
  const amountPaid = Number(
    body.amount_paid ?? body.amount ?? body.settlement_amount ?? body.paid_amount ?? 0,
  );

  if (!success && !(amountPaid > 0)) {
    console.info('[xixapay/virtual-account] non-success', status);
    return NextResponse.json({ status: 'ignored' });
  }

  const transactionId = String(
    body.transaction_id ||
      body.transactionId ||
      body.reference ||
      body.externalReference ||
      body.external_reference ||
      body.id ||
      '',
  );
  const accountNumberRaw = String(
    body.receiver?.account_number ||
      body.receiver?.accountNumber ||
      body.account_number ||
      body.accountNumber ||
      body.virtualAccountNumber ||
      body.virtual_account_number ||
      '',
  );
  const accountDigits = digitsOnly(accountNumberRaw);
  const customerEmail = String(body.customer?.email || body.email || '').toLowerCase();
  const customerId = String(body.customer?.customer_id || body.customer?.id || '');
  const externalRef = String(
    body.externalReference || body.external_reference || body.external_ref || '',
  );

  if (!transactionId || !(amountPaid > 0)) {
    console.warn('[xixapay/virtual-account] missing fields', {
      transactionId,
      amountPaid,
      accountNumberRaw,
    });
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const creditAmount = Math.round((amountPaid - FUNDING_FEE_NGN) * 100) / 100;
  if (creditAmount <= 0) {
    console.warn('[xixapay/virtual-account] amount too low after fee', {
      amountPaid,
      fee: FUNDING_FEE_NGN,
      transactionId,
    });
    return NextResponse.json({
      status: 'below_fee',
      message: `Deposit must be greater than ₦${FUNDING_FEE_NGN}`,
    });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  let userId: string | null = null;

  try {
    if (accountDigits) {
      // Exact match first
      let rows = await sbSelect(
        'virtual_accounts',
        `account_number=eq.${encodeURIComponent(accountDigits)}&order=created_at.desc&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;

      // Fallback: last 8–10 digits (handles masked or spaced numbers)
      if (!userId && accountDigits.length >= 8) {
        const tail = accountDigits.slice(-10);
        rows = await sbSelect(
          'virtual_accounts',
          `account_number=like.*${tail}&order=created_at.desc&limit=1`,
        );
        if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;
      }
    }

    if (!userId && externalRef) {
      const rows = await sbSelect(
        'virtual_accounts',
        `external_ref=eq.${encodeURIComponent(externalRef)}&order=created_at.desc&limit=1`,
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

    if (!userId && customerId) {
      const rows = await sbSelect(
        'virtual_accounts',
        `provider_customer_id=eq.${encodeURIComponent(customerId)}&order=created_at.desc&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]?.user_id) userId = rows[0].user_id;
    }
  } catch (e) {
    console.error('[xixapay/virtual-account] lookup', e);
  }

  if (!userId) {
    console.error('[xixapay/virtual-account] user not found', {
      accountDigits,
      customerEmail,
      externalRef,
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
        p_reference: `xixapay:${transactionId}`,
        p_description: `Wallet funding via ${body.receiver?.bank || 'OPay'} (₦${FUNDING_FEE_NGN} fee)`,
      }),
    });

    if (!rpc.ok) {
      const t = await rpc.text().catch(() => '');
      console.error('[xixapay/virtual-account] credit failed', rpc.status, t.slice(0, 300));
      return NextResponse.json({ error: 'Credit failed' }, { status: 500 });
    }

    const newBal = await rpc.json();
    console.info('[xixapay/virtual-account] credited', {
      userId,
      amountPaid,
      fee: FUNDING_FEE_NGN,
      creditAmount,
      newBal,
      transactionId,
    });
    return NextResponse.json({
      status: 'ok',
      balance: newBal,
      amount_paid: amountPaid,
      fee: FUNDING_FEE_NGN,
      credited: creditAmount,
    });
  } catch (e) {
    console.error('[xixapay/virtual-account] error', e);
    return NextResponse.json({ error: 'Credit error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'xixapay-virtual-account-webhook',
    ready: Boolean(process.env.XIXAPAY_SECRET_KEY),
    funding_fee_ngn: FUNDING_FEE_NGN,
  });
}
