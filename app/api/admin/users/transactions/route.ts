import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/users/transactions?userId=<uuid>
 * Auth: x-admin-password header must match ADMIN_PASSWORD.
 * Returns the user's wallet_ledger history, newest first (200 rows),
 * best-effort merged with the legacy `transactions` table if it exists.
 */
export const dynamic = 'force-dynamic';

type LedgerRow = {
  id?: string;
  kind?: string;
  amount_usd?: number | null;
  amount_ngn?: number | null;
  currency?: string;
  reference?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string;
};

export async function GET(req: NextRequest) {
  const pw = req.headers.get('x-admin-password') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD not configured' }, { status: 503 });
  }
  if (pw !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (req.nextUrl.searchParams.get('userId') || '').trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
  }

  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'DB not configured' }, { status: 503 });
  }
  const hdr = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const mapRow = (r: LedgerRow) => {
    const metaDesc = (r.meta as Record<string, unknown> | null)?.description as string | undefined;
    return {
      kind: String(r.kind || 'other'),
      amountNgn:
        r.amount_ngn !== undefined && r.amount_ngn !== null ? Number(r.amount_ngn) : null,
      amountUsd:
        r.amount_usd !== undefined && r.amount_usd !== null ? Number(r.amount_usd) : null,
      currency: String(r.currency || 'NGN'),
      reference: String(r.reference || ''),
      description: String(metaDesc || r.reference || ''),
      createdAt: String(r.created_at || ''),
    };
  };

  let rows: ReturnType<typeof mapRow>[] = [];
  try {
    const res = await fetch(
      `${base}/rest/v1/wallet_ledger?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=200`,
      { headers: hdr, cache: 'no-store' },
    );
    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      console.error('[admin/users/transactions] wallet_ledger', res.status, raw.slice(0, 200));
      return NextResponse.json({ ok: false, error: 'Could not read the ledger' }, { status: 500 });
    }
    rows = ((await res.json()) as LedgerRow[]).map(mapRow);
  } catch (e) {
    console.error('[admin/users/transactions] wallet_ledger failed', e);
    return NextResponse.json({ ok: false, error: 'Could not read the ledger' }, { status: 500 });
  }

  // Optional second source: the legacy `transactions` table (may not exist).
  try {
    const res = await fetch(
      `${base}/rest/v1/transactions?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=200`,
      { headers: hdr, cache: 'no-store' },
    );
    if (res.ok) {
      const extra = ((await res.json()) as Array<Record<string, unknown>>).map((r) => ({
        kind: String(r.kind || 'other'),
        amountNgn: r.amount !== undefined && r.amount !== null ? Number(r.amount) : null,
        amountUsd: null,
        currency: 'NGN',
        reference: String(
          ((r.meta as Record<string, unknown> | null)?.reference as string | undefined) || '',
        ),
        description: String(r.kind || ''),
        createdAt: String(r.created_at || ''),
      }));
      rows = [...rows, ...extra].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    // 404 = table does not exist on this project — silently skipped.
  } catch {
    /* optional source */
  }

  return NextResponse.json({ ok: true, transactions: rows });
}
