import { NextRequest, NextResponse } from 'next/server';
import { getQuantity, orderEmail, isConfigured } from '@/lib/providers/anymessage';
import { sbInsert, sbSelect, supabaseConfigured } from '@/lib/supabase-admin';
import { resolvePanelClient } from '@/lib/panel-auth';
import { resolveEmailOtpPricing, emailOtpPriceNgn } from '@/lib/email-otp-pricing';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token.startsWith('vx_panel_')) return null;
  const base = supabaseBase();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(base + '/auth/v1/user', {
      headers: { apikey: anon, Authorization: 'Bearer ' + token },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string };
    return u.id || null;
  } catch {
    return null;
  }
}

async function settingsList(key: string): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  try {
    const rows = (await sbSelect(
      'admin_settings',
      'key=eq.' + key + '&select=value&limit=1',
    )) as Array<{ value?: string }>;
    const parsed = rows?.[0]?.value ? JSON.parse(rows[0].value) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function debitRetailWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const res = await fetch(base + '/rest/v1/rpc/debit_wallet', {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Email OTP purchase',
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error('Debit failed: ' + t.slice(0, 200));
  }
  return res.json();
}

async function debitResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) throw new Error('Wallet backend not configured');
  const hdr = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
  await fetch(base + '/rest/v1/reseller_wallet', {
    method: 'POST',
    headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId, balance: 0 }),
  }).catch(() => null);
  const balRes = await fetch(
    base + '/rest/v1/reseller_wallet?user_id=eq.' + encodeURIComponent(userId) + '&select=balance&limit=1',
    { headers: hdr, cache: 'no-store' },
  );
  if (!balRes.ok) throw new Error('Reseller balance read failed');
  const rows = (await balRes.json()) as Array<{ balance: number }>;
  const prev = Number(rows?.[0]?.balance) || 0;
  if (prev < amount) throw new Error('INSUFFICIENT_BALANCE');
  const next = Math.round((prev - amount) * 100) / 100;
  const up = await fetch(base + '/rest/v1/reseller_wallet?user_id=eq.' + encodeURIComponent(userId), {
    method: 'PATCH',
    headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => '');
    throw new Error('Reseller debit failed: ' + t.slice(0, 200));
  }
  try {
    await fetch(base + '/rest/v1/transactions', {
      method: 'POST',
      headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        kind: 'panel_email_debit',
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

async function creditRetailWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  await fetch(base + '/rest/v1/rpc/credit_wallet', {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: 'Refund: email OTP purchase failed',
    }),
  }).catch(() => null);
}

async function creditResellerWallet(userId: string, amount: number, reference: string) {
  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey || amount <= 0) return;
  const hdr = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
  const balRes = await fetch(
    base + '/rest/v1/reseller_wallet?user_id=eq.' + encodeURIComponent(userId) + '&select=balance&limit=1',
    { headers: hdr, cache: 'no-store' },
  );
  const rows = balRes.ok ? ((await balRes.json()) as Array<{ balance: number }>) : [];
  const prev = Number(rows?.[0]?.balance) || 0;
  const next = Math.round((prev + amount) * 100) / 100;
  await fetch(base + '/rest/v1/reseller_wallet?user_id=eq.' + encodeURIComponent(userId), {
    method: 'PATCH',
    headers: { ...hdr, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ balance: next, updated_at: new Date().toISOString() }),
  }).catch(() => null);
}

function cleanSite(raw: string): string {
  let s = (raw || '').toLowerCase().trim();
  s = s.split('/rest')[0];
  if (s.startsWith('https://')) s = s.slice(8);
  if (s.startsWith('http://')) s = s.slice(7);
  if (s.startsWith('www.')) s = s.slice(4);
  s = s.split('/')[0];
  return s.trim();
}

/**
 * POST /api/v1/email-otp/order  { site, domain, userId? }
 * Server-side pricing (client price is IGNORED). Debits wallet, orders the
 * inbox from AnyMessage, stores the order, refunds on provider failure.
 */
