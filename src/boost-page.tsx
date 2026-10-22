'use client';

import { useMemo, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Hash,
  Inbox,
  Info,
  Link2,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import './boost-page.css';
import type { AuthSession } from './auth/AuthFlow';

export type PlatformId =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'telegram'
  | 'spotify'
  | 'audiomack';

export interface BoostService {
  id: string;
  platform: PlatformId;
  category: 'followers' | 'likes' | 'views' | 'subscribers' | 'members' | 'plays' | 'growth';
  title: string;
  ratePer1000: number;
  min: number;
  max: number;
  speed: string;
  refill?: string;
  quality?: string;
  instant?: boolean;
}

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  shortName: string;
  brandColor: string;
  placeholder: string;
  linkHint: string;
  urlPattern: RegExp;
  categories: { id: string; label: string }[];
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'canceled';

export interface BoostOrder {
  id: string;
  serviceId: string;
  serviceTitle: string;
  platform: PlatformId;
  targetUrl: string;
  quantity: number;
  amount: number;
  status: OrderStatus;
  createdAt: string;
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    brandColor: '#0F1419',
    placeholder: 'https://www.tiktok.com/@username',
    linkHint: 'Paste your TikTok profile link or video URL',
    urlPattern: /(tiktok\.com|douyin\.com)/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'followers', label: 'Followers' },
      { id: 'likes', label: 'Likes' },
      { id: 'views', label: 'Views' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'Instagram',
    brandColor: '#E1306C',
    placeholder: 'https://www.instagram.com/p/yourpost/',
    linkHint: 'Paste your Instagram post, reel, or profile link',
    urlPattern: /instagram\.com/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'followers', label: 'Followers' },
      { id: 'likes', label: 'Likes' },
      { id: 'views', label: 'Views / Reels' },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    brandColor: '#FF0000',
    placeholder: 'https://www.youtube.com/watch?v=...',
    linkHint: 'Paste your YouTube video or channel link',
    urlPattern: /(youtube\.com|youtu\.be)/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'subscribers', label: 'Subscribers' },
      { id: 'views', label: 'Views' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    brandColor: '#1877F2',
    placeholder: 'https://www.facebook.com/page-or-post',
    linkHint: 'Paste your Facebook page, profile, or post link',
    urlPattern: /facebook\.com/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'followers', label: 'Followers' },
      { id: 'likes', label: 'Page Likes' },
    ],
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    brandColor: '#0F1419',
    placeholder: 'https://x.com/username',
    linkHint: 'Paste your X profile or tweet link',
    urlPattern: /(x\.com|twitter\.com)/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'followers', label: 'Followers' },
      { id: 'likes', label: 'Likes' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    shortName: 'Telegram',
    brandColor: '#24A1DE',
    placeholder: 'https://t.me/channel',
    linkHint: 'Paste your Telegram channel or group link',
    urlPattern: /t\.me/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'members', label: 'Members' },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    brandColor: '#1DB954',
    placeholder: 'https://open.spotify.com/track/...',
    linkHint: 'Paste your Spotify track, album, or artist link',
    urlPattern: /spotify\.com/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'plays', label: 'Plays & Streams' },
    ],
  },
  {
    id: 'audiomack',
    name: 'Audiomack',
    shortName: 'Audiomack',
    brandColor: '#FFA200',
    placeholder: 'https://audiomack.com/song/...',
    linkHint: 'Paste your Audiomack song or profile link',
    urlPattern: /audiomack\.com/i,
    categories: [
      { id: 'all', label: 'All Services' },
      { id: 'plays', label: 'Plays' },
    ],
  },
];

