/**
 * JustAnotherPanel / Standard SMM Panel API v2 Integration.
 *
 * Pulls live platforms, categories, and services from the configured SMM panel.
 * Enforces:
 * - Exclusion of any service with wholesale rate > $10 / 1,000 USD.
 * - Retail pricing formula:
 *     <= $0.50 USD  -> 4.0x multiplier
 *     $0.51 - $2.00 -> 2.5x multiplier
 *     > $2.00 USD   -> 1.8x multiplier
 *     USD -> NGN fixed exchange rate: 1,380
 * - Alphabetical sorting of all discovered platforms.
 * - Correct scoping of categories and services per platform.
 * - Full service descriptions preserved without truncation.
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

/**
 * Multiplier tiers agreed for Verxor Boost:
 * <= $0.50      -> 4.0x
 * $0.51 - $2.00 -> 2.5x
 * > $2.00       -> 1.8x
 */
export function getSmmMultiplier(costUsd: number): number {
  if (costUsd <= 0.50) return 4.0;
  if (costUsd <= 2.00) return 2.5;
  return 1.8;
}

export function calculateSmmPriceNgn(costUsd: number): number {
  const mult = getSmmMultiplier(costUsd);
  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;
}

interface PlatformDefinition {
  id: string;
  name: string;
  shortName: string;
  brandColor: string;
  placeholder: string;
  linkHint: string;
  urlPatternStr: string;
  matcher: RegExp;
}

