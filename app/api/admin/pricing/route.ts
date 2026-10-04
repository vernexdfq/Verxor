import { NextRequest, NextResponse } from 'next/server';
import { configuredProviders, scrapeOffers } from '@/lib/providers';
import { sbInsert, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

const POOLS = [
  { id: 'usa-economy', title: 'USA · Economy', region: 'usa', tier: 'economy', server: 1 },
  { id: 'usa-standard', title: 'USA · Standard', region: 'usa', tier: 'standard', server: 1 },
  { id: 'usa-fast', title: 'USA · Fast', region: 'usa', tier: 'fast', server: 2 },
  { id: 'usa-premium', title: 'USA · Premium', region: 'usa', tier: 'premium', server: 2 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', region: 'worldwide', tier: 'economy', server: 1 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', region: 'worldwide', tier: 'standard', server: 1 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', region: 'worldwide', tier: 'fast', server: 2 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', region: 'worldwide', tier: 'premium', server: 2 },
] as const;

const PRODUCTS = [
  'whatsapp',
  'telegram',
  'instagram',
  'facebook',
  'google',
  'tiktok',
  'twitter',
  'discord',
  'microsoft',
  'amazon',
  'apple',
  'paypal',
];

function rate() {
  return Number(process.env.USD_NGN_RATE || 1600);
}

function checkPassword(password: string | undefined) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return { ok: false as const, status: 503, reason: 'ADMIN_PASSWORD is not configured' };
  if (!password || password !== expected) return { ok: false as const, status: 401, reason: 'Invalid password' };
  return { ok: true as const };
}

async function loadOverrides(): Promise<
  Record<string, { retailUsd: number | null; retailNgn: number | null; retailMarkupPct: number | null; panelMarkupPct: number }>
> {
  const map: Record<
    string,
    { retailUsd: number | null; retailNgn: number | null; retailMarkupPct: number | null; panelMarkupPct: number }
  > = {};
  if (!supabaseConfigured()) return map;
  try {
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const res = await fetch(`${url}/rest/v1/pool_pricing?select=*&is_active=eq.true`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) return map;
    const rows = (await res.json()) as Array<{
      pool_id: string;
      product: string;
      retail_usd: number | null;
      retail_ngn: number | null;
      retail_markup_pct: number | null;
      panel_markup_pct: number;
    }>;
    for (const r of rows) {
      const k = `${r.pool_id}::${r.product}`;
      map[k] = {
        retailUsd: r.retail_usd != null ? Number(r.retail_usd) : null,
        retailNgn: r.retail_ngn != null ? Number(r.retail_ngn) : null,
        retailMarkupPct: r.retail_markup_pct != null ? Number(r.retail_markup_pct) : null,
        panelMarkupPct: Number(r.panel_markup_pct ?? 15),
      };
    }
  } catch {
    /* table may not exist yet */
  }
  return map;
}

/**
 * GET ?password=&product=whatsapp&country=usa
 * Returns every pool with live provider cost (admin only), stock, and your sell / panel rates.
 */
