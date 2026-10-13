import { NextRequest, NextResponse } from 'next/server';
import { sbInsert, sbSelect, sbUpdate, supabaseConfigured } from '@/lib/supabase-admin';

export const maxDuration = 60;

const GRIZZLY_BASE = 'https://api.grizzlysms.com/stubs/handler_api.php';

const PRIORITY_COUNTRIES = [
  '187', // USA
  '12',  // USA Virtual
  '16',  // United Kingdom
  '22',  // India
  '6',   // Indonesia
  '10',  // Vietnam
  '73',  // Brazil
  '1',   // Ukraine
  '36',  // Canada
  '43',  // Germany
  '48',  // Netherlands
  '56',  // Spain
  '78',  // France
  '86',  // Italy
  '117', // Philippines
  '175', // Australia
];

const POPULAR_CODES = new Set([
  'wa', 'tg', 'ig', 'fb', 'go', 'lf', 'tw', 'ds', 'vi', 'ub',
  'mm', 'am', 'ot', 'ni', 'me', 'wb', 'ka', 'pm', 'mb', 'sn',
]);

function checkPassword(password: string | undefined) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return { ok: false as const, status: 503, reason: 'ADMIN_PASSWORD is not configured' };
  if (!password || password !== expected) return { ok: false as const, status: 401, reason: 'Invalid password' };
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

