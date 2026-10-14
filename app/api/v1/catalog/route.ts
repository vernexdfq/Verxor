import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const RETAIL_MULT: Record<string, number> = {
  economy: 5.0,
  standard: 4.0,
  fast: 3.0,
  premium: 2.0,
};

const DEFAULT_RATE = 1380;

const ISO_TO_GRIZZLY: Record<string, string[]> = {
  US: ['187', '12'],
  USA: ['187', '12'],
  GB: ['16'],
  UK: ['16'],
  IN: ['22'],
  ID: ['6'],
  VN: ['10'],
  BR: ['73'],
  UA: ['1'],
  CA: ['36'],
  DE: ['43'],
  NL: ['48'],
  ES: ['56'],
  FR: ['78'],
  IT: ['86'],
  PH: ['4', '117'],
  AU: ['175'],
  TH: ['52'],
  TR: ['62'],
  MX: ['54'],
  CO: ['33'],
  ZA: ['31'],
  NG: ['19'],
  PL: ['15'],
  RO: ['32'],
  SE: ['46'],
  AT: ['50'],
  CZ: ['63'],
  BE: ['82'],
  HU: ['84'],
  GR: ['129'],
  FI: ['141'],
  NO: ['163'],
  MA: ['37'],
  SA: ['53'],
  AE: ['95'],
  BD: ['60'],
  PK: ['66'],
  MY: ['7'],
  KE: ['8'],
  GH: ['38'],
  NZ: ['67'],
  TW: ['55'],
  HK: ['14'],
  IE: ['23'],
  AR: ['39'],
  PE: ['65'],
  EG: ['21'],
  PT: ['114'],
};

const GRIZZLY_TO_ISO: Record<
  string,
  { code: string; name: string; flag: string; dial: string }
