'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FolderOpen,
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
import type { AuthSession } from './auth/AuthFlow';
import type { AccountProduct } from './accounts-types';
import { STATIC_CATALOG as CATALOG } from './accounts-static-catalog';

/**
 * Buy Accounts & Logs — Verxor marketplace
 * Facebook = live AccsZone. Other platforms = static fallback until enabled.
 */

export type { AccountProduct } from './accounts-types';

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

const money = (value: number) => `₦${value.toLocaleString('en-NG')}`;

function BrandLogo({ platform, size = 36 }: { platform: string; size?: number }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 40 40', fill: 'none' as const };
  switch (platform) {
    case 'Facebook':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#1877F2" />
          <path d="M26.5 21.2h-3.4v12.3h-5.1V21.2h-2.4v-4.3h2.4v-2.6c0-2.4 1.1-6.1 6.1-6.1h4.5v4.4h-3.3c-.5 0-1.3.3-1.3 1.4v2.9h4.7l-.6 4.3z" fill="#fff" />
        </svg>
      );
    case 'Instagram':
      return (
        <svg {...common} aria-hidden>
          <defs>
            <linearGradient id="igGrad" x1="0" y1="40" x2="40" y2="0">
              <stop stopColor="#F58529" />
              <stop offset="0.5" stopColor="#DD2A7B" />
              <stop offset="1" stopColor="#8134AF" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="url(#igGrad)" />
          <rect x="11" y="11" width="18" height="18" rx="5" stroke="#fff" strokeWidth="2" />
          <circle cx="20" cy="20" r="4.5" stroke="#fff" strokeWidth="2" />
          <circle cx="25.5" cy="14.5" r="1.5" fill="#fff" />
        </svg>
      );
    case 'TikTok':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#010101" />
          <path d="M27.2 14.2c-1.4-.9-2.4-2.3-2.7-4h-3.3v14.2c0 1.8-1.5 3.3-3.3 3.3s-3.3-1.5-3.3-3.3 1.5-3.3 3.3-3.3c.3 0 .7.1 1 .2v-3.4c-.3 0-.7-.1-1-.1-3.7 0-6.7 3-6.7 6.7s3 6.7 6.7 6.7 6.7-3 6.7-6.7V18c1.5 1.1 3.3 1.7 5.2 1.7v-3.4c-1.1 0-2.1-.4-3-.9z" fill="#fff" />
        </svg>
      );
    case 'X / Twitter':
    case 'X':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0F1419" />
          <path d="M11.5 11.5h4.2l4.4 6.1 5-6.1h4.4l-7 8.3 7.4 8.7h-4.2l-4.8-6.6-5.4 6.6h-4.4l7.3-8.7-6.9-8.3z" fill="#fff" />
        </svg>
      );
    case 'YouTube':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#FF0000" />
          <path d="M16 13.5v13l11-6.5-11-6.5z" fill="#fff" />
        </svg>
      );
    case 'Telegram':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#2AABEE" />
          <path d="M29.5 12.2L9.8 19.5c-1.3.5-1.3 1.2-.2 1.5l5 1.6 2 6c.2.6.4.8 1 .8.6 0 .9-.3 1.2-.6l3-2.9 5.5 4.1c1 .6 1.7.3 2-.9l3.6-17c.4-1.5-.5-2.2-1.6-1.7z" fill="#fff" />
        </svg>
      );
    case 'Gmail':
    case 'Google':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#fff" stroke="#E2E8F0" />
          <path d="M10 14l10 7.5L30 14v12H10V14z" fill="#EA4335" />
          <path d="M10 14l10 7.5L10 26V14z" fill="#FBBC05" />
          <path d="M30 14l-10 7.5L30 26V14z" fill="#34A853" />
          <path d="M10 14h20v2.5L20 23.5 10 16.5V14z" fill="#4285F4" />
        </svg>
      );
    case 'Discord':
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#5865F2" />
          <path d="M14.5 15c1.8-.8 3.4-1.2 5.5-1.2s3.7.4 5.5 1.2c.3 1.1.5 2.6.5 4.2 0 1.6-.2 3.1-.5 4.2-1.8.8-3.4 1.2-5.5 1.2s-3.7-.4-5.5-1.2c-.3-1.1-.5-2.6-.5-4.2 0-1.6.2-3.1.5-4.2zm2.3 5.8c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3zm6.4 0c.7 0 1.2-.6 1.2-1.3s-.5-1.3-1.2-1.3-1.2.6-1.2 1.3.5 1.3 1.2 1.3z" fill="#fff" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect width="40" height="40" rx="10" fill="#0f172a" />
          <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">
            {(platform || '?')[0]}
          </text>
        </svg>
      );
  }
}

