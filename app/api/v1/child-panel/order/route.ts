import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;

  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (base && anon) {
    try {
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const u = (await res.json()) as { id?: string };
        if (u.id) return u.id;
      }
    } catch {
      /* ignore */
    }
  }

  // Fallback JWT sub claim decode
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && typeof payload.sub === 'string' && payload.sub.length > 10) {
        return payload.sub;
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function debitRetailWallet(userId: string, amountNgn: number, reference: string, description: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const res = await fetch(`${base}/rest/v1/rpc/debit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amountNgn,
      p_reference: reference,
      p_description: description,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(text)) {
      const err = new Error('INSUFFICIENT_BALANCE');
      (err as any).code = 'INSUFFICIENT_BALANCE';
      throw err;
    }
    throw new Error(`Debit failed: ${text.slice(0, 200)}`);
  }

  return res.json().catch(() => ({}));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      packageId,
      packageName,
      price,
      brandName,
      domain,
      whatsapp,
      email,
      notes,
      paymentMode,
    } = body || {};

    if (!packageId || !packageName || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Invalid package selection or price.' }, { status: 400 });
    }

    if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
      return NextResponse.json({ error: 'Website / Brand name is required.' }, { status: 400 });
    }

    if (!whatsapp || typeof whatsapp !== 'string' || !whatsapp.trim()) {
      return NextResponse.json({ error: 'WhatsApp contact number is required for deployment.' }, { status: 400 });
    }

    const userId = await resolveUserId(req);
    const reference = `VX-CP-${Math.floor(100000 + Math.random() * 900000)}`;
    const base = supabaseBase();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let orderStatus = 'pending_review';

    if (paymentMode === 'wallet') {
      if (!userId) {
        return NextResponse.json(
          { error: 'You must be signed in to pay with your Verxor wallet.', code: 'AUTH_REQUIRED' },
          { status: 401 },
        );
      }

      try {
        await debitRetailWallet(
          userId,
          price,
          reference,
          `Child Panel Order: ${packageName} (${brandName.trim()})`,
        );
        orderStatus = 'paid';
      } catch (err: any) {
        if (err?.code === 'INSUFFICIENT_BALANCE' || err?.message === 'INSUFFICIENT_BALANCE') {
          return NextResponse.json(
            { error: 'Insufficient wallet balance for this package.', code: 'INSUFFICIENT_BALANCE' },
            { status: 402 },
          );
        }
        return NextResponse.json(
          { error: err?.message || 'Failed to process wallet debit.' },
          { status: 500 },
        );
      }
    } else {
      orderStatus = 'pending_bank_transfer';
    }

    // Insert order record into public.service_orders if Supabase is configured
    let orderId = reference;
    if (base && serviceKey && userId) {
      try {
        const usdApprox = Number((price / 1500).toFixed(4));
        const res = await fetch(`${base}/rest/v1/service_orders`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            user_id: userId,
            category: 'other',
            provider: 'verxor_child_panel',
            provider_order_id: reference,
            title: `Child Panel - ${packageName}`,
            price_usd: usdApprox,
            status: orderStatus,
            meta: {
              package_id: packageId,
              package_name: packageName,
              price_ngn: price,
              brand_name: brandName.trim(),
              domain: (domain || '').trim(),
              whatsapp: whatsapp.trim(),
              email: (email || '').trim(),
              notes: (notes || '').trim(),
              payment_mode: paymentMode,
              reference,
            },
          }),
        });

        if (res.ok) {
          const inserted = await res.json().catch(() => []);
          if (Array.isArray(inserted) && inserted[0]?.id) {
            orderId = inserted[0].id;
          }
        }
      } catch {
        /* log and proceed */
      }

      // Add in-app notification
      try {
        await fetch(`${base}/rest/v1/notifications`, {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            kind: 'order',
            title: `Child Panel Order Placed (${reference})`,
            message: `Your order for ${packageName} has been received (${orderStatus === 'paid' ? 'Paid via Wallet' : 'Pending Transfer'}). Our engineering team will contact you on WhatsApp (${whatsapp.trim()}) for deployment.`,
            meta: { reference, package_id: packageId, status: orderStatus },
          }),
        });
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      orderId,
      status: orderStatus,
      packageName,
      amount: price,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected server error while processing child panel order.' },
      { status: 500 },
    );
  }
}