export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Email OTP provider is not configured' }, { status: 503 });
  }

  let body: { site?: string; domain?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const site = cleanSite(String(body.site || ''));
  const domain = String(body.domain || '').trim().toLowerCase();
  if (!site || !domain) {
    return NextResponse.json({ ok: false, error: 'site and domain are required' }, { status: 400 });
  }

  const panel = await resolvePanelClient(req);
  let userId = await resolveUserId(req, body.userId);
  if (!userId && panel?.walletUserId) userId = panel.walletUserId;
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: 'Sign in required to purchase an email address.' },
      { status: 401 },
    );
  }

  // Ban / freeze enforcement
  const [banned, frozen] = await Promise.all([settingsList('banned_users'), settingsList('frozen_users')]);
  if (banned.includes(userId)) {
    return NextResponse.json(
      { ok: false, error: 'Your account has been banned. Contact Verxor support.' },
      { status: 403 },
    );
  }
  if (frozen.includes(userId)) {
    return NextResponse.json(
      { ok: false, error: 'Your account is frozen. Contact Verxor support to restore access.' },
      { status: 403 },
    );
  }

  // Live stock + provider cost — never trust the client
  let stock: { count: number; price: number } | undefined;
  try {
    const raw = await getQuantity(site);
    stock = raw[domain];
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Provider unavailable';
    return NextResponse.json({ ok: false, error: 'Provider unavailable: ' + msg }, { status: 503 });
  }
  if (!stock) {
    return NextResponse.json({ ok: false, error: 'Unknown domain for this platform' }, { status: 400 });
  }
  if (!Number(stock.count) || Number(stock.count) <= 0) {
    return NextResponse.json({ ok: false, error: 'This domain is out of stock. Pick another one.' }, { status: 409 });
  }

  // Audience + markup + rate (same detection as Virtual Numbers)
  const fwdHeaders: Record<string, string> = { 'x-vx-user': userId };
  const apiKey = req.headers.get('x-api-key');
  const authz = req.headers.get('authorization');
  if (apiKey) fwdHeaders['x-api-key'] = apiKey;
  if (authz) fwdHeaders.authorization = authz;
  if (panel) {
    const key = req.headers.get('x-api-key') || (authz && authz.startsWith('Bearer vx_panel_') ? authz.slice(7) : '');
    if (key) fwdHeaders['x-api-key'] = key;
    fwdHeaders['x-vx-user'] = '';
  }
  const { audience, markup, rate } = await resolveEmailOtpPricing(
    new Request('http://internal/pricing', { headers: fwdHeaders }),
  );
  const costUsd = Number(stock.price) || 0;
  const priceNgn = emailOtpPriceNgn(costUsd, markup, rate);

  const useReseller = Boolean(panel);
  const debitRef = 'email-otp-' + (panel ? 'panel-' + panel.id : userId) + '-' + Date.now();
  let debited = false;

  if (priceNgn > 0) {
    try {
      if (useReseller) {
        await debitResellerWallet(userId, priceNgn, debitRef);
      } else {
        await debitRetailWallet(userId, priceNgn, debitRef);
      }
      debited = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Debit failed';
      if (msg === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json(
          { ok: false, error: 'Insufficient wallet balance. Fund your wallet and try again.', code: 'INSUFFICIENT_BALANCE' },
          { status: 402 },
        );
      }
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  try {
    const result = await orderEmail({ site, domain });

    let savedId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const rows = await sbInsert('email_orders', {
          user_id: userId,
          provider: 'anymessage',
          provider_order_id: result.id,
          email_address: result.email,
          site,
          domain,
          cost_usd: costUsd,
          charged_ngn: priceNgn,
          audience,
          status: 'waiting',
        });
        if (Array.isArray(rows) && rows[0]?.id) savedId = String(rows[0].id);
      } catch {
        /* order row optional */
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId || result.id,
        providerOrderId: result.id,
        email: result.email,
        site,
        domain,
        priceNgn,
        audience,
        status: 'waiting',
      },
    });
  } catch (err) {
    if (debited) {
      if (useReseller) {
        await creditResellerWallet(userId, priceNgn, 'refund-' + debitRef);
      } else {
        await creditRetailWallet(userId, priceNgn, 'refund-' + debitRef);
      }
    }
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return NextResponse.json({ ok: false, error: 'Provider failed, wallet refunded: ' + message }, { status: 503 });
  }
}