const KNOWN_PLATFORMS: PlatformDefinition[] = [
  {
    id: 'apple-music',
    name: 'Apple Music',
    shortName: 'Apple Music',
    brandColor: '#FC3C44',
    placeholder: 'https://music.apple.com/...',
    linkHint: 'Paste your Apple Music song, album, or artist link',
    urlPatternStr: '(music\\.apple\\.com|apple\\.com)',
    matcher: /\b(apple\s*music|itunes)\b/i,
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    shortName: 'Audiomack',
    brandColor: '#FFA200',
    placeholder: 'https://audiomack.com/song/...',
    linkHint: 'Paste your Audiomack song, album, or profile link',
    urlPatternStr: 'audiomack\\.com',
    matcher: /\baudiomack\b/i,
  },
  {
    id: 'clubhouse',
    name: 'Clubhouse',
    shortName: 'Clubhouse',
    brandColor: '#F2CA65',
    placeholder: 'https://www.clubhouse.com/@username',
    linkHint: 'Paste your Clubhouse profile or room link',
    urlPatternStr: 'clubhouse\\.com',
    matcher: /\bclubhouse\b/i,
  },
  {
    id: 'discord',
    name: 'Discord',
    shortName: 'Discord',
    brandColor: '#5865F2',
    placeholder: 'https://discord.gg/...',
    linkHint: 'Paste your Discord invite link',
    urlPatternStr: '(discord\\.gg|discord\\.com)',
    matcher: /\bdiscord\b/i,
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    shortName: 'Dribbble',
    brandColor: '#EA4C89',
    placeholder: 'https://dribbble.com/...',
    linkHint: 'Paste your Dribbble profile or shot link',
    urlPatternStr: 'dribbble\\.com',
    matcher: /\bdribbble\b/i,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    brandColor: '#1877F2',
    placeholder: 'https://www.facebook.com/page-or-post',
    linkHint: 'Paste your Facebook page, profile, or post link',
    urlPatternStr: '(facebook\\.com|fb\\.watch|fb\\.com)',
    matcher: /\b(facebook|\bfb\b)\b/i,
  },
  {
    id: 'google',
    name: 'Google',
    shortName: 'Google',
    brandColor: '#4285F4',
    placeholder: 'https://maps.google.com/...',
    linkHint: 'Paste your Google Maps, Business, or Play link',
    urlPatternStr: 'google\\.com',
    matcher: /\bgoogle(\s*reviews|\s*maps|\s*play)?\b/i,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'Instagram',
    brandColor: '#E1306C',
    placeholder: 'https://www.instagram.com/p/yourpost/',
    linkHint: 'Paste your Instagram post, reel, or profile link',
    urlPatternStr: 'instagram\\.com',
    matcher: /\b(instagram|\big\b)\b/i,
  },
  {
    id: 'kick',
    name: 'Kick',
    shortName: 'Kick',
    brandColor: '#53FC18',
    placeholder: 'https://kick.com/channel',
    linkHint: 'Paste your Kick stream or channel link',
    urlPatternStr: 'kick\\.com',
    matcher: /\bkick(\.com|\s+stream)?\b/i,
  },
  {
    id: 'kwai',
    name: 'Kwai',
    shortName: 'Kwai',
    brandColor: '#FF4D2E',
    placeholder: 'https://kwai.com/...',
    linkHint: 'Paste your Kwai profile or video link',
    urlPatternStr: 'kwai\\.com',
    matcher: /\bkwai\b/i,
  },
  {
    id: 'likee',
    name: 'Likee',
    shortName: 'Likee',
    brandColor: '#282828',
    placeholder: 'https://likee.video/@username',
    linkHint: 'Paste your Likee profile link',
    urlPatternStr: 'likee\\.video',
    matcher: /\blikee\b/i,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    brandColor: '#0A66C2',
    placeholder: 'https://www.linkedin.com/in/username',
    linkHint: 'Paste your LinkedIn profile, post, or company page link',
    urlPatternStr: 'linkedin\\.com',
    matcher: /\blinkedin\b/i,
  },
  {
    id: 'medium',
    name: 'Medium',
    shortName: 'Medium',
    brandColor: '#12100E',
    placeholder: 'https://medium.com/@username',
    linkHint: 'Paste your Medium story or profile link',
    urlPatternStr: 'medium\\.com',
    matcher: /\bmedium\b/i,
  },
  {
    id: 'napster',
    name: 'Napster',
    shortName: 'Napster',
    brandColor: '#0070F3',
    placeholder: 'https://app.napster.com/artist/...',
    linkHint: 'Paste your Napster track or artist link',
    urlPatternStr: 'napster\\.com',
    matcher: /\bnapster\b/i,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    shortName: 'Pinterest',
    brandColor: '#E60023',
    placeholder: 'https://www.pinterest.com/username',
    linkHint: 'Paste your Pinterest pin or profile link',
    urlPatternStr: 'pinterest\\.com',
    matcher: /\bpinterest\b/i,
  },
  {
    id: 'quora',
    name: 'Quora',
    shortName: 'Quora',
    brandColor: '#B92B27',
    placeholder: 'https://www.quora.com/...',
    linkHint: 'Paste your Quora profile or question link',
    urlPatternStr: 'quora\\.com',
    matcher: /\bquora\b/i,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    shortName: 'Reddit',
    brandColor: '#FF4500',
    placeholder: 'https://www.reddit.com/r/...',
    linkHint: 'Paste your Reddit post or profile link',
    urlPatternStr: 'reddit\\.com',
    matcher: /\breddit\b/i,
  },
  {
    id: 'rumble',
    name: 'Rumble',
    shortName: 'Rumble',
    brandColor: '#85C742',
    placeholder: 'https://rumble.com/v...',
    linkHint: 'Paste your Rumble video or channel link',
    urlPatternStr: 'rumble\\.com',
    matcher: /\brumble\b/i,
  },
  {
    id: 'shazam',
    name: 'Shazam',
    shortName: 'Shazam',
    brandColor: '#0088FF',
    placeholder: 'https://www.shazam.com/track/...',
    linkHint: 'Paste your Shazam track link',
    urlPatternStr: 'shazam\\.com',
    matcher: /\bshazam\b/i,
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    shortName: 'Snapchat',
    brandColor: '#FFFC00',
    placeholder: 'https://www.snapchat.com/add/username',
    linkHint: 'Paste your Snapchat story or profile link',
    urlPatternStr: 'snapchat\\.com',
    matcher: /\b(snapchat|\bsnap\b)\b/i,
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    shortName: 'SoundCloud',
    brandColor: '#FF5500',
    placeholder: 'https://soundcloud.com/artist/track',
    linkHint: 'Paste your SoundCloud song or profile link',
    urlPatternStr: 'soundcloud\\.com',
    matcher: /\bsoundcloud\b/i,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    brandColor: '#1DB954',
    placeholder: 'https://open.spotify.com/track/...',
    linkHint: 'Paste your Spotify track, album, or artist link',
    urlPatternStr: 'spotify\\.com',
    matcher: /\bspotify\b/i,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    shortName: 'Telegram',
    brandColor: '#24A1DE',
    placeholder: 'https://t.me/channel',
    linkHint: 'Paste your Telegram channel or group link',
    urlPatternStr: '(t\\.me|telegram\\.me)',
    matcher: /\b(telegram|\btg\b)\b/i,
  },
  {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    brandColor: '#000000',
    placeholder: 'https://www.threads.net/@username',
    linkHint: 'Paste your Threads profile or post link',
    urlPatternStr: 'threads\\.net',
    matcher: /\bthreads\b/i,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    brandColor: '#0F1419',
    placeholder: 'https://www.tiktok.com/@username',
    linkHint: 'Paste your TikTok profile link or video URL',
    urlPatternStr: '(tiktok\\.com|douyin\\.com)',
    matcher: /\b(tiktok|douyin)\b/i,
  },
  {
    id: 'tidal',
    name: 'Tidal',
    shortName: 'Tidal',
    brandColor: '#000000',
    placeholder: 'https://tidal.com/browse/track/...',
    linkHint: 'Paste your Tidal track link',
    urlPatternStr: 'tidal\\.com',
    matcher: /\btidal\b/i,
  },
  {
    id: 'tumblr',
    name: 'Tumblr',
    shortName: 'Tumblr',
    brandColor: '#36465D',
    placeholder: 'https://username.tumblr.com/...',
    linkHint: 'Paste your Tumblr blog link',
    urlPatternStr: 'tumblr\\.com',
    matcher: /\btumblr\b/i,
  },
  {
    id: 'twitch',
    name: 'Twitch',
    shortName: 'Twitch',
    brandColor: '#9146FF',
    placeholder: 'https://www.twitch.tv/channel',
    linkHint: 'Paste your Twitch channel or clip link',
    urlPatternStr: 'twitch\\.tv',
    matcher: /\btwitch\b/i,
  },
  {
    id: 'website-traffic',
    name: 'Website Traffic',
    shortName: 'Web Traffic',
    brandColor: '#0284C7',
    placeholder: 'https://yourwebsite.com',
    linkHint: 'Paste your destination website or webpage URL',
    urlPatternStr: 'https?:\\/\\/',
    matcher: /\b(website\s*traffic|web\s*traffic|seo\s*traffic|traffic)\b/i,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    shortName: 'WhatsApp',
    brandColor: '#25D366',
    placeholder: 'https://chat.whatsapp.com/...',
    linkHint: 'Paste your WhatsApp channel or group invite link',
    urlPatternStr: '(whatsapp\\.com|wa\\.me)',
    matcher: /\bwhatsapp\b/i,
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    brandColor: '#0F1419',
    placeholder: 'https://x.com/username',
    linkHint: 'Paste your X profile or post link',
    urlPatternStr: '(x\\.com|twitter\\.com)',
    matcher: /\b(twitter|\bx\b|x\s*\(twitter\)|twitter\s*\(x\))\b/i,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    brandColor: '#FF0000',
    placeholder: 'https://www.youtube.com/watch?v=...',
    linkHint: 'Paste your YouTube video or channel link',
    urlPatternStr: '(youtube\\.com|youtu\\.be)',
    matcher: /\b(youtube|\byt\b)\b/i,
  },
];

