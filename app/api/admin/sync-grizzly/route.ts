import { NextRequest, NextResponse } from 'next/server';
import {
  sbSelect,
  sbUpsertBatch,
  supabaseConfigured,
} from '@/lib/supabase-admin';

/** Allow long-running full catalog sync (Vercel Pro / Fluid can go higher). */
export const maxDuration = 300;

const GRIZZLY_BASE = 'https://api.grizzlysms.com/stubs/handler_api.php';
const BATCH = 150;
/** How many getPricesV3 country calls to run at once. */
const PRICE_CONCURRENCY = 8;

/** High-demand first so partial runs still cover FB/IG/TikTok/WA well. */
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
  '117', // Philippines / Australia variant
  '175', // Australia
  '52', // Thailand
  '62', // Turkey
  '54', // Mexico
  '33', // Colombia
  '31', // South Africa
  '19', // Nigeria
  '4', // Philippines
  '14', // Hong Kong
  '15', // Poland
  '32', // Romania
  '46', // Sweden
  '50', // Austria
  '63', // Czech
  '82', // Belgium
  '84', // Hungary
  '129', // Greece
  '141', // Finland
  '163', // Norway
  '37', // Morocco
  '53', // Saudi Arabia
  '95', // UAE
  '40', // Uzbekistan
  '60', // Bangladesh
  '66', // Pakistan
  '64', // Sri Lanka
  '81', // Nepal
  '8', // Kenya
  '38', // Ghana
  '67', // New Zealand
  '55', // Taiwan
  '3', // China
  '57', // Iran
  '47', // Iraq
  '13', // Israel
  '0', // Russia
  '2', // Kazakhstan
  '7', // Malaysia
  '9', // Tanzania
  '11', // Kyrgyzstan
  '17', // Madagascar
  '18', // DR Congo
  '20', // Macao
  '21', // Egypt
  '23', // Ireland
  '24', // Cambodia
  '25', // Laos
  '29', // Serbia
  '34', // Estonia
  '35', // Azerbaijan
  '39', // Argentina
  '41', // Cameroon
  '44', // Lithuania
  '45', // Croatia
  '49', // Latvia
  '51', // Belarus
  '58', // Algeria
  '59', // Slovenia
  '61', // Senegal
  '65', // Peru
  '70', // Venezuela
  '71', // Ethiopia
  '72', // Mongolia
  '74', // Afghanistan
  '75', // Uganda
  '83', // Bulgaria
  '85', // Moldova
  '87', // Paraguay
  '93', // Costa Rica
  '94', // Guatemala
  '103', // Jamaica
  '105', // Ecuador
  '109', // Dominican Republic
  '114', // Portugal
  '128', // Georgia
  '131', // Lebanon
];

