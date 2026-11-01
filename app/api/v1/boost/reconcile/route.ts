import { NextRequest, NextResponse } from 'next/server';
import { supabaseConfigured } from '@/lib/supabase-admin';
import { isSmmConfigured, smmGetStatus } from '@/lib/providers/smm-orders';
import { sendBoostReceipt } from '@/lib/email/receipts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

function mapStatus(raw: unknown): 'pending' | 'processing' | 'completed' | 'canceled' {
  const s = String(raw || '').toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('cancel') || s.includes('refund')) return 'canceled';
  if (s.includes('pending')) return 'pending';
  if (s.includes('progress') || s.includes('processing') || s.includes('partial')) return 'processing';
  if (!s.trim()) return 'pending';
  return 'processing';
}

function isJapId(id: string): boolean {
  return /^\d+$/.test(String(id || '').trim());
}

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const xCron = req.headers.get('x-cron-secret') || '';
  const querySecret = new URL(req.url).searchParams.get('secret') || '';
  const isVercelCron = Boolean(req.headers.get('x-vercel-cron'));

  if (cronSecret) {
    if (bearer === cronSecret || xCron === cronSecret || querySecret === cronSecret || isVercelCron) {
      return true;
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && bearer === serviceKey) {
    return true;
  }

  // If no CRON_SECRET is configured, allow internal calls or verify anon key
  if (!cronSecret) return true;
  return false;
}

/**
 * GET/POST /api/v1/boost/reconcile
 * Server-side reconciliation job:
 * Scans open boost orders in wallet_ledger, queries JAP, and persists canonical status.
 */
async function runReconcile(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSmmConfigured()) {
    return NextResponse.json({ ok: false, error: 'Boost provider not configured' }, { status: 503 });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Wallet backend not configured' }, { status: 503 });
  }

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'Service role credentials missing' }, { status: 500 });
  }

  const startTime = Date.now();

  try {
    const qs = new URLSearchParams({
      order: 'created_at.desc',
      limit: '100',
      select: 'id,user_id,kind,reference,meta,created_at',
    });

    const res = await fetch(`${base}/rest/v1/wallet_ledger?${qs.toString()}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Ledger query failed (HTTP ${res.status}): ${errText.slice(0, 150)}` },
        { status: 502 },
      );
    }

    const rows = (await res.json()) as Array<{
      id: string;
      user_id?: string;
      kind?: string;
      reference?: string;
      meta?: Record<string, unknown>;
      created_at?: string;
    }>;

    if (!Array.isArray(rows)) {
      return NextResponse.json({ ok: true, scanned: 0, updated: 0, completed: 0 });
    }

    // Filter for open boost rows
    const openOrders = rows.filter((r) => {
      const meta = (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>;
      const ref = String(r.reference || '');
      const kind = String(r.kind || '').toLowerCase();
      const isBoost =
        kind === 'panel_boost_debit' ||
        kind === 'boost' ||
        ref.startsWith('boost-') ||
        ref.startsWith('boost-order-') ||
        String(meta.type || meta.product || '').toLowerCase() === 'boost';

      if (!isBoost) return false;
      if (kind === 'panel_boost_refund' || ref.startsWith('refund-')) return false;

      const currentStatus = String(meta.status || '').toLowerCase();
      return !['completed', 'canceled', 'cancelled', 'failed', 'refunded'].includes(currentStatus);
    });

    let updatedCount = 0;
    let completedCount = 0;
    let canceledCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Sync up to 25 open orders per batch
    const batch = openOrders.slice(0, 25);

    await Promise.all(
      batch.map(async (row) => {
        const meta = (row.meta && typeof row.meta === 'object' ? row.meta : {}) as Record<string, unknown>;
        const ref = String(row.reference || '');

        let japId = String(meta.providerOrderId || meta.orderId || meta.japOrderId || '').trim();
        if (!isJapId(japId) && ref.startsWith('boost-order-')) {
          const extracted = ref.replace(/^boost-order-/, '').trim();
          if (isJapId(extracted)) japId = extracted;
        }

        if (!isJapId(japId)) {
          return;
        }

        try {
          const st = await smmGetStatus(japId);
          const nextStatus = mapStatus(st.status);
          const prevStatus = mapStatus(meta.status);

          const nextMeta = {
            ...meta,
            providerOrderId: japId,
            orderId: japId,
            status: nextStatus,
            japStatus: st.status,
            charge: st.charge != null ? String(st.charge) : meta.charge,
            remains: st.remains != null && st.remains !== '' ? Number(st.remains) : meta.remains,
            startCount: st.start_count != null ? String(st.start_count) : meta.startCount,
            currency: st.currency || meta.currency || 'NGN',
            reconciledAt: new Date().toISOString(),
          };

          const patchRes = await fetch(
            `${base}/rest/v1/wallet_ledger?id=eq.${encodeURIComponent(row.id)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ meta: nextMeta }),
            },
          );

          if (patchRes.ok) {
            updatedCount += 1;
            if (nextStatus === 'completed') completedCount += 1;
            if (nextStatus === 'canceled') canceledCount += 1;

            // If newly completed and retail order with user_id, dispatch receipt if not already sent
            if (
              nextStatus === 'completed' &&
              prevStatus !== 'completed' &&
              row.user_id &&
              !meta.notified &&
              String(row.kind) !== 'panel_boost_debit'
            ) {
              try {
                await sendBoostReceipt(row.user_id, {
                  platform: String(meta.platform || 'Social Media'),
                  serviceTitle: String(meta.serviceTitle || meta.title || 'Boost Order'),
                  quantity: Number(meta.quantity || 1),
                  link: String(meta.link || ''),
                  orderId: japId,
                  amountNgn: Number(meta.amountNgn || 0),
                  status: 'Completed',
                  date: new Date(),
                });
              } catch (receiptErr) {
                console.warn('[reconcile] completion receipt failed:', receiptErr);
              }
            }
          }
        } catch (syncErr: unknown) {
          const msg = syncErr instanceof Error ? syncErr.message : 'Unknown sync failure';
          errors.push({ id: row.id, error: msg });
        }
      }),
    );

    return NextResponse.json({
      ok: true,
      scanned: rows.length,
      openCount: openOrders.length,
      processed: batch.length,
      updated: updatedCount,
      completed: completedCount,
      canceled: canceledCount,
      errors: errors.length ? errors : undefined,
      durationMs: Date.now() - startTime,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Reconciliation failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runReconcile(req);
}

export async function POST(req: NextRequest) {
  return runReconcile(req);
}
