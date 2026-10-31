/**
 * JustAnotherPanel / Standard SMM Panel API v2 Integration.
 * Full catalog restore — credentials aligned with smm-orders.
 */
export interface RawSmmService {
  service: string | number;
  name: string;
  type?: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean;
  cancel?: boolean;
  desc?: string;
  dripfeed?: boolean;
}

export interface BoostService {
  id: string;
  providerId: number;
  platform: string;
  platformName: string;
  category: string;
  categoryName: string;
  title: string;
  ratePer1000: number;
  wholesaleUsd: number;
  min: number;
  max: number;
  speed: string;
  refill?: string;
  quality?: string;
  instant?: boolean;
  desc?: string;
}

export interface BoostCategory {
  id: string;
  label: string;
  serviceCount: number;
}

export interface BoostPlatform {
  id: string;
  name: string;
  shortName: string;
  brandColor: string;
  placeholder: string;
  linkHint: string;
  urlPatternStr: string;
  categories: BoostCategory[];
  totalServices: number;
}

export interface BoostCatalog {
  ok: boolean;
  source: 'live' | 'cached' | 'fallback' | 'empty';
  rate: number;
  updatedAt: string;
  totalPlatforms: number;
  totalServices: number;
  platforms: BoostPlatform[];
  services: BoostService[];
  error?: string;
  warning?: string;
}

export const SMM_EXCHANGE_RATE = 1380;
export const SMM_MAX_USD_CUTOFF = 10.0;

export function getSmmMultiplier(costUsd: number): number {
  if (costUsd <= 0.5) return 4.0;
  if (costUsd <= 1.0) return 3.0;
  if (costUsd <= 2.0) return 2.0;
  return 1.5;
}

export function calculateSmmPriceNgn(costUsd: number): number {
  return Math.round(costUsd * getSmmMultiplier(costUsd) * SMM_EXCHANGE_RATE * 100) / 100;
}

export function getSmmPartnerMultiplier(costUsd: number): number {
  if (costUsd <= 0.5) return 2.0;
  if (costUsd <= 1.0) return 1.7;
  if (costUsd <= 2.0) return 1.35;
  return 1.15;
}

