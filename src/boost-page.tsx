'use client';

import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Coins,
  Hash,
  Inbox,
  Info,
  Link2,
  RefreshCw,
  Rocket,
  Search,
  Wallet,
  X,
  AlertTriangle,
} from 'lucide-react';
import './boost-page.css';

/* --- Types --- */

type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'telegram'
  | 'spotify'
  | 'audiomack';

type BoostService = {
  id: string;
  platform: PlatformId;
  title: string;
  ratePer1000: number;
  min: number;
  max: number;
};

type Category = {
  id: PlatformId;
  label: string;
  placeholder: string;
  linkHint: string;
  urlPattern: RegExp;
};

type OrderStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'canceled';

type BoostOrder = {
  id: string;
  serviceTitle: string;
  platform: PlatformId;
  targetUrl: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://www.tiktok.com/@username',
    linkHint: 'Paste your TikTok profile or video link',
    urlPattern: /tiktok\.com/i,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    placeholder: 'https://www.instagram.com/p/yourpost/',
    linkHint: 'Paste your Instagram post or profile link',
    urlPattern: /instagram\.com/i,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/watch?v=',
    linkHint: 'Paste your YouTube video or channel link',
    urlPattern: /(youtube\.com|youtu\.be)/i,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/',
    linkHint: 'Paste your Facebook page or post link',
    urlPattern: /facebook\.com/i,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    linkHint: 'Paste your X profile or post link',
    urlPattern: /(x\.com|twitter\.com)/i,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    placeholder: 'https://t.me/channel',
    linkHint: 'Paste your Telegram channel or post link',
    urlPattern: /t\.me/i,
  },
  {
    id: 'spotify',
    label: 'Spotify',
    placeholder: 'https://open.spotify.com/',
    linkHint: 'Paste your Spotify track or playlist link',
    urlPattern: /spotify\.com/i,
  },
  {
    id: 'audiomack',
    label: 'Audiomack',
    placeholder: 'https://audiomack.com/',
    linkHint: 'Paste your Audiomack track or profile link',
    urlPattern: /audiomack\.com/i,
  },
];

