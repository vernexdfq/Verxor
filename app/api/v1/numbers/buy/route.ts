import { NextRequest, NextResponse } from 'next/server';
import { grizzly } from '@/lib/providers';
import { sbInsert, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * Buy a real OTP number from Grizzly.
 * Body: {
 *   service: grizzly service code (e.g. "wa"),
 *   country: grizzly country code (e.g. "12" or "187"),
 *   maxPriceUsd: number,
 *   poolId: string,
 *   priceNgn: number,
 *   userId?: string
 * }
 */
export async function POST(req: NextRequest) {
  if (!grizzly.isConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Grizzly SMS is not configured' },
      { status: 503 },
    );
  }

  let body: {
    service?: string;
    country?: string;
    maxPriceUsd?: number;
    poolId?: string;
    priceNgn?: number;
    userId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const service = (body.service || '').trim().toLowerCase();
  const country = String(body.country || '').trim();
  const maxPriceUsd = Number(body.maxPriceUsd);
  const poolId = (body.poolId || '').toLowerCase();
  const priceNgn = Number(body.priceNgn) || 0;

  if (!service || !country) {
    return NextResponse.json(
      { ok: false, error: 'service and country are required' },
      { status: 400 },
    );
  }
  if (!Number.isFinite(maxPriceUsd) || maxPriceUsd <= 0) {
    return NextResponse.json(
      { ok: false, error: 'maxPriceUsd must be a positive number' },
      { status: 400 },
    );
  }

  try {
    const maxPrice = Math.round((maxPriceUsd + 0.01) * 100) / 100;

    const result = await grizzly.getNumber({
      service,
      country,
      maxPrice,
    });

    const phone = result.phone.startsWith('+') ? result.phone : `+${result.phone}`;

    let savedId: string | null = null;
    if (supabaseConfigured()) {
      try {
        const rows = await sbInsert('vn_orders', {
          user_id: body.userId || null,
          provider: 'grizzly',
          provider_order_id: result.id,
          phone,
          service_code: service,
          country_code: country,
          pool_id: poolId || null,
          cost_usd: maxPriceUsd,
          price_ngn: priceNgn,
          status: 'waiting',
          raw: { access: result.raw },
        });
        savedId = Array.isArray(rows) ? (rows[0] as { id?: string })?.id ?? null : null;
      } catch {
        // Still return the live number even if ledger insert fails
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: savedId || result.id,
        provider: 'grizzly',
        providerOrderId: result.id,
        phone,
        status: 'waiting',
        poolId,
        service,
        country,
        priceNgn,
        costUsd: maxPriceUsd,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Buy failed';
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
