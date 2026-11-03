/**
 * POST /api/v1/accounts/buy
 * wallet debit → AccsZone /purchase → refund on failure → save order → return credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPlatformCatalog, purchaseListing, normalizePlatform } from '@/lib/providers/accszone';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

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

async function debitRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
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
      p_amount: amount,
      p_reference: reference,
      p_description: description,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

async function creditRetailWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string,
) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return false;
  const res = await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: description,
    }),
  });
  return res.ok;
}

type BuyBody = {
  listingId?: number | string;
  providerListingId?: number | string;
  quantity?: number;
  platform?: string;
  title?: string;
  unitPriceNgn?: number;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BuyBody;
    const userId = await resolveUserId(req);
    if (!userId) return bad('Unauthorized', 401);

    const adId = Number(body.providerListingId ?? body.listingId);
    const requestedQty = Number(body.quantity);
    if (!Number.isSafeInteger(adId) || adId <= 0) return bad('Invalid listing', 400);
    if (!Number.isSafeInteger(requestedQty) || requestedQty < 1 || requestedQty > 10) {
      return bad('Quantity must be between 1 and 10', 400);
    }

    // Never trust client-supplied price/title/platform. Confirm this listing and
    // current retail price from the server-side provider catalogue before debit.
    const platformToValidate = normalizePlatform(body.platform?.trim() || 'Facebook');
    const enabledPlatforms = new Set(['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram', 'Gmail', 'YouTube', 'Threads', 'WhatsApp']);
    if (!enabledPlatforms.has(platformToValidate)) {
      return bad('Live checkout is not enabled for this platform.', 400);
    }
    const catalog = await fetchPlatformCatalog(platformToValidate, { forceRefresh: true });
    if (!catalog.ok || catalog.source === 'fallback' || catalog.source === 'error') {
      return bad(`Live ${platformToValidate} catalogue is temporarily unavailable. No payment was taken.`, 503);
    }
    const listing = catalog.offers.find(
      (offer) => offer.providerListingId === adId && normalizePlatform(offer.platform) === platformToValidate,
    );
    if (!listing || listing.stock < requestedQty || listing.priceNgn <= 0) {
      return bad('This listing is no longer available in the requested quantity. Refresh the catalogue.', 409);
    }

    const quantity = requestedQty;
    const unitPrice = listing.priceNgn;
    const platform = listing.platform;
    const title = listing.title.slice(0, 200);
    const totalNgn = unitPrice * quantity;
    if (!Number.isSafeInteger(totalNgn) || totalNgn <= 0) return bad('Invalid order total', 400);

    // AccsZone requires a UUID v4 client_reference (idempotency key for purchases).
    const clientRef = crypto.randomUUID();
    const debitRef = `acc-buy-${clientRef}`;

    try {
      await debitRetailWallet(userId, totalNgn, debitRef, `Accounts: ${title} x${quantity}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') return bad('Insufficient wallet balance', 402);
      return bad(msg, 500);
    }

    let purchase: Awaited<ReturnType<typeof purchaseListing>>;
    try {
      purchase = await purchaseListing({
        adId,
        quantity,
        clientReference: clientRef,
      });
    } catch {
      const refunded = await creditRetailWallet(
        userId,
        totalNgn,
        `refund-${debitRef}`,
        `Refund accounts purchase failed: ${title}`,
      );
      return NextResponse.json(
        { ok: false, error: refunded ? 'Provider request failed. The wallet debit was refunded.' : 'Provider request failed and the refund could not be confirmed. Contact support before retrying.', refunded },
        { status: 502 },
      );
    }

    if (!purchase.ok) {
      // Ambiguous provider timeouts: the purchase may have completed on
      // AccsZone's side even though we could not confirm it. Auto-refunding
      // here risks paying the provider without charging the customer, so the
      // wallet stays debited and support reconciles with the client reference.
      if (purchase.code === 'provider_timeout_unconfirmed') {
        return NextResponse.json(
          {
            ok: false,
            error:
              'The purchase is still being confirmed with the provider. Your wallet was debited and any overcharge will be refunded automatically once the order status is confirmed. Please contact support with this reference if you do not receive your accounts shortly.',
            code: purchase.code,
            reference: clientRef,
          },
          { status: 504 },
        );
      }
      const refunded = await creditRetailWallet(
        userId,
        totalNgn,
        `refund-${debitRef}`,
        `Refund accounts purchase failed: ${title}`,
      );
      return NextResponse.json(
        {
          ok: false,
          error: refunded ? (purchase.error || 'Purchase failed at provider') : 'Purchase failed and the refund could not be confirmed. Contact support before retrying.',
          code: purchase.code || 'provider_error',
          refunded,
        },
        { status: 502 },
      );
    }

    let orderId: string | null = null;
    let persistenceWarning: string | undefined;
    if (supabaseConfigured()) {
      try {
        const inserted = await sbInsert('account_orders', {
          user_id: userId,
          platform,
          title,
          quantity,
          unit_price_ngn: unitPrice,
          total_ngn: totalNgn,
          provider_listing_id: adId,
          credentials: purchase.accounts,
          status: 'delivered',
          provider_order_id: purchase.orderId != null ? String(purchase.orderId) : null,
          client_reference: clientRef,
        });
        const row = Array.isArray(inserted) ? inserted[0] : inserted;
        orderId = row && typeof row === 'object' && 'id' in row ? String((row as { id: string }).id) : null;
        if (!orderId) persistenceWarning = 'Delivery succeeded, but the order could not be confirmed in My Logs. Save these credentials and contact support.';
      } catch {
        persistenceWarning = 'Delivery succeeded, but the order could not be saved to My Logs. Save these credentials and contact support.';
      }
    } else {
      persistenceWarning = 'Order storage is not configured. Save these credentials securely.';
    }

    return NextResponse.json({
      ok: true,
      orderId,
      credentials: purchase.accounts,
      quantity: purchase.accounts.length,
      totalNgn,
      platform,
      title,
      warning: persistenceWarning,
      message: 'Purchase successful. Credentials are ready.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
