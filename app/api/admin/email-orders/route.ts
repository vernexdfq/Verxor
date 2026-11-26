import { NextRequest, NextResponse } from 'next/server';

/**
 * GET   /api/admin/email-orders?q=<search>&status=<status>&limit=<n>
 * PATCH /api/admin/email-orders  body { id, status?, message?, refund? }
 *
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Admin management for customer email OTP orders (public.email_orders).
 * - PATCH status: waiting | completed | cancelled | refunded (free-form edit)
 * - PATCH message: overwrite the stored message the customer sees (e.g. paste
 *   an OTP manually)
 * - PATCH refund=true: credits the customer's wallet with charged_ngn via the
 *   credit_wallet RPC and marks the order refunded. Guarded against double
 *   refunds (a refund only proceeds when the order is not already refunded).
 */
export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function dbHeaders(): Record<string, string> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
  };
}

function authorized(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  return Boolean(expected) && pw === expected;
}

type OrderRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_order_id: string;
  email_address: string;
  site: string;
  domain: string;
  cost_usd: string | number;
  charged_ngn: string | number;
  audience: string;
  status: string;
  message: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const status = (req.nextUrl.searchParams.get('status') || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(10, Number(req.nextUrl.searchParams.get('limit')) || 100));

  try {
    let url = `${base}/rest/v1/email_orders?order=created_at.desc&limit=${limit}` +
      `&select=id,user_id,provider,provider_order_id,email_address,site,domain,cost_usd,charged_ngn,audience,status,message,created_at`;
    if (status && status !== 'all') url += `&status=eq.${encodeURIComponent(status)}`;
    if (q) {
      // Search across email, site, domain and provider order id via OR
      const like = `ilike.*${encodeURIComponent(q)}*`;
      url += `&or=(email_address.${like},site.${like},domain.${like},provider_order_id.${like})`;
    }

    const res = await fetch(url, { headers: hdr, cache: 'no-store' });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `DB query failed: ${t.slice(0, 160)}` }, { status: 500 });
    }
    const rows = (await res.json()) as OrderRow[];

    // Attach light profile info for display
    const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))].slice(0, 100);
    const profiles = new Map<string, { email?: string; full_name?: string }>();
    if (ids.length) {
      try {
        const pRes = await fetch(
          `${base}/rest/v1/profiles?id=in.(${ids.map((i) => encodeURIComponent(i)).join(',')})&select=id,email,full_name&limit=100`,
          { headers: hdr, cache: 'no-store' },
        );
        if (pRes.ok) {
          const pRows = (await pRes.json()) as Array<{ id: string; email?: string; full_name?: string }>;
          for (const p of pRows) profiles.set(p.id, { email: p.email, full_name: p.full_name });
        }
      } catch { /* profile join is best-effort */ }
    }

    const orders = rows.map((r) => {
      const p = profiles.get(r.user_id) || {};
      return {
        id: r.id,
        userId: r.user_id,
        userLabel: p.full_name || p.email || r.user_id.slice(0, 8),
        provider: r.provider,
        providerOrderId: r.provider_order_id,
        email: r.email_address,
        site: r.site,
        domain: r.domain,
        costUsd: Number(r.cost_usd) || 0,
        chargedNgn: Number(r.charged_ngn) || 0,
        audience: r.audience,
        status: r.status,
        message: r.message,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ ok: true, orders, count: orders.length });
  } catch (e) {
    console.error('[admin/email-orders GET]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const base = supabaseBase();
  const hdr = dbHeaders();
  if (!base || !hdr) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }

  let body: { id?: string; status?: string; message?: string; refund?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Order id required' }, { status: 400 });
  }
  const status = body.status != null ? String(body.status).trim().toLowerCase().slice(0, 30) : null;
  const message = body.message != null ? String(body.message).slice(0, 5000) : null;
  const refund = body.refund === true;

  if (!status && message == null && !refund) {
    return NextResponse.json({ ok: false, error: 'Nothing to update' }, { status: 400 });
  }

  try {
    // Load current row (needed for refund guard + user id)
    const curRes = await fetch(
      `${base}/rest/v1/email_orders?id=eq.${encodeURIComponent(id)}&select=id,user_id,status,charged_ngn&limit=1`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!curRes.ok) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }
    const curRows = (await curRes.json()) as Array<{ id: string; user_id: string; status: string; charged_ngn: string | number }>;
    const cur = curRows[0];
    if (!cur) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    if (refund) {
      if (cur.status === 'refunded') {
        return NextResponse.json({ ok: false, error: 'This order is already refunded' }, { status: 409 });
      }
      const amount = Number(cur.charged_ngn) || 0;
      if (amount > 0) {
        const rpc = await fetch(`${base}/rest/v1/rpc/credit_wallet`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify({
            p_user_id: cur.user_id,
            p_amount: amount,
            p_reference: `email-admin-refund-${id.slice(0, 8)}-${Date.now()}`,
            p_description: 'Admin refund — Email OTP order',
          }),
        });
        if (!rpc.ok) {
          const t = await rpc.text().catch(() => '');
          return NextResponse.json({ ok: false, error: `Refund failed: ${t.slice(0, 140)}` }, { status: 500 });
        }
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (message != null) patch.message = message;
    if (refund) patch.status = 'refunded';

    const upRes = await fetch(`${base}/rest/v1/email_orders?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...hdr, Prefer: 'return=minimal' },
      body: JSON.stringify(patch),
    });
    if (!upRes.ok) {
      const t = await upRes.text().catch(() => '');
      return NextResponse.json({ ok: false, error: `Update failed: ${t.slice(0, 140)}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, refunded: refund });
  } catch (e) {
    console.error('[admin/email-orders PATCH]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
