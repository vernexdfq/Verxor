import * as fivesim from './fivesim';
import * as grizzly from './grizzly';
import * as pvapins from './pvapins';
import * as smsbower from './smsbower';
import {
  bandOffer,
  customerPriceNgn,
  customerPriceUsd,
  maxCostForTier,
  minCostForTier,
  resolveRegion,
  type PriceTier,
  type Region,
} from '../pricing';

export type ProviderId = 'fivesim' | 'grizzly' | 'smsbower' | 'pvapins';

export type NormalizedOffer = {
  provider: ProviderId;
  country: string;
  product: string;
  operator?: string;
  costUsd: number;
  count?: number | null;
  region: Region;
  tier: PriceTier;
  server: 1 | 2;
  poolId: string;
  sellUsd: number;
  sellNgn: number;
};

/** Map UI/app product names → provider service codes (extend as needed). */
export function mapProductCode(product: string, provider: ProviderId): string {
  const p = product.toLowerCase().trim();
  const common: Record<string, string> = {
    whatsapp: 'wa',
    telegram: 'tg',
    instagram: 'ig',
    facebook: 'fb',
    google: 'go',
    gmail: 'go',
    tiktok: 'lf',
    twitter: 'tw',
    x: 'tw',
    discord: 'ds',
    microsoft: 'mm',
    amazon: 'am',
    apple: 'wx',
    paypal: 'ts',
  };
  if (provider === 'fivesim') {
    // 5sim uses full names mostly
    const five: Record<string, string> = {
      whatsapp: 'whatsapp',
      telegram: 'telegram',
      instagram: 'instagram',
      facebook: 'facebook',
      google: 'google',
      gmail: 'google',
      tiktok: 'tiktok',
      twitter: 'twitter',
      discord: 'discord',
      microsoft: 'microsoft',
      amazon: 'amazon',
      apple: 'apple',
      paypal: 'paypal',
    };
    return five[p] || p;
  }
  if (provider === 'pvapins') return common[p] || p;
  // grizzly / smsbower use short codes
  return common[p] || p;
}

export function mapCountryCode(country: string, provider: ProviderId): string {
  const c = country.toLowerCase().trim();
  if (provider === 'fivesim') {
    if (c === 'us' || c === 'usa' || c === 'united states') return 'usa';
    return c;
  }
  if (provider === 'pvapins') {
    if (c === 'usa' || c === 'united states') return 'US';
    if (c.length === 2) return c.toUpperCase();
    return c.toUpperCase();
  }
  // grizzly/smsbower often use numeric country ids — pass through; USA is commonly 12 or 187
  if (c === 'usa' || c === 'us' || c === 'united states') return process.env.GRIZZLY_USA_COUNTRY_ID || '12';
  return c;
}

export function configuredProviders(): ProviderId[] {
  const list: ProviderId[] = [];
  if (fivesim.isConfigured()) list.push('fivesim');
  if (grizzly.isConfigured()) list.push('grizzly');
  if (smsbower.isConfigured()) list.push('smsbower');
  if (pvapins.isConfigured()) list.push('pvapins');
  return list;
}

/** Pull live offers from all configured providers and band them. */
export async function scrapeOffers(opts: {
  country: string;
  product: string;
}): Promise<NormalizedOffer[]> {
  const out: NormalizedOffer[] = [];
  const region = resolveRegion(opts.country);

  const tasks: Array<Promise<void>> = [];

  if (fivesim.isConfigured()) {
    tasks.push(
      (async () => {
        try {
          const code = mapProductCode(opts.product, 'fivesim');
          const cc = mapCountryCode(opts.country, 'fivesim');
          const rows = await fivesim.listOffers(cc, code);
          for (const r of rows) {
            const band = bandOffer(r.cost, region);
            if (!band) continue;
            out.push({
              provider: 'fivesim',
              country: cc,
              product: code,
              operator: r.operator,
              costUsd: r.cost,
              count: r.count,
              region: band.region,
              tier: band.tier,
              server: band.server,
              poolId: band.poolId,
              sellUsd: customerPriceUsd(r.cost),
              sellNgn: customerPriceNgn(r.cost),
            });
          }
        } catch {
          /* provider soft-fail */
        }
      })(),
    );
  }

  if (pvapins.isConfigured()) {
    tasks.push(
      (async () => {
        try {
          const code = mapProductCode(opts.product, 'pvapins');
          const cc = mapCountryCode(opts.country, 'pvapins');
          const rows = await pvapins.listOffers(cc, code);
          for (const r of rows) {
            const band = bandOffer(r.cost, region);
            if (!band) continue;
            out.push({
              provider: 'pvapins',
              country: cc,
              product: code,
              operator: r.operator,
              costUsd: r.cost,
              count: r.count,
              region: band.region,
              tier: band.tier,
              server: band.server,
              poolId: band.poolId,
              sellUsd: customerPriceUsd(r.cost),
              sellNgn: customerPriceNgn(r.cost),
            });
          }
        } catch {
          /* soft-fail */
        }
      })(),
    );
  }

  // Grizzly / SmsBower price payloads vary; we still attempt buy with maxPrice bounds.
  // Catalog "from" price for those is filled when buy path probes succeed.

  await Promise.all(tasks);
  return out.sort((a, b) => a.costUsd - b.costUsd);
}

