'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FolderOpen,
  Package,
  Search,
  ShieldCheck,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';
import type { AuthSession } from './auth/AuthFlow';
import type { AccountProduct } from './accounts-types';
import { DescriptionBody } from './accounts-description';
import { MyLogsPage } from './MyLogsPage';
import { loadSessionTokens } from './auth/session-unlock';

/**
 * Buy Accounts & Logs — Verxor marketplace
 * All platforms load live AccsZone stock, cached briefly in localStorage.
 */

export type { AccountProduct } from './accounts-types';

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'TikTok',
  'X / Twitter',
  'Telegram',
] as const;

/** Platforms with live AccsZone checkout. Chips above match this list 1:1. */
const LIVE_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram'] as const;
const LIVE_PLATFORM_SET = new Set<string>(LIVE_PLATFORMS);

/** Live stock cache is considered fresh for 15 minutes. */
const CAT_CACHE_TTL_MS = 15 * 60 * 1000;

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
  providerListingId?: number;
}): AccountProduct {
  return {
    id: o.id,
    providerListingId: o.providerListingId,
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
  const [showMyLogs, setShowMyLogs] = useState(false);
  const [slide, setSlide] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [liveByPlatform, setLiveByPlatform] = useState<
    Record<
      string,
      {
        offers: AccountProduct[];
        subtypes: { name: string; count: number; stock: number }[];
      }
    >
  >({});
  const [loadingPlatforms, setLoadingPlatforms] = useState<Record<string, boolean>>({});
  const [errorByPlatform, setErrorByPlatform] = useState<Record<string, string | null>>({});

  const loadPlatformStock = useCallback(async (p: string) => {
    if (!LIVE_PLATFORM_SET.has(p)) return;
    const cacheKey = `verxor:cat:${p.toLowerCase()}:v1`;
    type Cat = { offers: unknown[]; subtypes: { name: string; count: number; stock: number }[] };

    let hadFreshCache = false;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const saved = JSON.parse(raw) as { at: number; data: Cat };
        if (saved?.data && Array.isArray(saved.data.offers) && saved.data.offers.length > 0) {
          // Hydrate immediately from cache (fresh or stale) so the list is never blank,
          // but only treat fresh cache as authoritative — stale cache triggers a re-fetch.
          setLiveByPlatform((prev) => ({
            ...prev,
            [p]: {
              offers: (saved.data.offers as Parameters<typeof offerToProduct>[0][]).map(offerToProduct),
              subtypes: saved.data.subtypes || [],
            },
          }));
          hadFreshCache = Date.now() - (saved.at || 0) < CAT_CACHE_TTL_MS;
        }
      }
    } catch {
      /* ignore */
    }

    if (!hadFreshCache) {
      setLoadingPlatforms((prev) => ({ ...prev, [p]: true }));
    }
    setErrorByPlatform((prev) => ({ ...prev, [p]: null }));

    async function fetchOnce(): Promise<Cat> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(`/api/v1/accounts/catalog?platform=${encodeURIComponent(p)}`, {
          signal: ctrl.signal,
        });
        const text = await res.text();
        let data: (Cat & { ok?: boolean; error?: string }) | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Stock is refreshing. Retrying…');
        }
        if (!data?.ok || !Array.isArray(data.offers)) {
          throw new Error(data?.error || `Could not load live ${p} stock`);
        }
        return data;
      } finally {
        clearTimeout(timer);
      }
    }

    let lastErr = `Could not load live ${p} stock`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!mountedRef.current) return;
      try {
        const data = await fetchOnce();
        if (!mountedRef.current) return;
        const offers = (data.offers as Parameters<typeof offerToProduct>[0][]).map(offerToProduct);
        const subtypes = (data.subtypes || []).map((sub) => ({
          name: sub.name,
          count: sub.count,
          stock: sub.stock,
        }));
        setLiveByPlatform((prev) => ({
          ...prev,
          [p]: { offers, subtypes },
        }));
        setErrorByPlatform((prev) => ({ ...prev, [p]: null }));
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data }));
        } catch {
          /* storage full */
        }
        setLoadingPlatforms((prev) => ({ ...prev, [p]: false }));
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'Network error';
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }

    if (!mountedRef.current) return;
    setErrorByPlatform((prev) => ({ ...prev, [p]: lastErr }));
    setLoadingPlatforms((prev) => ({ ...prev, [p]: false }));
  }, []);

  // Auto-load live stock for every platform on mount.
  useEffect(() => {
    for (const p of LIVE_PLATFORMS) {
      void loadPlatformStock(p);
    }
  }, [loadPlatformStock]);

  useEffect(() => {
    if (selected || showMyLogs) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [selected, showMyLogs]);

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
    const list: AccountProduct[] = [];
    for (const stock of Object.values(liveByPlatform)) {
      list.push(...stock.offers);
    }
    return list;
  }, [liveByPlatform]);

  const platformSubtypes = useMemo(() => {
    if (platform === 'All') return [] as { name: string; count: number; stock: number }[];
    const live = liveByPlatform[platform];
    if (live && live.subtypes.length > 0) return live.subtypes;
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
  }, [platform, catalog, liveByPlatform]);

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

  if (showMyLogs) {
    return <MyLogsPage onBack={() => setShowMyLogs(false)} session={session} />;
  }

  // Full-page product detail (AccsMarket-style) — replaces list, not a popup sheet
  if (selected) {
    return (
      <AccountDetail
        product={selected}
        wallet={walletBalance}
        onClose={() => setSelected(null)}
        onCheckoutBlocked={(msg) => setToast(msg)}
        onOpenLogs={() => setShowMyLogs(true)}
      />
    );
  }

  function selectPlatform(p: string) {
    setPlatform(p);
    if (LIVE_PLATFORM_SET.has(p) && !liveByPlatform[p]) {
      void loadPlatformStock(p);
    }
  }

  function selectSubtype(name: string | null) {
    setSubtype(name);
    setSubtypeDrawerOpen(false);
  }

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <button
          type="button"
          className="accounts-back-btn"
          onClick={onBack}
          aria-label="Back to Services"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="accounts-header-titles">
          <h1>Buy Accounts & Logs</h1>
          <p>Instant delivery & aged logs</p>
        </div>
        <button
          type="button"
          className="accounts-orders-btn"
          onClick={() => setShowMyLogs(true)}
          aria-label="My Orders"
        >
          <Package size={15} strokeWidth={2.2} />
          <span>My Orders</span>
        </button>
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

      {(() => {
        const anyLoading = Object.values(loadingPlatforms).some(Boolean);
        const isCurrentLoading =
          platform === 'All'
            ? anyLoading && catalog.length === 0
            : Boolean(loadingPlatforms[platform]);
        const isCurrentLive =
          platform === 'All'
            ? Object.values(liveByPlatform).some((st) => st.offers.length > 0)
            : Boolean(liveByPlatform[platform]?.offers.length);
        const currentLiveOffers = platform !== 'All' ? liveByPlatform[platform]?.offers : null;
        const allFeedsFailed =
          LIVE_PLATFORMS.every((p) => (liveByPlatform[p]?.offers.length ?? 0) === 0) &&
          LIVE_PLATFORMS.every((p) => errorByPlatform[p]);
        const currentError =
          platform !== 'All'
            ? errorByPlatform[platform]
            : allFeedsFailed
              ? 'Live stock feed is unavailable right now. Tap a platform to retry.'
              : null;

        return (
          <>
            <div className="accounts-meta-row">
              <strong>
                {isCurrentLoading
                  ? 'Loading live stock…'
                  : `${filtered.length} listing${filtered.length === 1 ? '' : 's'}`}
              </strong>
              <span className="live-dot">
                <i /> {isCurrentLive ? 'Live · In stock only' : 'In stock only'}
              </span>
            </div>
            {currentError && (!currentLiveOffers || currentLiveOffers.length === 0) && (
              <p className="accounts-catalog-hint" role="status">
                {currentError}
              </p>
            )}
          </>
        );
      })()}

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
          <div
            key={p.id}
            className="account-card-row"
            onClick={() => setSelected(p)}
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
          </div>
        ))}
      </div>

      {!filtered.length && !Object.values(loadingPlatforms).some(Boolean) && (
        <Card className="accounts-empty">
          <Package size={22} />
          <strong>No accounts match</strong>
          <p>Try another platform or clear search.</p>
        </Card>
      )}

      {subtypeDrawerOpen && showSubtypeBar && (
        <div className="sheet-backdrop subtype-drawer-backdrop" onClick={() => setSubtypeDrawerOpen(false)}>
          <div className="subtype-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="subtype-drawer-handle" />
            <div className="subtype-drawer-head">
              <div>
                <strong>{platform} Categories ({platformSubtypes.length})</strong>
                <p>Filter listings by type</p>
              </div>
              <button type="button" onClick={() => setSubtypeDrawerOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="subtype-option-list">
              <button
                type="button"
                className={`subtype-option${!subtype ? ' active' : ''}`}
                onClick={() => selectSubtype(null)}
              >
                <div className="subtype-option-main">
                  <strong>All {platform}</strong>
                  <small>{filtered.length} listings</small>
                </div>
                {!subtype && <Check size={16} />}
              </button>
              {platformSubtypes.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`subtype-option${subtype === s.name ? ' active' : ''}`}
                  onClick={() => selectSubtype(s.name)}
                >
                  <div className="subtype-option-main">
                    <strong>{s.name}</strong>
                    <small>
                      {s.count} · {s.stock.toLocaleString()} in stock
                    </small>
                  </div>
                  {subtype === s.name && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="accounts-toast">{toast}</div>}
    </div>
  );
}

function AccountDetail({
  product,
  wallet,
  onClose,
  onCheckoutBlocked,
  onOpenLogs,
}: {
  product: AccountProduct;
  wallet: number;
  onClose: () => void;
  onCheckoutBlocked: (msg: string) => void;
  onOpenLogs: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<{ orderId: string | null; credentials: string[]; totalNgn: number; warning?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const total = product.price * qty;
  const LIVE_CHECKOUT_SET = useMemo(
    () => new Set(['Facebook', 'Instagram', 'TikTok', 'X / Twitter', 'Telegram', 'X']),
    [],
  );
  const isLiveListing = LIVE_CHECKOUT_SET.has(product.platform) && Number(product.providerListingId) > 0;
  const canPay = wallet >= total;

  async function submitPurchase() {
    if (buying) return;
    if (!isLiveListing) {
      setBuyError('Live checkout is currently available for Facebook, Instagram, TikTok, X / Twitter, and Telegram.');
      return;
    }
    const token = loadSessionTokens()?.access_token;
    if (!token) {
      setBuyError('Your secure session has expired. Sign in again before purchasing.');
      return;
    }
    setBuying(true);
    setBuyError(null);
    try {
      const res = await fetch('/api/v1/accounts/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ providerListingId: product.providerListingId, quantity: qty, platform: product.platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Purchase could not be completed.');
      const credentials = Array.isArray(data.credentials) ? data.credentials.map(String) : [];
      if (!credentials.length) throw new Error('The provider confirmed the purchase, but no account details were returned. Contact support before retrying.');
      setPurchase({ orderId: data.orderId ? String(data.orderId) : null, credentials, totalNgn: Number(data.totalNgn) || total, warning: data.warning || undefined });
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('verxor:balance-refresh'));
    } catch (error) {
      setBuyError(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
    } finally {
      setBuying(false);
    }
  }

  if (purchase) {
    return (
      <div className="account-detail-page account-purchase-result">
        <header className="detail-page-header">
          <button
            type="button"
            className="accounts-back-btn"
            onClick={onClose}
            aria-label="Back to listings"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <strong className="account-result-header">Order delivered</strong>
          <span style={{ width: 40 }} />
        </header>
        <main className="account-result-body">
          <div className="account-result-icon"><CheckCircle2 size={30} /></div>
          <p className="account-result-kicker">PAYMENT CONFIRMED</p>
          <h1>Your account{purchase.credentials.length === 1 ? ' is' : 's are'} ready</h1>
          <p className="account-result-summary">{product.title} · {purchase.credentials.length} delivered · {money(purchase.totalNgn)}</p>
          {purchase.orderId && <p className="account-result-reference">Order reference <code>{purchase.orderId}</code></p>}
          {purchase.warning && <p className="account-result-warning" role="status">{purchase.warning}</p>}
          <section className="account-delivery-credentials" aria-label="Delivered account credentials">
            <div className="account-credentials-heading"><div><strong>Delivered credentials</strong><span>Keep these details private and secure.</span></div><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(purchase.credentials.join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setBuyError('Clipboard access is unavailable. Select and copy the credentials manually.'); } }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy all'}</button></div>
            <div className="account-credential-list">{purchase.credentials.map((line, index) => <code key={`${index}-${line}`}>{line}</code>)}</div>
          </section>
          {buyError && <p className="account-checkout-error" role="alert">{buyError}</p>}
          <div className="account-result-actions"><PrimaryButton className="detail-order-btn" onClick={onOpenLogs}>View My Logs <ArrowRight size={16} /></PrimaryButton><button type="button" className="account-secondary-action" onClick={onClose}>Continue browsing</button></div>
        </main>
      </div>
    );
  }

  return (
    <div className="account-detail-page">
      <header className="detail-page-header">
        <button
          type="button"
          className="accounts-back-btn"
          onClick={onClose}
          aria-label="Back to listings"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="detail-page-header-center">
          <span className="accounts-eyebrow">{product.platform}</span>
          <strong>Account details</strong>
        </div>
        <button
          type="button"
          className="accounts-orders-btn"
          onClick={onOpenLogs}
          aria-label="My Orders"
        >
          <Package size={15} strokeWidth={2.2} />
          <span>My Orders</span>
        </button>
      </header>

      <div className="detail-page-hero">
        <div className="detail-page-hero-logo">
          <BrandLogo platform={product.platform} size={48} />
        </div>
        <div className="detail-page-hero-copy">
          <h1>{product.title}</h1>
          <p className="detail-page-meta">
            {product.age} · {product.country} ·{' '}
            <span className="detail-page-stock">{product.stock.toLocaleString()} in stock</span>
          </p>
          <div className="detail-page-flags">
            {product.badge && <span className={badgeClass(product.badge)}>{product.badge}</span>}
            {product.twoFa && <span className="card-mini-flag">2FA</span>}
            {product.cookies && <span className="card-mini-flag">COOKIES</span>}
            {product.instant && <span className="badge-instant">INSTANT</span>}
          </div>
        </div>
      </div>

      <div className="detail-page-body">
        <section className="detail-page-section">
          <h2 className="detail-section-title">Description</h2>
          <DescriptionBody text={product.description} />
        </section>

        {product.bullets.length > 0 && (
          <section className="detail-page-section">
            <h2 className="detail-section-title">Key features</h2>
            <ul className="detail-bullets">
              {product.bullets.map((b) => (
                <li key={b}>
                  <Check size={14} /> {b}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="detail-page-section">
          <h2 className="detail-section-title">Account format</h2>
          <div className="detail-format-pill">
            <code>{product.format}</code>
          </div>
        </section>

        <section className="detail-guarantee-box">
          <ShieldCheck size={16} />
          <div>
            <strong>24-hour replacement window</strong>
            <p>Invalid on delivery is replaced when reported within policy.</p>
          </div>
        </section>
      </div>

      <div className="detail-page-checkout">
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

        {buyError && <p className="account-checkout-error" role="alert">{buyError}</p>}
        <PrimaryButton
          className="detail-order-btn"
          disabled={buying || !isLiveListing}
          onClick={() => {
            if (!canPay) {
              onCheckoutBlocked('Insufficient wallet balance. Fund wallet to continue.');
              return;
            }
            void submitPurchase();
          }}
        >
          {buying ? 'Processing secure payment…' : isLiveListing ? (canPay ? `Pay ${money(total)}` : 'Fund Wallet') : 'Coming soon'}
          {!buying && <ArrowRight size={16} />}
        </PrimaryButton>

        <p className="detail-footnote">Secure wallet payment · Credentials are delivered here and saved to My Logs.</p>
      </div>
    </div>
  );
}

