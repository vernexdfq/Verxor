import { NextRequest, NextResponse } from 'next/server';
import {
  sbSelect,
  sbUpsertBatch,
  supabaseConfigured,
} from '@/lib/supabase-admin';

export const maxDuration = 60;

const GRIZZLY_BASE = 'https://api.grizzlysms.com/stubs/handler_api.php';
const BATCH = 200;

const PRIORITY_COUNTRIES = [
  '187', // USA
  '12', // USA Virtual
  '16', // United Kingdom
  '22', // India
  '6', // Indonesia
  '10', // Vietnam
  '73', // Brazil
  '1', // Ukraine
  '36', // Canada
  '43', // Germany
  '48', // Netherlands
  '56', // Spain
  '78', // France
  '86', // Italy
  '117', // Philippines
  '175', // Australia
];

const POPULAR_CODES = new Set([
  'wa',
  'tg',
  'ig',
  'fb',
  'go',
  'lf',
  'tw',
  'ds',
  'vi',
  'ub',
  'mm',
  'am',
  'ot',
  'ni',
  'me',
  'wb',
  'ka',
  'pm',
  'mb',
  'sn',
]);

function checkPassword(password: string | undefined) {
  const expected = (process.env.ADMIN_PASSWORD || '').trim();
  if (!expected)
    return {
      ok: false as const,
      status: 503,
      reason: 'ADMIN_PASSWORD is not configured',
    };
  if (!password || password.trim() !== expected)
    return { ok: false as const, status: 401, reason: 'Invalid password' };
  return { ok: true as const };
}

function tierFromCost(cost: number): 'economy' | 'standard' | 'fast' | 'premium' {
  if (cost < 0.5) return 'economy';
  if (cost <= 1.0) return 'standard';
  if (cost <= 2.0) return 'fast';
  return 'premium';
}

