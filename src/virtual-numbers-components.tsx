'use client';

import {
  type Pool,
} from './virtual-numbers-data';
import { formatNgn } from './virtual-numbers-data';

export function ServiceLogo({ id }: { id: string }) {
  const colors: Record<string, string> = {
    whatsapp: '#25D366', telegram: '#26A5E4', facebook: '#1877F2', instagram: '#E4405F',
    tiktok: '#000000', twitter: '#0F1419', discord: '#5865F2', paypal: '#003087',
    google: '#4285F4', googlepay: '#4285F4', linkedin: '#0A66C2', snapchat: '#FFFC00',
    tinder: '#FE3C72', steam: '#1B2838', netflix: '#E50914', spotify: '#1DB954',
    uber: '#000000', ubereats: '#06C167', apple: '#111111', microsoft: '#00A4EF',
    amazon: '#FF9900', openai: '#10A37F', signal: '#3A76F0', viber: '#7360F2',
    wechat: '#07C160', line: '#06C755', bolt: '#34D186', bet365: '#1B7A3D',
  };
  const bg = colors[id] || '#2563EB';
  const letter = (id || '?').slice(0, 1).toUpperCase();
  return (
    <span
      className="vn-service-letter"
      style={{
        background: bg,
        color: '#fff',
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {letter}
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