export const BOOST_CATALOG: BoostService[] = [
  // TikTok
  {
    id: 'tt-followers-guaranteed',
    platform: 'tiktok',
    category: 'followers',
    title: 'TikTok Followers [Guaranteed · Instant Start]',
    ratePer1000: 4858.67,
    min: 10,
    max: 1000000,
    speed: '200K / Day',
    refill: '10 Days Refill',
    quality: 'High Quality',
    instant: true,
  },
  {
    id: 'tt-followers-hq',
    platform: 'tiktok',
    category: 'followers',
    title: 'TikTok Followers [HQ Profile · 30D Refill]',
    ratePer1000: 8200.0,
    min: 50,
    max: 500000,
    speed: '50K / Day',
    refill: '30 Days Refill',
    quality: 'Real Profiles',
    instant: true,
  },
  {
    id: 'tt-likes',
    platform: 'tiktok',
    category: 'likes',
    title: 'TikTok Video Likes [Instant · High Speed]',
    ratePer1000: 1100.0,
    min: 50,
    max: 5000000,
    speed: '500K / Day',
    quality: 'Stable',
    instant: true,
  },
  {
    id: 'tt-views',
    platform: 'tiktok',
    category: 'views',
    title: 'TikTok Video Views [Ultra Fast · 1M/Day]',
    ratePer1000: 250.0,
    min: 500,
    max: 10000000,
    speed: '1M / Day',
    quality: 'Fast Delivery',
    instant: true,
  },

  // Instagram
  {
    id: 'ig-followers',
    platform: 'instagram',
    category: 'followers',
    title: 'Instagram Followers [HQ · 30D Refill Guarantee]',
    ratePer1000: 2500.0,
    min: 100,
    max: 50000,
    speed: '10K / Day',
    refill: '30 Days Refill',
    quality: 'High Quality',
    instant: true,
  },
  {
    id: 'ig-likes',
    platform: 'instagram',
    category: 'likes',
    title: 'Instagram Post & Reel Likes [Instant · No Drop]',
    ratePer1000: 800.0,
    min: 50,
    max: 100000,
    speed: '50K / Day',
    quality: 'Real Active',
    instant: true,
  },
  {
    id: 'ig-views',
    platform: 'instagram',
    category: 'views',
    title: 'Instagram Reel Views [High Retention · Instant]',
    ratePer1000: 300.0,
    min: 100,
    max: 500000,
    speed: '100K / Day',
    quality: 'Instant Start',
    instant: true,
  },

  // YouTube
  {
    id: 'yt-subs',
    platform: 'youtube',
    category: 'subscribers',
    title: 'YouTube Channel Subscribers [Non-Drop · 30D Refill]',
    ratePer1000: 12000.0,
    min: 50,
    max: 10000,
    speed: '500 / Day',
    refill: '30 Days Refill',
    quality: 'Authentic',
    instant: false,
  },
  {
    id: 'yt-views',
    platform: 'youtube',
    category: 'views',
    title: 'YouTube High-Retention Views [Monetizable Safe]',
    ratePer1000: 1500.0,
    min: 100,
    max: 100000,
    speed: '20K / Day',
    quality: '60% Retention',
    instant: true,
  },

  // Facebook
  {
    id: 'fb-page-likes',
    platform: 'facebook',
    category: 'likes',
    title: 'Facebook Page Likes & Followers [15D Refill]',
    ratePer1000: 4000.0,
    min: 50,
    max: 20000,
    speed: '5K / Day',
    refill: '15 Days Refill',
    quality: 'High Quality',
    instant: false,
  },
  {
    id: 'fb-followers',
    platform: 'facebook',
    category: 'followers',
    title: 'Facebook Profile Followers [Instant Dispatch]',
    ratePer1000: 4500.0,
    min: 50,
    max: 20000,
    speed: '10K / Day',
    quality: 'Real Profiles',
    instant: true,
  },

  // X
  {
    id: 'x-followers',
    platform: 'x',
    category: 'followers',
    title: 'X (Twitter) Followers [HQ · 30D Refill]',
    ratePer1000: 5000.0,
    min: 50,
    max: 20000,
    speed: '5K / Day',
    refill: '30 Days Refill',
    quality: 'High Quality',
    instant: true,
  },
  {
    id: 'x-likes',
    platform: 'x',
    category: 'likes',
    title: 'X (Twitter) Post Likes [Fast Delivery]',
    ratePer1000: 1200.0,
    min: 50,
    max: 50000,
    speed: '20K / Day',
    quality: 'Instant Start',
    instant: true,
  },

  // Telegram
  {
    id: 'tg-members',
    platform: 'telegram',
    category: 'members',
    title: 'Telegram Channel & Group Members [Non-Drop]',
    ratePer1000: 3500.0,
    min: 100,
    max: 50000,
    speed: '15K / Day',
    quality: 'Real Accounts',
    instant: true,
  },

  // Spotify
  {
    id: 'spotify-plays',
    platform: 'spotify',
    category: 'plays',
    title: 'Spotify Track Streams [Premium Plays · Global]',
    ratePer1000: 1800.0,
    min: 500,
    max: 1000000,
    speed: '50K / Day',
    quality: 'Royalty Eligible',
    instant: true,
  },

  // Audiomack
  {
    id: 'audiomack-plays',
    platform: 'audiomack',
    category: 'plays',
    title: 'Audiomack Song Plays [Verified Stream Delivery]',
    ratePer1000: 900.0,
    min: 100,
    max: 500000,
    speed: '100K / Day',
    quality: 'Fast Delivery',
    instant: true,
  },
];

