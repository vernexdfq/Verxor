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
const PRICE_CONCURRENCY = 6;

/** High-demand first so partial runs still cover FB/IG/TikTok/WA well. */
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
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

/**
 * Grizzly getPricesV3 shapes observed:
 * A) { "187": { "wa": { cost, count, providers: { "1": { price, count } } } } }
 * B) { "wa": { cost, count, providers: ... } }  when country= param is set
 * C) providers.price can be number | number[] | string
 * D) sometimes only top-level cost/count without providers
 */
function extractPriceRowsForCountry(
  countryCode: string,
  countryId: string,
  priceData: any,
  serviceMap: Map<string, string>,
): Record<string, unknown>[] {
  const priceRows: Record<string, unknown>[] = [];

  let countryBlock: any =
    priceData?.[countryCode] ?? priceData?.[String(countryCode)] ?? null;

  // If response is already service-keyed (no outer country), use whole object
  if (!countryBlock || typeof countryBlock !== 'object') {
    countryBlock = priceData;
  }
  // If still nested under the country key only, unwrap
  if (
    countryBlock &&
    typeof countryBlock === 'object' &&
    countryBlock[countryCode] &&
    typeof countryBlock[countryCode] === 'object'
  ) {
    countryBlock = countryBlock[countryCode];
  }

  if (!countryBlock || typeof countryBlock !== 'object') return priceRows;

  for (const [serviceCode, info] of Object.entries(countryBlock)) {
    // skip nested pure-numeric country keys
    if (/^\d+$/.test(serviceCode) && serviceCode === countryCode) continue;
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
        if (Array.isArray(p.price)) {
          prices = p.price.map(Number);
        } else if (p.price != null && p.price !== '') {
          prices = [Number(p.price)];
        } else if (p.cost != null && p.cost !== '') {
          prices = [Number(p.cost)];
        }
        // also fall back to parent cost if provider has no price
        if (prices.length === 0 && infoObj.cost != null) {
          prices = [Number(infoObj.cost)];
        }
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
            is_available: true, // show even if stock reported 0 (stock fluctuates)
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Always also capture top-level cost if present (covers shape without providers)
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
    // Debug: inspect raw Grizzly prices for one country (no DB write)
    if (mode === 'debug-prices') {
      const country = req.nextUrl.searchParams.get('country') || '187';
      const priceData = await grizzly('getPricesV3', { country });
      const topKeys = priceData && typeof priceData === 'object' ? Object.keys(priceData).slice(0, 40) : [];
      const nested =
        priceData?.[country] && typeof priceData[country] === 'object'
          ? Object.keys(priceData[country]).slice(0, 40)
          : [];
      const interesting = ['fb', 'ig', 'lf', 'wa', 'tg', 'go', 'tw', 'ds', 'vi'];
      const samples: Record<string, unknown> = {};
      const scan = (obj: any, prefix = '') => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          if (interesting.includes(String(k).toLowerCase())) {
            samples[prefix + k] = obj[k];
          }
        }
        // one level nested under country
        if (obj[country] && typeof obj[country] === 'object') {
          for (const k of Object.keys(obj[country])) {
            if (interesting.includes(String(k).toLowerCase())) {
              samples['nested.' + k] = obj[country][k];
            }
          }
        }
      };
      scan(priceData);

      // Also test extraction against DB maps
      const serviceRows = (await sbSelect(
        'vn_services',
        'select=id,code&is_active=eq.true&limit=5000',
      )) as Array<{ id: string; code: string }>;
      const countryRows = (await sbSelect(
        'vn_countries',
        `code=eq.${country}&select=id,code&limit=1`,
      )) as Array<{ id: string; code: string }>;
      const serviceMap = new Map<string, string>();
      for (const r of serviceRows || [])
        serviceMap.set(String(r.code).toLowerCase(), r.id);
      const countryId = countryRows?.[0]?.id || 'missing';
      const extracted = extractPriceRowsForCountry(
        country,
        countryId,
        priceData,
        serviceMap,
      );
      const byService: Record<string, number> = {};
      for (const row of extracted) {
        // reverse lookup code
        let code = '?';
        for (const [c, id] of serviceMap) {
          if (id === row.service_id) {
            code = c;
            break;
          }
        }
        byService[code] = (byService[code] || 0) + 1;
      }

      return NextResponse.json({
        ok: true,
        mode: 'debug-prices',
        country,
        topKeys,
        nestedKeys: nested,
        interestingSamples: samples,
        serviceMapHas: {
          fb: serviceMap.has('fb'),
          ig: serviceMap.has('ig'),
          lf: serviceMap.has('lf'),
          wa: serviceMap.has('wa'),
        },
        extractedCount: extracted.length,
        extractedByService: Object.fromEntries(
          Object.entries(byService)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50),
        ),
        extractedFbIgLf: extracted.filter((r) => {
          for (const [c, id] of serviceMap) {
            if (id === r.service_id && ['fb', 'ig', 'lf'].includes(c)) return true;
          }
          return false;
        }).slice(0, 20),
      });
    }

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

    // 3. Price options
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

      // Process in sequential mini-batches to avoid 429 and memory spikes
      let totalOptions = 0;
      const BATCH_COUNTRIES = 5;
      for (let i = 0; i < countryCodes.length; i += BATCH_COUNTRIES) {
        const slice = countryCodes.slice(i, i + BATCH_COUNTRIES);
        const batchRows: Record<string, unknown>[] = [];

        await mapPool(slice, PRICE_CONCURRENCY, async (countryCode) => {
          const countryId = countryMap.get(countryCode);
          if (!countryId) {
            stats.errors.push('missing country id for ' + countryCode);
            stats.countriesFailed += 1;
            return;
          }
          try {
            const priceData = await grizzly('getPricesV3', {
              country: countryCode,
            });
            const rows = extractPriceRowsForCountry(
              countryCode,
              countryId,
              priceData,
              serviceMap,
            );
            if (rows.length > 0) {
              batchRows.push(...rows);
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

        const uniqueRows = dedupePriceRows(batchRows);
        await upsertInBatches(
          'vn_price_options',
          uniqueRows,
          'service_id,country_id,provider_code,cost_usd',
        );
        totalOptions += uniqueRows.length;

        // brief pause between batches to reduce 429s
        if (i + BATCH_COUNTRIES < countryCodes.length) {
          await new Promise((r) => setTimeout(r, 400));
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
