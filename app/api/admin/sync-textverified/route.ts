import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, sbUpsertBatch, supabaseConfigured } from '@/lib/supabase-admin';
import { textverifiedConfigured, tvVerificationServices, tvVerificationPriceUsd } from '@/lib/providers/textverified';

export const maxDuration = 300;

/**
 * Admin sync: Textverified one-time OTP verifications → USA Virtual Number pools.
 *
 * Pulls the verification service list (US mobile), prices each service, and
 * upserts into vn_price_options with provider_code='textverified' so they
 * compete with GrizzlySMS options on price inside the same tier pools
 * (usa-economy / usa-standard / usa-fast / usa-premium by provider cost band).
 *
 * Auth: ADMIN_PASSWORD (query `password` or JSON body), same as sync-grizzly.
 * Modes:
 *   full    — price every Textverified verification service (slow, ~1 req/service)
 *   popular — price only services mapped to known/popular Verxor services
 */

const BATCH = 150;
const PRICE_CONCURRENCY = 4;

/** Textverified service name → existing Verxor (GrizzlySMS) service code.
 * Mapped services merge into the existing service rows; unmapped Textverified
 * services get their own row (code = the provider slug). */
const TV_TO_VX_CODE: Record<string, string> = {
  whatsapp: 'wa',
  facebook: 'fb',
  instagram: 'ig',
  tiktok: 'lf',
  google: 'go',
  telegram: 'tg',
  twitter: 'tw',
  discord: 'ds',
  snapchat: 'sn',
  paypal: 'pm',
  amazon: 'am',
  microsoft: 'me',
  microsoftteams: 'me',
  uber: 'ub',
  wechat: 'wb',
  vk: 'vk',
  odnoklassniki: 'ok',
};

const POPULAR_TV = new Set([
  'whatsapp', 'facebook', 'instagram', 'tiktok', 'google', 'telegram',
  'twitter', 'discord', 'snapchat', 'paypal', 'cashapp', 'cashappbusiness',
  'coinbase', 'openai', 'chatgpt', 'googlevoice', 'amazon', 'microsoft',
  'netflix', 'apple', 'appstore', 'uber', 'bing', 'cisco', 'linkedin',
  'paytone', 'tinder', 'bumble', 'doordash', 'stripe', 'wise',
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
  if (cost < 0.50) return 'economy';
  if (cost < 1.00) return 'standard';
  if (cost < 2.00) return 'fast';
  return 'premium';
}

function prettyName(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function upsertInBatches(table: string, rows: Record<string, unknown>[], onConflict: string) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await sbUpsertBatch(table, rows.slice(i, i + BATCH), onConflict);
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
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
    return NextResponse.json({ ok: false, reason: 'Supabase not configured' }, { status: 503 });
  }
  if (!textverifiedConfigured()) {
    return NextResponse.json({ ok: false, reason: 'Textverified env (TEXTVERIFIED_API_KEY + username) missing' }, { status: 503 });
  }

  const mode = (req.nextUrl.searchParams.get('mode') || 'popular').toLowerCase();

  const { services, error: svcError } = await tvVerificationServices();
  if (svcError || !services.length) {
    return NextResponse.json({ ok: false, reason: svcError || 'no verification services' }, { status: 502 });
  }

  // 1. Resolve the USA country row in vn_countries (187=US, 12=US virtual).
  const countryRows = (await sbSelect(
    'vn_countries',
    'select=id,code&code=in.("187","12")&is_active=eq.true&limit=10',
  )) as Array<{ id: string; code: string }>;
  const usa = countryRows.find((c) => c.code === '187') || countryRows[0];
  if (!usa) {
    return NextResponse.json({ ok: false, reason: 'No USA country row in vn_countries — run sync-grizzly first' }, { status: 409 });
  }

  // 2. Pick services to price.
  const wanted = services
    .map((s) => s.serviceName)
    .filter((n) => (mode === 'full' ? true : POPULAR_TV.has(n.toLowerCase())));

  if (!wanted.length) {
    return NextResponse.json({
      ok: false,
      reason: `mode=${mode} matched 0 of ${services.length} Textverified services. Try mode=full.`,
    }, { status: 400 });
  }

  // 3. Ensure vn_services rows exist for everything we will price.
  const now = new Date().toISOString();
  const serviceRows: Record<string, unknown>[] = [];
  const seenCodes = new Set<string>();
  for (const name of wanted) {
    const code = TV_TO_VX_CODE[name.toLowerCase()] || name.toLowerCase();
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    serviceRows.push({
      code,
      name: prettyName(code),
      display_name: prettyName(code),
      is_popular: POPULAR_TV.has(name.toLowerCase()),
      is_active: true,
      updated_at: now,
    });
  }
  await upsertInBatches('vn_services', serviceRows, 'code');

  // 4. Load service ids by code.
  const codeList = [...seenCodes];
  const svcByCode = new Map<string, string>();
  for (let i = 0; i < codeList.length; i += 200) {
    const chunk = codeList.slice(i, i + 200);
    const rows = (await sbSelect(
      'vn_services',
      `select=id,code&code=in.(${chunk.map((c) => `"${c}"`).join(',')})&limit=500`,
    )) as Array<{ id: string; code: string }>;
    for (const r of rows || []) svcByCode.set(String(r.code), String(r.id));
  }

  // 5. Price each service (concurrency-limited).
  const stats = { services: services.length, matched: wanted.length, priced: 0, failed: 0, tiers: { economy: 0, standard: 0, fast: 0, premium: 0 }, errors: [] as string[] };
  const priceRows: Record<string, unknown>[] = [];
  const pricedNames = new Set<string>();

  await mapPool(wanted, PRICE_CONCURRENCY, async (name) => {
    const price = await tvVerificationPriceUsd(name);
    if (!price.ok || !price.priceUsd) {
      stats.failed += 1;
      if (stats.errors.length < 10) stats.errors.push(String(price.error || name));
      return null;
    }
    const code = TV_TO_VX_CODE[name.toLowerCase()] || name.toLowerCase();
    const serviceId = svcByCode.get(code);
    if (!serviceId) return null;
    const tier = tierFromCost(price.priceUsd);
    stats.priced += 1;
    stats.tiers[tier] += 1;
    pricedNames.add(name.toLowerCase());
    priceRows.push({
      service_id: serviceId,
      country_id: usa.id,
      provider_code: 'textverified',
      provider_service: name.toLowerCase(),
      cost_usd: price.priceUsd,
      // Textverified exposes stock only at purchase time; 1 = purchasable,
      // failed buys are caught at checkout and refunded as today.
      stock: 1,
      tier,
      is_available: true,
      last_synced_at: now,
      updated_at: now,
    });
    return null;
  });

  if (priceRows.length) {
    await upsertInBatches(
      'vn_price_options',
      priceRows,
      'service_id,country_id,provider_code,cost_usd',
    );
  }

  return NextResponse.json({
    ok: true,
    mode,
    country: { id: usa.id, code: usa.code },
    ...stats,
    note: 'Textverified options now sit in the USA pools next to GrizzlySMS; the cheapest option per service wins, tier from provider cost band.',
  });
}
