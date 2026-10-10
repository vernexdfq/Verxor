'use client';

import { useState, type CSSProperties } from 'react';
import { AppWindow } from 'lucide-react';
import { type Pool } from './virtual-numbers-data';
import { formatNgn } from './virtual-numbers-data';

/**
 * Official brand marks are loaded from Simple Icons' public CDN.
 * Unknown/unavailable marks fall back to a neutral app icon, never a made-up brand glyph.
 */
const SERVICE_BRANDS: Record<string, { slug: string; color: string }> = {
  whatsapp: { slug: 'whatsapp', color: '25D366' },
  telegram: { slug: 'telegram', color: '26A5E4' },
  signal: { slug: 'signal', color: '3A76F0' },
  discord: { slug: 'discord', color: '5865F2' },
  imo: { slug: 'imo', color: '00A6E8' },
  viber: { slug: 'viber', color: '7360F2' },
  wechat: { slug: 'wechat', color: '07C160' },
  line: { slug: 'line', color: '06C755' },
  facebook: { slug: 'facebook', color: '1877F2' },
  instagram: { slug: 'instagram', color: 'E4405F' },
  tiktok: { slug: 'tiktok', color: '111111' },
  twitter: { slug: 'x', color: '111111' },
  snapchat: { slug: 'snapchat', color: '111111' },
  linkedin: { slug: 'linkedin', color: '0A66C2' },
  tinder: { slug: 'tinder', color: 'FE3C72' },
  badoo: { slug: 'badoo', color: '783BF9' },
  bumble: { slug: 'bumble', color: 'FFC629' },
  steam: { slug: 'steam', color: '171A21' },
  pubg: { slug: 'pubg', color: 'F2A900' },
  roblox: { slug: 'roblox', color: '111111' },
  amazon: { slug: 'amazon', color: 'FF9900' },
  ebay: { slug: 'ebay', color: 'E53238' },
  alibaba: { slug: 'alibabagroup', color: 'FF6A00' },
  paypal: { slug: 'paypal', color: '003087' },
  googlepay: { slug: 'googlepay', color: '4285F4' },
  wise: { slug: 'wise', color: '9FE870' },
  ubereats: { slug: 'ubereats', color: '06C167' },
  doordash: { slug: 'doordash', color: 'EB1700' },
  walmart: { slug: 'walmart', color: '0071CE' },
  nike: { slug: 'nike', color: '111111' },
  bet365: { slug: 'bet365', color: '14805E' },
  '1xbet': { slug: '1xbet', color: '0277FF' },
  uber: { slug: 'uber', color: '111111' },
  bolt: { slug: 'bolt', color: '34D186' },
  google: { slug: 'google', color: '4285F4' },
  microsoft: { slug: 'microsoft', color: '5E5E5E' },
  apple: { slug: 'apple', color: '111111' },
  netflix: { slug: 'netflix', color: 'E50914' },
  spotify: { slug: 'spotify', color: '1DB954' },
  openai: { slug: 'openai', color: '10A37F' },
};

export function ServiceLogo({ id, compact = false }: { id: string; compact?: boolean }) {
  const brand = SERVICE_BRANDS[id.toLowerCase()];
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={`vn-service-logo${compact ? " vn-service-logo--compact" : ""}`}
      aria-label={id}
      title={id}
      style={{ '--vn-logo-color': brand ? `#${brand.color}` : '#64748b', backgroundColor: brand ? `#${brand.color}` : '#f1f5f9' } as CSSProperties}
    >
      {brand && !failed ? (
        <img
          src={`https://cdn.simpleicons.org/${brand.slug}/ffffff`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <AppWindow size={compact ? 16 : 19} strokeWidth={1.8} aria-hidden="true" />
      )}
    </span>
  );
}

export function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (p: Pool) => void }) {
  const tierClass =
    pool.tier === 'ECO' ? 'tier-eco' : pool.tier === 'STD' ? 'tier-std' : pool.tier === 'FAST' ? 'tier-fast' : 'tier-premium';
  return (
    <button type="button" className="vn-pool-card" onClick={() => onSelect(pool)}>
      <div className="vn-pool-card-top">
        <span className="vn-pool-mark">{pool.location === 'USA' ? '🇺🇸' : '🌍'}</span>
        <span className={`vn-tier-badge ${tierClass}`}>{pool.tier}</span>
      </div>
      <span className="vn-pool-title">{pool.title}</span>
      <span className="vn-pool-hint">{pool.hint}</span>
      <span className={`vn-price-pill ${tierClass}`}>From {formatNgn(pool.fromNgn)}</span>
    </button>
  );
}