export function resolvePlatform(categoryName: string, serviceTitle: string): {
  id: string;
  name: string;
  shortName: string;
  brandColor: string;
  placeholder: string;
  linkHint: string;
  urlPatternStr: string;
} {
  const combined = `${categoryName} ${serviceTitle}`;

  // Match known platform
  for (const p of KNOWN_PLATFORMS) {
    if (p.matcher.test(combined)) {
      return {
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        brandColor: p.brandColor,
        placeholder: p.placeholder,
        linkHint: p.linkHint,
        urlPatternStr: p.urlPatternStr,
      };
    }
  }

  // Dynamic fallback: extract leading word or phrase before separator
  const cleaned = categoryName.split(/[-—|•:\[➜(\/]/)[0].trim();
  const name = cleaned.length > 1 ? cleaned : 'Other Platforms';
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';

  return {
    id,
    name,
    shortName: name,
    brandColor: '#475569',
    placeholder: 'https://...',
    linkHint: `Paste your ${name} link`,
    urlPatternStr: 'https?:\\/\\/',
  };
}

function parseSpeed(title: string): string {
  const match = title.match(/Speed\s*:\s*([^|\]]+)/i);
  if (match) return match[1].trim();
  const perDay = title.match(/(\d+[kKmMbB]?\+?\s*\/\s*(?:Day|Hour))/i);
  if (perDay) return perDay[1].trim();
  return '';
}

function parseRefill(title: string, rawRefill?: boolean): string | undefined {
  const match = title.match(/Refill\s*:\s*([^|\]]+)/i);
  if (match) return match[1].trim();
  if (rawRefill) return 'Refill Guaranteed';
  return undefined;
}

