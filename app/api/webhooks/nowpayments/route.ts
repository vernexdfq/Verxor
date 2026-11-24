import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      const v = obj[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        acc[key] = sortObject(v as Record<string, unknown>);
      } else {
        acc[key] = v;
      }
      return acc;
    }, {} as Record<string, unknown>);
}

function verifyIpn(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    const sorted = sortObject(parsed);
    const payload = JSON.stringify(sorted);
    const expected = createHmac('sha512', secret).update(payload).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature.trim());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'IPN not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('x-nowpayments-sig');
  const skip = process.env.NOWPAYMENTS_SKIP_IPN_VERIFY === '1';
  if (!skip && !verifyIpn(rawBody, sig, secret)) {
    console.warn('[nowpayments] invalid IPN signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.info('[nowpayments] IPN', JSON.stringify(body).slice(0, 2000));

  const status = String(body.payment_status || body.status || '').toLowerCase();
  // Credit only on NOWPayments' final successful payment status.
  const finished = status === 'finished';

  if (!finished) {
    return NextResponse.json({ status: 'ignored', payment_status: status });
  }

  const orderId = String(body.order_id || body.orderId || '');
  const paymentId = String(body.payment_id || body.paymentId || body.invoice_id || '');
  const priceAmount = Number(body.price_amount || body.priceAmount || 0);

  if (!orderId && !paymentId) {
    return NextResponse.json({ error: 'Missing order' }, { status: 400 });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  let userId: string | null = null;
  let creditNgn: number | null = null;

  try {
    if (orderId) {
      const rows = await sbSelect(
        'virtual_accounts',
        `external_ref=eq.${encodeURIComponent(orderId)}&provider=eq.nowpayments&order=created_at.desc&limit=1`,
      );
      if (Array.isArray(rows) && rows[0]) {
        userId = rows[0].user_id;
        const amt = Number(rows[0].amount_ngn);
        if (Number.isFinite(amt) && amt > 0) creditNgn = amt;
        const raw = rows[0].raw as Record<string, unknown> | null;
        if (!creditNgn && raw?.credit_ngn) creditNgn = Number(raw.credit_ngn);
      }
    }
  } catch (e) {
    console.error('[nowpayments] lookup', e);
  }

  if (!userId || !creditNgn || creditNgn <= 0) {
    console.error('[nowpayments] saved order missing or invalid', { orderId, paymentId });
    return NextResponse.json({ error: 'Saved payment order not found' }, { status: 500 });
  }

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const reference = `nowpayments:${orderId || paymentId}`;

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
        p_amount: creditNgn,
        p_reference: reference,
        p_description: `Crypto funding via NowPayments ($${priceAmount})`,
      }),
    });

    if (!rpc.ok) {
      const t = await rpc.text().catch(() => '');
      console.error('[nowpayments] credit failed', rpc.status, t.slice(0, 400));
      return NextResponse.json({ error: 'Credit failed' }, { status: 500 });
    }

    // Referral: 10% of this user's FIRST deposit goes to their referrer (no-op otherwise)
    try {
      await fetch(`${base}/rest/v1/rpc/referral_reward_on_deposit`, {
        method: 'POST',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_user: userId, p_amount: creditNgn }),
      });
    } catch { /* referral reward is best-effort; deposit already credited */ }

    const newBal = await rpc.json();
    console.info('[nowpayments] credited', { userId, creditNgn, paymentId, orderId, newBal });
    return NextResponse.json({ status: 'ok', credited: creditNgn, balance: newBal });
  } catch (e) {
    console.error('[nowpayments] error', e);
    return NextResponse.json({ error: 'Credit error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'nowpayments-ipn',
    ready: Boolean(process.env.NOWPAYMENTS_IPN_SECRET),
  });
}
