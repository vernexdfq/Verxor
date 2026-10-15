import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

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

  const status = String(
    body.notification_status || body.transaction_status || body.status || '',
  ).toLowerCase();
  const success =
    status.includes('success') ||
    status === 'payment_successful' ||
    status === 'successful' ||
    status === 'paid';

  if (!success) {
    console.info('[xixapay/virtual-account] non-success', status);
    return NextResponse.json({ status: 'ignored' });
  }

  const transactionId = String(
    body.transaction_id || body.transactionId || body.reference || body.id || '',
  );
  const amountPaid = Number(body.amount_paid ?? body.amount ?? body.settlement_amount ?? 0);
  const accountNumber = String(
    body.receiver?.account_number ||
      body.receiver?.accountNumber ||
      body.account_number ||
      body.virtualAccountNumber ||
      '',
  );
  const customerEmail = String(body.customer?.email || body.email || '').toLowerCase();
  const customerId = String(body.customer?.customer_id || body.customer?.id || '');

  if (!transactionId || !(amountPaid > 0)) {
    console.warn('[xixapay/virtual-account] missing fields', body);
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  let userId: string | null = null;

  try {
    if (accountNumber) {
      const rows = await sbSelect(
        'virtual_accounts',
        `account_number=eq.${encodeURIComponent(accountNumber)}&order=created_at.desc&limit=1`,
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
      accountNumber,
      customerEmail,
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
        p_amount: amountPaid,
        p_reference: `xixapay:${transactionId}`,
        p_description: `Wallet funding via ${body.receiver?.bank || 'bank transfer'}`,
      }),
    });

    if (!rpc.ok) {
      const t = await rpc.text().catch(() => '');
      console.error('[xixapay/virtual-account] credit failed', rpc.status, t.slice(0, 300));
      return NextResponse.json({ error: 'Credit failed' }, { status: 500 });
    }

    const newBal = await rpc.json();
    console.info('[xixapay/virtual-account] credited', { userId, amountPaid, newBal, transactionId });
    return NextResponse.json({ status: 'ok', balance: newBal });
  } catch (e) {
    console.error('[xixapay/virtual-account] error', e);
    return NextResponse.json({ error: 'Credit error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'xixapay-virtual-account-webhook',
    ready: Boolean(process.env.XIXAPAY_SECRET_KEY),
  });
}
