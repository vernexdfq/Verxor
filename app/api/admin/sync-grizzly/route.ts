import { NextRequest, NextResponse } from 'next/server';
import {
  sbSelect,
  sbUpsertBatch,
  supabaseConfigured,
} from '@/lib/supabase-admin';

export const maxDuration = 300;

const GRIZZLY_BASE = 'https://api.grizzlysms.com/stubs/handler_api.php';
const BATCH = 150;
const PRICE_CONCURRENCY = 5;

const PRIORITY_COUNTRIES = [
  '187', '12', '16', '22', '6', '10', '73', '1', '36', '43',
  '48', '56', '78', '86', '117', '175', '52', '62', '54', '33',
  '31', '19', '4', '14', '15', '32', '46', '50', '63', '82',
  '84', '129', '141', '163', '37', '53', '95', '40', '60', '66',
  '64', '81', '8', '38', '67', '55', '3', '57', '47', '13',
  '0', '2', '7', '9', '11', '17', '18', '20', '21', '23',
  '24', '25', '29', '34', '35', '39', '41', '44', '45', '49',
  '51', '58', '59', '61', '65', '70', '71', '72', '74', '75',
  '83', '85', '87', '93', '94', '103', '105', '109', '114', '128',
  '131',
];

/** Friendly names when Grizzly getServicesList omits a code that still appears in prices. */
const KNOWN_SERVICE_NAMES: Record<string, string> = {
  fb: 'Facebook',
  ig: 'Instagram',
  lf: 'TikTok',
  wa: 'WhatsApp',
  tg: 'Telegram',
  go: 'Google',
  tw: 'Twitter / X',
  ds: 'Discord',
  vi: 'Viber',
  ok: 'Odnoklassniki',
  vk: 'VK',
  mm: 'Microsoft',
  am: 'Amazon',
  ub: 'Uber',
  ni: 'Nike',
  me: 'Microsoft',
  wb: 'WeChat',
  pm: 'PayPal',
  sn: 'Snapchat',
  ot: 'Any other',
};

const POPULAR_CODES = new Set([
  'wa', 'tg', 'ig', 'fb', 'go', 'lf', 'tw', 'ds', 'vi', 'ub',
  'mm', 'am', 'ot', 'ni', 'me', 'wb', 'ka', 'pm', 'mb', 'sn',
  'ok', 'vk', 'im', 'fu', 'kt', 'hw', 'aax', 'acz',
]);

function checkPassword(password: string | undefined) {
  const expected = (process.env.ADMIN_PASSWORD || '').trim();
  if (!expected)
    return { ok: false as const, status: 503, reason: 'ADMIN_PASSWORD is not configured' };
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
    await sbUpsertBatch(table, rows.slice(i, i + BATCH), onConflict);
  }
}

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
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function unwrapCountryBlock(priceData: any, countryCode: string): any {
  if (!priceData || typeof priceData !== 'object') return null;
  if (priceData[countryCode] && typeof priceData[countryCode] === 'object') {
    return priceData[countryCode];
  }
  // already service-keyed
  return priceData;
}

/** Collect service codes present in a price payload. */
function collectServiceCodes(priceData: any, countryCode: string): string[] {
  const block = unwrapCountryBlock(priceData, countryCode);
  if (!block || typeof block !== 'object') return [];
  return Object.keys(block).filter((k) => !/^\d+$/.test(k) && typeof block[k] === 'object');
}