const SERVICES: BoostService[] = [
  {
    id: 'tt-followers-guaranteed',
    platform: 'tiktok',
    title: 'TikTok Followers [Max 10M] [LQ Profile] [Refill: 10D] [Instant Start] 200K/Day',
    ratePer1000: 4858.67,
    min: 10,
    max: 1_000_000,
  },
  {
    id: 'tt-followers-hq',
    platform: 'tiktok',
    title: 'TikTok Followers [HQ] [Refill: 30D] [Max 500K] 50K/Day',
    ratePer1000: 8200,
    min: 50,
    max: 500_000,
  },
  {
    id: 'tt-likes',
    platform: 'tiktok',
    title: 'TikTok Likes [Instant] [Max 5M] [No Refill] 500K/Day',
    ratePer1000: 1100,
    min: 50,
    max: 5_000_000,
  },
  {
    id: 'tt-views',
    platform: 'tiktok',
    title: 'TikTok Views [Real] [Max 10M] [Instant Start] 1M/Day',
    ratePer1000: 250,
    min: 500,
    max: 10_000_000,
  },
  {
    id: 'ig-followers',
    platform: 'instagram',
    title: 'Instagram Followers [Max 50K] [Refill: 30D] [HQ] 10K/Day',
    ratePer1000: 2500,
    min: 100,
    max: 50_000,
  },
  {
    id: 'ig-likes',
    platform: 'instagram',
    title: 'Instagram Likes [Instant] [Max 100K] [No Drop] 50K/Day',
    ratePer1000: 800,
    min: 50,
    max: 100_000,
  },
  {
    id: 'ig-views',
    platform: 'instagram',
    title: 'Instagram Views / Reels [Max 500K] [Instant] 100K/Day',
    ratePer1000: 300,
    min: 100,
    max: 500_000,
  },
  {
    id: 'yt-subs',
    platform: 'youtube',
    title: 'YouTube Subscribers [Refill: 30D] [Max 10K] [HQ]',
    ratePer1000: 12000,
    min: 50,
    max: 10_000,
  },
  {
    id: 'yt-views',
    platform: 'youtube',
    title: 'YouTube Views [Retention 60%] [Max 100K] [Speed 20K/Day]',
    ratePer1000: 1500,
    min: 100,
    max: 100_000,
  },
  {
    id: 'fb-page-likes',
    platform: 'facebook',
    title: 'Facebook Page Likes [Max 20K] [Refill: 15D]',
    ratePer1000: 4000,
    min: 50,
    max: 20_000,
  },
  {
    id: 'fb-followers',
    platform: 'facebook',
    title: 'Facebook Followers [Max 20K] [Instant Start]',
    ratePer1000: 4500,
    min: 50,
    max: 20_000,
  },
  {
    id: 'x-followers',
    platform: 'x',
    title: 'X Followers [Max 20K] [Refill: 30D] [HQ]',
    ratePer1000: 5000,
    min: 50,
    max: 20_000,
  },
  {
    id: 'x-likes',
    platform: 'x',
    title: 'X Likes [Instant] [Max 50K]',
    ratePer1000: 1200,
    min: 50,
    max: 50_000,
  },
  {
    id: 'tg-members',
    platform: 'telegram',
    title: 'Telegram Channel Members [Max 50K] [Real]',
    ratePer1000: 3500,
    min: 100,
    max: 50_000,
  },
  {
    id: 'spotify-plays',
    platform: 'spotify',
    title: 'Spotify Plays [Max 1M] [Premium Accounts]',
    ratePer1000: 1800,
    min: 500,
    max: 1_000_000,
  },
  {
    id: 'audiomack-plays',
    platform: 'audiomack',
    title: 'Audiomack Plays [Max 500K] [Real]',
    ratePer1000: 900,
    min: 100,
    max: 500_000,
  },
];

const CATEGORY_CHIPS: { id: PlatformId; label: string }[] = [
  { id: 'tiktok', label: 'TikTok Followers [Guaranteed]' },
  { id: 'instagram', label: 'Instagram Growth' },
  { id: 'youtube', label: 'YouTube Growth' },
  { id: 'facebook', label: 'Facebook Growth' },
  { id: 'x', label: 'X (Twitter) Growth' },
  { id: 'telegram', label: 'Telegram Growth' },
  { id: 'spotify', label: 'Spotify Plays' },
  { id: 'audiomack', label: 'Audiomack Plays' },
];

const WALLET_BALANCE = 0.27;

function money(n: number) {
  return 'NGN ' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number) {
  return n.toLocaleString('en-NG');
}

