'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Globe2 } from 'lucide-react';
import { type Pool, formatNgn } from './virtual-numbers-data';

/**
 * Recognised brands use their Simple Icons mark (cdn.simpleicons.org).
 * Provider codes and display names are normalised so aliases resolve to the
 * same mark. Unknown brands use a neutral initials tile — never a fake logo.
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
  alipay: { slug: 'alipay', color: '1677FF' },
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
  aol: { slug: 'aol', color: '3399FF' },
  anthropic: { slug: 'anthropic', color: 'D4A27F' },
};

/** Provider short codes → brand keys */
const SERVICE_ALIASES: Record<string, string> = {
  wa: 'whatsapp', whatsappbusiness: 'whatsapp',
  tg: 'telegram', tele: 'telegram',
  fb: 'facebook', meta: 'facebook',
  ig: 'instagram', insta: 'instagram',
  tw: 'twitter', xcom: 'x', twitterx: 'x',
  go: 'google', googlemail: 'gmail', ml: 'gmail',
  yt: 'youtube',
  ds: 'discord', discordapp: 'discord',
  vi: 'viber',
  lf: 'tiktok', tt: 'tiktok',
  am: 'amazon',
  ub: 'uber',
  ni: 'nike',
  me: 'microsoft', mm: 'microsoft',
  pm: 'paypal',
  sn: 'snapchat', fu: 'snapchat',
  im: 'imo',
  ya: 'yandex',
  ot: 'other',
};

/** Match display names when provider code has no logoId */
const SERVICE_NAME_LOGOS: Array<[RegExp, string]> = [
  [/whatsapp/i, 'whatsapp'], [/telegram/i, 'telegram'], [/facebook|\bmeta\b/i, 'facebook'],
  [/instagram|threads/i, 'instagram'], [/tiktok/i, 'tiktok'], [/\bx\b|twitter/i, 'twitter'],
  [/snapchat/i, 'snapchat'], [/discord/i, 'discord'], [/viber/i, 'viber'], [/wechat/i, 'wechat'],
  [/\bimo\b/i, 'imo'], [/\bline\b/i, 'line'], [/linkedin/i, 'linkedin'],
  [/tinder/i, 'tinder'], [/badoo/i, 'badoo'], [/bumble/i, 'bumble'], [/steam/i, 'steam'],
  [/pubg/i, 'pubg'], [/roblox/i, 'roblox'], [/amazon/i, 'amazon'], [/ebay/i, 'ebay'],
  [/alibaba/i, 'alibaba'], [/alipay/i, 'alipay'], [/paypal/i, 'paypal'],
  [/google\s*pay/i, 'googlepay'], [/gmail/i, 'gmail'], [/youtube/i, 'youtube'],
  [/google/i, 'google'], [/wise|transferwise/i, 'wise'],
  [/uber\s*eats/i, 'ubereats'], [/doordash/i, 'doordash'], [/walmart/i, 'walmart'],
  [/nike/i, 'nike'], [/bet365/i, 'bet365'], [/1xbet/i, '1xbet'], [/uber/i, 'uber'],
  [/bolt/i, 'bolt'], [/microsoft|outlook|hotmail/i, 'microsoft'], [/apple|icloud/i, 'apple'],
  [/netflix/i, 'netflix'], [/spotify/i, 'spotify'], [/openai|chatgpt/i, 'openai'],
  [/claude|anthropic/i, 'anthropic'], [/\baol\b/i, 'aol'],
  [/yahoo/i, 'yahoo'], [/reddit/i, 'reddit'], [/pinterest/i, 'pinterest'], [/twitch/i, 'twitch'],
  [/skype/i, 'skype'], [/binance/i, 'binance'], [/coinbase/i, 'coinbase'], [/payoneer/i, 'payoneer'],
  [/revolut/i, 'revolut'], [/aliexpress/i, 'aliexpress'], [/shopee/i, 'shopee'], [/lazada/i, 'lazada'],
  [/grab/i, 'grab'], [/foodpanda/i, 'foodpanda'], [/airbnb/i, 'airbnb'], [/booking/i, 'booking'],
  [/deezer/i, 'deezer'], [/capcut/i, 'capcut'], [/canva/i, 'canva'], [/zoom/i, 'zoom'],
  [/yandex/i, 'yandex'], [/kakao/i, 'kakaotalk'], [/naver/i, 'naver'], [/weibo/i, 'weibo'],
  [/\bokx\b/i, 'okx'], [/bybit/i, 'bybit'], [/bitget/i, 'bitget'],
];

