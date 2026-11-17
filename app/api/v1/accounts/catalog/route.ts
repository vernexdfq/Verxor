import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPlatformCatalog,
  fetchAccsZoneCategories,
  normalizePlatform,
} from '@/lib/providers/accszone';
import { resolvePanelClient } from '@/lib/panel-auth';
import {
  loadAccountsMarkups,
  loadAccountsUsdRate,
  wholesaleCostUnitNgn,
} from '@/lib/accounts-pricing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ENABLED_PLATFORMS = new Set([
  'facebook',
  'instagram',
  'tiktok',
  'x / twitter',
  'x',
  'twitter',
  'telegram',
  'gmail',
  'youtube',
  'threads',
  'whatsapp',
  'mobile proxies',
  'google voice',
  'odnoklassniki',
  'linkedin',
  'reddit',
  'indeed',
  'truth social',
  'ai accounts',
  'google ads',
  'bluesky',
  'snapchat',
  'discord',
  'twitch',
  'trustpilot',
  'quora',
  'dating apps',
  'grindr',
  'eharmony',
  'badoo',
  'gaming',
  'premium subscriptions',
  'mastercard',
  'apple',
  'e-commerce',
  'spotify',
  'vpn',
  'netflix',
  'pinterest',
  'yahoo',
  'capcut',
  'phone & messaging',
  'roblox',
  'github',
  'outlook',
]);

/**
 * GET /api/v1/accounts/catalog
 * Query:
 *   platform=Facebook | Instagram | TikTok | X / Twitter | Telegram | Gmail | YouTube | Threads | WhatsApp | Mobile Proxies | Google Voice | Odnoklassniki | LinkedIn | Reddit | Indeed | Truth Social | AI Accounts | Google Ads | Bluesky | Snapchat | Discord | Twitch | Trustpilot | Quora | Dating Apps | Grindr | eHarmony | Badoo | Gaming | Premium Subscriptions | Mastercard | Apple | E-Commerce | Spotify | VPN | Netflix | Pinterest | Yahoo | CapCut | Phone & Messaging | Roblox | GitHub | Outlook | categories
 *   refresh=1 force upstream re-fetch
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPlatform = (searchParams.get('platform') || 'Facebook').trim();
    const forceRefresh =
      searchParams.get('refresh') === '1' || searchParams.get('refresh') === 'true';

    if (rawPlatform.toLowerCase() === 'categories') {
      const categories = await fetchAccsZoneCategories().catch(() => []);
      return NextResponse.json(
        {
          ok: true,
          categories,
        },
        {
          headers: { 'Cache-Control': 'public, s-maxage=3600' },
        },
      );
    }

    const normLower = rawPlatform.toLowerCase();
    if (!ENABLED_PLATFORMS.has(normLower)) {
      return NextResponse.json(
        {
          ok: false,
          source: 'empty',
          platform: rawPlatform,
          rate: Number(process.env.USD_NGN_RATE || 1380),
          updatedAt: new Date().toISOString(),
          subtypes: [],
          offers: [],
          total: 0,
          inStock: 0,
          error: `Live catalogue for ${rawPlatform} is coming soon. Facebook, Instagram, TikTok, X / Twitter, Telegram, Gmail, YouTube, Threads, WhatsApp, Mobile Proxies, Google Voice, Odnoklassniki, LinkedIn, Reddit, Indeed, Truth Social, AI Accounts, Google Ads, Bluesky, Snapchat, Discord, Twitch, Trustpilot, Quora, Dating Apps, Grindr, eHarmony, Badoo, Gaming, Premium Subscriptions, Mastercard, Apple, E-Commerce, Spotify, VPN, Netflix, Pinterest, Yahoo, CapCut, Phone & Messaging, Roblox, GitHub, and Outlook are live.`,
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const platform = normalizePlatform(rawPlatform);
    const catalog = await fetchPlatformCatalog(platform, { forceRefresh });

    if (!catalog.ok) {
      const isMissingConfig = catalog.error?.toLowerCase().includes('not configured');
      return NextResponse.json(catalog, {
        status: isMissingConfig ? 503 : 502,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    // Child-panel / API keys see wholesale prices computed from the provider
    // cost. Retail buyers see the live retail prices. costUsd (raw provider
    // cost) is never exposed to any client.
    const panel = await resolvePanelClient(req).catch(() => null);
    if (panel) {
      const [rate, markups] = await Promise.all([loadAccountsUsdRate(), loadAccountsMarkups()]);
      const offers = catalog.offers.map((o) => ({
        ...o,
        costUsd: undefined,
        priceNgn: wholesaleCostUnitNgn(o.costUsd, rate, markups) || o.priceNgn,
      }));
      return NextResponse.json(
        { ...catalog, offers, audience: 'child' as const },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const offers = catalog.offers.map((o) => ({ ...o, costUsd: undefined }));
    return NextResponse.json(
      { ...catalog, offers, audience: 'retail' as const },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error while fetching accounts catalog';
    return NextResponse.json(
      {
        ok: false,
        source: 'error',
        platform: 'All',
        rate: Number(process.env.USD_NGN_RATE || 1380),
        updatedAt: new Date().toISOString(),
        subtypes: [],
        offers: [],
        total: 0,
        inStock: 0,
        error: message,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
