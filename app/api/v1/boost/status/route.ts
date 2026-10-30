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
  if (bodyUserId) return bodyUserId;
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

/**
 * GET /api/v1/boost/status?orderId=123
 * POST { orderId, notifyCompleted?, platform?, serviceTitle?, quantity?, link?, amountNgn?, createdAt?, userId? }
 * JAP action=status
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
  if (!orderId) {
    return NextResponse.json({ ok: false, error: 'orderId is required' }, { status: 400 });
  }
  try {
    const st = await smmGetStatus(orderId);
    const normalizedStatus = String(st.status || '').toLowerCase();
    const isCompleted = normalizedStatus.includes('complete');

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
            orderId,
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
      orderId,
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
