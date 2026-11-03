/**
 * POST /api/v1/accounts/buy
 * wallet debit → AccsZone /purchase → refund on failure → save order → return credentials
 *
 * Auth: retail end-user JWT (wallets via debit_wallet RPC)
 *    or child-panel API key vx_panel_* (reseller_wallet, tiered wholesale:
 *    $0.01–$1.00 ×1.50 · $1.01–$10.00 ×1.25 · $10.01+ ×1.15 at the USD_NGN_RATE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchPlatformCatalog, purchaseListing, normalizePlatform } from '@/lib/providers/accszone';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient, getPanelAdminEmail } from '@/lib/panel-auth';
import { panelAllowsBuyLogs, accountsWholesaleUnitNgn } from '@/lib/panel-accounts';
import { sendPanelAdminOrderAlert } from '@/lib/email/receipts';

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

/**
 * Partner / child-panel wholesale balance (reseller_wallet).
 * This is where Partner Fund deposits land — must be used for panel buys.
 */
async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  // Ensure row exists
  await fetch(`${base}/rest/v1/reseller_wallet`, {
    method: 'POST',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: userId, balance: 0 }),
  }).catch(() => null);

  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!balRes.ok) {
    throw new Error(`Reseller balance read failed: ${balRes.status}`);
  }
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  if (prev < amount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  const next = Math.round((prev - amount) * 100) / 100;

  const up = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`,
    {
      method: 'PATCH',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
    },
  );
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
  }

  // Ledger row (best-effort)
  try {
    await fetch(`${base}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'panel_logs_debit',
        status: 'completed',
        amount: -amount,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* optional */
  }

  return { balance: next };
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;

  const hdr = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  const balRes = await fetch(
    `${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}&select=balance&limit=1`,
    { headers: hdr, cache: 'no-store' },
  );
  const rows = balRes.ok ? ((await balRes.json()) as Array<{ balance: number }>) : [];
  const prev = Number(rows?.[0]?.balance) || 0;
  const next = Math.round((prev + amount) * 100) / 100;

  await fetch(`${base}/rest/v1/reseller_wallet?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      ...hdr,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });

  try {
    await fetch(`${base}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        ...hdr,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        kind: 'panel_logs_refund',
        status: 'completed',
        amount,
        meta: { reference, mode: 'reseller_wallet' },
      }),
    });
  } catch {
    /* optional */
  }
}

