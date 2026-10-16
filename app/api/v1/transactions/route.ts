import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type TxItem = {
  id: string;
  title: string;
  amount: number;
  currency: 'NGN' | 'USD';
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  kind?: string;
};

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const qsUid = req.nextUrl.searchParams.get('userId');

  if (token) {
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
        /* fall through */
      }
    }
  }

  return qsUid || null;
}

/** Turn raw DB text into clean bank-style labels. */
function polishTitle(raw: string, kind: string, reference?: string | null): string {
  const t = (raw || '').trim();
  const lower = t.toLowerCase();
  const k = (kind || '').toLowerCase();
  const ref = (reference || '').toLowerCase();

  // Strip internal / provider noise → clean bank labels
  if (
    lower.startsWith('manual credit') ||
    lower.includes('xixapay') ||
    lower.includes('manual credit') ||
    ref.startsWith('xixapay:manual') ||
    ref.startsWith('xixapay:')
  ) {
    return 'Wallet Fund';
  }

  if (
    k === 'fund' ||
    lower.includes('wallet fund') ||
    lower === 'fund' ||
    lower.includes('top-up') ||
    lower.includes('top up') ||
    lower.includes('topup')
  ) {
    return 'Wallet Fund';
  }
  if (k === 'refund' || lower.startsWith('refund')) {
    if (lower.includes('virtual') || lower.includes('number') || ref.includes('vn')) {
      return 'Refund — Virtual Number';
    }
    if (lower.includes('boost') || lower.includes('cancel')) {
      return 'Refund — Cancelled Order';
    }
    return t.startsWith('Refund') ? t : 'Refund';
  }
  if (k === 'purchase' || lower.includes('virtual number') || ref.startsWith('vn-')) {
    if (t && !lower.startsWith('purchase') && lower.includes('virtual')) return t;
    return t && t.length > 3 && !lower.startsWith('purchase') ? t : 'Virtual Number Purchase';
  }
  if (k === 'wholesale_debit') return 'Wholesale Debit';
  if (k === 'adjustment') return 'Adjustment';

  if (t) return t;
  if (k) return k.charAt(0).toUpperCase() + k.slice(1);
  return 'Transaction';
}

function titleFromLedger(kind: string, meta: Record<string, unknown>, reference?: string | null) {
  const m = meta || {};
  let raw = '';
  if (typeof m.title === 'string' && m.title.trim()) raw = m.title.trim();
  else if (typeof m.description === 'string' && m.description.trim()) raw = m.description.trim();
  else if (typeof m.service === 'string' && m.service.trim()) {
    raw = `Virtual Number (${m.service})`;
  } else {
    switch ((kind || '').toLowerCase()) {
      case 'fund':
        raw = 'Wallet Fund';
        break;
      case 'purchase':
        raw = 'Virtual Number Purchase';
        break;
      case 'refund':
        raw = 'Refund';
        break;
      default:
        if (reference && String(reference).startsWith('xixapay:')) raw = 'Wallet Fund';
        else if (reference && String(reference).startsWith('vn-')) raw = 'Virtual Number Purchase';
        else if (reference && String(reference).startsWith('refund-')) raw = 'Refund';
        else raw = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Transaction';
    }
  }
  return polishTitle(raw, kind, reference);
}