export function calculateSmmPartnerPriceNgn(costUsd: number): number {
  return Math.round(costUsd * getSmmPartnerMultiplier(costUsd) * SMM_EXCHANGE_RATE * 100) / 100;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function resolvePlatform(categoryName: string, serviceTitle: string) {
  const combined = `${categoryName} ${serviceTitle}`;
  const known: Array<{ id: string; name: string; shortName: string; brandColor: string; placeholder: string; linkHint: string; urlPatternStr: string; matcher: RegExp }> = [
    { id: 'tiktok', name: 'TikTok', shortName: 'TikTok', brandColor: '#0F1419', placeholder: 'https://www.tiktok.com/@username', linkHint: 'Paste your TikTok link', urlPatternStr: '(tiktok\\.com|douyin\\.com)', matcher: /\b(tiktok|douyin)\b/i },
    { id: 'instagram', name: 'Instagram', shortName: 'Instagram', brandColor: '#E1306C', placeholder: 'https://www.instagram.com/', linkHint: 'Paste your Instagram link', urlPatternStr: 'instagram\\.com', matcher: /\b(instagram|\big\b)\b/i },
    { id: 'youtube', name: 'YouTube', shortName: 'YouTube', brandColor: '#FF0000', placeholder: 'https://www.youtube.com/', linkHint: 'Paste your YouTube link', urlPatternStr: '(youtube\\.com|youtu\\.be)', matcher: /\b(youtube|\byt\b)\b/i },
    { id: 'x', name: 'X (Twitter)', shortName: 'X', brandColor: '#0F1419', placeholder: 'https://x.com/', linkHint: 'Paste your X link', urlPatternStr: '(x\\.com|twitter\\.com)', matcher: /\b(twitter|\bx\b)\b/i },
    { id: 'facebook', name: 'Facebook', shortName: 'Facebook', brandColor: '#1877F2', placeholder: 'https://www.facebook.com/', linkHint: 'Paste your Facebook link', urlPatternStr: '(facebook\\.com|fb\\.com)', matcher: /\b(facebook|\bfb\b)\b/i },
    { id: 'spotify', name: 'Spotify', shortName: 'Spotify', brandColor: '#1DB954', placeholder: 'https://open.spotify.com/', linkHint: 'Paste your Spotify link', urlPatternStr: 'spotify\\.com', matcher: /\bspotify\b/i },
    { id: 'apple-music', name: 'Apple Music', shortName: 'Apple Music', brandColor: '#FC3C44', placeholder: 'https://music.apple.com/', linkHint: 'Paste your Apple Music link', urlPatternStr: 'music\\.apple\\.com', matcher: /\b(apple\s*music|itunes)\b/i },
    { id: 'telegram', name: 'Telegram', shortName: 'Telegram', brandColor: '#24A1DE', placeholder: 'https://t.me/', linkHint: 'Paste your Telegram link', urlPatternStr: '(t\\.me|telegram\\.me)', matcher: /\b(telegram|\btg\b)\b/i },
  ];
  for (const p of known) {
    if (p.matcher.test(combined)) {
      return { id: p.id, name: p.name, shortName: p.shortName, brandColor: p.brandColor, placeholder: p.placeholder, linkHint: p.linkHint, urlPatternStr: p.urlPatternStr };
    }
  }
  const cleaned = categoryName.split(/[-—|•:\[\/]/)[0].trim();
  const name = cleaned.length > 1 ? cleaned : 'Other Platforms';
  const id = slugify(name) || 'other';
  return { id, name, shortName: name, brandColor: '#475569', placeholder: 'https://...', linkHint: `Paste your ${name} link`, urlPatternStr: 'https?:\\/\\/' };
}

let catalogCache: BoostCatalog | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function fetchSmmCatalog(options?: { forceRefresh?: boolean }): Promise<BoostCatalog> {
  const now = Date.now();
  if (!options?.forceRefresh && catalogCache && now - cacheTime < CACHE_TTL_MS) {
    return { ...catalogCache, source: 'cached' };
  }

  const apiUrl = (
    process.env.SMM_PANEL_API_URL ||
    process.env.JUSTANOTHER_API_URL ||
    process.env.JUSTANOTHERPANEL_API_URL ||
    process.env.YOYOMEDIA_API_URL ||
    'https://justanotherpanel.com/api/v2'
  ).replace(/\/$/, '');
  const apiKey = (
    process.env.SMM_PANEL_API_KEY ||
    process.env.JUSTANOTHER_API_KEY ||
    process.env.JUSTANOTHERPANEL_API_KEY ||
    process.env.YOYOMEDIA_API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    return {
      ok: false,
      source: 'empty',
      rate: SMM_EXCHANGE_RATE,
      updatedAt: new Date().toISOString(),
      totalPlatforms: 0,
      totalServices: 0,
      platforms: [],
      services: [],
      error: 'SMM_PANEL_API_KEY is not configured on the server',
    };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Verxor/1.0 (SMM Gateway)',
      },
      body: new URLSearchParams({ key: apiKey, action: 'services' }).toString(),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(`SMM provider authentication failed (HTTP ${res.status}). Verify API key.`);
      }
      if (res.status === 429) throw new Error('SMM provider rate limit exceeded. Retry shortly.');
      if (res.status >= 500) throw new Error(`SMM provider unavailable (HTTP ${res.status})`);
      throw new Error(`SMM provider returned HTTP ${res.status}`);
    }

    const rawText = await res.text();
    if (!rawText?.trim()) throw new Error('SMM provider returned an empty response');
    const trimmed = rawText.trim();
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      throw new Error('SMM provider returned HTML instead of JSON');
    }

    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) {
      if (data && typeof data === 'object') {
        if (data.error) throw new Error(String(data.error));
        if (data.message) throw new Error(String(data.message));
      }
      throw new Error('SMM provider response did not contain a services list');
    }

    const services: BoostService[] = [];
    const platformsMap = new Map<string, BoostPlatform>();

    for (const item of data as RawSmmService[]) {
      const wholesaleUsd = parseFloat(String(item.rate ?? '0'));
      if (isNaN(wholesaleUsd) || wholesaleUsd <= 0 || wholesaleUsd > SMM_MAX_USD_CUTOFF) continue;

      const minQty = parseInt(String(item.min ?? '10'), 10) || 10;
      const maxQty = parseInt(String(item.max ?? '1000000'), 10) || 1000000;
      const title = String(item.name || '').trim();
      const rawCategory = String(item.category || 'General').trim();
      const platformMeta = resolvePlatform(rawCategory, title);
      const ratePer1000 = calculateSmmPriceNgn(wholesaleUsd);
      const categoryId = slugify(rawCategory);

      services.push({
        id: String(item.service),
        providerId: Number(item.service),
        platform: platformMeta.id,
        platformName: platformMeta.name,
        category: categoryId,
        categoryName: rawCategory,
        title,
        ratePer1000,
        wholesaleUsd,
        min: minQty,
        max: maxQty,
        speed: '',
        refill: item.refill ? 'Refill Guaranteed' : undefined,
      });

      if (!platformsMap.has(platformMeta.id)) {
        platformsMap.set(platformMeta.id, {
          id: platformMeta.id,
          name: platformMeta.name,
          shortName: platformMeta.shortName,
          brandColor: platformMeta.brandColor,
          placeholder: platformMeta.placeholder,
          linkHint: platformMeta.linkHint,
          urlPatternStr: platformMeta.urlPatternStr,
          categories: [],
          totalServices: 0,
        });
      }
      const plat = platformsMap.get(platformMeta.id)!;
      plat.totalServices += 1;
      if (!plat.categories.find((c) => c.id === categoryId)) {
        plat.categories.push({ id: categoryId, label: rawCategory, serviceCount: 0 });
      }
      const cat = plat.categories.find((c) => c.id === categoryId)!;
      cat.serviceCount += 1;
    }

    const platforms = Array.from(platformsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    const catalog: BoostCatalog = {
      ok: true,
      source: 'live',
      rate: SMM_EXCHANGE_RATE,
      updatedAt: new Date().toISOString(),
      totalPlatforms: platforms.length,
      totalServices: services.length,
      platforms,
      services,
    };
    catalogCache = catalog;
    cacheTime = now;
    return catalog;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Catalog fetch failed';
    if (catalogCache) {
      return { ...catalogCache, source: 'fallback', warning: message };
    }
    return {
      ok: false,
      source: 'empty',
      rate: SMM_EXCHANGE_RATE,
      updatedAt: new Date().toISOString(),
      totalPlatforms: 0,
      totalServices: 0,
      platforms: [],
      services: [],
      error: message,
    };
  }
}
