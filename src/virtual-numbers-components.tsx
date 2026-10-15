'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Globe2 } from 'lucide-react';
import { type Pool, formatNgn } from './virtual-numbers-data';

/**
 * Recognised brands use their Simple Icons mark. Provider catalogue IDs and
 * display names are normalised below so aliases resolve to the same mark.
 * Unknown brands use a neutral initials tile; it is deliberately not styled
 * as an official brand logo.
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
  x: { slug: 'x', color: '111111' },
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
  gmail: { slug: 'gmail', color: 'EA4335' },
  youtube: { slug: 'youtube', color: 'FF0033' },
  yahoo: { slug: 'yahoo', color: '6001D2' },
  reddit: { slug: 'reddit', color: 'FF4500' },
  pinterest: { slug: 'pinterest', color: 'BD081C' },
  twitch: { slug: 'twitch', color: '9146FF' },
  discordapp: { slug: 'discord', color: '5865F2' },
  skype: { slug: 'skype', color: '00AFF0' },
  outlook: { slug: 'microsoftoutlook', color: '0078D4' },
  microsoftteams: { slug: 'microsoftteams', color: '6264A7' },
  binance: { slug: 'binance', color: 'F0B90B' },
  coinbase: { slug: 'coinbase', color: '0052FF' },
  payoneer: { slug: 'payoneer', color: 'FF4800' },
  revolut: { slug: 'revolut', color: '191C1F' },
  aliexpress: { slug: 'aliexpress', color: 'FF4747' },
  shopee: { slug: 'shopee', color: 'EE4D2D' },
  lazada: { slug: 'lazada', color: '0F146D' },
  grab: { slug: 'grab', color: '00B14F' },
  foodpanda: { slug: 'foodpanda', color: 'D70F64' },
  boltfood: { slug: 'boltfood', color: '34D186' },
  airbnb: { slug: 'airbnb', color: 'FF5A5F' },
  booking: { slug: 'bookingdotcom', color: '003580' },
  deezer: { slug: 'deezer', color: 'FEAA2D' },
  discordnitro: { slug: 'discord', color: '5865F2' },
  capcut: { slug: 'capcut', color: '111111' },
  canva: { slug: 'canva', color: '00C4CC' },
  zoom: { slug: 'zoom', color: '0B5CFF' },
  proton: { slug: 'proton', color: '6D4AFF' },
  yandex: { slug: 'yandex', color: 'FC3F1D' },
  kakaotalk: { slug: 'kakaotalk', color: 'FFCD00' },
  kakao: { slug: 'kakaotalk', color: 'FFCD00' },
  naver: { slug: 'naver', color: '03C75A' },
  weibo: { slug: 'sinaweibo', color: 'E6162D' },
  okx: { slug: 'okx', color: '111111' },
  bybit: { slug: 'bybit', color: 'F7A600' },
  bitget: { slug: 'bitget', color: '00F0FF' },
};

const SERVICE_ALIASES: Record<string, string> = {
  wa: 'whatsapp', whatsappbusiness: 'whatsapp', tg: 'telegram', tele: 'telegram',
  fb: 'facebook', meta: 'facebook', ig: 'instagram', insta: 'instagram',
  tw: 'twitter', xcom: 'x', twitterx: 'x', go: 'google', googlemail: 'gmail',
  yt: 'youtube', ds: 'discord', vi: 'viber', lf: 'tiktok', tt: 'tiktok',
  am: 'amazon', ub: 'uber', ni: 'nike', me: 'microsoft', pm: 'paypal',
  sn: 'snapchat', im: 'imo', vk: 'vk', ok: 'ok', ml: 'gmail',
  ya: 'yandex', mm: 'microsoft', ot: 'other',
};

function normaliseServiceId(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
}

function initialsFor(value: string) {
  const words = value.trim().replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const compact = (words[0] || '?').replace(/[^a-z0-9]/gi, '');
  return compact.slice(0, 2).toUpperCase() || '?';
}

export function ServiceLogo({ id, compact = false }: { id: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const resolved = useMemo(() => {
    const normalised = normaliseServiceId(id);
    const key = SERVICE_ALIASES[normalised] || normalised;
    return SERVICE_BRANDS[key] || null;
  }, [id]);
  const size = compact ? 16 : 19;

  return (
    <span
      className={`vn-service-logo${compact ? ' vn-service-logo--compact' : ''}`}
      aria-label={`${id} logo`}
      title={id}
      style={{
        '--vn-logo-color': resolved ? `#${resolved.color}` : '#64748b',
        backgroundColor: resolved ? `#${resolved.color}` : '#f1f5f9',
      } as CSSProperties}
    >
      {resolved && !failed ? (
        <img
          src={`https://cdn.simpleicons.org/${resolved.slug}/ffffff`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            height: '100%',
            color: '#334155',
            fontSize: compact ? 9 : 11,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          {initialsFor(id)}
        </span>
      )}
    </span>
  );
}

export function CountryFlag({ code, flag, compact = false }: { code?: string; flag?: string; compact?: boolean }) {
  // Prefer the provider/API's country flag when supplied. ISO emoji fallback
  // covers standard two-letter territory codes without a hardcoded country list.
  const iso = (code || '').trim().toUpperCase();
  const emoji = iso.length === 2 && /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : flag || '';
  return (
    <span
      className={compact ? 'vn-country-flag vn-country-flag--compact' : 'vn-country-flag'}
      role="img"
      aria-label={iso ? `${iso} flag` : 'Country'}
      title={iso || 'Country'}
    >
      {emoji || <Globe2 size={compact ? 15 : 18} aria-hidden="true" />}
    </span>
  );
}

export function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (p: Pool) => void }) {
  const tierClass =
    pool.tier === 'ECO' ? 'tier-eco' : pool.tier === 'STD' ? 'tier-std' : pool.tier === 'FAST' ? 'tier-fast' : 'tier-premium';
  return (
    <button type="button" className="vn-pool-card" onClick={() => onSelect(pool)}>
      <div className="vn-pool-card-top">
        <span className="vn-pool-mark" aria-hidden="true">{pool.location === 'USA' ? '🇺🇸' : '🌍'}</span>
        <span className={`vn-tier-badge ${tierClass}`}>{pool.tier}</span>
      </div>
      <span className="vn-pool-title">{pool.title}</span>
      <span className="vn-pool-hint">{pool.hint}</span>
      <span className={`vn-price-pill ${tierClass}`}>From {formatNgn(pool.fromNgn)}</span>
    </button>
  );
}
