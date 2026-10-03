import { NextRequest, NextResponse } from 'next/server';
import { customerPriceNgn, customerPriceUsd } from '@/lib/pricing';
import { configuredProviders, scrapeOffers } from '@/lib/providers';

const POOLS = [
  { id: 'usa-economy', title: 'USA · Economy', region: 'usa', tier: 'economy', server: 1, badge: 'ECO' },
  { id: 'usa-standard', title: 'USA · Standard', region: 'usa', tier: 'standard', server: 1, badge: 'STD' },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', region: 'worldwide', tier: 'economy', server: 1, badge: 'ECO' },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', region: 'worldwide', tier: 'standard', server: 1, badge: 'STD' },
  { id: 'usa-fast', title: 'USA · Fast', region: 'usa', tier: 'fast', server: 2, badge: 'FAST' },
  { id: 'usa-premium', title: 'USA · Premium', region: 'usa', tier: 'premium', server: 2, badge: 'PREMIUM' },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', region: 'worldwide', tier: 'fast', server: 2, badge: 'FAST' },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', region: 'worldwide', tier: 'premium', server: 2, badge: 'PREMIUM' },
] as const;

/**
 * Live catalog: scrapes provider prices for country+product and bands into the 8 pools.
 * Query: ?product=whatsapp&country=usa
 * Provider names never leave this server response (only pools + from-price).
 */
export async function GET(req: NextRequest) {
  const product = (req.nextUrl.searchParams.get('product') || 'whatsapp').toLowerCase();
  const country = (req.nextUrl.searchParams.get('country') || 'usa').toLowerCase();

  const providers = configuredProviders();
  let offers: Awaited<ReturnType<typeof scrapeOffers>> = [];
  let scrapeError: string | null = null;

  try {
    offers = await scrapeOffers({ country, product });
  } catch (e) {
    scrapeError = e instanceof Error ? e.message : 'scrape failed';
  }

  const pools = POOLS.map((p) => {
    const inPool = offers.filter((o) => o.poolId === p.id);
    const cheapest = inPool[0];
    const fromUsd = cheapest ? cheapest.sellUsd : null;
    const fromNgn = cheapest ? cheapest.sellNgn : null;
    // Fallback display anchors if no live stock (UI still shows cards)
    const fallbackNgn: Record<string, number> = {
      'usa-economy': 150,
      'usa-standard': 380,
      'worldwide-economy': 280,
      'worldwide-standard': 450,
      'usa-fast': 620,
      'usa-premium': 990,
      'worldwide-fast': 750,
      'worldwide-premium': 1100,
    };
    return {
      id: p.id,
      title: p.title,
      region: p.region,
      tier: p.tier,
      server: p.server,
      badge: p.badge,
      stockCount: inPool.length,
      fromUsd,
      fromNgn: fromNgn ?? fallbackNgn[p.id] ?? null,
      live: Boolean(cheapest),
    };
  });

  return NextResponse.json({
    ok: true,
    product,
    country,
    providersOnline: providers.length,
    // never expose provider ids to retail UI — only count
    lanes: [
      {
        server: 1,
        label: 'Server 1 — Volume Routes',
        pools: pools.filter((x) => x.server === 1),
      },
      {
        server: 2,
        label: 'Server 2 — High Speed & Non-VoIP Routes',
        pools: pools.filter((x) => x.server === 2),
      },
    ],
    markupNote: 'Customer price = provider cost + markup; tiers are cost-banded only.',
    scrapeError,
    // sample for debugging (no provider names)
    sampleBanded: offers.slice(0, 5).map((o) => ({
      poolId: o.poolId,
      sellUsd: o.sellUsd,
      sellNgn: o.sellNgn,
    })),
  });
}