export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get('password') || '';
  const auth = checkPassword(password);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  const product = (req.nextUrl.searchParams.get('product') || 'whatsapp').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'usa').toLowerCase();
  const usdNgn = rate();
  const providers = configuredProviders();

  let offers: Awaited<ReturnType<typeof scrapeOffers>> = [];
  let scrapeError: string | null = null;
  try {
    offers = await scrapeOffers({ country, product });
  } catch (e) {
    scrapeError = e instanceof Error ? e.message : 'scrape failed';
  }

  const overrides = await loadOverrides();
  const defaultRetailMarkup = 35;
  const defaultPanelMarkup = 15;

  const rows = POOLS.map((p) => {
    const inPool = offers.filter((o) => o.poolId === p.id);
    const cheapest = inPool[0];
    const costUsd = cheapest ? cheapest.costUsd : null;
    const stock = inPool.reduce((n, o) => n + (o.count ?? 1), 0) || inPool.length;

    const specific = overrides[`${p.id}::${product}`];
    const wildcard = overrides[`${p.id}::*`];
    const ov = specific || wildcard;

    const retailMarkupPct = ov?.retailMarkupPct ?? defaultRetailMarkup;
    const panelMarkupPct = ov?.panelMarkupPct ?? defaultPanelMarkup;

    let retailUsd: number | null = ov?.retailUsd ?? null;
    if (retailUsd == null && costUsd != null) {
      retailUsd = Math.round(costUsd * (1 + retailMarkupPct / 100) * 100) / 100;
    }

    let retailNgn: number | null = ov?.retailNgn ?? null;
    if (retailNgn == null && retailUsd != null) {
      retailNgn = Math.round(retailUsd * usdNgn);
    }

    const panelUsd =
      costUsd != null ? Math.round(costUsd * (1 + panelMarkupPct / 100) * 100) / 100 : null;

    const profitUsd =
      costUsd != null && retailUsd != null ? Math.round((retailUsd - costUsd) * 100) / 100 : null;

    return {
      poolId: p.id,
      title: p.title,
      region: p.region,
      tier: p.tier,
      server: p.server,
      stock,
      costUsd,
      costProvider: cheapest?.provider ?? null,
      retailMarkupPct,
      retailUsd,
      retailNgn,
      panelMarkupPct,
      panelUsd,
      profitUsd,
      live: Boolean(cheapest),
      hasOverride: Boolean(ov),
    };
  });

  return NextResponse.json({
    ok: true,
    product,
    country,
    usdNgnRate: usdNgn,
    providersOnline: providers,
    providersCount: providers.length,
    scrapeError,
    products: PRODUCTS,
    rows,
  });
}

/**
 * POST body: { password, product, rows: [{ poolId, retailUsd, retailNgn, retailMarkupPct, panelMarkupPct }] }
 * Saves your rate card. Requires Supabase + admin_pricing.sql applied.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      password?: string;
      product?: string;
      rows?: Array<{
        poolId: string;
        retailUsd?: number | null;
        retailNgn?: number | null;
        retailMarkupPct?: number | null;
        panelMarkupPct?: number | null;
      }>;
    };

    const auth = checkPassword(body.password);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
    }

    if (!supabaseConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            'Supabase not configured. Add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, then run supabase/admin_pricing.sql',
        },
        { status: 503 },
      );
    }

    const product = (body.product || '*').toLowerCase();
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, reason: 'No rows to save' }, { status: 400 });
    }

    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    let saved = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (!row.poolId) continue;
      const payload = {
        pool_id: row.poolId,
        product,
        retail_usd: row.retailUsd ?? null,
        retail_ngn: row.retailNgn ?? null,
        retail_markup_pct: row.retailMarkupPct ?? null,
        panel_markup_pct: row.panelMarkupPct ?? 15,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const res = await fetch(`${url}/rest/v1/pool_pricing?on_conflict=pool_id,product`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 201 || res.status === 204) {
        saved += 1;
      } else {
        const text = await res.text().catch(() => '');
        try {
          await sbUpdate(
            'pool_pricing',
            { pool_id: row.poolId, product },
            {
              retail_usd: payload.retail_usd,
              retail_ngn: payload.retail_ngn,
              retail_markup_pct: payload.retail_markup_pct,
              panel_markup_pct: payload.panel_markup_pct,
              updated_at: payload.updated_at,
            },
          );
          saved += 1;
        } catch {
          try {
            await sbInsert('pool_pricing', payload);
            saved += 1;
          } catch (e) {
            errors.push(
              `${row.poolId}: ${text.slice(0, 120) || (e instanceof Error ? e.message : 'fail')}`,
            );
          }
        }
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      saved,
      errors: errors.length ? errors : undefined,
      reason:
        errors.length && saved === 0
          ? 'Could not save. Run supabase/admin_pricing.sql in Supabase SQL Editor first.'
          : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: 'Bad request' }, { status: 400 });
  }
}