function PlatformMark({ platform, size = 22 }: { platform: PlatformId; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  switch (platform) {
    case 'tiktok':
      return (
        <svg {...s} fill="#0F1419">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64 6.34 6.34 0 0 0 15.83 15.3V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.08-.36z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...s}>
          <defs>
            <linearGradient id="igBoost" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f58529" />
              <stop offset="50%" stopColor="#dd2a7b" />
              <stop offset="100%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igBoost)" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...s} fill="#FF0000">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...s} fill="#1877F2">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
        </svg>
      );
    case 'x':
      return (
        <svg {...s} fill="#0F1419">
          <path d="M18.24 2H21.5l-7.05 8.06L22.5 22h-6.17l-4.83-6.31L6.3 22H3.02l7.54-8.62L1.5 2h6.33l4.36 5.78L18.24 2zm-1.08 18.1h1.81L7.03 3.8H5.09l12.07 16.3z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg {...s} fill="#26A5E4">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.6 7.56c-.12.54-.43.67-.87.42l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.04c.19-.17-.04-.27-.3-.1l-5.53 3.48-2.38-.74c-.52-.16-.53-.52.11-.77l9.3-3.58c.43-.2.81.1.68.61z" />
        </svg>
      );
    case 'spotify':
      return (
        <svg {...s} fill="#1DB954">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.6 14.45c-.18.3-.56.4-.86.22-2.36-1.44-5.34-1.77-8.84-.97-.34.08-.68-.13-.76-.47-.08-.34.13-.68.47-.76 3.84-.88 7.14-.5 9.78 1.12.3.18.4.56.21.86zm1.23-2.74c-.23.37-.71.49-1.08.26-2.7-1.66-6.82-2.14-10.02-1.17-.41.12-.85-.11-.97-.52-.12-.41.11-.85.52-.97 3.66-1.11 8.16-.57 11.28 1.34.37.23.49.71.27 1.06zm.1-2.85C14.8 8.6 9.08 8.4 5.86 9.38c-.5.15-1.02-.13-1.17-.62-.15-.5.13-1.02.62-1.17 3.7-1.12 9.86-.9 13.74 1.36.45.27.6.86.33 1.31-.27.45-.86.6-1.31.33z" />
        </svg>
      );
    case 'audiomack':
      return (
        <svg {...s} fill="#FFA200">
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2l6.5 3.6v1.4L12 12.8 5.5 9.2V7.8L12 4.2zM5 11.1l6 3.3v5.1l-6-3.3v-5.1zm8 8.4v-5.1l6-3.3v5.1l-6 3.3z" />
        </svg>
      );
    default: {
      const label = String(platform ?? '?');
      return <span className="boost-mark-fallback">{label.slice(0, 1).toUpperCase()}</span>;
    }
  }
}

function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="boost-sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="boost-sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="boost-sheet">
        <div className="boost-sheet-handle" aria-hidden />
        <div className="boost-sheet-head">
          <strong>{title}</strong>
          <button type="button" className="boost-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="boost-sheet-body">{children}</div>
      </div>
    </div>
  );
}

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'st-pending' },
  processing: { label: 'In Progress', className: 'st-processing' },
  completed: { label: 'Completed', className: 'st-completed' },
  partial: { label: 'Partial', className: 'st-partial' },
  canceled: { label: 'Canceled', className: 'st-canceled' },
};