/** Pick cheapest offer inside a public pool (tier + region). */
export function filterPool(offers: NormalizedOffer[], poolId: string) {
  return offers.filter((o) => o.poolId === poolId);
}

export async function buyIntoPool(opts: {
  poolId: string;
  product: string;
  country?: string;
}) {
  const [region, tier] = opts.poolId.split('-') as [Region, PriceTier];
  const country =
    opts.country ||
    (region === 'usa' ? 'usa' : 'england'); // worldwide default sample; UI should pass country
  const min = minCostForTier(tier);
  const max = maxCostForTier(tier);

  const offers = await scrapeOffers({ country, product: opts.product });
  const pool = filterPool(offers, opts.poolId).filter(
    (o) => o.costUsd >= min && o.costUsd <= max,
  );

  // Prefer PVAPins for premium/fast (non-VoIP bias), else cheapest
  const sorted = [...pool].sort((a, b) => {
    if (tier === 'premium' || tier === 'fast') {
      if (a.provider === 'pvapins' && b.provider !== 'pvapins') return -1;
      if (b.provider === 'pvapins' && a.provider !== 'pvapins') return 1;
    }
    return a.costUsd - b.costUsd;
  });

  for (const offer of sorted) {
    try {
      if (offer.provider === 'fivesim') {
        const order = await fivesim.buyActivation({
          country: offer.country,
          product: offer.product,
          operator: offer.operator,
        });
        return {
          provider: 'fivesim' as const,
          providerOrderId: String(order?.id ?? ''),
          phone: String(order?.phone ?? ''),
          status: String(order?.status ?? 'waiting'),
          costUsd: offer.costUsd,
          sellUsd: offer.sellUsd,
          sellNgn: offer.sellNgn,
          server: offer.server,
          tier: offer.tier,
          poolId: offer.poolId,
          raw: order,
        };
      }
      if (offer.provider === 'pvapins') {
        const order = await pvapins.createOrder({
          country: offer.country,
          service: offer.product,
          operator: offer.operator ? Number(offer.operator) : undefined,
        });
        return {
          provider: 'pvapins' as const,
          providerOrderId: String(order?.id ?? ''),
          phone: String(order?.phoneNumber ?? order?.phone ?? ''),
          status: String(order?.status ?? 'active'),
          costUsd: Number(order?.price ?? offer.costUsd),
          sellUsd: offer.sellUsd,
          sellNgn: offer.sellNgn,
          server: offer.server,
          tier: offer.tier,
          poolId: offer.poolId,
          raw: order,
        };
      }
    } catch {
      continue;
    }
  }

  // Fallback: grizzly / smsbower with maxPrice bound (no pre-scrape required)
  if (grizzly.isConfigured()) {
    try {
      const service = mapProductCode(opts.product, 'grizzly');
      const cc = mapCountryCode(country, 'grizzly');
      const order = await grizzly.getNumber({
        service,
        country: cc,
        maxPrice: max,
        minPrice: min,
      });
      const cost = max; // exact cost unknown until settlement; use tier ceiling for banding
      return {
        provider: 'grizzly' as const,
        providerOrderId: order.id,
        phone: order.phone,
        status: 'waiting',
        costUsd: cost,
        sellUsd: customerPriceUsd(cost),
        sellNgn: customerPriceNgn(cost),
        server: tier === 'economy' || tier === 'standard' ? (1 as const) : (2 as const),
        tier,
        poolId: opts.poolId,
        raw: order,
      };
    } catch {
      /* next */
    }
  }

  if (smsbower.isConfigured()) {
    try {
      const service = mapProductCode(opts.product, 'smsbower');
      const cc = mapCountryCode(country, 'smsbower');
      const order = await smsbower.getNumber({
        service,
        country: cc,
        maxPrice: max,
      });
      const cost = max;
      return {
        provider: 'smsbower' as const,
        providerOrderId: order.id,
        phone: order.phone,
        status: 'waiting',
        costUsd: cost,
        sellUsd: customerPriceUsd(cost),
        sellNgn: customerPriceNgn(cost),
        server: tier === 'economy' || tier === 'standard' ? (1 as const) : (2 as const),
        tier,
        poolId: opts.poolId,
        raw: order,
      };
    } catch {
      /* next */
    }
  }

  throw new Error('No stock available in this pool right now. Try another tier or app.');
}

export { fivesim, grizzly, pvapins, smsbower };
