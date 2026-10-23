import { NextRequest, NextResponse } from 'next/server';
import { isXixapayConfigured, createXixapayCard } from '@/lib/providers/xixapay';
import { sbSelect, sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function supabaseBase() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
}

async function resolveUserId(req: NextRequest, bodyUserId?: string): Promise<string | null> {
  if (bodyUserId && bodyUserId.trim()) return bodyUserId.trim();
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

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  const isDemo = !isXixapayConfigured();

  if (!userId || !supabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      demo: isDemo,
      cards: [],
    });
  }

  try {
    const cards = await sbSelect(
      'virtual_cards',
      `user_id=eq.${userId}&order=created_at.desc`,
    ).catch(() => []);

    const mapped = (Array.isArray(cards) ? cards : []).map((c: Record<string, unknown>) => ({
      id: c.id,
      card_number_masked: String(c.card_number_masked || '5078 •••• •••• 9520'),
      cardholder_name: String(c.cardholder_name || 'VERXOR USER'),
      expiry: String(c.expiry || '08/29'),
      currency: String(c.currency || 'USD'),
      balance_usd: Number(c.balance_usd ?? 0),
      status: String(c.status || 'active'),
      is_frozen: Boolean(c.is_frozen),
      created_at: c.created_at,
      demo: Boolean(c.is_demo ?? isDemo),
    }));

    return NextResponse.json({
      ok: true,
      demo: isDemo,
      cards: mapped,
    });
  } catch (err: unknown) {
    console.error('[cards/provision GET]', err);
    return NextResponse.json({ ok: true, demo: isDemo, cards: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON payload' }, { status: 400 });
  }

  const userId = await resolveUserId(req, typeof body.userId === 'string' ? body.userId : undefined);
  const isDemo = !isXixapayConfigured();
  const cardholderName = String(body.cardholder_name || body.name || 'VALUED CLIENT').trim().toUpperCase();
  const amount = Math.max(3, Number(body.amount || 5)); // Minimum $3 USD per XixaPay rules
  const customerId = String(body.customer_id || `cus_vx_${userId ? userId.slice(0, 8) : Date.now()}`);

  // Call XixaPay card issuance provider
  const cardRes = await createXixapayCard({
    customerId,
    country: 'US',
    amount,
  });

  if (!cardRes.ok && !isDemo) {
    return NextResponse.json(
      { ok: false, message: cardRes.message || 'Card provisioning failed.' },
      { status: 502 },
    );
  }

  const rawNumber = String(cardRes.card_number || '5078749028148821');
  const last4 = rawNumber.replace(/\D/g, '').slice(-4) || '8821';
  const masked = `5078 •••• •••• ${last4}`;

  const cardData = {
    id: cardRes.card_id || `card_${Date.now()}`,
    user_id: userId || null,
    card_number_masked: masked,
    cardholder_name: cardholderName,
    expiry: cardRes.expiry || '08/29',
    currency: 'USD',
    balance_usd: amount,
    status: 'active',
    is_frozen: false,
    is_demo: isDemo,
    created_at: new Date().toISOString(),
  };

  if (supabaseConfigured() && userId) {
    try {
      await sbInsert('virtual_cards', cardData).catch(() => null);
    } catch (e) {
      console.warn('[cards/provision db save non-fatal]', e);
    }
  }

  return NextResponse.json({
    ok: true,
    demo: isDemo,
    message: isDemo
      ? 'USD Virtual Card provisioned in Demo mode. Ready for test transactions.'
      : 'USD Virtual Card successfully provisioned.',
    card: {
      id: cardData.id,
      card_number_masked: masked,
      cardholder_name: cardholderName,
      expiry: cardData.expiry,
      currency: 'USD',
      balance_usd: amount,
      status: 'active',
      is_frozen: false,
      demo: isDemo,
    },
  });
}