export function BoostPage({ onBack }: { onBack: () => void }) {
  const [categoryId, setCategoryId] = useState<PlatformId | ''>('');
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [qty, setQty] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const [catQuery, setCatQuery] = useState('');
  const [svcQuery, setSvcQuery] = useState('');
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const categoryChip = CATEGORY_CHIPS.find((c) => c.id === categoryId);

  const servicesForCat = useMemo(
    () => (categoryId ? SERVICES.filter((s) => s.platform === categoryId) : []),
    [categoryId],
  );

  const selected = servicesForCat.find((s) => s.id === serviceId);

  const filteredCats = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return CATEGORY_CHIPS;
    return CATEGORY_CHIPS.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q));
  }, [catQuery]);

  const filteredSvcs = useMemo(() => {
    const q = svcQuery.trim().toLowerCase();
    if (!q) return servicesForCat;
    return servicesForCat.filter((s) => s.title.toLowerCase().includes(q));
  }, [svcQuery, servicesForCat]);

  const qtyNum = Number(qty);
  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0;

  const total = useMemo(() => {
    if (!selected || !qtyValid) return 0;
    return Math.round((qtyNum / 1000) * selected.ratePer1000 * 100) / 100;
  }, [selected, qtyNum, qtyValid]);

  const linkMismatch = useMemo(() => {
    if (!category || !link.trim()) return false;
    return !category.urlPattern.test(link.trim());
  }, [category, link]);

  const qtyOutOfRange =
    selected && qtyValid ? qtyNum < selected.min || qtyNum > selected.max : false;

  const insufficient = total > 0 && total > WALLET_BALANCE;
  const formReady =
    !!selected && !!link.trim() && qtyValid && !qtyOutOfRange && !linkMismatch && total > 0;

  const selectCategory = (id: PlatformId) => {
    setCategoryId(id);
    setServiceId('');
    setCatOpen(false);
    setCatQuery('');
  };

  const selectService = (id: string) => {
    setServiceId(id);
    setSvcOpen(false);
    setSvcQuery('');
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const handlePlaceOrder = async () => {
    if (!formReady || !selected || insufficient) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const order: BoostOrder = {
      id: 'BX-' + Date.now().toString(36).toUpperCase(),
      serviceTitle: selected.title,
      platform: selected.platform,
      targetUrl: link.trim(),
      quantity: qtyNum,
      amount: total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [order, ...prev]);
    setSubmitting(false);
    setLink('');
    setQty('');
    showToast('Order placed successfully');
  };

  const handleFundWallet = () => {
    showToast('Opening Fund Wallet...');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
    showToast(orders.length ? 'Orders refreshed' : 'No orders yet');
  };

  const ctaDisabled =
    submitting ||
    (!insufficient && (!formReady || !!qtyOutOfRange || linkMismatch));

  let ctaLabel = 'Place Order';
  let ctaAction = handlePlaceOrder;
  let ctaClass = 'boost-cta';

  if (insufficient && formReady) {
    ctaLabel = 'Fund Wallet';
    ctaAction = handleFundWallet;
    ctaClass = 'boost-cta boost-cta-fund';
  } else if (!selected) {
    ctaLabel = 'Select a service';
  } else if (!link.trim()) {
    ctaLabel = 'Enter target link';
  } else if (linkMismatch) {
    ctaLabel = 'Fix link mismatch';
  } else if (!qtyValid) {
    ctaLabel = 'Enter quantity';
  } else if (qtyOutOfRange && selected) {
    ctaLabel =
      qtyNum < selected.min
        ? 'Minimum is ' + formatQty(selected.min)
        : 'Maximum is ' + formatQty(selected.max);
  } else if (submitting) {
    ctaLabel = 'Placing order...';
  }

  return (
    <div className="boost-page">
      <header className="boost-topbar">
        <button type="button" className="boost-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <h1 className="boost-title">Boost Account</h1>
        <span className="boost-balance-pill" aria-label="Wallet balance">
          <Wallet size={13} strokeWidth={2.4} />
          {money(WALLET_BALANCE)}
        </span>
      </header>

      <section className="boost-hero" aria-label="Boost Your Account">
        <div className="boost-hero-icon" aria-hidden>
          <Rocket size={26} strokeWidth={1.8} />
        </div>
        <div className="boost-hero-copy">
          <strong>Boost Your Account</strong>
          <p>Get followers, likes, views and more instantly</p>
        </div>
        <div className="boost-hero-icons" aria-hidden>
          <span className="boost-hero-social">
            <PlatformMark platform="tiktok" size={14} />
          </span>
          <span className="boost-hero-social">
            <PlatformMark platform="instagram" size={14} />
          </span>
          <span className="boost-hero-social">
            <PlatformMark platform="youtube" size={14} />
          </span>
        </div>
      </section>

      <div className="boost-tip">
        <span className="boost-tip-icon" aria-hidden>
          <Info size={15} strokeWidth={2.4} />
        </span>
        <p>
          <strong>Quick Tip:</strong> Select a category, choose your service, then enter your link and
          quantity.
        </p>
      </div>

      <label className="boost-field">
        <span className="boost-label">Category</span>
        <button
          type="button"
          className={`boost-select ${categoryId ? 'has-value' : ''}`}
          onClick={() => setCatOpen(true)}
        >
          {categoryId && categoryChip ? (
            <>
              <span className="boost-select-mark">
                <PlatformMark platform={categoryId} size={20} />
              </span>
              <span className="boost-select-text">{categoryChip.label}</span>
            </>
          ) : (
            <span className="boost-select-placeholder">Select a category</span>
          )}
          <ChevronDown size={18} className="boost-select-chevron" />
        </button>
      </label>

      <label className="boost-field">
        <span className="boost-label">Service</span>
        <button
          type="button"
          className={`boost-select ${selected ? 'has-value' : ''}`}
          onClick={() => categoryId && setSvcOpen(true)}
          disabled={!categoryId}
        >
          {selected ? (
            <>
              <span className="boost-select-mark">
                <PlatformMark platform={selected.platform} size={20} />
              </span>
              <span className="boost-select-text boost-select-text-full">{selected.title}</span>
            </>
          ) : (
            <span className="boost-select-placeholder">
              {categoryId ? 'Select a service' : 'Select category first'}
            </span>
          )}
          <ChevronDown size={18} className="boost-select-chevron" />
        </button>
      </label>

      <label className="boost-field">
        <span className="boost-label">Target Link</span>
        <div className={`boost-input-wrap ${linkMismatch ? 'is-error' : ''}`}>
          <Link2 size={16} className="boost-input-icon" aria-hidden />
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={category?.placeholder ?? 'https://...'}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>
        {linkMismatch ? (
          <p className="boost-field-error" role="alert">
            <AlertTriangle size={13} /> Link mismatch: You selected a {category?.label} service, but
            entered a different platform link. Please verify before placing the order.
          </p>
        ) : (
          <small className="boost-field-hint">{category?.linkHint ?? 'Paste your post or profile link'}</small>
        )}
      </label>

      <label className="boost-field">
        <span className="boost-label">Quantity</span>
        <div className={`boost-input-wrap ${qtyOutOfRange ? 'is-error' : ''`}>
          <Hash size={16} className="boost-input-icon" aria-hidden />
          <input
            type="number"
            inputMode="numeric"
            min={selected?.min ?? 1}
            max={selected?.max}
            placeholder={selected ? formatQty(selected.min) + ' - ' + formatQty(selected.max) : 'Enter quantity'}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        {qtyOutOfRange && selected && (
          <p className="boost-field-error" role="alert">
            Quantity must be between {formatQty(selected.min)} and {formatQty(selected.max)}.
          </p>
        )}
      </label>

      {selected && (
        <div className="boost-metrics" aria-label="Service metrics">
          <div className="boost-metric">
            <span className="boost-metric-icon">
              <Coins size={16} />
            </span>
            <div>
              <span className="boost-metric-label">Rate per 1000</span>
              <strong>{money(selected.ratePer1000)}</strong>
              <small>From provider (live rate)</small>
            </div>
          </div>
          <div className="boost-metric-divider" aria-hidden />
          <div className="boost-metric">
            <span className="boost-metric-icon">
              <BarChart3 size={16} />
            </span>
            <div>
              <span className="boost-metric-label">Min / Max</span>
              <strong>
                {formatQty(selected.min)} - {formatQty(selected.max)}
              </strong>
              <small>Per order limits</small>
            </div>
          </div>
        </div>
      )}

      {selected && total > 0 && (
        <div className={`boost-total ${insufficient ? 'is-insufficient' : ''}`}>
          <div className="boost-total-main">
            <span className="boost-total-label">Total Cost (for {formatQty(qtyNum)})</span>
            <strong className="boost-total-amount">{money(total)}</strong>
            {insufficient && (
              <p className="boost-total-warn" role="alert">
                <AlertTriangle size={14} /> Insufficient wallet balance
              </p>
            )}
            <p className="boost-total-wallet">
              Wallet Balance: <span>{money(WALLET_BALANCE)}</span>
            </p>
          </div>
          <div className="boost-total-art" aria-hidden>
            <Wallet size={48} strokeWidth={1.2} />
          </div>
        </div>
      )}

      <button
        type="button"
        className={ctaClass}
        disabled={ctaDisabled && !(insufficient && formReady)}
        onClick={ctaAction}
      >
        {insufficient && formReady ? (
          <>
            <Wallet size={18} /> {ctaLabel}
          </>
        ) : (
          <>
            <Rocket size={18} /> {ctaLabel}
          </>
        )}
      </button>

      <section className="boost-orders" aria-labelledby="boost-orders-title">
        <div className="boost-orders-head">
          <h2 id="boost-orders-title">My Orders</h2>
          <button
            type="button"
            className="boost-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh orders"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="boost-orders-empty">
            <div className="boost-orders-empty-icon" aria-hidden>
              <Inbox size={28} strokeWidth={1.5} />
            </div>
            <strong>No orders yet.</strong>
            <p>Your boost service orders will appear here.</p>
          </div>
        ) : (
          <ul className="boost-orders-list">
            {orders.map((order) => {
              const meta = STATUS_META[order.status];
              return (
                <li key={order.id} className="boost-order-card">
                  <div className="boost-order-top">
                    <span className="boost-order-mark">
                      <PlatformMark platform={order.platform} size={18} />
                    </span>
                    <div className="boost-order-meta">
                      <strong className="boost-order-title">{order.serviceTitle}</strong>
                      <button
                        type="button"
                        className="boost-order-url"
                        title="Tap to copy"
                        onClick={() => {
                          void navigator.clipboard?.writeText(order.targetUrl);
                          showToast('Link copied');
                        }}
                      >
                        {order.targetUrl.length > 42
                          ? order.targetUrl.slice(0, 40) + '...'
                          : order.targetUrl}
                      </button>
                    </div>
                    <span className={`boost-status ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="boost-order-foot">
                    <span>
                      Qty {formatQty(order.quantity)} · {money(order.amount)}
                    </span>
                    <span>
                      {order.id} ·{' '}
                      {new Date(order.createdAt).toLocaleString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {toast && (
        <div className="boost-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}

      <BottomSheet open={catOpen} title="Select category" onClose={() => setCatOpen(false)}>
        <div className="boost-sheet-search">
          <Search size={16} />
          <input
            value={catQuery}
            onChange={(e) => setCatQuery(e.target.value)}
            placeholder="Search platforms..."
            autoFocus
          />
          {catQuery ? (
            <button type="button" onClick={() => setCatQuery('')} aria-label="Clear">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <ul className="boost-sheet-list">
          {filteredCats.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`boost-sheet-item ${categoryId === c.id ? 'active' : ''}`}
                onClick={() => selectCategory(c.id)}
              >
                <span className="boost-sheet-item-mark">
                  <PlatformMark platform={c.id} size={22} />
                </span>
                <span className="boost-sheet-item-text">{c.label}</span>
                {categoryId === c.id && <Check size={18} className="boost-sheet-check" />}
              </button>
            </li>
          ))}
          {filteredCats.length === 0 && (
            <li className="boost-sheet-empty">No platforms match "{catQuery}".</li>
          )}
        </ul>
      </BottomSheet>

      <BottomSheet open={svcOpen} title="Select service" onClose={() => setSvcOpen(false)}>
        <div className="boost-sheet-search">
          <Search size={16} />
          <input
            value={svcQuery}
            onChange={(e) => setSvcQuery(e.target.value)}
            placeholder="Search services..."
            autoFocus
          />
          {svcQuery ? (
            <button type="button" onClick={() => setSvcQuery('')} aria-label="Clear">
              <X size={14} />
            </button>
          ) : null}
        </div>
        <ul className="boost-sheet-list">
          {filteredSvcs.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`boost-sheet-item boost-sheet-item-svc ${serviceId === s.id ? 'active' : ''}`}
                onClick={() => selectService(s.id)}
              >
                <span className="boost-sheet-item-mark">
                  <PlatformMark platform={s.platform} size={22} />
                </span>
                <span className="boost-sheet-item-body">
                  <span className="boost-sheet-item-title">{s.title}</span>
                  <span className="boost-sheet-item-sub">
                    {money(s.ratePer1000)} / 1,000 · Min {formatQty(s.min)} - Max {formatQty(s.max)}
                  </span>
                </span>
                {serviceId === s.id && <Check size={18} className="boost-sheet-check" />}
              </button>
            </li>
          ))}
          {filteredSvcs.length === 0 && (
            <li className="boost-sheet-empty">No services match "{svcQuery}".</li>
          )}
        </ul>
      </BottomSheet>
    </div>
  );
}
