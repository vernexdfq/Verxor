import { NextRequest, NextResponse } from 'next/server';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Fixed credit rate: $1 → ₦1600 (override with CRYPTO_USD_TO_NGN) */
function usdToNgnRate(): number {
  const n = Number(process.env.CRYPTO_USD_TO_NGN);
  return Number.isFinite(n) && n > 0 ? n : 1600;
}

async function resolveUserId(req: NextRequest, body: { userId?: string }): Promise<string | null> {
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !serviceKey) return (body.userId || '').trim() || null;

  let userId = (body.userId || '').trim();
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) userId = u.id;
      }
    } catch {
      /* ignore */
    }
  }
  return userId || null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const amountUsd = Number(searchParams.get('amountUsd') || searchParams.get('usd') || 0);
  const rate = usdToNgnRate();
  const creditNgn = Math.round(amountUsd * rate * 100) / 100;
  return NextResponse.json({
    ok: true,
    amountUsd,
    creditNgn: amountUsd > 0 ? creditNgn : 0,
    minUsd: 1,
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: 'NowPayments is not configured (NOWPAYMENTS_API_KEY).' },
      { status: 503 },
    );
  }

  let body: { amountUsd?: number; userId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const amountUsd = Number(body.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd < 1) {
    return NextResponse.json(
      { ok: false, message: 'Enter at least $1 to fund with crypto.' },
      { status: 400 },
    );
  }

  const userId = await resolveUserId(req, body);
  if (!userId) {
    return NextResponse.json(
      { ok: false, message: 'Please log in again to fund with crypto.' },
      { status: 401 },
    );
  }

  const rate = usdToNgnRate();
  const creditNgn = Math.round(amountUsd * rate * 100) / 100;
  const orderId = `vx-crypto-${userId.slice(0, 8)}-${Date.now()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://verxor.com').replace(/\/$/, '');
  const ipnUrl =
    process.env.NOWPAYMENTS_IPN_URL || `${appUrl}/api/webhooks/nowpayments`;

  const payload: Record<string, unknown> = {
    price_amount: amountUsd,
    price_currency: 'usd',
    // omit pay_currency → user picks coin on NowPayments checkout
    order_id: orderId,
    order_description: `Verxor wallet funding $${amountUsd} (≈ ₦${creditNgn.toLocaleString()})`,
    ipn_callback_url: ipnUrl,
    success_url: `${appUrl}/?fund=crypto_ok`,
    cancel_url: `${appUrl}/?fund=crypto_cancel`,
    is_fee_paid_by_user: true,
  };

  let npRes: Response;
  try {
    npRes = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch (e) {
    console.error('[funding/crypto] network', e);
    return NextResponse.json(
      { ok: false, message: 'Could not reach NowPayments. Try again.' },
      { status: 502 },
    );
  }

  const rawText = await npRes.text().catch(() => '');
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    raw = { raw: rawText.slice(0, 200) };
  }

  if (!npRes.ok) {
    console.error('[funding/crypto] error', npRes.status, rawText.slice(0, 400));
    const msg =
      (typeof raw.message === 'string' && raw.message) ||
      `NowPayments error (${npRes.status})`;
    return NextResponse.json({ ok: false, message: String(msg) }, { status: 502 });
  }

  const invoiceUrl = String(raw.invoice_url || raw.invoiceUrl || '');
  const invoiceId = String(raw.id || raw.invoice_id || '');

  if (!invoiceUrl) {
    return NextResponse.json(
      { ok: false, message: 'NowPayments did not return a checkout URL.' },
      { status: 502 },
    );
  }

  if (supabaseConfigured()) {
    try {
      await sbInsert('virtual_accounts', {
        user_id: userId,
        provider: 'nowpayments',
        bank_code: 'crypto',
        bank_name: 'NowPayments',
        account_number: invoiceId || orderId,
        account_name: 'Crypto',
        account_type: 'crypto',
        amount_ngn: creditNgn,
        external_ref: orderId,
        provider_customer_id: invoiceId || null,
        raw: {
          amount_usd: amountUsd,
          rate_ngn_per_usd: rate,
          credit_ngn: creditNgn,
          invoice: raw,
        },
      });
    } catch (e) {
      console.error('[funding/crypto] save order', e);
    }
  }

  return NextResponse.json({
    ok: true,
    invoiceUrl,
    invoiceId,
    orderId,
    amountUsd,
    creditNgn,
    feeNote: 'NowPayments network and gateway fees are paid on checkout',
  });
}