function badgeClass(b?: AccountProduct['badge']) {
  if (b === 'SOFTREG') return 'badge-softreg';
  if (b === 'AGED') return 'badge-aged';
  if (b === 'PVA') return 'badge-pva';
  return 'badge-instant';
}

function platformKey(p: string) {
  if (p === 'X / Twitter') return 'X / Twitter';
  return p;
}

function offerToProduct(o: {
  id: string;
  platform: string;
  subtype: string;
  title: string;
  shortTitle: string;
  description: string;
  format: string;
  age: string;
  country: string;
  priceNgn: number;
  stock: number;
  sold?: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
  badge?: AccountProduct['badge'];
}): AccountProduct {
  return {
    id: o.id,
    platform: o.platform,
    subtype: o.subtype,
    title: o.title,
    shortTitle: o.shortTitle,
    description: o.description,
    bullets: o.tags.slice(0, 5),
    format: o.format,
    age: o.age,
    country: o.country,
    price: o.priceNgn,
    stock: o.stock,
    sold: o.sold,
    instant: o.instant,
    cookies: o.cookies,
    emailIncluded: o.emailIncluded,
    twoFa: o.twoFa,
    tags: o.tags,
    badge: o.badge,
  };
}

export function AccountsPage({ onBack, session }: { onBack: () => void; session?: AuthSession | null }) {
  const walletBalance = session?.balanceNgn ?? 0;
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string>('All');
  const [subtype, setSubtype] = useState<string | null>(null);
  const [subtypeDrawerOpen, setSubtypeDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [slide, setSlide] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [liveFacebook, setLiveFacebook] = useState<AccountProduct[]>([]);
  const [liveFbSubtypes, setLiveFbSubtypes] = useState<{ name: string; count: number; stock: number }[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch('/api/v1/accounts/catalog?platform=Facebook', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.ok || !Array.isArray(data.offers)) {
          setCatalogError(data?.error || 'Could not load live Facebook stock');
          setLiveFacebook([]);
          setLiveFbSubtypes([]);
          return;
        }
        setLiveFacebook(data.offers.map(offerToProduct));
        setLiveFbSubtypes(
          (data.subtypes || []).map((s: { name: string; count: number; stock: number }) => ({
            name: s.name,
            count: s.count,
            stock: s.stock,
          })),
        );
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof Error ? e.message : 'Network error');
          setLiveFacebook([]);
          setLiveFbSubtypes([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setSubtype(null);
    setSubtypeDrawerOpen(false);
  }, [platform]);

  const catalog = useMemo(() => {
    const nonFb = CATALOG.filter((p) => p.platform !== 'Facebook');
    if (liveFacebook.length > 0) return [...liveFacebook, ...nonFb];
    return CATALOG;
  }, [liveFacebook]);

  const platformSubtypes = useMemo(() => {
    if (platform === 'All') return [] as { name: string; count: number; stock: number }[];
    if (platform === 'Facebook' && liveFbSubtypes.length > 0) return liveFbSubtypes;
    const map = new Map<string, { count: number; stock: number }>();
    for (const p of catalog) {
      if (p.stock <= 0) continue;
      const plat = platformKey(p.platform);
      const matches =
        platform === 'X / Twitter'
          ? plat === 'X / Twitter' || p.platform === 'X'
          : p.platform === platform;
      if (!matches) continue;
      const prev = map.get(p.subtype) || { count: 0, stock: 0 };
      map.set(p.subtype, { count: prev.count + 1, stock: prev.stock + p.stock });
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, stock: v.stock }))
      .sort((a, b) => b.stock - a.stock);
  }, [platform, catalog, liveFbSubtypes]);

  const showSubtypeBar = platform !== 'All' && platformSubtypes.length >= 2;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      if (p.stock <= 0) return false;
      const plat = platformKey(p.platform);
      if (platform !== 'All') {
        if (platform === 'X / Twitter' && plat !== 'X / Twitter' && p.platform !== 'X') return false;
        if (platform !== 'X / Twitter' && p.platform !== platform) return false;
      }
      if (subtype && p.subtype !== subtype) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.platform.toLowerCase().includes(q) ||
        p.subtype.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, platform, subtype, catalog]);

  const activePromo = PROMO_SLIDES[slide];

  function selectPlatform(p: string) {
    setPlatform(p);
  }

  function selectSubtype(name: string | null) {
    setSubtype(name);
    setSubtypeDrawerOpen(false);
  }

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <button type="button" className="accounts-back-link" onClick={onBack} aria-label="Back to Services">
          <ArrowLeft size={18} />
          <span>Services</span>
        </button>
        <div className="accounts-header-center">
          <h1>Buy Accounts & Logs</h1>
          <p>Instant delivery & aged logs</p>
        </div>
        <div className="accounts-wallet-badge" aria-label="Wallet balance">
          <Wallet size={14} />
          <span>{money(walletBalance)}</span>
        </div>
      </header>

      <div className="accounts-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platform, country, or account type..."
          aria-label="Search accounts"
        />
        {query && (
          <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="accounts-chips" role="tablist" aria-label="Platforms">
        {PLATFORMS.map((p) => {
          const count =
            p === 'All'
              ? catalog.filter((prod) => prod.stock > 0).length
              : catalog.filter((prod) => {
                  if (prod.stock <= 0) return false;
                  if (p === 'X / Twitter') return prod.platform === 'X' || prod.platform === 'X / Twitter';
                  return prod.platform === p;
                }).length;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={platform === p}
              className={platform === p ? 'chip active' : 'chip'}
              onClick={() => selectPlatform(p)}
            >
              <span>{p}</span>
              {count > 0 && <span className="chip-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="accounts-meta-row">
        <strong>
          {catalogLoading
            ? 'Loading live stock…'
            : `${filtered.length} listing${filtered.length === 1 ? '' : 's'}`}
        </strong>
        <span className="live-dot">
          <i /> {liveFacebook.length > 0 ? 'Live · In stock only' : 'In stock only'}
        </span>
      </div>
      {catalogError && liveFacebook.length === 0 && (
        <p className="accounts-catalog-hint" role="status">
          Live Facebook feed unavailable — showing demo stock. {catalogError}
        </p>
      )}

      {showSubtypeBar && (
        <button
          type="button"
          className={`accounts-subtype-bar${subtype ? ' is-filtered' : ''}`}
          onClick={() => setSubtypeDrawerOpen(true)}
          aria-expanded={subtypeDrawerOpen}
          aria-haspopup="dialog"
        >
          <span className="subtype-bar-icon" aria-hidden>
            <FolderOpen size={16} />
          </span>
          <span className="subtype-bar-copy">
            {subtype ? (
              <>
                <strong>
                  {platform} › {subtype}
                </strong>
                <small>
                  {platformSubtypes.find((s) => s.name === subtype)?.count ?? 0} listing
                  {(platformSubtypes.find((s) => s.name === subtype)?.count ?? 0) === 1 ? '' : 's'}
                </small>
              </>
            ) : (
              <>
                <strong>
                  All {platform} Accounts ({filtered.length})
                </strong>
                <small>Tap to filter by type (Marketplace, Aged, Softreg…)</small>
              </>
            )}
          </span>
          <span className="subtype-bar-action">
            {subtype ? 'Change' : ''}
            <ChevronRight size={16} />
          </span>
        </button>
      )}

      <div className="accounts-promo">
        <div className="promo-slide">
          <img className="accounts-promo-logo" src="/brand/verxor-logo.svg" alt="Verxor" width="28" height="28" />
          <div className="promo-copy">
            <strong>{activePromo.title}</strong>
            <p>{activePromo.body}</p>
            <button type="button" className="promo-cta">
              {activePromo.cta}
            </button>
          </div>
          <div className="promo-art" aria-hidden>
            <div className="promo-stack" />
          </div>
        </div>
        <div className="promo-dots" role="tablist" aria-label="Promo slides">
          {PROMO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === slide ? 'dot active' : 'dot'}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </div>

      <div className="accounts-list">
        {filtered.map((p) => (
          <article
            key={p.id}
            className="account-card-row"
            onClick={() => setSelected(p)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected(p);
              }
            }}
          >
            <div className="card-row-left">
              <div className="card-row-logo-wrap">
                <BrandLogo platform={p.platform} size={36} />
              </div>
            </div>
            <div className="card-row-main">
              <div className="card-row-eyebrow">
                <span className="card-platform-tag">{p.platform}</span>
                {p.badge && <span className={badgeClass(p.badge)}>{p.badge}</span>}
                {p.twoFa && <span className="card-mini-flag">2FA</span>}
                {p.cookies && <span className="card-mini-flag">COOKIES</span>}
              </div>
              <h3 className="card-row-title">{p.title}</h3>
              <div className="card-row-meta">
                <span className="card-meta-spec">
                  {p.age} · {p.country}
                  {p.tags[0] ? ` · ${p.tags[0]}` : ''}
                </span>
                <span className="card-meta-stock">
                  <i className="stock-dot" /> {p.stock.toLocaleString()} in stock
                </span>
              </div>
            </div>
            <div className="card-row-right">
              <div className="card-row-price-wrap">
                <strong className="card-row-price">{money(p.price)}</strong>
              </div>
              <button
                type="button"
                className="card-row-buy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                }}
              >
                Buy →
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && !catalogLoading && (
        <Card className="accounts-empty">
          <Package size={22} />
          <strong>No accounts match</strong>
          <p>Try another platform or clear search.</p>
        </Card>
      )}

      {selected && (
        <AccountDetail
          product={selected}
          wallet={walletBalance}
          onClose={() => setSelected(null)}
          onCheckoutBlocked={(msg) => setToast(msg)}
        />
      )}

      {subtypeDrawerOpen && showSubtypeBar && (
        <div className="sheet-backdrop subtype-drawer-backdrop" onClick={() => setSubtypeDrawerOpen(false)}>
          <section
            className="subtype-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="subtype-drawer-title"
          >
            <div className="subtype-drawer-handle" aria-hidden />
            <header className="subtype-drawer-head">
              <div>
                <h2 id="subtype-drawer-title">{platform} Categories</h2>
                <p>{platformSubtypes.length} types available</p>
              </div>
              <button
                type="button"
                className="subtype-drawer-close"
                onClick={() => setSubtypeDrawerOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>
            <div className="subtype-drawer-list" role="listbox" aria-label={`${platform} sub-categories`}>
              <button
                type="button"
                role="option"
                aria-selected={subtype === null}
                className={`subtype-option${subtype === null ? ' is-active' : ''}`}
                onClick={() => selectSubtype(null)}
              >
                <span className="subtype-option-main">
                  <strong>All {platform}</strong>
                  <small>Show every in-stock listing</small>
                </span>
                <span className="subtype-option-meta">
                  <span className="subtype-option-count">
                    {catalog.filter((p) => {
                      if (p.stock <= 0) return false;
                      if (platform === 'X / Twitter') return p.platform === 'X' || p.platform === 'X / Twitter';
                      return p.platform === platform;
                    }).length}
                  </span>
                  {subtype === null && (
                    <span className="subtype-option-check" aria-hidden>
                      <Check size={14} />
                    </span>
                  )}
                </span>
              </button>
              {platformSubtypes.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  role="option"
                  aria-selected={subtype === s.name}
                  className={`subtype-option${subtype === s.name ? ' is-active' : ''}`}
                  onClick={() => selectSubtype(s.name)}
                >
                  <span className="subtype-option-main">
                    <strong>{s.name}</strong>
                    <small>
                      {s.stock.toLocaleString()} units · {s.count} listing{s.count === 1 ? '' : 's'}
                    </small>
                  </span>
                  <span className="subtype-option-meta">
                    <span className="subtype-option-count">{s.count}</span>
                    {subtype === s.name && (
                      <span className="subtype-option-check" aria-hidden>
                        <Check size={14} />
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="accounts-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function AccountDetail({
  product,
  wallet,
  onClose,
  onCheckoutBlocked,
}: {
  product: AccountProduct;
  wallet: number;
  onClose: () => void;
  onCheckoutBlocked: (msg: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const total = product.price * qty;
  const canPay = wallet >= total;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="account-detail-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="detail-sheet-head">
          <div className="detail-head-main">
            <BrandLogo platform={product.platform} size={40} />
            <div>
              <span className="accounts-eyebrow">{product.platform}</span>
              <h2>{product.shortTitle}</h2>
              <small>
                {product.age} · {product.country} · {product.stock.toLocaleString()} in stock
              </small>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="detail-bold-flow">
          <div className="detail-desc-block">
            <span className="detail-section-title">Description</span>
            <p className="detail-lead">{product.description}</p>
          </div>
          {product.bullets.length > 0 && (
            <div className="detail-features-block">
              <span className="detail-section-title">Key features</span>
              <ul className="detail-bullets">
                {product.bullets.map((b) => (
                  <li key={b}>
                    <Check size={14} /> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="detail-format-block">
            <span className="detail-section-title">Account format</span>
            <div className="detail-format-pill">
              <code>{product.format}</code>
            </div>
          </div>
          <div className="detail-guarantee-box">
            <ShieldCheck size={16} />
            <div>
              <strong>24-hour replacement window</strong>
              <p>Invalid on delivery is replaced when reported within policy.</p>
            </div>
          </div>
        </div>

        <div className="detail-qty-row">
          <span>Quantity</span>
          <div className="qty-stepper">
            <button type="button" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
              <Minus size={14} />
            </button>
            <strong>{qty}</strong>
            <button
              type="button"
              disabled={qty >= Math.min(10, product.stock)}
              onClick={() => setQty((q) => Math.min(10, product.stock, q + 1))}
              aria-label="Increase"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="detail-price-row">
          <div>
            <span>Total payable</span>
            <small>{money(product.price)} each</small>
          </div>
          <strong>{money(total)}</strong>
        </div>

        <div className="detail-wallet-indicator">
          <span>Wallet</span>
          <strong>{money(wallet)}</strong>
        </div>

        <PrimaryButton
          className="detail-order-btn"
          onClick={() => {
            if (!canPay) {
              onCheckoutBlocked('Insufficient wallet balance. Fund wallet to continue.');
              return;
            }
            onCheckoutBlocked('Checkout connects on the next release — catalog is live.');
          }}
        >
          {canPay ? `Pay ${money(total)}` : 'Fund Wallet'}
          <ArrowRight size={16} />
        </PrimaryButton>

        <p className="detail-footnote">
          Credentials appear in your logs after a successful order.
        </p>
      </div>
    </div>
  );
}