type BuyBody = {
  listingId?: number | string;
  providerListingId?: number | string;
  quantity?: number;
  platform?: string;
  title?: string;
  unitPriceNgn?: number;
  customerName?: string;
  customerEmail?: string;
  customerPaidNgn?: number;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BuyBody;

    // Panel / API-user path: vx_panel_* key with a linked reseller wallet.
    const panel = await resolvePanelClient(req);
    if (panel && !panelAllowsBuyLogs(panel)) {
      return bad('This panel key is not allowed to buy logs (accounts)', 403);
    }
    const useReseller = Boolean(panel);
    const userId = panel ? panel.walletUserId : await resolveUserId(req);
    if (!userId) {
      if (panel) {
        return bad(
          'Panel wallet not linked. Regenerate the panel key with ownerEmail, or set meta.wallet_user_id / VERXOR_PANEL_WALLET_USER_ID.',
          402,
        );
      }
      return bad('Unauthorized', 401);
    }

    const adId = Number(body.providerListingId ?? body.listingId);
    const requestedQty = Number(body.quantity);
    if (!Number.isSafeInteger(adId) || adId <= 0) return bad('Invalid listing', 400);
    if (!Number.isSafeInteger(requestedQty) || requestedQty < 1 || requestedQty > 10) {
      return bad('Quantity must be between 1 and 10', 400);
    }

    // Never trust client-supplied price/title/platform. Confirm this listing and
    // current retail price from the server-side provider catalogue before debit.
    const platformToValidate = normalizePlatform(body.platform?.trim() || 'Facebook');
    const enabledPlatforms = new Set(['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram', 'Gmail', 'YouTube', 'Threads', 'WhatsApp', 'Mobile Proxies', 'Google Voice', 'Odnoklassniki', 'LinkedIn', 'Reddit', 'Indeed', 'Truth Social', 'AI Accounts', 'Google Ads', 'Bluesky', 'Snapchat', 'Discord', 'Twitch', 'Trustpilot', 'Quora', 'Dating Apps', 'Grindr', 'eHarmony', 'Badoo', 'Gaming', 'Premium Subscriptions', 'Mastercard', 'Apple', 'E-Commerce', 'Spotify', 'VPN', 'Netflix', 'Pinterest', 'Yahoo', 'CapCut', 'Phone & Messaging', 'Roblox', 'GitHub', 'Outlook']);
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
    const platform = listing.platform;
    const title = listing.title.slice(0, 200);

    // Pricing: retail users pay the live retail price; panels/API users pay the
    // tiered wholesale price computed server-side from the same live price.
    const rate = Number(process.env.USD_NGN_RATE || 1380) || 1380;
    const unitPrice = useReseller
      ? accountsWholesaleUnitNgn(listing.priceNgn, rate)
      : listing.priceNgn;
    const totalNgn = unitPrice * quantity;
    if (!Number.isSafeInteger(totalNgn) || totalNgn <= 0) return bad('Invalid order total', 400);

    // AccsZone requires a UUID v4 client_reference (idempotency key for purchases).
    const clientRef = crypto.randomUUID();
    const debitRef = `acc-buy-${panel ? `panel-${panel.id}` : userId}-${clientRef}`;

    try {
      if (useReseller) {
        await debitResellerWallet(userId, totalNgn, debitRef);
      } else {
        await debitRetailWallet(userId, totalNgn, debitRef, `Accounts: ${title} x${quantity}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') {
        return bad(
          useReseller
            ? 'Insufficient panel wholesale balance. Fund the partner wallet first.'
            : 'Insufficient wallet balance',
          402,
        );
      }
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
      const refunded = useReseller
        ? (await creditResellerWallet(userId, totalNgn, `refund-${debitRef}`), true)
        : await creditRetailWallet(userId, totalNgn, `refund-${debitRef}`, `Refund accounts purchase failed: ${title}`);
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
              'The purchase is still being confirmed with the provider. The wallet was debited and any overcharge will be refunded automatically once the order status is confirmed. Please contact support with this reference if the accounts are not delivered shortly.',
            code: purchase.code,
            reference: clientRef,
          },
          { status: 504 },
        );
      }
      if (useReseller) {
        await creditResellerWallet(userId, totalNgn, `refund-${debitRef}`);
        return NextResponse.json(
          { ok: false, error: purchase.error || 'Purchase failed at provider. The panel wallet was refunded.', code: purchase.code || 'provider_error', refunded: true },
          { status: 502 },
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

    // Provider safety: if AccsZone delivers fewer units than were debited,
    // refund the difference immediately so the buyer never overpays.
    const deliveredQty = purchase.accounts.length;
    const shortQty = quantity - deliveredQty;
    let chargedTotal = totalNgn;
    if (shortQty > 0) {
      const shortRefund = unitPrice * shortQty;
      if (useReseller) {
        await creditResellerWallet(userId, shortRefund, `refund-short-${debitRef}`);
        chargedTotal = totalNgn - shortRefund;
      } else {
        const refundedShort = await creditRetailWallet(
          userId,
          shortRefund,
          `refund-short-${debitRef}`,
          `Refund ${shortQty} undelivered unit(s): ${title}`,
        );
        if (refundedShort) chargedTotal = totalNgn - shortRefund;
      }
    }

    let orderId: string | null = null;
    let persistenceWarning: string | undefined;
    if (supabaseConfigured()) {
      try {
        const inserted = await sbInsert('account_orders', {
          user_id: userId,
          platform,
          title,
          quantity: deliveredQty,
          unit_price_ngn: unitPrice,
          total_ngn: chargedTotal,
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

    // Panel wholesale order: notify the panel admin only, never the end customer.
    if (panel) {
      try {
        const adminEmail = await getPanelAdminEmail(panel);
        if (adminEmail) {
          const customerPaid = Number(body.customerPaidNgn);
          const validPaid = Number.isFinite(customerPaid) && customerPaid > 0 ? customerPaid : undefined;
          const customerLabel = (body.customerName || body.customerEmail || '').trim() || 'Child panel customer';
          const mail = await sendPanelAdminOrderAlert(adminEmail, {
            panelName: panel.name,
            adminEmail,
            customerName: customerLabel,
            customerEmail: body.customerEmail ? body.customerEmail.trim() : undefined,
            service: `Buy Logs — ${platform}`,
            orderId: orderId || clientRef,
            wholesaleAmountNgn: chargedTotal,
            customerPaidNgn: validPaid,
            details: [
              { label: 'Customer', value: customerLabel },
              { label: 'Platform', value: platform },
              { label: 'Listing', value: title },
              { label: 'Quantity', value: String(deliveredQty) },
              { label: 'Client reference', value: clientRef },
            ],
            date: new Date(),
          });
          if (!mail.ok) console.warn('[email] Panel admin alert not sent:', mail.error);
        }
      } catch (err) {
        console.warn('[email] Panel admin alert dispatch failed:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      orderId,
      credentials: purchase.accounts,
      quantity: deliveredQty,
      totalNgn: chargedTotal,
      unitPriceNgn: unitPrice,
      platform,
      title,
      warning: persistenceWarning,
      message: 'Purchase successful. Credentials are ready.',
      panel: panel ? { id: panel.id, name: panel.name } : null,
      wholesale: useReseller
        ? {
            unitNgn: unitPrice,
            totalNgn: chargedTotal,
            providerUnitNgn: listing.priceNgn,
            rate,
            multiplier: Number((unitPrice / Math.max(1, listing.priceNgn)).toFixed(4)),
          }
        : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