function normaliseServiceId(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
}

function initialsFor(value: string) {
  const words = value.trim().replace(/[_-]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const compact = (words[0] || '?').replace(/[^a-z0-9]/gi, '');
  return compact.slice(0, 2).toUpperCase() || '?';
}

function resolveBrand(id: string, name?: string) {
  const candidates = [id, name || ''].filter(Boolean);
  for (const raw of candidates) {
    const normalised = normaliseServiceId(raw);
    if (!normalised) continue;
    const aliased = SERVICE_ALIASES[normalised] || normalised;
    if (SERVICE_BRANDS[aliased]) return SERVICE_BRANDS[aliased];
    if (SERVICE_BRANDS[normalised]) return SERVICE_BRANDS[normalised];
  }
  for (const raw of candidates) {
    for (const [pattern, key] of SERVICE_NAME_LOGOS) {
      if (pattern.test(raw) && SERVICE_BRANDS[key]) return SERVICE_BRANDS[key];
    }
  }
  return null;
}

export function ServiceLogo({
  id,
  name,
  compact = false,
}: {
  id: string;
  name?: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = useMemo(() => resolveBrand(id, name), [id, name]);
  const label = name || id;

  useEffect(() => {
    setFailed(false);
  }, [id, name]);

  return (
    <span
      className={`vn-service-logo${compact ? ' vn-service-logo--compact' : ''}`}
      aria-label={`${label} logo`}
      title={label}
      style={
        {
          '--vn-logo-color': resolved ? `#${resolved.color}` : '#64748b',
          backgroundColor: resolved ? `#${resolved.color}` : '#f1f5f9',
        } as CSSProperties
      }
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
          {initialsFor(label)}
        </span>
      )}
    </span>
  );
}

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  afghanistan: 'AF', albania: 'AL', algeria: 'DZ', andorra: 'AD', angola: 'AO', argentina: 'AR',
  armenia: 'AM', australia: 'AU', austria: 'AT', azerbaijan: 'AZ', bahamas: 'BS', bahrain: 'BH',
  bangladesh: 'BD', barbados: 'BB', belarus: 'BY', belgium: 'BE', belize: 'BZ', benin: 'BJ',
  bhutan: 'BT', bolivia: 'BO', 'bosnia and herzegovina': 'BA', botswana: 'BW', brazil: 'BR',
  brunei: 'BN', bulgaria: 'BG', 'burkina faso': 'BF', burundi: 'BI', cambodia: 'KH', cameroon: 'CM',
  canada: 'CA', 'cape verde': 'CV', 'central african republic': 'CF', chad: 'TD', chile: 'CL', china: 'CN',
  colombia: 'CO', comoros: 'KM', congo: 'CG', 'costa rica': 'CR', croatia: 'HR', cuba: 'CU', cyprus: 'CY',
  'czech republic': 'CZ', czechia: 'CZ', denmark: 'DK', djibouti: 'DJ', dominica: 'DM',
  'dominican republic': 'DO', ecuador: 'EC', egypt: 'EG', 'el salvador': 'SV', 'equatorial guinea': 'GQ',
  eritrea: 'ER', estonia: 'EE', eswatini: 'SZ', ethiopia: 'ET', fiji: 'FJ', finland: 'FI', france: 'FR',
  gabon: 'GA', gambia: 'GM', georgia: 'GE', germany: 'DE', ghana: 'GH', greece: 'GR', grenada: 'GD',
  guatemala: 'GT', guinea: 'GN', 'guinea-bissau': 'GW', guyana: 'GY', haiti: 'HT', honduras: 'HN',
  'hong kong': 'HK', hungary: 'HU', iceland: 'IS', india: 'IN', indonesia: 'ID', iran: 'IR', iraq: 'IQ',
  ireland: 'IE', israel: 'IL', italy: 'IT', jamaica: 'JM', japan: 'JP', jordan: 'JO', kazakhstan: 'KZ',
  kenya: 'KE', kuwait: 'KW', kyrgyzstan: 'KG', laos: 'LA', latvia: 'LV', lebanon: 'LB', lesotho: 'LS',
  liberia: 'LR', libya: 'LY', liechtenstein: 'LI', lithuania: 'LT', luxembourg: 'LU', macau: 'MO',
  madagascar: 'MG', malawi: 'MW', malaysia: 'MY', maldives: 'MV', mali: 'ML', malta: 'MT',
  mauritania: 'MR', mauritius: 'MU', mexico: 'MX', moldova: 'MD', monaco: 'MC', mongolia: 'MN',
  montenegro: 'ME', morocco: 'MA', mozambique: 'MZ', myanmar: 'MM', namibia: 'NA', nepal: 'NP',
  netherlands: 'NL', 'new zealand': 'NZ', nicaragua: 'NI', niger: 'NE', nigeria: 'NG', 'north korea': 'KP',
  'north macedonia': 'MK', norway: 'NO', oman: 'OM', pakistan: 'PK', panama: 'PA', 'papua new guinea': 'PG',
  paraguay: 'PY', peru: 'PE', philippines: 'PH', poland: 'PL', portugal: 'PT', qatar: 'QA', romania: 'RO',
  russia: 'RU', rwanda: 'RW', 'saudi arabia': 'SA',
  senegal: 'SN', serbia: 'RS', seychelles: 'SC', 'sierra leone': 'SL', singapore: 'SG', slovakia: 'SK',
  slovenia: 'SI', somalia: 'SO', 'south africa': 'ZA', 'south korea': 'KR', 'south sudan': 'SS', spain: 'ES',
  'sri lanka': 'LK', sudan: 'SD', suriname: 'SR', sweden: 'SE', switzerland: 'CH', syria: 'SY',
  taiwan: 'TW', tajikistan: 'TJ', tanzania: 'TZ', thailand: 'TH', togo: 'TG', 'trinidad and tobago': 'TT',
  tunisia: 'TN', turkey: 'TR', türkiye: 'TR', turkmenistan: 'TM', uganda: 'UG', ukraine: 'UA',
  'united arab emirates': 'AE', uae: 'AE', 'united kingdom': 'GB', uk: 'GB', 'united states': 'US',
  'united states of america': 'US', usa: 'US', uruguay: 'UY', uzbekistan: 'UZ', venezuela: 'VE',
  vietnam: 'VN', yemen: 'YE', zambia: 'ZM', zimbabwe: 'ZW', kosovo: 'XK',
};

