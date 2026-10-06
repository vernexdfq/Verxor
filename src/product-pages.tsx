'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Search,
  ShieldCheck,
  Wallet,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

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
  badge?: 'INSTANT' | 'SOFTREG' | 'AGED' | 'PVA';
};

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'Telegram',
  'YouTube',
  'Gmail',
  'Discord',
  'LinkedIn',
  'Threads',
  'Reddit',
  'Snapchat',
] as const;

const PROMO_SLIDES = [
  { id: 1, title: 'Own a Whitelabel Reseller Panel', body: 'Sell accounts & logs under your brand.', cta: 'Own a Panel →' },
  { id: 2, title: 'Guaranteed Replacement Window', body: 'All aged logs verified before delivery.', cta: 'Browse Stocks →' },
  { id: 3, title: 'Need a Custom Digital Marketplace?', body: 'Build with Verxor Agency.', cta: 'Get Started →' },
];

const CATALOG: AccountProduct[] = [
  {
    id: 'fb-usa-aged',
    platform: 'Facebook',
    subtype: 'USA Aged',
    title: 'Facebook USA · Aged',
    shortTitle: 'FB Aged 2020+',
    description: 'Aged Facebook accounts registered from USA IP. Email verified where noted. Suitable for page management and advertising warm-up.',
    bullets: ['Registered from USA IP', 'Email verified options', 'Cookies on select lots', 'Best for page + ads warm-up'],
    format: 'login:pass | cookies (optional)',
    age: '2020+',
    country: 'USA',
    price: 2500,
    stock: 12,
    sold: 340,
    instant: true,
    cookies: true,
    emailIncluded: false,
    twoFa: false,
    tags: ['USA', 'Aged', 'Cookies'],
    badge: 'AGED',
  },
  {
    id: 'ig-softreg',
    platform: 'Instagram',
    subtype: 'Softreg',
    title: 'Instagram Softreg',
    shortTitle: 'IG Softreg',
    description: 'Fresh Instagram soft-registered accounts. Phone-verified where available. Ideal for growth and automation starters.',
    bullets: ['Soft registration', 'Phone verified lots', 'Fast delivery', 'Good for warm-up'],
    format: 'user:pass',
    age: 'New',
    country: 'Mixed',
    price: 1800,
    stock: 40,
    sold: 890,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Softreg', 'IG'],
    badge: 'SOFTREG',
  },
  {
    id: 'tt-pva',
    platform: 'TikTok',
    subtype: 'PVA',
    title: 'TikTok PVA',
    shortTitle: 'TikTok PVA',
    description: 'Phone-verified TikTok accounts. Suitable for organic growth and content posting.',
    bullets: ['Phone verified', 'Ready for content', 'Instant delivery', 'Mixed geos'],
    format: 'user:pass',
    age: 'Fresh',
    country: 'Mixed',
    price: 3200,
    stock: 8,
    sold: 210,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['PVA', 'TikTok'],
    badge: 'PVA',
  },
  {
    id: 'gmail-aged',
    platform: 'Gmail',
    subtype: 'Aged',
    title: 'Gmail Aged',
    shortTitle: 'Gmail Aged',
    description: 'Aged Gmail accounts for recovery, business, and verification use. Instant delivery after payment.',
    bullets: ['Aged mailbox', 'Instant delivery', 'Recovery-ready', 'High stock'],
    format: 'email:pass',
    age: '2018+',
    country: 'Mixed',
    price: 900,
    stock: 100,
    sold: 2100,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Gmail', 'Aged'],
    badge: 'INSTANT',
  },
  {
    id: 'tg-premium',
    platform: 'Telegram',
    subtype: 'Premium-ready',
    title: 'Telegram Accounts',
    shortTitle: 'Telegram',
    description: 'Telegram accounts with session options. Useful for channels, bots, and community management.',
    bullets: ['Session-ready lots', 'Fast delivery', 'Channel-friendly'],
    format: 'phone + session',
    age: 'Mixed',
    country: 'Mixed',
    price: 4500,
    stock: 15,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['Telegram'],
    badge: 'INSTANT',
  },
  {
    id: 'x-aged',
    platform: 'X / Twitter',
    subtype: 'Aged',
    title: 'X / Twitter Aged',
    shortTitle: 'X Aged',
    description: 'Aged X (Twitter) accounts for engagement and branding.',
    bullets: ['Aged profiles', 'Engagement-ready', 'Instant delivery'],
    format: 'user:pass',
    age: '2019+',
    country: 'Mixed',
    price: 2800,
    stock: 22,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: false,
    tags: ['X', 'Aged'],
    badge: 'AGED',
  },
];