async function grizzly(action: string, extra: Record<string, string> = {}) {
  const key = process.env.GRIZZLYSMS_API_KEY;
  if (!key) throw new Error('GRIZZLYSMS_API_KEY is not set');

  const params = new URLSearchParams({ api_key: key, action, ...extra });
  const url = GRIZZLY_BASE + '?' + params.toString();
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Grizzly ' + action + ': HTTP ' + res.status);
  if (text.startsWith('BAD_') || text.startsWith('ERROR') || text === 'NO_KEY') {
    throw new Error('Grizzly ' + action + ': ' + text);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function upsertInBatches(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await sbUpsertBatch(table, chunk, onConflict);
  }
}

export async function GET(req: NextRequest) {
  return runSync(req);
}

export async function POST(req: NextRequest) {
  return runSync(req);
}

async function runSync(req: NextRequest) {
  const password =
    req.nextUrl.searchParams.get('password') ||
    (await req.json().catch(() => ({}))).password ||
    '';

  const auth = checkPassword(password);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: auth.reason }, { status: auth.status });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          'Supabase not configured (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
      },
      { status: 503 },
    );
  }

  if (!process.env.GRIZZLYSMS_API_KEY) {
    return NextResponse.json(
      { ok: false, reason: 'GRIZZLYSMS_API_KEY missing' },
      { status: 503 },
    );
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'full').toLowerCase();
  const stats = {
    services: 0,
    countries: 0,
    priceOptions: 0,
    errors: [] as string[],
  };

  try {
    // ─── 1. Services (bulk) ───────────────────────────────────────
    if (mode === 'full' || mode === 'services') {
      const raw = await grizzly('getServicesList');
      const list: Array<{ code?: string; name?: string }> = Array.isArray(
        raw?.services,
      )
        ? raw.services
        : Array.isArray(raw)
          ? raw
          : [];

      const rows: Record<string, unknown>[] = [];
      for (const s of list) {
        const code = String(s.code || '').trim().toLowerCase();
        if (!code) continue;
        const name = String(s.name || code).trim();
        rows.push({
          code,
          name,
          display_name: name,
          is_popular: POPULAR_CODES.has(code),
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }

      await upsertInBatches('vn_services', rows, 'code');
      stats.services = rows.length;
    }

    // ─── 2. Countries (bulk) ──────────────────────────────────────
    if (mode === 'full' || mode === 'services') {
      const raw = await grizzly('getCountries');
      const entries =
        typeof raw === 'object' && raw !== null ? Object.entries(raw) : [];

      const rows: Record<string, unknown>[] = [];
      for (const [code, info] of entries) {
        if (!info || typeof info !== 'object') continue;
        const c = info as { eng?: string; name?: string };
        const name = String(c.eng || c.name || code).trim();
        const isVirtual =
          code === '12' ||
          name.toLowerCase().includes('virtual') ||
          name.includes('(2)');
        rows.push({
          code: String(code),
          name,
          display_name: isVirtual
            ? 'United States (Virtual)'
            : name === 'USA'
              ? 'United States'
              : name,
          is_virtual: isVirtual,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }

      await upsertInBatches('vn_countries', rows, 'code');
      stats.countries = rows.length;
    }

    // ─── 3. Price options (priority countries, bulk) ──────────────
    if (mode === 'full' || mode === 'prices') {
      // Supabase default page size is 1000 — fetch all pages
      const serviceRows = (await sbSelect(
        'vn_services',
        'select=id,code&is_active=eq.true&limit=5000',
      )) as Array<{ id: string; code: string }>;
      const countryRows = (await sbSelect(
        'vn_countries',
        'select=id,code&is_active=eq.true&limit=1000',
      )) as Array<{ id: string; code: string }>;

      const serviceMap = new Map<string, string>();
      for (const r of serviceRows || [])
        serviceMap.set(String(r.code).toLowerCase(), r.id);
      const countryMap = new Map<string, string>();
      for (const r of countryRows || []) countryMap.set(String(r.code), r.id);

      const priceRows: Record<string, unknown>[] = [];

      for (const countryCode of PRIORITY_COUNTRIES) {
        const countryId = countryMap.get(countryCode);
        if (!countryId) continue;

        let priceData: any;
        try {
          priceData = await grizzly('getPricesV3', { country: countryCode });
        } catch (e) {
          stats.errors.push(
            'prices country ' +
              countryCode +
              ': ' +
              (e instanceof Error ? e.message : 'fail'),
          );
          continue;
        }

        // getPricesV3 shape can be { "187": { "wa": { cost, count, ... } } }
        // or nested with providers
        const countryBlock =
          priceData?.[countryCode] || priceData?.[String(countryCode)] || {};

        for (const [serviceCode, info] of Object.entries(countryBlock)) {
          const serviceId = serviceMap.get(String(serviceCode).toLowerCase());
          if (!serviceId || !info || typeof info !== 'object') continue;

          const infoObj = info as any;

          // Format A: { providers: { id: { count, price: [] } } }
          if (infoObj.providers && typeof infoObj.providers === 'object') {
            for (const [providerId, pinfo] of Object.entries(infoObj.providers)) {
              const p = pinfo as { count?: number; price?: number[] | number };
              const prices = Array.isArray(p.price)
                ? p.price
                : p.price != null
                  ? [Number(p.price)]
                  : [];
              const stock = Number(p.count || 0);
              for (const cost of prices) {
                const costUsd = Number(cost);
                if (!Number.isFinite(costUsd) || costUsd <= 0) continue;
                priceRows.push({
                  service_id: serviceId,
                  country_id: countryId,
                  provider_code: String(providerId),
                  cost_usd: costUsd,
                  stock,
                  tier: tierFromCost(costUsd),
                  is_available: stock > 0,
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
              }
            }
          } else {
            // Format B: flat { cost, count } or { price, count }
            const costUsd = Number(infoObj.cost ?? infoObj.price ?? 0);
            const stock = Number(infoObj.count ?? infoObj.qty ?? 0);
            if (!Number.isFinite(costUsd) || costUsd <= 0) continue;
            priceRows.push({
              service_id: serviceId,
              country_id: countryId,
              provider_code: 'grizzly',
              cost_usd: costUsd,
              stock,
              tier: tierFromCost(costUsd),
              is_available: stock > 0,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      // unique index is (service_id, country_id, provider_code, cost_usd)
      await upsertInBatches(
        'vn_price_options',
        priceRows,
        'service_id,country_id,provider_code,cost_usd',
      );
      stats.priceOptions = priceRows.length;
    }

    return NextResponse.json({
      ok: true,
      mode,
      stats,
      message:
        mode === 'services'
          ? 'Services + countries synced'
          : mode === 'prices'
            ? 'Priority country prices synced'
            : 'Full sync completed (services + countries + priority prices)',
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: err instanceof Error ? err.message : 'Sync failed',
        stats,
      },
      { status: 500 },
    );
  }
}
