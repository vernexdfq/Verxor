import { NextRequest, NextResponse } from 'next/server';
import { rentLinePriceNgn, RENT_LINE_PERIODS, type RentLineAudience } from '@/lib/rentline-pricing';
import { resolvePanelClient } from '@/lib/panel-auth';
import { notifyAdmin } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  let u = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  u = u.split('/rest/v1')[0];
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId) return bodyUserId;
  const header = (req.headers.get('x-vx-user') || '').trim();
  if (header) return header;
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
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

async function debitRetailWallet(userId: string, amount: number, reference: string, description: string) {
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
    body: JSON.stringify({ p_user_id: userId, p_amount: amount, p_reference: reference, p_description: description }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    if (/INSUFFICIENT_BALANCE/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
    throw new Error(`Debit failed: ${t.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

/**
 * POST /api/v1/rent-line/renew  { id, period, userId }
 * Extends a line the user owns from max(now, expires_at).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; period?: string; userId?: string };
  const lineId = String(body.id || '').trim();
  const period = RENT_LINE_PERIODS[body.period || ''] ? String(body.period) : '30d';
  if (!lineId) return NextResponse.json({ ok: false, error: 'Missing line id' }, { status: 400 });
  const userId = await resolveUserId(req, body.userId);
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in required' }, { status: 401 });

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hdr = { apikey: serviceKey || '', Authorization: `Bearer ${serviceKey || ''}`, 'Content-Type': 'application/json' };
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Backend not configured' }, { status: 503 });
  }
  const q = await fetch(
    `${base}/rest/v1/rented_lines?id=eq.${encodeURIComponent(lineId)}&select=id,user_id,e164,country_code,status,expires_at`,
    { headers: hdr, cache: 'no-store' },
  );
  if (!q.ok) return NextResponse.json({ ok: false, error: 'Could not find that line' }, { status: 502 });
  const rows = (await q.json()) as Array<{
    id?: string; user_id?: string; e164?: string; country_code?: string; status?: string; expires_at?: string;
  }>;
  const row = rows?.[0];
  if (!row) return NextResponse.json({ ok: false, error: 'Line not found' }, { status: 404 });
  if (String(row.user_id || '') !== userId) {
    return NextResponse.json({ ok: false, error: 'Not your line' }, { status: 403 });
  }
  if (String(row.status || '') === 'released') {
    return NextResponse.json({ ok: false, error: 'That line was released. Rent a new number.' }, { status: 400 });
  }

  // Audience tier: child panel renews its own lines from the panel wallet.
  const panel = await resolvePanelClient(req).catch(() => null);
  const audience: RentLineAudience = panel ? 'child' : 'retail';
  const totalNgn = await rentLinePriceNgn(period, audience);
  if (!totalNgn) {
    return NextResponse.json({ ok: false, error: 'That renewal period is not priced yet.' }, { status: 400 });
  }
  const periodInfo = RENT_LINE_PERIODS[period];
  const debitRef = `swr-${userId.slice(0, 8)}-${Date.now()}`;
  const desc = `Rent-a-line renewal · ${String(row.e164 || '')} · ${periodInfo.label}`;
  try {
    if (panel) {
      const pres = await fetch(`${base}/rest/v1/rpc/debit_reseller_wallet`, {
        method: 'POST',
        headers: hdr,
        body: JSON.stringify({ p_user_id: userId, p_amount: totalNgn, p_reference: debitRef }),
      });
      if (!pres.ok) {
        const t = await pres.text().catch(() => '');
        if (/insufficient/i.test(t)) throw new Error('INSUFFICIENT_BALANCE');
        throw new Error(`Reseller debit failed: ${t.slice(0, 200)}`);
      }
    } else {
      await debitRetailWallet(userId, totalNgn, debitRef, desc);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Debit failed';
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: `Insufficient wallet balance — total is ₦${totalNgn.toLocaleString('en-NG')}.` },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const from = Math.max(Date.now(), Date.parse(String(row.expires_at || '')) || 0);
  const newExpiry = new Date(from + periodInfo.days * 24 * 60 * 60 * 1000).toISOString();
  const upd = await fetch(`${base}/rest/v1/rented_lines?id=eq.${encodeURIComponent(lineId)}`, {
    method: 'PATCH',
    headers: { ...hdr, Prefer: 'return=minimal' },
    body: JSON.stringify({ period, expires_at: newExpiry, status: 'active', updated_at: new Date().toISOString() }),
  });
  if (!upd.ok) {
    return NextResponse.json({ ok: false, error: 'Renewal failed after payment. Contact support with this reference: ' + debitRef }, { status: 502 });
  }
  void notifyAdmin(
    `🔁 Rent-a-line renewed\n${String(row.e164 || '')} · ${periodInfo.label} · ₦${totalNgn.toLocaleString('en-NG')}\nCustomer: ${userId}`,
  );
  return NextResponse.json({ ok: true, expiresAt: newExpiry });
}