function signedAmountNgn(
  kind: string,
  amountNgn: number | null | undefined,
  amountUsd: number | null | undefined,
) {
  const raw =
    amountNgn != null && Number.isFinite(Number(amountNgn))
      ? Number(amountNgn)
      : amountUsd != null && Number.isFinite(Number(amountUsd))
        ? Number(amountUsd)
        : 0;
  const k = (kind || '').toLowerCase();
  if (k === 'purchase' || k === 'wholesale_debit') return -Math.abs(raw);
  if (k === 'fund' || k === 'refund') return Math.abs(raw);
  return raw;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: true, items: [], message: 'Sign in required' });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: true, items: [], message: 'Wallet backend not configured' });
  }

  const items: TxItem[] = [];
  const seen = new Set<string>();

  // 1) Primary: wallet_ledger
  try {
    const rows = (await sbSelect(
      'wallet_ledger',
      `user_id=eq.${userId}&order=created_at.desc&limit=100&select=id,kind,amount_usd,amount_ngn,currency,reference,meta,created_at`,
    )) as Array<Record<string, unknown>>;

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const id = String(r.id || '');
        const ref = r.reference != null ? String(r.reference) : '';
        if (!id || seen.has(id)) continue;
        seen.add(id);
        if (ref) seen.add(ref);
        if (ref.startsWith('vn-')) seen.add(ref);
        // Also mark bare order id if reference is vn-<uuid>
        if (ref.startsWith('vn-') && ref.length > 3) seen.add(ref.slice(3));
        const kind = String(r.kind || 'adjustment');
        const meta = (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<
          string,
          unknown
        >;
        const amount = signedAmountNgn(
          kind,
          r.amount_ngn as number | null,
          r.amount_usd as number | null,
        );
        const currency =
          String(r.currency || '').toUpperCase() === 'USD' && !(r.amount_ngn != null)
            ? 'USD'
            : 'NGN';
        items.push({
          id,
          title: titleFromLedger(kind, meta, r.reference as string | null),
          amount,
          currency,
          status: 'success',
          createdAt: String(r.created_at || new Date().toISOString()),
          kind,
        });
      }
    }
  } catch (e) {
    console.warn('[transactions] wallet_ledger', e);
  }

  // 2) Secondary: wallet_transactions
  try {
    const rows = (await sbSelect(
      'wallet_transactions',
      `user_id=eq.${userId}&order=created_at.desc&limit=100`,
    )) as Array<Record<string, unknown>>;

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const id = String(r.id || r.reference || '');
        const ref = r.reference != null ? String(r.reference) : '';
        if (!id || seen.has(id) || (ref && seen.has(ref))) continue;
        seen.add(id);
        if (ref) seen.add(ref);
        const kind = String(r.type || r.kind || r.direction || 'fund');
        const rawAmt = Number(r.amount_ngn ?? r.amount ?? 0);
        let amount = rawAmt;
        const k = kind.toLowerCase();
        if (k.includes('debit') || k.includes('purchase') || k === 'out') amount = -Math.abs(rawAmt);
        else if (k.includes('credit') || k.includes('fund') || k === 'in') amount = Math.abs(rawAmt);

        const desc =
          (typeof r.description === 'string' && r.description) ||
          (typeof r.title === 'string' && r.title) ||
          '';
        items.push({
          id,
          title: polishTitle(
            desc || titleFromLedger(kind, {}, r.reference as string | null),
            kind,
            r.reference as string | null,
          ),
          amount,
          currency: 'NGN',
          status: (String(r.status || 'success').toLowerCase() as TxItem['status']) || 'success',
          createdAt: String(r.created_at || new Date().toISOString()),
          kind,
        });
      }
    }
  } catch {
    /* table may not exist */
  }

  // 3) vn_orders
  try {
    const rows = (await sbSelect(
      'vn_orders',
      `user_id=eq.${userId}&order=created_at.desc&limit=50&select=id,service_code,country_code,price_ngn,status,created_at,phone`,
    )) as Array<Record<string, unknown>>;

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const id = `vn-${String(r.id || '')}`;
        if (!id || seen.has(id) || seen.has(String(r.id))) continue;
        seen.add(id);
        const svc = String(r.service_code || 'Number');
        const country = String(r.country_code || '').toUpperCase();
        const price = Number(r.price_ngn || 0);
        const st = String(r.status || '').toLowerCase();
        const label = country
          ? `Virtual Number (${svc} / ${country})`
          : `Virtual Number (${svc})`;
        items.push({
          id,
          title: label,
          amount: price > 0 ? -Math.abs(price) : 0,
          currency: 'NGN',
          status:
            st === 'failed' || st === 'expired'
              ? 'failed'
              : st === 'waiting'
                ? 'pending'
                : 'success',
          createdAt: String(r.created_at || new Date().toISOString()),
          kind: 'purchase',
        });
      }
    }
  } catch {
    /* optional */
  }

  // 4) number_orders (legacy)
  try {
    const rows = (await sbSelect(
      'number_orders',
      `user_id=eq.${userId}&order=created_at.desc&limit=50&select=id,product,country,price_usd,status,created_at`,
    )) as Array<Record<string, unknown>>;

    if (Array.isArray(rows)) {
      for (const r of rows) {
        const id = `no-${String(r.id || '')}`;
        if (!id || seen.has(id) || seen.has(String(r.id))) continue;
        seen.add(id);
        const product = String(r.product || 'Virtual Number');
        const priceUsd = Number(r.price_usd || 0);
        const priceNgn = priceUsd * 1600;
        const st = String(r.status || '').toLowerCase();
        items.push({
          id,
          title: `Virtual Number (${product})`,
          amount: priceNgn > 0 ? -Math.abs(priceNgn) : 0,
          currency: 'NGN',
          status:
            st === 'failed' || st === 'expired'
              ? 'failed'
              : st === 'waiting'
                ? 'pending'
                : 'success',
          createdAt: String(r.created_at || new Date().toISOString()),
          kind: 'purchase',
        });
      }
    }
  } catch {
    /* optional */
  }

  // Same event can land in wallet_ledger + wallet_transactions + vn_orders
  // with different IDs. Collapse logical duplicates (title + amount + minute).
  const unique: TxItem[] = [];
  const logicalSeen = new Set<string>();
  for (const item of items) {
    let minute = 0;
    try {
      minute = Math.floor(new Date(item.createdAt).getTime() / 60_000);
    } catch {
      minute = 0;
    }
    const key = `${item.title}|${item.amount}|${minute}`;
    if (logicalSeen.has(key)) continue;
    logicalSeen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ ok: true, items: unique });
}