const POPULAR_CODES = new Set([
  'wa', 'tg', 'ig', 'fb', 'go', 'lf', 'tw', 'ds', 'vi', 'ub',
  'mm', 'am', 'ot', 'ni', 'me', 'wb', 'ka', 'pm', 'mb', 'sn',
  'ok', 'vk', 'im', 'fu', 'kt', 'hw', 'aax', 'acz',
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
    signal: AbortSignal.timeout(28000),
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

/** Keep one row per unique constraint key (last write wins). */
function dedupePriceRows(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key =
      String(row.service_id) +
      '|' +
      String(row.country_id) +
      '|' +
      String(row.provider_code) +
      '|' +
      String(row.cost_usd);
    map.set(key, row);
  }
  return Array.from(map.values());
}

/** Simple concurrency pool. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function extractPriceRowsForCountry(
  countryCode: string,
  countryId: string,
  priceData: any,
  serviceMap: Map<string, string>,
): Record<string, unknown>[] {
  const priceRows: Record<string, unknown>[] = [];
  const countryBlock =
    priceData?.[countryCode] || priceData?.[String(countryCode)] || priceData || {};

  if (!countryBlock || typeof countryBlock !== 'object') return priceRows;

  for (const [serviceCode, info] of Object.entries(countryBlock)) {
    // skip nested country keys if API returns { "187": { wa: ... } } already unwrapped
    if (serviceCode === countryCode) continue;
    const serviceId = serviceMap.get(String(serviceCode).toLowerCase());
    if (!serviceId || !info || typeof info !== 'object') continue;

    const infoObj = info as any;

    if (infoObj.providers && typeof infoObj.providers === 'object') {
      for (const [providerId, pinfo] of Object.entries(infoObj.providers)) {
        const p = pinfo as { count?: number; price?: number[] | number };
        const prices = Array.isArray(p.price)
          ? p.price
          : p.price != null
            ? [Number(p.price)]
            : [];
        const stock = Number(p.count || 0);
        const seenCosts = new Set<number>();
        for (const cost of prices) {
          const costUsd = Number(cost);
          if (!Number.isFinite(costUsd) || costUsd <= 0) continue;
          if (seenCosts.has(costUsd)) continue;
          seenCosts.add(costUsd);
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
  return priceRows;
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
  // countries=all | priority | comma-list of grizzly codes
  const countriesParam = (req.nextUrl.searchParams.get('countries') || 'all').toLowerCase();

  const stats = {
    services: 0,
    countries: 0,
    priceOptions: 0,
    countriesPriced: 0,
    countriesFailed: 0,
    errors: [] as string[],
  };

  try {
    // 1. Services — full list from Grizzly
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
      const seen = new Set<string>();
      for (const s of list) {
        const code = String(s.code || '').trim().toLowerCase();
        if (!code || seen.has(code)) continue;
        seen.add(code);
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

    // 2. Countries — full list from Grizzly
    if (mode === 'full' || mode === 'services' || mode === 'countries') {
      const raw = await grizzly('getCountries');
      const entries =
        typeof raw === 'object' && raw !== null ? Object.entries(raw) : [];

      const rows: Record<string, unknown>[] = [];
      const seen = new Set<string>();
      for (const [code, info] of entries) {
        if (!info || typeof info !== 'object') continue;
        const codeStr = String(code);
        if (seen.has(codeStr)) continue;
        seen.add(codeStr);
        const c = info as { eng?: string; name?: string; rus?: string };
        const name = String(c.eng || c.name || c.rus || code).trim();
        const isVirtual =
          codeStr === '12' ||
          name.toLowerCase().includes('virtual') ||
          name.includes('(2)');
        rows.push({
          code: codeStr,
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

    // 3. Price options — all countries (or priority / explicit list) in parallel batches
    if (mode === 'full' || mode === 'prices') {
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

      let countryCodes: string[] = [];
      if (countriesParam === 'priority') {
        countryCodes = PRIORITY_COUNTRIES.filter((c) => countryMap.has(c));
      } else if (countriesParam === 'all' || !countriesParam) {
        // Priority first, then every other country in DB → true 100% coverage
        const prioritySet = new Set(PRIORITY_COUNTRIES);
        const rest = (countryRows || [])
          .map((c) => String(c.code))
          .filter((c) => !prioritySet.has(c));
        countryCodes = [
          ...PRIORITY_COUNTRIES.filter((c) => countryMap.has(c)),
          ...rest,
        ];
      } else {
        countryCodes = countriesParam
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c && countryMap.has(c));
      }

      const allPriceRows: Record<string, unknown>[] = [];

      await mapPool(countryCodes, PRICE_CONCURRENCY, async (countryCode) => {
        const countryId = countryMap.get(countryCode);
        if (!countryId) {
          stats.errors.push('missing country id for ' + countryCode);
          stats.countriesFailed += 1;
          return;
        }

        try {
          const priceData = await grizzly('getPricesV3', { country: countryCode });
          const rows = extractPriceRowsForCountry(
            countryCode,
            countryId,
            priceData,
            serviceMap,
          );
          if (rows.length > 0) {
            allPriceRows.push(...rows);
            stats.countriesPriced += 1;
          }
        } catch (e) {
          stats.countriesFailed += 1;
          stats.errors.push(
            'prices country ' +
              countryCode +
              ': ' +
              (e instanceof Error ? e.message : 'fail'),
          );
        }
      });

      const uniqueRows = dedupePriceRows(allPriceRows);
      // Upsert in batches so we don't blow memory / payload limits
      await upsertInBatches(
        'vn_price_options',
        uniqueRows,
        'service_id,country_id,provider_code,cost_usd',
      );
      stats.priceOptions = uniqueRows.length;
    }

    return NextResponse.json({
      ok: true,
      mode,
      countriesParam,
      stats,
      message:
        mode === 'services'
          ? 'Services + countries synced (full Grizzly lists)'
          : mode === 'prices'
            ? `Prices synced for ${stats.countriesPriced} countries (${stats.priceOptions} options)`
            : `Full sync: ${stats.services} services, ${stats.countries} countries, ${stats.priceOptions} price options across ${stats.countriesPriced} countries`,
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