async function upsertService(row: {
  code: string;
  name: string;
  display_name: string;
  is_popular: boolean;
}) {
  try {
    const existing = await sbSelect(
      'vn_services',
      'code=eq.' + encodeURIComponent(row.code) + '&select=id',
    );
    if (Array.isArray(existing) && existing.length > 0) {
      await sbUpdate('vn_services', { code: row.code }, {
        name: row.name,
        display_name: row.display_name,
        is_popular: row.is_popular,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      return existing[0].id as string;
    }
  } catch {
    /* continue to insert */
  }

  const inserted = await sbInsert('vn_services', {
    code: row.code,
    name: row.name,
    display_name: row.display_name,
    is_popular: row.is_popular,
    is_active: true,
  });
  return Array.isArray(inserted) ? inserted[0]?.id : null;
}

async function upsertCountry(row: {
  code: string;
  name: string;
  display_name: string;
  is_virtual: boolean;
}) {
  try {
    const existing = await sbSelect(
      'vn_countries',
      'code=eq.' + encodeURIComponent(row.code) + '&select=id',
    );
    if (Array.isArray(existing) && existing.length > 0) {
      await sbUpdate('vn_countries', { code: row.code }, {
        name: row.name,
        display_name: row.display_name,
        is_virtual: row.is_virtual,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      return existing[0].id as string;
    }
  } catch {
    /* continue */
  }

  const inserted = await sbInsert('vn_countries', {
    code: row.code,
    name: row.name,
    display_name: row.display_name,
    is_virtual: row.is_virtual,
    is_active: true,
  });
  return Array.isArray(inserted) ? inserted[0]?.id : null;
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
      { ok: false, reason: 'Supabase not configured (need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)' },
      { status: 503 },
    );
  }

  if (!process.env.GRIZZLYSMS_API_KEY) {
    return NextResponse.json({ ok: false, reason: 'GRIZZLYSMS_API_KEY missing' }, { status: 503 });
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'full').toLowerCase();
  const stats = {
    services: 0,
    countries: 0,
    priceOptions: 0,
    errors: [] as string[],
  };

  try {
    // 1. Services
    if (mode === 'full' || mode === 'services') {
      const raw = await grizzly('getServicesList');
      const list: Array<{ code?: string; name?: string }> = Array.isArray(raw?.services)
        ? raw.services
        : Array.isArray(raw)
          ? raw
          : [];

      for (const s of list) {
        const code = String(s.code || '').trim().toLowerCase();
        if (!code) continue;
        const name = String(s.name || code).trim();
        try {
          await upsertService({
            code,
            name,
            display_name: name,
            is_popular: POPULAR_CODES.has(code),
          });
          stats.services += 1;
        } catch (e) {
          stats.errors.push('service ' + code + ': ' + (e instanceof Error ? e.message : 'fail'));
        }
      }
    }

    // 2. Countries
    if (mode === 'full' || mode === 'services') {
      const raw = await grizzly('getCountries');
      const entries = typeof raw === 'object' && raw !== null ? Object.entries(raw) : [];

      for (const [code, info] of entries) {
        if (!info || typeof info !== 'object') continue;
        const c = info as { eng?: string; name?: string; id?: number };
        const name = String(c.eng || c.name || code).trim();
        const isVirtual =
          code === '12' ||
          name.toLowerCase().includes('virtual') ||
          name.includes('(2)');
        try {
          await upsertCountry({
            code: String(code),
            name,
            display_name: isVirtual
              ? 'United States (Virtual)'
              : name === 'USA'
                ? 'United States'
                : name,
            is_virtual: isVirtual,
          });
          stats.countries += 1;
        } catch (e) {
          stats.errors.push('country ' + code + ': ' + (e instanceof Error ? e.message : 'fail'));
        }
      }
    }

    // 3. Price options (priority countries)
    if (mode === 'full' || mode === 'prices') {
      const serviceRows = await sbSelect('vn_services', 'select=id,code&is_active=eq.true');
      const countryRows = await sbSelect('vn_countries', 'select=id,code&is_active=eq.true');

      const serviceMap = new Map<string, string>();
      if (Array.isArray(serviceRows)) {
        for (const r of serviceRows) serviceMap.set(String(r.code).toLowerCase(), r.id);
      }
      const countryMap = new Map<string, string>();
      if (Array.isArray(countryRows)) {
        for (const r of countryRows) countryMap.set(String(r.code), r.id);
      }

      for (const countryCode of PRIORITY_COUNTRIES) {
        const countryId = countryMap.get(countryCode);
        if (!countryId) continue;

        let priceData: any;
        try {
          priceData = await grizzly('getPricesV3', { country: countryCode });
        } catch (e) {
          stats.errors.push(
            'prices country ' + countryCode + ': ' + (e instanceof Error ? e.message : 'fail'),
          );
          continue;
        }

        const countryBlock = priceData?.[countryCode] || priceData?.[String(countryCode)] || {};
        for (const [serviceCode, info] of Object.entries(countryBlock)) {
          const serviceId = serviceMap.get(String(serviceCode).toLowerCase());
          if (!serviceId || !info || typeof info !== 'object') continue;

          const providers = (info as any).providers || {};
          for (const [providerId, pinfo] of Object.entries(providers)) {
            const p = pinfo as { count?: number; price?: number[] };
            const prices = Array.isArray(p.price) ? p.price : [];
            const stock = Number(p.count || 0);

            for (const cost of prices) {
              const costUsd = Number(cost);
              if (!Number.isFinite(costUsd) || costUsd <= 0) continue;

              const tier = tierFromCost(costUsd);
              const isAvailable = stock > 0;

              try {
                const existing = await sbSelect(
                  'vn_price_options',
                  'service_id=eq.' +
                    serviceId +
                    '&country_id=eq.' +
                    countryId +
                    '&provider_code=eq.' +
                    encodeURIComponent(providerId) +
                    '&cost_usd=eq.' +
                    costUsd +
                    '&select=id',
                );

                if (Array.isArray(existing) && existing.length > 0) {
                  await sbUpdate(
                    'vn_price_options',
                    { id: existing[0].id },
                    {
                      stock,
                      tier,
                      is_available: isAvailable,
                      last_synced_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  );
                } else {
                  await sbInsert('vn_price_options', {
                    service_id: serviceId,
                    country_id: countryId,
                    provider_code: String(providerId),
                    cost_usd: costUsd,
                    stock,
                    tier,
                    is_available: isAvailable,
                    last_synced_at: new Date().toISOString(),
                  });
                }
                stats.priceOptions += 1;
              } catch (e) {
                stats.errors.push(
                  'price ' +
                    serviceCode +
                    '/' +
                    countryCode +
                    '/' +
                    providerId +
                    ': ' +
                    (e instanceof Error ? e.message : 'fail'),
                );
              }
            }
          }
        }
      }
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