function parseQuality(title: string): string | undefined {
  const match = title.match(/Quality\s*:\s*([^|\]]+)/i);
  if (match) return match[1].trim();
  if (/HQ|High Quality/i.test(title)) return 'High Quality';
  if (/Real|Active/i.test(title)) return 'Real Profiles';
  return undefined;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * In-memory cache for live SMM catalog.
 * Defaults to 1-hour TTL, refreshable on demand.
 */
let catalogCache: BoostCatalog | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchSmmCatalog(options?: { forceRefresh?: boolean }): Promise<BoostCatalog> {
  const now = Date.now();
  if (!options?.forceRefresh && catalogCache && now - cacheTime < CACHE_TTL_MS) {
    return { ...catalogCache, source: 'cached' };
  }

  const apiUrl =
    process.env.SMM_PANEL_API_URL ||
    process.env.YOYOMEDIA_API_URL ||
    'https://justanotherpanel.com/api/v2';
  const apiKey = process.env.SMM_PANEL_API_KEY || process.env.YOYOMEDIA_API_KEY;

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
    let res: Response;
    try {
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Verxor/1.0 (SMM Gateway)',
        },
        body: new URLSearchParams({
          key: apiKey,
          action: 'services',
        }).toString(),
        signal: AbortSignal.timeout(15000),
      });
    } catch (fetchErr: any) {
      if (fetchErr?.name === 'TimeoutError' || fetchErr?.name === 'AbortError') {
        throw new Error('SMM provider request timed out (15s). Provider may be slow or unresponsive.');
      }
      throw new Error(`SMM provider connection error: ${fetchErr?.message || 'Network unreachable'}`);
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(`SMM provider authentication failed (HTTP ${res.status}). Verify SMM_PANEL_API_KEY.`);
      }
      if (res.status === 429) {
        throw new Error('SMM provider rate limit exceeded. Please retry in a few moments.');
      }
      if (res.status >= 500) {
        throw new Error(`SMM provider service unavailable (HTTP ${res.status}). Provider may be down or under maintenance.`);
      }
      throw new Error(`SMM provider returned HTTP ${res.status}`);
    }

    const rawText = await res.text();
    if (!rawText || !rawText.trim()) {
      throw new Error('SMM provider returned an empty response');
    }

    const trimmed = rawText.trim();
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      throw new Error('SMM provider returned an HTML error page instead of JSON catalog (Cloudflare or maintenance).');
    }

    let data: any;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error(`SMM provider returned malformed JSON: ${trimmed.slice(0, 120)}`);
    }

    if (!Array.isArray(data)) {
      if (data && typeof data === 'object') {
        if (data.error) throw new Error(String(data.error));
        if (data.message) throw new Error(String(data.message));
      }
      throw new Error('SMM provider response did not contain a services list');
    }

    const rawList: RawSmmService[] = data;
    const services: BoostService[] = [];
    const platformsMap = new Map<string, BoostPlatform>();

    for (const item of rawList) {
      const wholesaleUsd = parseFloat(String(item.rate ?? '0'));
      // Filter rule: any service with wholesale rate > $10 must be excluded
      if (isNaN(wholesaleUsd) || wholesaleUsd <= 0 || wholesaleUsd > SMM_MAX_USD_CUTOFF) {
        continue;
      }

      const minQty = parseInt(String(item.min ?? '10'), 10) || 10;
      const maxQty = parseInt(String(item.max ?? '1000000'), 10) || 1000000;
      const title = String(item.name || '').trim();
      const rawCategory = String(item.category || 'General').trim();

      const platformMeta = resolvePlatform(rawCategory, title);
      const ratePer1000 = calculateSmmPriceNgn(wholesaleUsd);
      const categoryId = slugify(rawCategory);

      const serviceObj: BoostService = {
        id: String(item.service),
        providerId: Number(item.service),
        platform: platformMeta.id,
        platformName: platformMeta.name,
        category: categoryId,
        categoryName: rawCategory,
        title, // Preserved in full!
        ratePer1000,
        wholesaleUsd,
        min: minQty,
        max: maxQty,
        speed: parseSpeed(title),
        refill: parseRefill(title, item.refill),
        quality: parseQuality(title),
        instant: /instant|⚡/i.test(title),
        desc: item.desc ? String(item.desc) : undefined,
      };

      services.push(serviceObj);

      // Aggregate into platforms
      let platform = platformsMap.get(platformMeta.id);
      if (!platform) {
        platform = {
          id: platformMeta.id,
          name: platformMeta.name,
          shortName: platformMeta.shortName,
          brandColor: platformMeta.brandColor,
          placeholder: platformMeta.placeholder,
          linkHint: platformMeta.linkHint,
          urlPatternStr: platformMeta.urlPatternStr,
          categories: [],
          totalServices: 0,
        };
        platformsMap.set(platformMeta.id, platform);
      }

      platform.totalServices += 1;

      let cat = platform.categories.find((c) => c.id === categoryId);
      if (!cat) {
        cat = { id: categoryId, label: rawCategory, serviceCount: 0 };
        platform.categories.push(cat);
      }
      cat.serviceCount += 1;
    }

    // Sort platforms strictly ALPHABETICALLY by name
    const platforms = Array.from(platformsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    // Sort categories within each platform
    for (const p of platforms) {
      p.categories.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }

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
  } catch (err: any) {
    const errorMsg = err?.message || 'Failed to pull live catalog from SMM provider';
    console.error('[fetchSmmCatalog Error]', errorMsg);

    // Stale-while-revalidate fallback: serve previously cached catalog if available
    if (catalogCache && catalogCache.services.length > 0) {
      return {
        ...catalogCache,
        source: 'cached',
        warning: `Serving cached catalog due to provider issue: ${errorMsg}`,
      };
    }

    return {
      ok: false,
      source: 'fallback',
      rate: SMM_EXCHANGE_RATE,
      updatedAt: new Date().toISOString(),
      totalPlatforms: 0,
      totalServices: 0,
      platforms: [],
      services: [],
      error: errorMsg,
    };
  }
}
