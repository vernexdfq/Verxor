import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Package,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

/**
 * Buy Accounts / Logs marketplace
 * - No Available Balance on this page
 * - Compact header
 * - Square cards (max 12px radius)
 * - "All" = endless mixed grid
 * - Platform select isolates that platform only + its sub-types
 * - Rich product detail (provider-style description, format, notes)
 * Catalog is structured for AccsZone API later; AccsMarket scrape as Phase 2.
 */

export type AccountProduct = {
  id: string;
  platform: string;
  subtype: string;
  title: string;
  shortTitle: string;
  description: string;
  bullets: string[];
  format: string;
  age: string;
  country: string;
  price: number;
  stock: number;
  sold?: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
};

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'TikTok',
  'X',
  'Gmail',
  'Telegram',
  'Discord',
  'LinkedIn',
  'YouTube',
  'Reddit',
  'Threads',
  'Snapchat',
  'Other',
] as const;

// Realistic catalog shaped like AccsZone / AccsMarket product lines.
// Production: replace with AccsZone API listings + AccsMarket in-stock scrape.
const CATALOG: AccountProduct[] = [
  {
    id: 'fb-usa-aged',
    platform: 'Facebook',
    subtype: 'USA Aged',
    title: 'Facebook USA · Aged',
    shortTitle: 'Facebook USA Aged',
    description:
      'Aged Facebook accounts registered from USA IP. Email verified where noted. Suitable for page management and advertising warm-up. Cookies included when marked.',
    bullets: [
      'Registered from USA IP',
      'Email verified (email may or may not be included — see listing)',
      'Partially filled profiles',
      '2FA available on selected lots',
      'Cookies included on Instant lots',
    ],
    format: 'login:password | email:password | 2FA key (when set)',
    age: '2–4 yrs',
    country: 'USA',
    price: 6800,
    stock: 174,
    sold: 890,
    instant: true,
    cookies: true,
    emailIncluded: false,
    twoFa: true,
    tags: ['USA', 'Aged', 'Cookies'],
  },
  {
    id: 'fb-with-page',
    platform: 'Facebook',
    subtype: 'With Page',
    title: 'Facebook · With Page',
    shortTitle: 'Facebook With Page',
    description:
      'Facebook accounts that include an existing page. Useful when you need ready page structure without creating from a cold profile.',
    bullets: [
      'Account includes at least one page',
      'Email status varies by lot',
      'Cookies on Instant delivery',
      'Recommended: use proxy matching registration region',
    ],
    format: 'login:password:email:email_pass (when provided)',
    age: '1–3 yrs',
    country: 'Mixed',
    price: 9200,
    stock: 48,
    sold: 210,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: false,
    tags: ['With Page', 'Cookies'],
  },
  {
    id: 'fb-softreg',
    platform: 'Facebook',
    subtype: 'Softreg',
    title: 'Facebook · Softreg',
    shortTitle: 'Facebook Softreg',
    description:
      'Soft-registered Facebook accounts. Lower age / lighter history. Best for volume testing before upgrading to aged stock.',
    bullets: [
      'Soft registration batch',
      'Lower trust than aged lots',
      'Instant delivery when in stock',
    ],
    format: 'login:password',
    age: 'New–6 mo',
    country: 'Mixed',
    price: 3200,
    stock: 320,
    sold: 1200,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Softreg'],
  },
  {
    id: 'ig-aged-2019',
    platform: 'Instagram',
    subtype: 'Aged',
    title: 'Instagram · Aged 2019+',
    shortTitle: 'Instagram Aged',
    description:
      'Aged Instagram accounts with email access on selected lots. Higher trust for organic and automation workflows when used with proper proxies.',
    bullets: [
      'Registration year 2019 or earlier on premium lots',
      'Email access included on marked products',
      'Profile fill level varies',
      'Instant delivery',
    ],
    format: 'username:password:email:email_pass',
    age: '2019+',
    country: 'Mixed',
    price: 4500,
    stock: 86,
    sold: 540,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
  },
  {
    id: 'ig-followers',
    platform: 'Instagram',
    subtype: 'With Followers',
    title: 'Instagram · 1K–5K Followers',
    shortTitle: 'IG 1K–5K',
    description:
      'Instagram accounts in the 1K–5K follower band. Follower quality and engagement are lot-dependent. Review description before bulk orders.',
    bullets: [
      'Follower range 1,000–5,000',
      'Email access on selected SKUs',
      'Use residential proxy matching region',
    ],
    format: 'username:password:email',
    age: '1–2 yrs',
    country: 'US',
    price: 8900,
    stock: 22,
    sold: 180,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Followers', 'US'],
  },
  {
    id: 'ig-pva',
    platform: 'Instagram',
    subtype: 'PVA',
    title: 'Instagram · PVA',
    shortTitle: 'Instagram PVA',
    description:
      'Phone-verified Instagram accounts. Phone number is not retained after delivery unless stated. Ideal for recovery-ready sessions.',
    bullets: ['Phone verified at creation', 'Email status per lot', 'Instant when stock > 0'],
    format: 'username:password',
    age: 'New',
    country: 'Mixed',
    price: 3800,
    stock: 140,
    sold: 980,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['PVA'],
  },
  {
    id: 'tt-aged',
    platform: 'TikTok',
    subtype: 'Aged',
    title: 'TikTok · Aged',
    shortTitle: 'TikTok Aged',
    description:
      'Verified older TikTok accounts with higher trust levels and lower verification risk for automation, ads warm-up, and organic growth when used carefully.',
    bullets: [
      'Registration date 2024 or earlier on standard aged lots',
      'Additional email included on many SKUs',
      'Email in set, native where marked',
      'Gender mix; profile often not fully filled',
      'Registered with regional IP (see product line)',
    ],
    format: 'ID:PASS:EMAIL:EMAIL_PASSWORD',
    age: '2024+',
    country: 'Canada / Mixed',
    price: 5200,
    stock: 500,
    sold: 2100,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
  },
  {
    id: 'tt-softreg',
    platform: 'TikTok',
    subtype: 'Softreg',
    title: 'TikTok · Softreg',
    shortTitle: 'TikTok Softreg',
    description: 'Soft-registered TikTok accounts for volume testing. Lower cost, lower trust than aged lines.',
    bullets: ['Softreg batch', 'Instant delivery', 'Test small quantities first'],
    format: 'ID:PASS',
    age: 'New',
    country: 'Mixed',
    price: 2100,
    stock: 600,
    sold: 3400,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Softreg'],
  },
  {
    id: 'tt-followers',
    platform: 'TikTok',
    subtype: 'With Followers',
    title: 'TikTok · With Followers',
    shortTitle: 'TikTok Followers',
    description: 'TikTok accounts sold with an existing follower base. Follower quality varies by supplier lot.',
    bullets: ['Follower package included', 'Email status per SKU', 'Proxy recommended'],
    format: 'ID:PASS:EMAIL',
    age: 'Mixed',
    country: 'Mixed',
    price: 7500,
    stock: 35,
    sold: 120,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Followers'],
  },
  {
    id: 'x-pva',
    platform: 'X',
    subtype: 'PVA',
    title: 'X (Twitter) · PVA',
    shortTitle: 'X PVA',
    description: 'Phone-verified X accounts. Native registration IP mixed. Email in set on selected lots.',
    bullets: ['Phone verified', 'Email in set on marked products', 'Registered with MIX IP on some lots'],
    format: 'login:password:email',
    age: '2013–New',
    country: 'Mixed',
    price: 3800,
    stock: 95,
    sold: 640,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['PVA'],
  },
  {
    id: 'gmail-pva',
    platform: 'Gmail',
    subtype: 'PVA + Recovery',
    title: 'Gmail · PVA + Recovery',
    shortTitle: 'Gmail PVA',
    description: 'Phone-verified Gmail with recovery options on selected inventory. High utility as recovery email for other platforms.',
    bullets: ['Phone verified', 'Recovery path on premium lots', 'Instant delivery'],
    format: 'email:password',
    age: 'New',
    country: 'US',
    price: 1500,
    stock: 210,
    sold: 4500,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['PVA', 'Recovery'],
  },
  {
    id: 'tg-aged',
    platform: 'Telegram',
    subtype: 'Aged',
    title: 'Telegram · Aged',
    shortTitle: 'Telegram Aged',
    description: 'Aged Telegram accounts. Session export format depends on supplier. Not all lots include 2FA.',
    bullets: ['Aged sessions', '2FA on selected lots', 'Use official clients carefully'],
    format: 'session / phone:code (per delivery note)',
    age: '1+ yrs',
    country: 'Mixed',
    price: 4100,
    stock: 60,
    sold: 300,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: true,
    tags: ['Aged'],
  },
  {
    id: 'discord-aged',
    platform: 'Discord',
    subtype: 'Aged',
    title: 'Discord · Aged',
    shortTitle: 'Discord Aged',
    description: 'Aged Discord accounts for server growth and automation where allowed by Discord ToS.',
    bullets: ['Aged accounts', 'Email verified on many lots', 'Token format on delivery'],
    format: 'email:password:token (when provided)',
    age: '1+ yrs',
    country: 'Mixed',
    price: 2900,
    stock: 110,
    sold: 800,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged'],
  },
  {
    id: 'li-basic',
    platform: 'LinkedIn',
    subtype: 'Standard',
    title: 'LinkedIn · Standard',
    shortTitle: 'LinkedIn',
    description: 'LinkedIn accounts for outreach and research workflows. Strict platform risk — use sparingly and with matching proxies.',
    bullets: ['Standard verification level', 'Email included on marked SKUs'],
    format: 'email:password',
    age: 'Mixed',
    country: 'US',
    price: 12000,
    stock: 18,
    sold: 90,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['US'],
  },
  {
    id: 'yt-aged',
    platform: 'YouTube',
    subtype: 'Aged',
    title: 'YouTube · Aged Channel',
    shortTitle: 'YouTube Aged',
    description: 'Aged YouTube channels / accounts. Monetization status is never guaranteed unless explicitly stated on the SKU.',
    bullets: ['Aged channel', 'Email recovery path when included', 'No monetization promise unless listed'],
    format: 'email:password',
    age: '2+ yrs',
    country: 'Mixed',
    price: 15000,
    stock: 12,
    sold: 40,
    instant: false,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Channel'],
  },
  {
    id: 'threads-basic',
    platform: 'Threads',
    subtype: 'Standard',
    title: 'Threads · Standard',
    shortTitle: 'Threads',
    description: 'Threads accounts linked to Instagram ecosystem where applicable. Stock and format follow provider delivery notes.',
    bullets: ['Standard Threads inventory', 'May require linked Instagram on some lots'],
    format: 'username:password',
    age: 'New',
    country: 'Mixed',
    price: 3500,
    stock: 44,
    sold: 150,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Standard'],
  },
  {
    id: 'reddit-aged',
    platform: 'Reddit',
    subtype: 'Aged',
    title: 'Reddit · Aged',
    shortTitle: 'Reddit Aged',
    description: 'Aged Reddit accounts for community participation. Karma and history vary by lot.',
    bullets: ['Aged accounts', 'Karma varies', 'Email on selected lots'],
    format: 'username:password',
    age: '1+ yrs',
    country: 'US',
    price: 2800,
    stock: 70,
    sold: 400,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged'],
  },
  {
    id: 'snap-basic',
    platform: 'Snapchat',
    subtype: 'Standard',
    title: 'Snapchat · Standard',
    shortTitle: 'Snapchat',
    description: 'Snapchat accounts for testing and growth experiments. Device fingerprint discipline required.',
    bullets: ['Standard stock', 'Instant when available'],
    format: 'username:password',
    age: 'Mixed',
    country: 'Mixed',
    price: 4200,
    stock: 28,
    sold: 95,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Standard'],
  },
];

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

