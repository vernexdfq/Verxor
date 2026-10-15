import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const url = new URL(req.url);
  const qUserId = url.searchParams.get('userId');
  if (qUserId) return qUserId;

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

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

type LedgerRow = {
  id?: string;
  user_id?: string;
  amount?: number;
  type?: string;
  reference?: string;
  description?: string;
  created_at?: string;
  balance_after?: number;
};

type TxItem = {
  id: string;
  title: string;
  amount: number;
  currency: 'NGN';
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  kind?: string;
};

function titleFor(row: LedgerRow): string {
  const desc = (row.description || '').toLowerCase();
  const typ = (row.type || '').toLowerCase();
  const ref = (row.reference || '').toLowerCase();
  if (
    typ.includes('credit') ||
    typ.includes('fund') ||
    desc.includes('fund') ||
    desc.includes('top') ||
    ref.includes('xixapay') ||
    ref.includes('opay')
  ) {
    return 'Wallet Fund';
  }
  if (desc.includes('virtual number') || desc.includes('vn-buy') || ref.startsWith('vn-buy')) {
    return 'Virtual Number';
  }
  if (desc.includes('refund')) return 'Refund';
  if (Number(row.amount) > 0) return 'Wallet Fund';
  return row.description || 'Transaction';
}

/**
 * Collapse near-duplicate Wallet Fund entries that share the same
 * amount + minute (common when both wallet_ledger and a webhook fire).
 */
function dedupeFunds(items: TxItem[]): TxItem[] {
  const seenRefs = new Set<string>();
  const seenFundKeys = new Set<string>();
  const out: TxItem[] = [];

  for (const t of items) {
    if (t.id && seenRefs.has(t.id)) continue;
    if (t.id) seenRefs.add(t.id);

    if (t.title === 'Wallet Fund' && t.amount > 0) {
      const d = new Date(t.createdAt);
      const minuteKey = `${t.amount}|${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${d.getUTCMinutes()}`;
      if (seenFundKeys.has(minuteKey)) continue;
      seenFundKeys.add(minuteKey);
    }

    out.push(t);
  }
  return out;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Sign in required', items: [] }, { status: 401 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: true, items: [] });
  }

  try {
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const ledgerUrl =
      `${base}/rest/v1/wallet_ledger?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=id,user_id,amount,type,reference,description,created_at,balance_after` +
      `&order=created_at.desc&limit=200`;

    const ledgerRes = await fetch(ledgerUrl, { headers, cache: 'no-store' });
    let rows: LedgerRow[] = [];
    if (ledgerRes.ok) {
      rows = (await ledgerRes.json()) as LedgerRow[];
    }

    try {
      const txUrl =
        `${base}/rest/v1/wallet_transactions?user_id=eq.${encodeURIComponent(userId)}` +
        `&select=id,user_id,amount,type,reference,description,created_at` +
        `&order=created_at.desc&limit=200`;
      const txRes = await fetch(txUrl, { headers, cache: 'no-store' });
      if (txRes.ok) {
        const extra = (await txRes.json()) as LedgerRow[];
        if (Array.isArray(extra) && extra.length) {
          const existingIds = new Set(rows.map((r) => r.id || r.reference).filter(Boolean));
          for (const e of extra) {
            const key = e.id || e.reference;
            if (key && existingIds.has(key)) continue;
            rows.push(e);
          }
        }
      }
    } catch {
      /* optional table */
    }

    const items: TxItem[] = rows.map((r) => {
      const amount = Number(r.amount) || 0;
      return {
        id: String(r.id || r.reference || `${r.created_at}-${amount}`),
        title: titleFor(r),
        amount,
        currency: 'NGN' as const,
        status: 'success' as const,
        createdAt: r.created_at || new Date().toISOString(),
        kind: r.type || undefined,
      };
    });

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const deduped = dedupeFunds(items);

    return NextResponse.json({ ok: true, items: deduped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load transactions';
    return NextResponse.json({ ok: false, error: msg, items: [] }, { status: 500 });
  }
}