function extractPriceRowsForCountry(
  countryCode: string,
  countryId: string,
  priceData: any,
  serviceMap: Map<string, string>,
): Record<string, unknown>[] {
  const priceRows: Record<string, unknown>[] = [];
  const countryBlock = unwrapCountryBlock(priceData, countryCode);
  if (!countryBlock || typeof countryBlock !== 'object') return priceRows;

  for (const [serviceCode, info] of Object.entries(countryBlock)) {
    if (/^\d+$/.test(serviceCode)) continue;
    if (!info || typeof info !== 'object') continue;

    const serviceId = serviceMap.get(String(serviceCode).toLowerCase());
    if (!serviceId) continue;

    const infoObj = info as any;

    if (infoObj.providers && typeof infoObj.providers === 'object') {
      for (const [providerId, pinfo] of Object.entries(infoObj.providers)) {
        const p = pinfo as {
          count?: number | string;
          price?: number[] | number | string;
          cost?: number | string;
        };
        let prices: number[] = [];
        if (Array.isArray(p.price)) prices = p.price.map(Number);
        else if (p.price != null && p.price !== '') prices = [Number(p.price)];
        else if (p.cost != null && p.cost !== '') prices = [Number(p.cost)];
        if (prices.length === 0 && infoObj.cost != null) prices = [Number(infoObj.cost)];
        if (prices.length === 0 && infoObj.price != null) prices = [Number(infoObj.price)];

        const stock = Number(p.count ?? infoObj.count ?? 0);
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
            is_available: true,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    const topCost = Number(infoObj.cost ?? infoObj.price ?? 0);
    const topStock = Number(infoObj.count ?? infoObj.qty ?? 0);
    if (Number.isFinite(topCost) && topCost > 0) {
      priceRows.push({
        service_id: serviceId,
        country_id: countryId,
        provider_code: 'grizzly',
        cost_usd: topCost,
        stock: topStock,
        tier: tierFromCost(topCost),
        is_available: true,
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
      { ok: false, reason: 'Supabase not configured' },
      { status: 503 },
    );
  }
  if (!process.env.GRIZZLYSMS_API_KEY) {
    return NextResponse.json({ ok: false, reason: 'GRIZZLYSMS_API_KEY missing' }, { status: 503 });
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'full').toLowerCase();
  const countriesParam = (req.nextUrl.searchParams.get('countries') || 'all').toLowerCase();

  const stats = {
    services: 0,
    servicesAddedFromPrices: 0,
    countries: 0,
    priceOptions: 0,
    countriesPriced: 0,
    countriesFailed: 0,
    errors: [] as string[],
  };

  try {
    if (mode === 'debug-prices') {
      const country = req.nextUrl.searchParams.get('country') || '16';
      const priceData = await grizzly('getPricesV3', { country });
      const codes = collectServiceCodes(priceData, country);
      const serviceRows = (await sbSelect(
        'vn_services',
        'select=id,code&is_active=eq.true&limit=5000',
      )) as Array<{ id: string; code: string }>;
      const inDb = new Set((serviceRows || []).map((r) => String(r.code).toLowerCase()));
      const missing = codes.filter((c) => !inDb.has(c.toLowerCase()));
      const interesting = ['fb', 'ig', 'lf', 'wa', 'tg', 'go'];
      const samples: Record<string, unknown> = {};
      const block = unwrapCountryBlock(priceData, country) || {};
      for (const k of interesting) {
        if (block[k]) samples[k] = block[k];
      }
      return NextResponse.json({
        ok: true,
        country,
        serviceCodesInPrices: codes.length,
        missingFromDb: missing.slice(0, 50),
        missingCount: missing.length,
        hasFbIgLf: {
          fb: codes.includes('fb'),
          ig: codes.includes('ig'),
          lf: codes.includes('lf'),
          inDbFb: inDb.has('fb'),
          inDbIg: inDb.has('ig'),
          inDbLf: inDb.has('lf'),
        },
        samples: Object.fromEntries(
          Object.entries(samples).map(([k, v]) => [
            k,
            {
              price: (v as any)?.price,
              cost: (v as any)?.cost,
              count: (v as any)?.count,
              providerCount: Object.keys((v as any)?.providers || {}).length,
            },
          ]),
        ),
      });
    }

    // 1. Services from getServicesList
    if (mode === 'full' || mode === 'services') {
      const raw = await grizzly('getServicesList');
      const list: Array<{ code?: string; name?: string }> = Array.isArray(raw?.services)
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
        const name = String(s.name || KNOWN_SERVICE_NAMES[code] || code).trim();
        rows.push({
          code,
          name,
          display_name: name,
          is_popular: POPULAR_CODES.has(code),
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }

      // Seed known popular codes even if getServicesList omits them
      for (const [code, name] of Object.entries(KNOWN_SERVICE_NAMES)) {
        if (seen.has(code)) continue;
        seen.add(code);
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

    // 2. Countries
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

    // 3. Prices — auto-create any service codes found in price payload but missing from DB
    if (mode === 'full' || mode === 'prices') {
      let serviceRows = (await sbSelect(
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

      let totalOptions = 0;
      const BATCH_COUNTRIES = 4;
      const missingServiceCodes = new Set<string>();

      for (let i = 0; i < countryCodes.length; i += BATCH_COUNTRIES) {
        const slice = countryCodes.slice(i, i + BATCH_COUNTRIES);
        const batchRows: Record<string, unknown>[] = [];
        const pricePayloads: Array<{ countryCode: string; countryId: string; data: any }> =
          [];

        await mapPool(slice, PRICE_CONCURRENCY, async (countryCode) => {
          const countryId = countryMap.get(countryCode);
          if (!countryId) {
            stats.countriesFailed += 1;
            return;
          }
          try {
            const priceData = await grizzly('getPricesV3', { country: countryCode });
            // discover missing services
            for (const code of collectServiceCodes(priceData, countryCode)) {
              if (!serviceMap.has(code.toLowerCase())) {
                missingServiceCodes.add(code.toLowerCase());
              }
            }
            pricePayloads.push({ countryCode, countryId, data: priceData });
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

        // Upsert any newly discovered services before extracting rows
        if (missingServiceCodes.size > 0) {
          const newRows = Array.from(missingServiceCodes).map((code) => ({
            code,
            name: KNOWN_SERVICE_NAMES[code] || code.toUpperCase(),
            display_name: KNOWN_SERVICE_NAMES[code] || code.toUpperCase(),
            is_popular: POPULAR_CODES.has(code),
            is_active: true,
            updated_at: new Date().toISOString(),
          }));
          await upsertInBatches('vn_services', newRows, 'code');
          stats.servicesAddedFromPrices += newRows.length;

          // refresh map for these codes
          const refreshed = (await sbSelect(
            'vn_services',
            'select=id,code&is_active=eq.true&limit=5000',
          )) as Array<{ id: string; code: string }>;
          serviceMap.clear();
          for (const r of refreshed || [])
            serviceMap.set(String(r.code).toLowerCase(), r.id);
          missingServiceCodes.clear();
        }

        for (const { countryCode, countryId, data } of pricePayloads) {
          const rows = extractPriceRowsForCountry(
            countryCode,
            countryId,
            data,
            serviceMap,
          );
          if (rows.length > 0) {
            batchRows.push(...rows);
            stats.countriesPriced += 1;
          }
        }

        const uniqueRows = dedupePriceRows(batchRows);
        await upsertInBatches(
          'vn_price_options',
          uniqueRows,
          'service_id,country_id,provider_code,cost_usd',
        );
        totalOptions += uniqueRows.length;

        if (i + BATCH_COUNTRIES < countryCodes.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      stats.priceOptions = totalOptions;
    }

    return NextResponse.json({
      ok: true,
      mode,
      countriesParam,
      stats,
      message:
        mode === 'services'
          ? 'Services + countries synced'
          : mode === 'prices'
            ? `Prices synced for ${stats.countriesPriced} countries (${stats.priceOptions} options, +${stats.servicesAddedFromPrices} services from prices)`
            : `Full sync done`,
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