const WALLET_BALANCE = 0;

const money = (value: number) => '\u20A6' + value.toLocaleString('en-NG');

function badgeClass(badge?: AccountProduct['badge']) {
  if (badge === 'INSTANT') return 'badge-instant';
  if (badge === 'SOFTREG') return 'badge-softreg';
  if (badge === 'AGED') return 'badge-aged';
  if (badge === 'PVA') return 'badge-pva';
  return 'badge-instant';
}

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('All');
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [qty, setQty] = useState(1);
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return CATALOG.filter((x) => {
      if (platform !== 'All' && x.platform !== platform) return false;
      if (!s) return true;
      return (
        x.platform.toLowerCase().includes(s) ||
        x.title.toLowerCase().includes(s) ||
        x.shortTitle.toLowerCase().includes(s) ||
        x.tags.some((t) => t.toLowerCase().includes(s))
      );
    });
  }, [q, platform]);

  const total = selected ? selected.price * qty : 0;
  const promo = PROMO_SLIDES[promoIndex];

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <button type="button" className="accounts-back-link" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} /> Services
        </button>
        <div className="accounts-header-center">
          <h1>Accounts & Logs</h1>
          <p>Verified marketplace stock</p>
        </div>
        <div className="accounts-wallet-badge" aria-label="Wallet balance">
          <Wallet size={14} />
          <span>{money(WALLET_BALANCE)}</span>
        </div>
      </header>

      <div className="accounts-search">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search platform or product"
          autoComplete="off"
        />
      </div>

      <div className="accounts-chips" role="tablist">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            className={platform === p ? 'chip active' : 'chip'}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="accounts-promo">
        <div className="promo-slide">
          <div className="promo-copy">
            <strong>{promo.title}</strong>
            <p>{promo.body}</p>
            <button type="button" className="promo-cta">{promo.cta}</button>
          </div>
        </div>
        <div className="promo-dots">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === promoIndex ? 'dot active' : 'dot'}
              onClick={() => setPromoIndex(i)}
            />
          ))}
        </div>
      </div>

      <div className="accounts-grid">
        {items.map((p) => (
          <article key={p.id} className="account-card-sq">
            <div className="card-sq-top">
              <span className="card-logo-wrap">
                <Package size={18} />
              </span>
              <span className={badgeClass(p.badge)}>{p.badge}</span>
            </div>
            <strong className="card-sq-title">{p.shortTitle}</strong>
            <span className="card-sq-sub">
              {p.platform} · {p.country}
            </span>
            <div className="card-sq-stock">
              <i className="stock-dot" /> {p.stock} in stock
            </div>
            <div className="card-sq-bottom">
              <strong>{money(p.price)}</strong>
              <button
                type="button"
                className="card-buy"
                onClick={() => {
                  setSelected(p);
                  setQty(1);
                }}
              >
                Buy <ArrowRight size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 && (
        <Card className="accounts-empty">
          <p>No products match your search.</p>
        </Card>
      )}

      <div className="accounts-protect" style={{ display: 'flex', gap: 10, padding: 14, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <ShieldCheck size={18} color="#16a34a" />
        <div>
          <strong style={{ fontSize: 13 }}>Buyer protection</strong>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            Instant delivery where marked. Replacement window on verified aged logs.
          </p>
        </div>
      </div>

      {selected && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)} role="presentation">
          <div
            className="account-detail-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button type="button" className="sheet-close" onClick={() => setSelected(null)} aria-label="Close">
              <X size={18} />
            </button>
            <div className="detail-sheet-head">
              <div className="detail-head-main">
                <span className="accounts-eyebrow">{selected.platform}</span>
                <h2>{selected.title}</h2>
                <p>
                  {selected.country} · {selected.age}
                </p>
              </div>
            </div>
            <p className="detail-lead">{selected.description}</p>
            <ul className="detail-bullets">
              {selected.bullets.map((b) => (
                <li key={b}>
                  <Check size={14} /> {b}
                </li>
              ))}
            </ul>
            <p className="detail-format">
              <strong>Format:</strong> {selected.format}
            </p>
            <div className="detail-qty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
              <span>Quantity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">
                  <Minus size={14} />
                </button>
                <strong>{qty}</strong>
                <button type="button" onClick={() => setQty((n) => Math.min(selected.stock, n + 1))} aria-label="Increase">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>
                {money(selected.price)} × {qty}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <PrimaryButton type="button">Buy now · {money(total)}</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return (
    <Card className="form-card">
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        Your {kind === 'accounts' ? 'account orders' : 'active rentals'} will appear here after you place an order.
      </p>
    </Card>
  );
}