const PLATFORM_LOGO: Record<string, string> = {
  Facebook: 'f',
  Instagram: 'ig',
  TikTok: '♪',
  X: '𝕏',
  Gmail: 'G',
  Telegram: '✈',
  Discord: 'D',
  LinkedIn: 'in',
  YouTube: '▶',
  Reddit: 'r',
  Threads: '@',
  Snapchat: '👻',
  Other: '•',
};

function logoClass(platform: string) {
  const map: Record<string, string> = {
    Facebook: 'logo-fb',
    Instagram: 'logo-ig',
    TikTok: 'logo-tt',
    X: 'logo-x',
    Gmail: 'logo-gm',
    Telegram: 'logo-tg',
    Discord: 'logo-dc',
    LinkedIn: 'logo-li',
    YouTube: 'logo-yt',
    Reddit: 'logo-rd',
    Threads: 'logo-th',
    Snapchat: 'logo-sc',
  };
  return map[platform] || 'logo-default';
}

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('All');
  const [subtype, setSubtype] = useState<string>('All');
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [subtypeOpen, setSubtypeOpen] = useState(false);

  const subtypesForPlatform = useMemo(() => {
    if (platform === 'All') return ['All'];
    const set = new Set(
      CATALOG.filter((p) => p.platform === platform).map((p) => p.subtype),
    );
    return ['All', ...Array.from(set)];
  }, [platform]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((p) => {
      if (platform !== 'All' && p.platform !== platform) return false;
      if (platform !== 'All' && subtype !== 'All' && p.subtype !== subtype) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.subtype.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, platform, subtype]);

  function selectPlatform(next: string) {
    setPlatform(next);
    setSubtype('All');
    setSubtypeOpen(false);
  }

  return (
    <div className="accounts-page">
      <header className="accounts-top">
        <button type="button" className="accounts-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="accounts-top-copy">
          <span className="accounts-eyebrow">MARKETPLACE</span>
          <h1>Buy Accounts</h1>
        </div>
      </header>

      <div className="accounts-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platform, type, country…"
          aria-label="Search accounts"
        />
      </div>

      <div className="accounts-chips" role="tablist" aria-label="Platforms">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            className={platform === p ? 'chip active' : 'chip'}
            onClick={() => selectPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      {platform !== 'All' && subtypesForPlatform.length > 1 && (
        <div className="accounts-subtype">
          <button
            type="button"
            className="subtype-trigger"
            onClick={() => setSubtypeOpen((v) => !v)}
            aria-expanded={subtypeOpen}
          >
            <span>
              {platform} · {subtype === 'All' ? 'All types' : subtype}
            </span>
            <ChevronDown size={16} className={subtypeOpen ? 'rot' : ''} />
          </button>
          {subtypeOpen && (
            <div className="subtype-menu" role="listbox">
              {subtypesForPlatform.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={subtype === s}
                  className={subtype === s ? 'active' : ''}
                  onClick={() => {
                    setSubtype(s);
                    setSubtypeOpen(false);
                  }}
                >
                  {s === 'All' ? `All ${platform}` : s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="accounts-meta-row">
        <strong>{filtered.length} listing{filtered.length === 1 ? '' : 's'}</strong>
        <span className="live-dot">
          <i /> In stock only
        </span>
      </div>

      <div className="accounts-grid">
        {filtered.map((p) => (
          <article key={p.id} className="account-card-sq">
            <div className="card-sq-top">
              <span className={`card-logo ${logoClass(p.platform)}`} aria-hidden>
                {PLATFORM_LOGO[p.platform] || '•'}
              </span>
              {p.instant && <span className="badge-instant">Instant</span>}
            </div>
            <strong className="card-sq-title">{p.shortTitle}</strong>
            <span className="card-sq-sub">
              {p.age} · {p.country}
            </span>
            <div className="card-sq-tags">
              {p.tags.slice(0, 3).map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="card-sq-stock">{p.stock} in stock</div>
            <div className="card-sq-bottom">
              <strong>{money(p.price)}</strong>
              <button type="button" onClick={() => setSelected(p)}>
                Buy <ArrowRight size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <Card className="accounts-empty">
          <Package size={22} />
          <strong>No accounts match</strong>
          <p>Try another platform or clear search.</p>
        </Card>
      )}

      {selected && <AccountDetail product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AccountDetail({
  product,
  onClose,
}: {
  product: AccountProduct;
  onClose: () => void;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="account-detail-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="detail-sheet-head">
          <div className="detail-head-main">
            <span className={`card-logo large ${logoClass(product.platform)}`}>
              {PLATFORM_LOGO[product.platform] || '•'}
            </span>
            <div>
              <span className="accounts-eyebrow">{product.platform}</span>
              <h2 id="detail-title">{product.title}</h2>
              <small>
                {product.age} · {product.country}
                {product.sold != null ? ` · ${product.sold} sold` : ''}
              </small>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="detail-lead">{product.description}</p>

        <ul className="detail-bullets">
          {product.bullets.map((b) => (
            <li key={b}>
              <Check size={14} /> {b}
            </li>
          ))}
        </ul>

        <div className="detail-flags">
          {product.instant && <span>Instant</span>}
          {product.cookies && <span>Cookies</span>}
          {product.emailIncluded && <span>Email</span>}
          {product.twoFa && <span>2FA</span>}
        </div>

        <div className="detail-block">
          <strong>Account format</strong>
          <code>{product.format}</code>
        </div>

        <div className="detail-block">
          <strong>How to use</strong>
          <ol>
            <li>Purchase only what you need for a first test (e.g. 1–10 units).</li>
            <li>Open credentials only after delivery is confirmed in History.</li>
            <li>Use a proxy matching the registration region when possible.</li>
            <li>Change password and secure recovery after first successful login.</li>
          </ol>
        </div>

        <div className="detail-price-row">
          <div>
            <span>Price each</span>
            <small>{product.stock} available</small>
          </div>
          <strong>{money(product.price)}</strong>
        </div>

        <PrimaryButton
          onClick={() =>
            alert(
              'Checkout stays disabled until wallet + AccsZone (and optional AccsMarket) provider layer are connected.',
            )
          }
        >
          <ShieldCheck size={17} /> Continue to checkout
        </PrimaryButton>

        <p className="detail-footnote">
          Credentials are never shown in the catalog. Delivery happens only after a successful
          wallet debit and provider confirmation.
        </p>
      </section>
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return (
    <Card className="product-empty order-empty">
      <div>{kind === 'accounts' ? <Package size={20} /> : <Package size={20} />}</div>
      <strong>No {kind} yet</strong>
      <p>
        Your {kind === 'accounts' ? 'account purchases' : 'active rentals'} will appear here after
        you place an order.
      </p>
    </Card>
  );
}