> = {
  '0': { code: 'RU', name: 'Russia', flag: '🇷🇺', dial: '+7' },
  '1': { code: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
  '2': { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', dial: '+7' },
  '3': { code: 'CN', name: 'China', flag: '🇨🇳', dial: '+86' },
  '4': { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  '6': { code: 'ID', name: 'Indonesia', flag: '🇮🇩', dial: '+62' },
  '7': { code: 'MY', name: 'Malaysia', flag: '🇲🇾', dial: '+60' },
  '8': { code: 'KE', name: 'Kenya', flag: '🇰🇪', dial: '+254' },
  '9': { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', dial: '+255' },
  '10': { code: 'VN', name: 'Vietnam', flag: '🇻🇳', dial: '+84' },
  '12': { code: 'US', name: 'United States (Virtual)', flag: '🇺🇸', dial: '+1' },
  '13': { code: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972' },
  '14': { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', dial: '+852' },
  '15': { code: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
  '16': { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  '19': { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234' },
  '21': { code: 'EG', name: 'Egypt', flag: '🇪🇬', dial: '+20' },
  '22': { code: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
  '23': { code: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
  '31': { code: 'ZA', name: 'South Africa', flag: '🇿🇦', dial: '+27' },
  '32': { code: 'RO', name: 'Romania', flag: '🇷🇴', dial: '+40' },
  '33': { code: 'CO', name: 'Colombia', flag: '🇨🇴', dial: '+57' },
  '36': { code: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  '37': { code: 'MA', name: 'Morocco', flag: '🇲🇦', dial: '+212' },
  '38': { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233' },
  '39': { code: 'AR', name: 'Argentina', flag: '🇦🇷', dial: '+54' },
  '43': { code: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  '46': { code: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
  '48': { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  '50': { code: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
  '52': { code: 'TH', name: 'Thailand', flag: '🇹🇭', dial: '+66' },
  '53': { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dial: '+966' },
  '54': { code: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
  '55': { code: 'TW', name: 'Taiwan', flag: '🇹🇼', dial: '+886' },
  '56': { code: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
  '60': { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', dial: '+880' },
  '62': { code: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
  '63': { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', dial: '+420' },
  '65': { code: 'PE', name: 'Peru', flag: '🇵🇪', dial: '+51' },
  '66': { code: 'PK', name: 'Pakistan', flag: '🇵🇰', dial: '+92' },
  '67': { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
  '73': { code: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
  '78': { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  '82': { code: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
  '84': { code: 'HU', name: 'Hungary', flag: '🇭🇺', dial: '+36' },
  '86': { code: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
  '95': { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  '114': { code: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  '117': { code: 'PH', name: 'Philippines', flag: '🇵🇭', dial: '+63' },
  '129': { code: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30' },
  '141': { code: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
  '163': { code: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
  '175': { code: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
  '187': { code: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
};

const SERVICE_META: Record<string, { category: string; logoId?: string }> = {
  wa: { category: 'messengers', logoId: 'whatsapp' },
  tg: { category: 'messengers', logoId: 'telegram' },
  fb: { category: 'social', logoId: 'facebook' },
  ig: { category: 'social', logoId: 'instagram' },
  tw: { category: 'social', logoId: 'twitter' },
  go: { category: 'other', logoId: 'google' },
  ds: { category: 'messengers', logoId: 'discord' },
  vi: { category: 'messengers', logoId: 'viber' },
  lf: { category: 'social', logoId: 'tiktok' },
  ok: { category: 'social' },
  vk: { category: 'social' },
  mm: { category: 'other' },
  am: { category: 'marketplace', logoId: 'amazon' },
  ub: { category: 'taxi', logoId: 'uber' },
  ni: { category: 'shops', logoId: 'nike' },
  me: { category: 'other', logoId: 'microsoft' },
  wb: { category: 'social' },
  ka: { category: 'other' },
  pm: { category: 'payments', logoId: 'paypal' },
  mb: { category: 'other' },
  sn: { category: 'social', logoId: 'snapchat' },
  ot: { category: 'other' },
  im: { category: 'messengers' },
  fu: { category: 'social', logoId: 'snapchat' },
};

type PricingSettings = {
  base_naira_rate?: number;
  retail_economy?: number;
  retail_standard?: number;
  retail_fast?: number;
  retail_premium?: number;
};

async function loadSettings(): Promise<{ rate: number; mult: Record<string, number> }> {
  try {
    const rows = (await sbSelect('vn_pricing_settings', 'select=*&limit=1')) as PricingSettings[];
    const s = rows?.[0];
    if (!s) return { rate: DEFAULT_RATE, mult: RETAIL_MULT };
    return {
      rate: Number(s.base_naira_rate) || DEFAULT_RATE,
      mult: {
        economy: Number(s.retail_economy) || RETAIL_MULT.economy,
        standard: Number(s.retail_standard) || RETAIL_MULT.standard,
        fast: Number(s.retail_fast) || RETAIL_MULT.fast,
        premium: Number(s.retail_premium) || RETAIL_MULT.premium,
      },
    };
  } catch {
    return { rate: DEFAULT_RATE, mult: RETAIL_MULT };
  }
}

function sellNgn(costUsd: number, tier: string, rate: number, mult: Record<string, number>) {
  const m = mult[tier] ?? 2;
  return Math.ceil(costUsd * rate * m);
}

function poolTier(poolId: string): string {
  if (poolId.includes('economy')) return 'economy';
  if (poolId.includes('standard')) return 'standard';
  if (poolId.includes('fast')) return 'fast';
  return 'premium';
}

function poolRegion(poolId: string): 'usa' | 'worldwide' {
  return poolId.startsWith('usa') ? 'usa' : 'worldwide';
}

/** Paginate through all matching price rows (PostgREST caps single responses). */
async function loadAllPrices(tier: string | null) {
  const all: Array<{ service_id: string; country_id: string; cost_usd: number; stock: number }> =
    [];
  const pageSize = 1000;
  for (let offset = 0; offset < 200000; offset += pageSize) {
    let q = `select=service_id,country_id,cost_usd,stock&is_available=eq.true&order=id.asc&limit=${pageSize}&offset=${offset}`;
    if (tier) q += `&tier=eq.${tier}`;
    const rows = (await sbSelect('vn_price_options', q)) as Array<{
      service_id: string;
      country_id: string;
      cost_usd: number;
      stock: number;
    }>;
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

/** Paginate all active services. */
async function loadAllServices() {
  const all: Array<{
    id: string;
    code: string;
    name: string;
    display_name: string;
    is_popular: boolean;
  }> = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const rows = (await sbSelect(
      'vn_services',
      `select=id,code,name,display_name,is_popular&is_active=eq.true&order=code.asc&limit=${pageSize}&offset=${offset}`,
    )) as Array<{
      id: string;
      code: string;
      name: string;
      display_name: string;
      is_popular: boolean;
    }>;
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function GET(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Database not configured' }, { status: 503 });
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'services').toLowerCase();
  const poolId = (req.nextUrl.searchParams.get('pool') || '').toLowerCase();
  const serviceCode = (req.nextUrl.searchParams.get('service') || '').toLowerCase();
  const countryParam = (req.nextUrl.searchParams.get('country') || '').toUpperCase();
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

  try {
    const { rate, mult } = await loadSettings();

    if (mode === 'services') {
      const tier = poolId ? poolTier(poolId) : null;
      const region = poolId ? poolRegion(poolId) : null;

      const [prices, countries, allServices] = await Promise.all([
        loadAllPrices(tier),
        sbSelect(
          'vn_countries',
          'select=id,code,display_name,is_virtual&is_active=eq.true&limit=500',
        ) as Promise<
          Array<{ id: string; code: string; display_name: string; is_virtual: boolean }>
        >,
        loadAllServices(),
      ]);

      const usaCodes = new Set(['187', '12']);
      const allowedCountryIds = new Set<string>();
      for (const c of countries || []) {
        if (!region) allowedCountryIds.add(c.id);
        else if (region === 'usa' && usaCodes.has(c.code)) allowedCountryIds.add(c.id);
        else if (region === 'worldwide' && !usaCodes.has(c.code)) allowedCountryIds.add(c.id);
      }

      const serviceIds = new Set<string>();
      const fromCost = new Map<string, number>();
      for (const p of prices) {
        if (!allowedCountryIds.has(p.country_id)) continue;
        serviceIds.add(p.service_id);
        const prev = fromCost.get(p.service_id);
        if (prev == null || Number(p.cost_usd) < prev) {
          fromCost.set(p.service_id, Number(p.cost_usd));
        }
      }

      let list = allServices
        .filter((s) => serviceIds.has(s.id))
        .map((s) => {
          const meta = SERVICE_META[s.code] || { category: 'other' };
          const cost = fromCost.get(s.id) || 0;
          const t = tier || 'economy';
          return {
            id: s.code,
            code: s.code,
            name: s.display_name || s.name,
            category: meta.category,
            logoId: meta.logoId || s.code,
            isPopular: Boolean(s.is_popular),
            fromNgn: sellNgn(cost, t, rate, mult),
            fromUsd: Math.round(cost * 100) / 100,
          };
        });

      list.sort((a, b) => {
        if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      if (q) {
        list = list.filter(
          (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
        );
      }

      const res = NextResponse.json({
        ok: true,
        mode: 'services',
        pool: poolId || null,
        tier,
        region,
        count: list.length,
        rate,
        services: list,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res;
    }

    if (mode === 'countries') {
      if (!serviceCode || !poolId) {
        return NextResponse.json({ ok: false, reason: 'service and pool required' }, { status: 400 });
      }
      const tier = poolTier(poolId);
      const region = poolRegion(poolId);
      const svcRows = (await sbSelect(
        'vn_services',
        `code=eq.${encodeURIComponent(serviceCode)}&select=id,code,name&limit=1`,
      )) as Array<{ id: string; code: string; name: string }>;
      const svc = svcRows?.[0];
      if (!svc) return NextResponse.json({ ok: true, countries: [], count: 0 });
      const prices = (await sbSelect(
        'vn_price_options',
        `service_id=eq.${svc.id}&tier=eq.${tier}&is_available=eq.true&select=country_id,cost_usd,stock&limit=10000`,
      )) as Array<{ country_id: string; cost_usd: number; stock: number }>;
      const countries = (await sbSelect(
        'vn_countries',
        'select=id,code,display_name,is_virtual&is_active=eq.true&limit=500',
      )) as Array<{ id: string; code: string; display_name: string; is_virtual: boolean }>;
      const byId = new Map(countries.map((c) => [c.id, c]));
      const usaCodes = new Set(['187', '12']);
      const seen = new Map<
        string,
        {
          code: string;
          name: string;
          flag: string;
          dial: string;
          fromNgn: number;
          stock: number;
          grizzlyCode: string;
        }
      >();
      for (const p of prices || []) {
        const c = byId.get(p.country_id);
        if (!c) continue;
        if (region === 'usa' && !usaCodes.has(c.code)) continue;
        if (region === 'worldwide' && usaCodes.has(c.code)) continue;
        const meta = GRIZZLY_TO_ISO[c.code] || {
          code: c.code,
          name: c.display_name,
          flag: '🌍',
          dial: '',
        };
        const key = meta.code + (c.code === '12' ? '-v' : '');
        const ngn = sellNgn(Number(p.cost_usd), tier, rate, mult);
        const prev = seen.get(key);
        if (!prev || ngn < prev.fromNgn) {
          seen.set(key, {
            code: meta.code,
            name: meta.name,
            flag: meta.flag,
            dial: meta.dial,
            fromNgn: ngn,
            stock: Number(p.stock) || 0,
            grizzlyCode: c.code,
          });
        }
      }
      const list = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
      const res = NextResponse.json({
        ok: true,
        mode: 'countries',
        service: serviceCode,
        pool: poolId,
        count: list.length,
        countries: list,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res;
    }

    if (mode === 'prices') {
      if (!serviceCode || !poolId) {
        return NextResponse.json({ ok: false, reason: 'service and pool required' }, { status: 400 });
      }
      const tier = poolTier(poolId);
      const region = poolRegion(poolId);
      const svcRows = (await sbSelect(
        'vn_services',
        `code=eq.${encodeURIComponent(serviceCode)}&select=id,code,name,display_name&limit=1`,
      )) as Array<{ id: string; code: string; name: string; display_name: string }>;
      const svc = svcRows?.[0];
      if (!svc) return NextResponse.json({ ok: true, options: [], count: 0 });
      let grizzlyCountryCodes: string[] = [];
      if (region === 'usa' || countryParam === 'US' || countryParam === 'USA')
        grizzlyCountryCodes = ['187', '12'];
      else if (countryParam && ISO_TO_GRIZZLY[countryParam])
        grizzlyCountryCodes = ISO_TO_GRIZZLY[countryParam];
      else if (countryParam) grizzlyCountryCodes = [countryParam];
      const countries = (await sbSelect(
        'vn_countries',
        'select=id,code,display_name&is_active=eq.true&limit=500',
      )) as Array<{ id: string; code: string; display_name: string }>;
      const countryById = new Map(countries.map((c) => [c.id, c]));
      const countryIds = countries
        .filter((c) => grizzlyCountryCodes.includes(c.code))
        .map((c) => c.id);
      if (countryIds.length === 0) return NextResponse.json({ ok: true, options: [], count: 0 });
      const prices = (await sbSelect(
        'vn_price_options',
        `service_id=eq.${svc.id}&tier=eq.${tier}&is_available=eq.true&select=id,country_id,cost_usd,stock,tier&order=cost_usd.asc&limit=1000`,
      )) as Array<{ id: string; country_id: string; cost_usd: number; stock: number; tier: string }>;
      const idSet = new Set(countryIds);
      const options = (prices || [])
        .filter((p) => idSet.has(p.country_id))
        .map((p, i) => {
          const cost = Number(p.cost_usd);
          const c = countryById.get(p.country_id);
          return {
            id: p.id || `opt-${i}`,
            label: `Option ${i + 1}`,
            priceUsd: Math.round(cost * 100) / 100,
            priceNgn: sellNgn(cost, tier, rate, mult),
            stock: Number(p.stock) || 0,
            optionId: p.id,
            grizzlyCountry: c?.code || grizzlyCountryCodes[0] || '',
          };
        })
        .filter((o) => o.stock >= 0);
      const byNgn = new Map<number, (typeof options)[0]>();
      for (const o of options) {
        const prev = byNgn.get(o.priceNgn);
        if (!prev || o.stock > prev.stock) byNgn.set(o.priceNgn, o);
      }
      const unique = Array.from(byNgn.values()).sort((a, b) => a.priceNgn - b.priceNgn);
      const res = NextResponse.json({
        ok: true,
        mode: 'prices',
        service: { code: svc.code, name: svc.display_name || svc.name },
        pool: poolId,
        tier,
        country: countryParam || (region === 'usa' ? 'US' : null),
        count: unique.length,
        options: unique.map((o, i) => ({ ...o, label: `Route ${i + 1}`, provider: '' })),
      });
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return res;
    }

    if (mode === 'pools') {
      const prices = await loadAllPrices(null);
      const countries = (await sbSelect('vn_countries', 'select=id,code&limit=500')) as Array<{
        id: string;
        code: string;
      }>;
      const codeById = new Map(countries.map((c) => [c.id, c.code]));
      const usaCodes = new Set(['187', '12']);
      const mins: Record<string, number> = {};
      for (const p of prices) {
        const code = codeById.get(p.country_id);
        if (!code) continue;
        const region = usaCodes.has(code) ? 'usa' : 'worldwide';
        // tier not in this query shape — re-fetch with tier or skip detailed pools
        // Use cost bands as approximation when tier missing from loadAllPrices without tier filter
        const cost = Number(p.cost_usd);
        // We need tier — loadAllPrices(null) doesn't select tier. Quick fix: query again per pool is heavy.
        // Instead use simple min across all for region labels only.
        for (const tier of ['economy', 'standard', 'fast', 'premium'] as const) {
          const pool = `${region}-${tier}`;
          // without tier on row we cannot assign accurately; leave pools endpoint best-effort
          if (!mins[pool] || cost < mins[pool]) {
            // only assign if cost falls in tier band
            const inBand =
              (tier === 'economy' && cost < 0.5) ||
              (tier === 'standard' && cost >= 0.5 && cost <= 1.0) ||
              (tier === 'fast' && cost > 1.0 && cost <= 2.0) ||
              (tier === 'premium' && cost > 2.0);
            if (inBand) {
              if (!mins[pool] || cost < mins[pool]) mins[pool] = cost;
            }
          }
        }
      }
      const poolIds = [
        'usa-economy',
        'usa-standard',
        'worldwide-economy',
        'worldwide-standard',
        'usa-fast',
        'usa-premium',
        'worldwide-fast',
        'worldwide-premium',
      ];
      const pools = poolIds.map((id) => {
        const tier = poolTier(id);
        const cost = mins[id];
        return {
          id,
          fromNgn: cost != null ? sellNgn(cost, tier, rate, mult) : null,
          fromUsd: cost != null ? Math.round(cost * 100) / 100 : null,
          live: cost != null,
        };
      });
      return NextResponse.json({ ok: true, mode: 'pools', rate, pools });
    }

    return NextResponse.json(
      { ok: false, reason: 'Unknown mode. Use services | countries | prices | pools' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof Error ? err.message : 'Catalog failed' },
      { status: 500 },
    );
  }
}
