import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/overview — Phase 2 live dashboard data.
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Reads wallet_ledger + transactions (best-effort) and aggregates by Lagos day.
 * Service margins become exact once the pricing tables land; today net revenue
 * = sales (customer debits) - refunds.
 */
export const dynamic = 'force-dynamic';

type LedgerRow = {
  amount?: number;
  amount_usd?: number;
  amount_ngn?: number | null;
  currency?: string;
  kind?: string;
  reference?: string;
  description?: string;
  meta?: Record<string, unknown> | null;
  created_at?: string;
};

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

/** Start of a Lagos (UTC+1) calendar day, i days ago, as UTC ISO. */
function lagosDayStart(daysAgo: number): string {
  const now = new Date(Date.now() + 60 * 60 * 1000); // shift to Lagos
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return new Date(Date.UTC(y, m, d - daysAgo) - 60 * 60 * 1000).toISOString();
}

/** Lagos (UTC+1) calendar day of a row, e.g. "2026-11-28". */
function rowDayKey(r: LedgerRow): string | null {
  const ts = r.created_at;
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  // Lagos day
  const lagos = new Date(d.getTime() + 60 * 60 * 1000);
  return lagos.toISOString().slice(0, 10);
}

/**
 * Row value in NGN. wallet_ledger has NO plain `amount` column: it stores
 * `amount_usd` (always set) and `amount_ngn` (set for NGN rows, null for USD).
 * USD rows are converted with the live admin rate.
 */
function rowValue(r: LedgerRow, usdRate: number): number {
  if (r.amount_ngn !== undefined && r.amount_ngn !== null && Number.isFinite(Number(r.amount_ngn))) {
    return Number(r.amount_ngn);
  }
  if (r.amount !== undefined && Number.isFinite(Number(r.amount))) {
    return Number(r.amount);
  }
  const usd = Number(r.amount_usd);
  if (Number.isFinite(usd) && usd !== 0) return usd * usdRate;
  return 0;
}

function rowIsRefund(r: LedgerRow): boolean {
  const kind = String(r.kind || '').toLowerCase();
  const ref = String(r.reference || '').toLowerCase();
  return kind.includes('refund') || ref.startsWith('refund-');
}

/** A row is a customer purchase if its kind says so, or if it debits the wallet. */
function rowIsPurchase(r: LedgerRow): boolean {
  const kind = String(r.kind || '').toLowerCase();
  if (kind.includes('refund')) return false;
  if (kind.includes('purchase') || kind.includes('debit') || kind.includes('order')) return true;
  return false;
}

function serviceLabel(r: LedgerRow): string {
  const kind = String(r.kind || '');
  const desc = String(
    r.description ||
      ((r.meta as Record<string, unknown> | null)?.description as string | undefined) ||
      '',
  ).toLowerCase();
  const k = kind.toLowerCase();
  if (k.includes('boost')) return 'Boost Account (SMM)';
  if (k.includes('vn') || k.includes('virtual') || k.includes('number')) return 'Virtual Numbers';
  if (k.includes('airtime') || desc.includes('airtime')) return 'Airtime';
  if (k.includes('data') || desc.includes('data')) return 'Data';
  if (k.includes('electricity')) return 'Electricity';
  if (k.includes('tv') || desc.includes('cable')) return 'Cable TV';
  if (k.includes('gift')) return 'Gift Cards';
  if (k.includes('logs') || k.includes('account')) return 'Buy Logs';
  if (k.includes('rent')) return 'Rental';
  return kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Other';
}

