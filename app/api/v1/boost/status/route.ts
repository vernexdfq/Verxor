import { NextRequest, NextResponse } from 'next/server';
import { isSmmConfigured, smmGetStatus } from '@/lib/providers/smm-orders';
import { sendBoostReceipt } from '@/lib/email/receipts';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  // Panel requests must NEVER dispatch end-customer receipts
  if (token.startsWith('vx_panel_') || req.headers.get('x-panel-key')) return null;
  if (bodyUserId) return bodyUserId;
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

/**
 * GET /api/v1/boost/status?orderId=123
 * POST { orderId, notifyCompleted?, platform?, serviceTitle?, quantity?, link?, amountNgn?, createdAt?, userId? }
 * JAP action=status. Supports numeric JAP IDs and child reference strings (e.g. boost-panel-...).
 */
async function handle(
  req: NextRequest,
  orderId: string,
  extra?: {
    notifyCompleted?: boolean;
    platform?: string;
    serviceTitle?: string;
    quantity?: number;
    link?: string;
    amountNgn?: number;
    createdAt?: string;
    userId?: string;
  },
) {
  if (!isSmmConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Boost provider not configured' },
      { status: 503 },
    );
  }
  const cleanId = String(orderId || '').trim();
  if (!cleanId) {
    return NextResponse.json({ ok: false, error: 'orderId is required' }, { status: 400 });
  }

  let effectiveJapId = cleanId;
  let ledgerRowId: string | null = null;
  let ledgerMeta: Record<string, unknown> | null = null;

  const base = supabaseBase();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If orderId is not purely numeric (e.g. child reference boost-xxx), look up wallet_ledger
  if (!/^\d+$/.test(cleanId) && base && serviceKey) {
    try {
      const q = `${base}/rest/v1/wallet_ledger?reference=eq.${encodeURIComponent(cleanId)}&select=id,meta&limit=1`;
      const res = await fetch(q, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const rows = (await res.json().catch(() => [])) as Array<{ id?: string; meta?: Record<string, unknown> }>;
        if (rows?.[0]) {
          ledgerRowId = rows[0].id ? String(rows[0].id) : null;
          ledgerMeta = rows[0].meta || null;
          const candidate = String(
            ledgerMeta?.providerOrderId || ledgerMeta?.orderId || ledgerMeta?.japOrderId || '',
          ).trim();
          if (/^\d+$/.test(candidate)) {
            effectiveJapId = candidate;
          }
        }
      }
    } catch (e) {
      console.warn('[boost/status] reference resolution error:', e);
    }
  }

  if (!/^\d+$/.test(effectiveJapId)) {
    return NextResponse.json(
      { ok: false, error: `Invalid order ID or unresolved reference: ${cleanId}` },
      { status: 400 },
    );
  }

  try {
    const st = await smmGetStatus(effectiveJapId);
    const normalizedStatus = String(st.status || '').toLowerCase();
    const isCompleted = normalizedStatus.includes('complete');

    // Update wallet_ledger with latest status
    if (base && serviceKey) {
      try {
        const patchMeta = {
          ...(ledgerMeta || {}),
          status: isCompleted
            ? 'completed'
            : normalizedStatus.includes('cancel')
              ? 'canceled'
              : normalizedStatus.includes('progress') || normalizedStatus.includes('processing')
                ? 'processing'
                : normalizedStatus || 'pending',
          japStatus: st.status,
          charge: st.charge,
          remains: st.remains,
          startCount: st.start_count,
          currency: st.currency,
          reconciledAt: new Date().toISOString(),
        };

        if (ledgerRowId) {
          await fetch(`${base}/rest/v1/wallet_ledger?id=eq.${encodeURIComponent(ledgerRowId)}`, {
            method: 'PATCH',
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ meta: patchMeta }),
          });
        }
      } catch {
        /* best effort */
      }
    }

    let notified = false;
    if (isCompleted && extra?.notifyCompleted) {
      const targetUserId = await resolveUserId(req, extra.userId);
      if (targetUserId) {
        try {
          const mail = await sendBoostReceipt(targetUserId, {
            platform: extra.platform || 'Social Media',
            serviceTitle: extra.serviceTitle || 'Boost Order',
            quantity: Number(extra.quantity || 1),
            link: extra.link || '',
            orderId: effectiveJapId,
            amountNgn: Number(extra.amountNgn || 0),
            status: 'Completed',
            date: new Date(),
          });
          notified = mail.ok;
          if (!mail.ok) {
            console.warn('[email] Boost completion receipt not sent:', mail.error);
          }
        } catch (err) {
          console.warn('[email] Boost completion receipt dispatch failed:', err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      orderId: effectiveJapId,
      providerOrderId: Number(effectiveJapId) || effectiveJapId,
      ref: cleanId,
      status: st.status,
      charge: st.charge,
      startCount: st.start_count,
      remains: st.remains,
      currency: st.currency,
      notified,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Status check failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const orderId = new URL(req.url).searchParams.get('orderId') || '';
  return handle(req, orderId);
}

export async function POST(req: NextRequest) {
  let body: {
    orderId?: string | number;
    notifyCompleted?: boolean;
    platform?: string;
    serviceTitle?: string;
    quantity?: number;
    link?: string;
    amountNgn?: number;
    createdAt?: string;
    userId?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  return handle(req, String(body.orderId || ''), body);
}
