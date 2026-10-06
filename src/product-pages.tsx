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

/**
 * Buy Accounts & Logs — Verxor marketplace
 * Catalog is structured for multi-provider APIs (AccsZone / AccsMarket / etc.).
 * Grid = short tags. Modal = 100% raw provider description + format + how-to.
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
  {
    id: 1,
    title: 'Own a Whitelabel Reseller Panel',
    body: 'Sell accounts & logs under your brand.',
    cta: 'Own a Panel →',
    href: '#child-panel',
  },
  {
    id: 2,
    title: 'Guaranteed Replacement Window',
    body: 'All aged logs verified before delivery.',
    cta: 'Browse Stocks →',
    href: '#',
  },
  {
    id: 3,
    title: 'Need a Custom Digital Marketplace?',
    body: 'Build with Verxor Agency.',
    cta: 'Get Started →',
    href: '#',
  },
];

const CATALOG: AccountProduct[] = [
  {
    id: 'fb-usa-aged',
    platform: 'Facebook',
    subtype: 'USA Aged',
    title: 'Facebook USA · Aged',
    shortTitle: 'Facebook Aged USA',
    description:
      'Aged Facebook accounts registered from USA IP. Email verified where noted. Suitable for page management and advertising warm-up. Cookies included when marked.',
    bullets: [
      'Registered from USA IP',
      'Email verified (email may or may not be included — see listing)',
      'Cookies available on select lots',
      'Best for page + ads warm-up',
    ],
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
    description:
      'Fresh Instagram soft-registered accounts. Phone-verified where available. Ideal for growth and automation starters.',
    bullets: ['Soft registration', 'Phone verified lots available', 'Fast delivery', 'Good for warm-up'],
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
    description:
      'Phone-verified TikTok accounts. Suitable for organic growth and content posting. Delivered with login details.',
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
    description:
      'Aged Gmail accounts for recovery, business, and verification use. Instant delivery after payment.',
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
    description: 'Aged X (Twitter) accounts for engagement and branding. Delivery includes login credentials.',
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

function platformLabel(p: string) {
  if (p === 'X / Twitter') return 'X / Twitter';
  return p;
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
      <header className="acc-topbar">
        <button type="button" className="acc-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="acc-topbar-copy">
          <strong>Accounts & Logs</strong>
          <small>Verified marketplace stock</small>
        </div>
        <div className="acc-balance">
          <Wallet size={14} />
          <span>{money(WALLET_BALANCE)}</span>
        </div>
      </header>

      <div className="acc-search">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search platform or product"
          autoComplete="off"
        />
      </div>

      <div className="acc-platforms" role="tablist" aria-label="Platforms">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            className={platform === p ? 'acc-chip active' : 'acc-chip'}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <section className="acc-promo" aria-label="Promotions">
        <div className="acc-promo-card">
          <strong>{promo.title}</strong>
          <p>{promo.body}</p>
          <span>{promo.cta}</span>
        </div>
        <div className="acc-promo-dots">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === promoIndex ? 'dot active' : 'dot'}
              onClick={() => setPromoIndex(i)}
            />
          ))}
        </div>
      </section>

      <div className="acc-grid">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            className="acc-card"
            onClick={() => {
              setSelected(p);
              setQty(1);
            }}
          >
            <div className="acc-card-top">
              <Package size={16} />
              {p.badge ? <span className={`acc-badge ${badgeClass(p.badge)}`}>{p.badge}</span> : null}
            </div>
            <strong>{p.shortTitle}</strong>
            <small>
              {platformLabel(p.platform)} · Stock {p.stock}
            </small>
            <strong className="acc-price">{money(p.price)}</strong>
          </button>
        ))}
        {items.length === 0 && (
          <p className="acc-empty">No products match your search.</p>
        )}
      </div>

      <div className="acc-protect">
        <ShieldCheck size={18} />
        <div>
          <strong>Buyer protection</strong>
          <p>Instant delivery where marked. Replacement window on verified aged logs.</p>
        </div>
      </div>

      {selected && (
        <div className="acc-modal" role="dialog" aria-modal="true">
          <div className="acc-modal-panel">
            <button type="button" className="acc-modal-close" onClick={() => setSelected(null)} aria-label="Close">
              <X size={18} />
            </button>
            <h2>{selected.title}</h2>
            <p className="acc-modal-meta">
              {selected.platform} · {selected.country} · {selected.age}
            </p>
            <p className="acc-modal-desc">{selected.description}</p>
            <ul className="acc-bullets">
              {selected.bullets.map((b) => (
                <li key={b}>
                  <Check size={14} /> {b}
                </li>
              ))}
            </ul>
            <p className="acc-format">
              <strong>Format:</strong> {selected.format}
            </p>
            <div className="acc-qty">
              <span>Quantity</span>
              <div className="acc-qty-ctrl">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                  <Minus size={14} />
                </button>
                <strong>{qty}</strong>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(selected.stock, q + 1))}
                  aria-label="Increase"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="acc-modal-total">
              <span>
                {money(selected.price)} × {qty} · {selected.stock} available
              </span>
              <strong>{money(total)}</strong>
            </div>
            <PrimaryButton type="button" className="acc-buy-btn">
              Buy now · {money(total)}
            </PrimaryButton>
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
        Your {kind === 'accounts' ? 'account orders' : 'active rentals'} will appear here after you
        place an order.
      </p>
    </Card>
  );
}