export async function GET(req: NextRequest) {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD not configured' }, { status: 503 });
  }
  if (pw !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // Live USD→NGN rate for converting USD ledger rows (admin_settings, fallback 1380).
  let usdRate = 1380;
  try {
    const rr = await fetch(`${base}/rest/v1/admin_settings?key=eq.usd_ngn_rate&select=value&limit=1`, {
      headers: hdr,
      cache: 'no-store',
    });
    if (rr.ok) {
      const rows = (await rr.json()) as Array<{ value?: string | number }>;
      const parsed = Number(rows[0]?.value);
      if (Number.isFinite(parsed) && parsed > 0) usdRate = parsed;
    }
  } catch {
    /* fallback rate */
  }

  const since = lagosDayStart(13);
  const dayKeys: string[] = [];
  for (let i = 0; i <= 13; i++) {
    // Today first, then going back — matches the child-panel daily-earnings layout.
    dayKeys.push(new Date(lagosDayStart(i)).toISOString().slice(0, 10));
  }

  const days = new Map<string, { orders: number; sales: number; refunds: number; net: number }>();
  for (const k of dayKeys) days.set(k, { orders: 0, sales: 0, refunds: 0, net: 0 });
  const services = new Map<string, { orders: number; sales: number }>();

  const collect = (rows: LedgerRow[]) => {
    for (const r of rows) {
      const key = rowDayKey(r);
      if (!key || !days.has(key)) continue;
      const bucket = days.get(key)!;
      const value = rowValue(r, usdRate);
      if (rowIsRefund(r)) {
        bucket.refunds += 1;
        bucket.net -= Math.abs(value);
        continue;
      }
      // Customer purchase debit: kind says purchase/debit/order, or the row
      // carries a negative amount (RPC may store signed values).
      const isPurchase = rowIsPurchase(r) || value < 0;
      if (isPurchase && value !== 0) {
        bucket.orders += 1;
        bucket.sales += Math.abs(value);
        bucket.net += Math.abs(value);
        const label = serviceLabel(r);
        const s = services.get(label) || { orders: 0, sales: 0 };
        s.orders += 1;
        s.sales += Math.abs(value);
        services.set(label, s);
      }
    }
  };

  // wallet_ledger (primary) — try common column set; fall back to narrower select
  let ledgerOk = true;
  try {
    const res = await fetch(
      `${base}/rest/v1/wallet_ledger?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=2000`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      collect((await res.json()) as LedgerRow[]);
    } else {
      ledgerOk = false;
      console.error('[admin/overview] wallet_ledger', res.status, (await res.text().catch(() => '')).slice(0, 200));
    }
  } catch (e) {
    ledgerOk = false;
    console.error('[admin/overview] wallet_ledger fetch failed', e);
  }

  // transactions (panel orders etc.) — best effort, skip if the shape differs
  try {
    const res = await fetch(
      `${base}/rest/v1/transactions?select=*&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=2000`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) collect((await res.json()) as LedgerRow[]);
  } catch {
    /* optional source */
  }

  // New users today (profiles) — best effort
  let newUsers = 0;
  try {
    const todayStart = lagosDayStart(0);
    const res = await fetch(
      `${base}/rest/v1/profiles?select=id&created_at=gte.${encodeURIComponent(todayStart)}&limit=500`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      const rows = (await res.json()) as Array<{ id?: string }>;
      newUsers = Array.isArray(rows) ? rows.length : 0;
    }
  } catch {
    /* optional */
  }

  const dayList = dayKeys.map((k) => {
    const b = days.get(k)!;
    // A day's profit can never be negative: refunds cancel the original sale
    // (usually already counted on its own day), they never "lose" money on the
    // day they land. No orders today = no profit today, never a minus.
    const netDay = Math.max(0, Math.round(b.net * 100) / 100);
    return { date: k, orders: b.orders, sales: Math.round(b.sales * 100) / 100, net: netDay };
  });
  const today = dayList[0];

  return NextResponse.json({
    ok: true,
    todaySales: today.sales,
    todayOrders: today.orders,
    todayRefunds: days.get(dayKeys[0])?.refunds ?? 0,
    todayNet: today.net,
    newUsers,
    days: dayList,
    services: Array.from(services.entries())
      .map(([name, v]) => ({ name, orders: v.orders, sales: Math.round(v.sales * 100) / 100 }))
      .sort((a, b) => b.orders - a.orders),
    ledgerSource: ledgerOk ? 'wallet_ledger+transactions' : 'transactions-only',
  });
}