export function CountryFlag({
  code,
  flag,
  name,
  compact = false,
}: {
  code?: string;
  flag?: string;
  name?: string;
  compact?: boolean;
}) {
  const rawCode = (code || '').trim().toUpperCase();
  const iso = /^[A-Z]{2}$/.test(rawCode)
    ? rawCode
    : COUNTRY_NAME_TO_ISO[(name || '').trim().toLowerCase()] || '';
  const emoji =
    iso.length === 2 && /^[A-Z]{2}$/.test(iso)
      ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
      : flag || '';
  return (
    <span
      className={compact ? 'vn-country-flag vn-country-flag--compact' : 'vn-country-flag'}
      role="img"
      aria-label={iso ? `${iso} flag` : name || 'Country'}
      title={name || iso || 'Country'}
    >
      {emoji || <Globe2 size={compact ? 15 : 18} aria-hidden="true" />}
    </span>
  );
}

export function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (p: Pool) => void }) {
  const tierClass =
    pool.tier === 'ECO'
      ? 'tier-eco'
      : pool.tier === 'STD'
        ? 'tier-std'
        : pool.tier === 'FAST'
          ? 'tier-fast'
          : 'tier-premium';
  return (
    <button type="button" className="vn-pool-card" onClick={() => onSelect(pool)}>
      <div className="vn-pool-card-top">
        <span className="vn-pool-mark" aria-hidden="true">
          {pool.location === 'USA' ? '🇺🇸' : '🌍'}
        </span>
        <span className={`vn-tier-badge ${tierClass}`}>{pool.tier}</span>
      </div>
      <span className="vn-pool-title">{pool.title}</span>
      <span className="vn-pool-hint">{pool.hint}</span>
      <span className={`vn-price-pill ${tierClass}`}>From {formatNgn(pool.fromNgn)}</span>
    </button>
  );
}