function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number): string {
  return n.toLocaleString('en-NG');
}

/** Authentic Brand Vector Marks */
export function PlatformMark({ platform, size = 22 }: { platform: PlatformId; size?: number }) {
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
            <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f58529" />
              <stop offset="50%" stopColor="#dd2a7b" />
              <stop offset="100%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#igGradient)" />
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
        <svg {...s} fill="#24A1DE">
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
    default:
      return <Globe size={size} />;
  }
}

/** Local Storage Key for Persistent Boost Orders */
const BOOST_ORDERS_STORAGE_KEY = 'verxor_boost_orders_v2';

export function BoostPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session?: AuthSession | null;
  onFund?: () => void;
}) {
  const walletBalance = session?.balanceNgn ?? 0;

  // Selected platform & category
  const [platformId, setPlatformId] = useState<PlatformId>('tiktok');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [serviceId, setServiceId] = useState<string>('tt-followers-guaranteed');

  // Input states
  const [link, setLink] = useState('');
  const [qty, setQty] = useState('1000');

  // Sheet & search
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Order state
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load orders from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save orders to localStorage
  const saveOrders = useCallback((newOrders: BoostOrder[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
    } catch {
      // ignore
    }
  }, []);

  const platform = useMemo(() => PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0], [platformId]);

  // Available services for current platform
  const platformServices = useMemo(
    () => BOOST_CATALOG.filter((s) => s.platform === platformId),
    [platformId],
  );

  // Filtered by category tab
  const filteredCategoryServices = useMemo(() => {
    if (catFilter === 'all') return platformServices;
    return platformServices.filter((s) => s.category === catFilter);
  }, [platformServices, catFilter]);

  // Current selected service
  const selectedService = useMemo(() => {
    const found = platformServices.find((s) => s.id === serviceId);
    return found ?? platformServices[0];
  }, [platformServices, serviceId]);

  // When platform changes, reset serviceId and category
  const handleSelectPlatform = (id: PlatformId) => {
    setPlatformId(id);
    setCatFilter('all');
    const firstSvc = BOOST_CATALOG.find((s) => s.platform === id);
    if (firstSvc) {
      setServiceId(firstSvc.id);
      // Auto-adjust default qty to fit within range
      setQty(String(Math.max(firstSvc.min, Math.min(1000, firstSvc.max))));
    }
  };

  // Quick quantities based on selected service min/max
  const quickQuantities = useMemo(() => {
    if (!selectedService) return [500, 1000, 2500, 5000];
    const { min, max } = selectedService;
    const candidates = [500, 1000, 2500, 5000, 10000, 20000];
    const fitting = candidates.filter((q) => q >= min && q <= max);
    if (fitting.length >= 4) {
      return fitting.slice(0, 4);
    }
    // Dynamic generation if standard list doesn't fit well
    const custom = [min, min * 2, min * 5, min * 10].filter((q) => q <= max);
    return custom.length ? custom : [min];
  }, [selectedService]);

  const qtyNum = Number(qty);
  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0;
  const qtyOutOfRange = selectedService && qtyValid ? qtyNum < selectedService.min || qtyNum > selectedService.max : false;

  // Real-time link validation
  const linkMismatch = useMemo(() => {
    if (!link.trim()) return false;
    return !platform.urlPattern.test(link.trim());
  }, [link, platform]);

  const linkValidFormat = useMemo(() => {
    if (!link.trim()) return false;
    return platform.urlPattern.test(link.trim());
  }, [link, platform]);

  // Total price calculation
  const totalAmount = useMemo(() => {
    if (!selectedService || !qtyValid || qtyOutOfRange) return 0;
    return Math.round((qtyNum / 1000) * selectedService.ratePer1000 * 100) / 100;
  }, [selectedService, qtyNum, qtyValid, qtyOutOfRange]);

  const isInsufficient = totalAmount > 0 && totalAmount > walletBalance;
  const shortfall = Math.max(0, totalAmount - walletBalance);

  const formReady =
    Boolean(selectedService) &&
    Boolean(link.trim()) &&
    !linkMismatch &&
    qtyValid &&
    !qtyOutOfRange &&
    totalAmount > 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  // One-touch clipboard paste
  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setLink(text.trim());
          showToast('Pasted from clipboard');
          return;
        }
      }
    } catch {
      // Clipboard denied or unsupported
    }
    showToast('Tap input field to paste link');
  };

  // Place order execution
  const handlePlaceOrder = async () => {
    if (!formReady || !selectedService || isInsufficient || submitting) return;

    setSubmitting(true);

    try {
      // Simulated or API call to /api/v1/boost/order
      await new Promise((r) => setTimeout(r, 850));

      const newOrder: BoostOrder = {
        id: 'BX-' + Math.random().toString(36).substring(2, 7).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase(),
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        platform: selectedService.platform,
        targetUrl: link.trim(),
        quantity: qtyNum,
        amount: totalAmount,
        status: 'processing',
        createdAt: new Date().toISOString(),
      };

      saveOrders([newOrder, ...orders]);
      setLink('');
      showToast('Order placed successfully! Ref: ' + newOrder.id);
    } catch {
      showToast('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fund Wallet handler
  const handleFundWallet = () => {
    if (onFund) {
      onFund();
    } else {
      showToast('Redirecting to Fund Wallet...');
    }
  };

  // Refresh orders handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
    showToast(orders.length ? 'Order status updated' : 'No active orders');
  };

  // Copy reference code
  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied: ' + text);
    }
  };

  // Sheet filtered services
  const sheetServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return platformServices;
    return platformServices.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.speed.toLowerCase().includes(q) ||
        (s.quality && s.quality.toLowerCase().includes(q)),
    );
  }, [platformServices, searchQuery]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  return (
    <div className="boost-page">
      {/* ── Top Bar ── */}
      <header className="boost-topbar">
        <button type="button" className="boost-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="boost-title-wrap">
          <h1 className="boost-title">Boost Account</h1>
          <p className="boost-subtitle">Social media growth & engagement</p>
        </div>
        <button
          type="button"
          className="boost-wallet-btn"
          onClick={handleFundWallet}
          title="Fund wallet"
        >
          <Wallet size={14} className="text-purple-600" />
          <span className="boost-wallet-val">{formatNaira(walletBalance)}</span>
          <span className="boost-wallet-plus" aria-hidden>+</span>
        </button>
      </header>

      {/* ── Platform Selection Card (Grade-1 Carrier Grid) ── */}
      <section className="boost-platforms-card" aria-label="Select Platform">
        <div className="boost-section-head">
          <span className="boost-section-title">Select Platform</span>
          <span className="boost-section-hint">8 verified networks</span>
        </div>
        <div className="boost-platforms-grid" role="radiogroup" aria-label="Social media networks">
          {PLATFORMS.map((p) => {
            const active = p.id === platformId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={active ? 'boost-platform-btn active' : 'boost-platform-btn'}
                onClick={() => handleSelectPlatform(p.id)}
              >
                <div className="boost-platform-icon-wrap">
                  <PlatformMark platform={p.id} size={24} />
                </div>
                <span className="boost-platform-name">{p.shortName}</span>
                {active && (
                  <span className="boost-platform-check" aria-hidden>
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Service Package & Configuration Card ── */}
      <section className="boost-card" aria-label="Service and Package">
        {/* Category Pills */}
        <div className="boost-field">
          <div className="boost-label-row">
            <span className="boost-label">Category Filter</span>
          </div>
          <div className="boost-filter-tabs">
            {platform.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={catFilter === c.id ? 'boost-filter-tab active' : 'boost-filter-tab'}
                onClick={() => setCatFilter(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Package Selector Trigger */}
        <div className="boost-field">
          <div className="boost-label-row">
            <span className="boost-label">Service Package</span>
            <button
              type="button"
              className="boost-label-aux"
              onClick={() => {
                setSearchQuery('');
                setSheetOpen(true);
              }}
            >
              Change package
            </button>
          </div>

          <button
            type="button"
            className="boost-service-trigger"
            onClick={() => {
              setSearchQuery('');
              setSheetOpen(true);
            }}
          >
            <div className="boost-service-trigger-main">
              <span className="boost-service-trigger-title">{selectedService.title}</span>
              <div className="boost-service-tags">
                {selectedService.instant && (
                  <span className="boost-tag boost-tag-instant">
                    <Zap size={10} /> Instant
                  </span>
                )}
                {selectedService.refill && (
                  <span className="boost-tag boost-tag-refill">
                    <RefreshCw size={10} /> {selectedService.refill}
                  </span>
                )}
                <span className="boost-tag boost-tag-rate">
                  {formatNaira(selectedService.ratePer1000)} / 1K
                </span>
              </div>
            </div>
            <div className="boost-service-trigger-right">
              <ChevronDown size={18} className="boost-service-trigger-icon" />
            </div>
          </button>
        </div>

        {/* Target Link Input */}
        <div className="boost-field">
          <div className="boost-label-row">
            <span className="boost-label">Target Link</span>
            <button type="button" className="boost-label-aux" onClick={handlePaste}>
              Paste link
            </button>
          </div>
          <div className={linkMismatch ? 'boost-input-wrap is-error' : 'boost-input-wrap'}>
            <Link2 size={16} className="boost-input-icon" />
            <input
              type="url"
              className="boost-input"
              inputMode="url"
              autoComplete="off"
              placeholder={platform.placeholder}
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            {link ? (
              <button
                type="button"
                className="boost-clear-btn"
                onClick={() => setLink('')}
                aria-label="Clear link"
              >
                <X size={14} />
              </button>
            ) : (
              <button type="button" className="boost-paste-btn" onClick={handlePaste}>
                Paste
              </button>
            )}
          </div>

          {linkMismatch ? (
            <div className="boost-field-feedback is-error" role="alert">
              <AlertTriangle size={13} />
              <span>Link mismatch: Please enter a valid {platform.name} URL</span>
            </div>
          ) : linkValidFormat ? (
            <div className="boost-field-feedback is-success">
              <Check size={13} />
              <span>Valid {platform.name} link detected</span>
            </div>
          ) : (
            <div className="boost-field-feedback is-hint">
              <span>{platform.linkHint}</span>
            </div>
          )}
        </div>

        {/* Quantity & Quick Chips */}
        <div className="boost-field">
          <div className="boost-label-row">
            <span className="boost-label">Quantity</span>
            <span className="boost-section-hint">
              Min: {formatQty(selectedService.min)} · Max: {formatQty(selectedService.max)}
            </span>
          </div>
          <div className={qtyOutOfRange ? 'boost-input-wrap is-error' : 'boost-input-wrap'}>
            <Hash size={16} className="boost-input-icon" />
            <input
              type="number"
              className="boost-input"
              inputMode="numeric"
              min={selectedService.min}
              max={selectedService.max}
              placeholder={`Enter between ${formatQty(selectedService.min)} and ${formatQty(selectedService.max)}`}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
            {qty && (
              <button
                type="button"
                className="boost-clear-btn"
                onClick={() => setQty('')}
                aria-label="Clear quantity"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {qtyOutOfRange && (
            <div className="boost-field-feedback is-error" role="alert">
              <AlertTriangle size={13} />
              <span>
                Quantity must be between {formatQty(selectedService.min)} and {formatQty(selectedService.max)}
              </span>
            </div>
          )}

          {/* Quick Quantity Chips */}
          <div className="boost-quick-wrap">
            <div className="boost-quick-grid">
              {quickQuantities.map((q) => {
                const active = qty === String(q);
                return (
                  <button
                    key={q}
                    type="button"
                    className={active ? 'boost-quick-chip active' : 'boost-quick-chip'}
                    onClick={() => setQty(String(q))}
                  >
                    {formatQty(q)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing Breakdown Summary Card */}
        {formReady && totalAmount > 0 && (
          <div className="boost-summary-card">
            <div className="boost-summary-head">
              <span className="boost-summary-title">Payment Breakdown</span>
              <span className="boost-summary-pill">
                <Sparkles size={11} /> Live Rate
              </span>
            </div>

            <div className="boost-summary-rows">
              <div className="boost-summary-row">
                <span className="boost-summary-row-label">Service Rate</span>
                <span className="boost-summary-row-val">{formatNaira(selectedService.ratePer1000)} / 1K</span>
              </div>
              <div className="boost-summary-row">
                <span className="boost-summary-row-label">Order Quantity</span>
                <span className="boost-summary-row-val">{formatQty(qtyNum)}</span>
              </div>
              <div className="boost-summary-row">
                <span className="boost-summary-row-label">Dispatch Speed</span>
                <span className="boost-summary-row-val">{selectedService.speed}</span>
              </div>

              <div className="boost-summary-divider" />

              <div className="boost-summary-total-row">
                <span className="boost-summary-total-label">Total Amount</span>
                <span className="boost-summary-total-val">{formatNaira(totalAmount)}</span>
              </div>
            </div>

            {/* Wallet Status */}
            {isInsufficient ? (
              <div className="boost-wallet-status is-insufficient">
                <AlertTriangle size={15} className="boost-wallet-status-icon" />
                <div>
                  <strong>Insufficient Balance</strong> · Shortfall {formatNaira(shortfall)} (Available {formatNaira(walletBalance)})
                </div>
              </div>
            ) : (
              <div className="boost-wallet-status is-sufficient">
                <Check size={15} className="boost-wallet-status-icon" />
                <div>
                  Wallet balance sufficient · Remaining after order: {formatNaira(walletBalance - totalAmount)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Action Button */}
        {isInsufficient && formReady ? (
          <button
            type="button"
            className="boost-cta boost-cta-fund"
            onClick={handleFundWallet}
          >
            <Wallet size={18} />
            Fund Wallet (Add {formatNaira(shortfall)})
          </button>
        ) : (
          <button
            type="button"
            className="boost-cta"
            disabled={!formReady || submitting}
            onClick={handlePlaceOrder}
          >
            <Rocket size={18} />
            {submitting
              ? 'Placing Boost Order...'
              : formReady
              ? `Place Boost Order · ${formatNaira(totalAmount)}`
              : !link.trim()
              ? 'Enter Target Link'
              : !qtyValid || qtyOutOfRange
              ? 'Enter Valid Quantity'
              : 'Place Boost Order'}
          </button>
        )}
      </section>

      {/* ── FinTech Trust & Security Card ── */}
      <section className="boost-trust-card" aria-label="Verxor Guarantee">
        <div className="boost-trust-title">
          <ShieldCheck size={18} className="boost-trust-title-icon" />
          <span>Verxor Boost Guarantee</span>
        </div>
        <div className="boost-trust-items">
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>100% Safe & Private:</strong> We never ask for your account password. Only public profile or post links.</span>
          </div>
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>Automated Dispatch:</strong> Orders route through verified high-speed delivery gateways within minutes.</span>
          </div>
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>Refill & Wallet Protection:</strong> Automatic refill on eligible services or instant wallet credit.</span>
          </div>
        </div>
      </section>

      {/* ── My Orders Section ── */}
      <section className="boost-orders-section" aria-labelledby="boost-orders-heading">
        <div className="boost-orders-head">
          <h2 id="boost-orders-heading" className="boost-orders-title">My Orders</h2>
          <button
            type="button"
            className="boost-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        {orders.length > 0 && (
          <div className="boost-orders-tabs">
            {(['all', 'processing', 'completed', 'pending'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={orderFilter === tab ? 'boost-orders-tab active' : 'boost-orders-tab'}
                onClick={() => setOrderFilter(tab)}
              >
                {tab === 'all' ? 'All Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Orders List */}
        <div className="boost-orders-list">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div key={order.id} className="boost-order-item">
                <div className="boost-order-top">
                  <div className="boost-order-service">
                    <div className="boost-order-icon">
                      <PlatformMark platform={order.platform} size={16} />
                    </div>
                    <span className="boost-order-title" title={order.serviceTitle}>
                      {order.serviceTitle}
                    </span>
                  </div>
                  <span className={`boost-order-badge st-${order.status}`}>
                    {order.status}
                  </span>
                </div>

                <div className="boost-order-details">
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Quantity</span>
                    <span className="boost-order-detail-val">{formatQty(order.quantity)}</span>
                  </div>
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Amount Paid</span>
                    <span className="boost-order-detail-val">{formatNaira(order.amount)}</span>
                  </div>
                </div>

                <div className="boost-order-footer">
                  <button
                    type="button"
                    className="boost-order-ref"
                    onClick={() => handleCopy(order.id)}
                    title="Click to copy order ID"
                  >
                    <span>{order.id}</span>
                    <Copy size={11} />
                  </button>
                  <span>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="boost-order-empty">
              <div className="boost-order-empty-icon">
                <Inbox size={22} />
              </div>
              <strong>No orders found</strong>
              <p>Your placed boost service orders will appear here with live tracking.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Package Selection Bottom Sheet ── */}
      {sheetOpen && (
        <div className="boost-sheet-root" role="dialog" aria-modal="true" aria-label="Select Service Package">
          <button
            type="button"
            className="boost-sheet-backdrop"
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
          />
          <div className="boost-sheet">
            <div className="boost-sheet-handle" aria-hidden />
            <div className="boost-sheet-head">
              <h3 className="boost-sheet-title">Select {platform.name} Package</h3>
              <button
                type="button"
                className="boost-sheet-close"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="boost-sheet-search">
              <div className="boost-sheet-search-wrap">
                <Search size={15} className="boost-sheet-search-icon" />
                <input
                  type="text"
                  className="boost-sheet-search-input"
                  placeholder="Search package name or features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="boost-sheet-body">
              {sheetServices.map((s) => {
                const isSelected = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={isSelected ? 'boost-sheet-item active' : 'boost-sheet-item'}
                    onClick={() => {
                      setServiceId(s.id);
                      setSheetOpen(false);
                      // Adjust qty if current qty is out of new service range
                      const currentN = Number(qty);
                      if (Number.isFinite(currentN)) {
                        if (currentN < s.min) setQty(String(s.min));
                        else if (currentN > s.max) setQty(String(s.max));
                      }
                    }}
                  >
                    <div className="boost-sheet-item-info">
                      <span className="boost-sheet-item-title">{s.title}</span>
                      <div className="boost-sheet-item-meta">
                        <span>Min: {formatQty(s.min)}</span>
                        <span>·</span>
                        <span>Max: {formatQty(s.max)}</span>
                        <span>·</span>
                        <span>{s.speed}</span>
                      </div>
                    </div>
                    <div className="boost-sheet-item-right">
                      <div className="boost-sheet-item-price">
                        {formatNaira(s.ratePer1000)}
                        <span style={{ display: 'block', fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                          per 1,000
                        </span>
                      </div>
                      {isSelected && <Check size={18} className="boost-sheet-item-check" />}
                    </div>
                  </button>
                );
              })}

              {sheetServices.length === 0 && (
                <div className="boost-sheet-empty">
                  No packages match "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="boost-toast" role="status">
          <Info size={15} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
