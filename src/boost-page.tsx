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
  const [platformId, setPlatformId] = useState<PlatformId>('tiktok');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [serviceId, setServiceId] = useState<string>('tt-followers-guaranteed');
  const [link, setLink] = useState('');
  const [qty, setQty] = useState('1000');
  const [activeSheet, setActiveSheet] = useState<'platform' | 'category' | 'service' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<BoostOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOST_ORDERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setOrders(parsed);
      }
    } catch {}
  }, []);

  const saveOrders = useCallback((newOrders: BoostOrder[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(BOOST_ORDERS_STORAGE_KEY, JSON.stringify(newOrders));
    } catch {}
  }, []);

  const platform = useMemo(() => PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0], [platformId]);
  const platformServices = useMemo(
    () => BOOST_CATALOG.filter((s) => s.platform === platformId),
    [platformId],
  );
  const selectedService = useMemo(() => {
    return platformServices.find((s) => s.id === serviceId) ?? platformServices[0];
  }, [platformServices, serviceId]);

  const handleSelectPlatform = (id: PlatformId) => {
    setPlatformId(id);
    setCatFilter('all');
    const firstSvc = BOOST_CATALOG.find((s) => s.platform === id);
    if (firstSvc) {
      setServiceId(firstSvc.id);
      setQty(String(Math.max(firstSvc.min, Math.min(1000, firstSvc.max))));
    }
    setActiveSheet(null);
    setSearchQuery('');
  };

  const quickQuantities = useMemo(() => {
    if (!selectedService) return [500, 1000, 2500, 5000];
    const { min, max } = selectedService;
    const candidates = [500, 1000, 2500, 5000, 10000, 20000].filter((q) => q >= min && q <= max);
    if (candidates.length >= 4) return candidates.slice(0, 4);
    const custom = [min, min * 2, min * 5, min * 10].filter((q) => q <= max);
    return custom.length ? custom : [min];
  }, [selectedService]);

  const qtyNum = Number(qty);
  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0;
  const qtyOutOfRange =
    selectedService && qtyValid
      ? qtyNum < selectedService.min || qtyNum > selectedService.max
      : false;
  const linkMismatch = useMemo(() => {
    if (!link.trim()) return false;
    return !platform.urlPattern.test(link.trim());
  }, [link, platform]);
  const linkValidFormat = useMemo(() => {
    if (!link.trim()) return false;
    return platform.urlPattern.test(link.trim());
  }, [link, platform]);
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
    } catch {}
    showToast('Tap input field to paste link');
  };

  const handlePlaceOrder = async () => {
    if (!formReady || !selectedService || isInsufficient || submitting) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 850));
      const newOrder: BoostOrder = {
        id:
          'BX-' +
          Math.random().toString(36).substring(2, 7).toUpperCase() +
          Date.now().toString(36).slice(-3).toUpperCase(),
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

  const handleFundWallet = () => {
    if (onFund) onFund();
    else showToast('Redirecting to Fund Wallet...');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
    showToast(orders.length ? 'Order status updated' : 'No active orders');
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Copied: ' + text);
    }
  };

  const openSheet = (type: 'platform' | 'category' | 'service') => {
    setSearchQuery('');
    setActiveSheet(type);
  };
  const closeSheet = () => {
    setActiveSheet(null);
    setSearchQuery('');
  };

  const sheetPlatforms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const sheetCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return platform.categories;
    return platform.categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [platform, searchQuery]);

  const sheetServices = useMemo(() => {
    let list = platformServices;
    if (catFilter !== 'all') list = list.filter((s) => s.category === catFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.speed.toLowerCase().includes(q) ||
        (s.quality && s.quality.toLowerCase().includes(q)),
    );
  }, [platformServices, catFilter, searchQuery]);

  const selectedCategoryLabel =
    platform.categories.find((c) => c.id === catFilter)?.label ?? 'All Services';

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter((o) => o.status === orderFilter);
  }, [orders, orderFilter]);

  return (
    <div className="boost-page">
      <header className="boost-topbar">
        <button type="button" className="boost-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="boost-title-wrap">
          <h1 className="boost-title">Boost Account</h1>
          <p className="boost-subtitle">Social media growth & engagement</p>
        </div>
        <button type="button" className="boost-wallet-btn" onClick={handleFundWallet} title="Fund wallet">
          <Wallet size={14} />
          <span className="boost-wallet-val">{formatNaira(walletBalance)}</span>
          <span className="boost-wallet-plus" aria-hidden>+</span>
        </button>
      </header>

      <div className="boost-tip">
        <Info size={14} className="boost-tip-icon" />
        <span>Select a platform, pick a category, choose a service, then enter your link and quantity.</span>
      </div>

      <section className="boost-card" aria-label="Boost configuration">
        <div className="boost-field">
          <div className="boost-label-row"><span className="boost-label">PLATFORM</span></div>
          <button type="button" className="boost-select-trigger" onClick={() => openSheet('platform')}>
            <div className="boost-select-trigger-left">
              <div className="boost-select-trigger-icon">
                <PlatformMark platform={platform.id} size={22} />
              </div>
              <span className="boost-select-trigger-text">{platform.name}</span>
            </div>
            <ChevronDown size={18} className="boost-select-chevron" />
          </button>
        </div>

        <div className="boost-field">
          <div className="boost-label-row"><span className="boost-label">CATEGORY</span></div>
          <button type="button" className="boost-select-trigger" onClick={() => openSheet('category')}>
            <div className="boost-select-trigger-left">
              <div className="boost-select-trigger-icon boost-select-trigger-icon-folder">
                <Inbox size={18} />
              </div>
              <span className="boost-select-trigger-text">{selectedCategoryLabel}</span>
            </div>
            <ChevronDown size={18} className="boost-select-chevron" />
          </button>
        </div>

        <div className="boost-field">
          <div className="boost-label-row"><span className="boost-label">SERVICE</span></div>
          <button type="button" className="boost-select-trigger boost-select-trigger-service" onClick={() => openSheet('service')}>
            <div className="boost-select-trigger-left">
              <div className="boost-select-trigger-icon">
                <PlatformMark platform={platform.id} size={20} />
              </div>
              <div className="boost-select-trigger-service-info">
                <span className="boost-select-trigger-text">{selectedService?.title ?? 'Select a service'}</span>
                {selectedService && (
                  <span className="boost-select-trigger-meta">
                    {formatNaira(selectedService.ratePer1000)} / 1K · Min {formatQty(selectedService.min)}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown size={18} className="boost-select-chevron" />
          </button>
        </div>

        <div className="boost-field">
          <div className="boost-label-row"><span className="boost-label">DETAILS</span></div>
          <div className="boost-link-row">
            <div className={'boost-input-wrap' + (linkMismatch ? ' is-error' : linkValidFormat ? ' is-success' : '')}>
              <Link2 size={15} className="boost-input-icon" />
              <input type="url" className="boost-input" placeholder={platform.placeholder} value={link} onChange={(e) => setLink(e.target.value)} autoComplete="off" />
              {link ? (
                <button type="button" className="boost-clear-btn" onClick={() => setLink('')} aria-label="Clear">
                  <X size={12} />
                </button>
              ) : null}
            </div>
            <button type="button" className="boost-paste-btn" onClick={handlePaste}>Paste</button>
          </div>
          {linkMismatch ? (
            <div className="boost-field-feedback is-error"><AlertTriangle size={12} /> Link does not match {platform.name}</div>
          ) : !link ? (
            <div className="boost-field-feedback is-hint">{platform.linkHint}</div>
          ) : null}
        </div>

        <div className="boost-field">
          <div className="boost-label-row">
            <span className="boost-label">QUANTITY</span>
            {selectedService ? (
              <span className="boost-label-aux" style={{ cursor: 'default', color: '#94A3B8' }}>
                Min {formatQty(selectedService.min)} · Max {formatQty(selectedService.max)}
              </span>
            ) : null}
          </div>
          <div className={'boost-input-wrap' + (qtyOutOfRange ? ' is-error' : '')}>
            <Hash size={15} className="boost-input-icon" />
            <input type="number" className="boost-input" value={qty} onChange={(e) => setQty(e.target.value)} min={selectedService?.min} max={selectedService?.max} />
          </div>
          <div className="boost-quick-wrap">
            <div className="boost-quick-grid">
              {quickQuantities.map((q) => (
                <button key={q} type="button" className={Number(qty) === q ? 'boost-quick-chip active' : 'boost-quick-chip'} onClick={() => setQty(String(q))}>
                  {formatQty(q)}
                </button>
              ))}
            </div>
          </div>
          {qtyOutOfRange ? (
            <div className="boost-field-feedback is-error"><AlertTriangle size={12} /> Quantity outside allowed range</div>
          ) : null}
        </div>

        {selectedService && totalAmount > 0 ? (
          <div className="boost-summary-card">
            <div className="boost-summary-head">
              <span className="boost-summary-title">Order Summary</span>
              {selectedService.instant ? (
                <span className="boost-summary-pill"><Zap size={10} /> Instant</span>
              ) : null}
            </div>
            <div className="boost-summary-rows">
              <div className="boost-summary-row">
                <span className="boost-summary-row-label">Rate per 1,000</span>
                <span className="boost-summary-row-val">{formatNaira(selectedService.ratePer1000)}</span>
              </div>
              <div className="boost-summary-row">
                <span className="boost-summary-row-label">Quantity</span>
                <span className="boost-summary-row-val">{formatQty(qtyNum)}</span>
              </div>
            </div>
            <div className="boost-summary-divider" />
            <div className="boost-summary-total-row">
              <span className="boost-summary-total-label">Total</span>
              <span className="boost-summary-total-val">{formatNaira(totalAmount)}</span>
            </div>
            <div className={isInsufficient ? 'boost-wallet-status is-insufficient' : 'boost-wallet-status is-sufficient'}>
              {isInsufficient ? (
                <><AlertTriangle size={14} className="boost-wallet-status-icon" /><span>Need {formatNaira(shortfall)} more · Wallet {formatNaira(walletBalance)}</span></>
              ) : (
                <><Check size={14} className="boost-wallet-status-icon" /><span>Wallet balance {formatNaira(walletBalance)}</span></>
              )}
            </div>
          </div>
        ) : null}

        {isInsufficient ? (
          <button type="button" className="boost-cta boost-cta-fund" onClick={handleFundWallet}>
            Fund Wallet · Need {formatNaira(shortfall)}
          </button>
        ) : (
          <button type="button" className="boost-cta" disabled={!formReady || submitting} onClick={handlePlaceOrder}>
            {submitting
              ? 'Placing Order…'
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

      <section className="boost-trust-card" aria-label="Verxor Guarantee">
        <div className="boost-trust-title">
          <ShieldCheck size={18} className="boost-trust-title-icon" />
          <span>Verxor Boost Guarantee</span>
        </div>
        <div className="boost-trust-items">
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>100% Safe & Private:</strong> We never ask for your password. Only public links.</span>
          </div>
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>Automated Dispatch:</strong> Orders route through verified high-speed gateways within minutes.</span>
          </div>
          <div className="boost-trust-item">
            <Check size={14} className="boost-trust-bullet" />
            <span><strong>Refill & Wallet Protection:</strong> Automatic refill on eligible services or instant wallet credit.</span>
          </div>
        </div>
      </section>

      <section className="boost-orders-section" aria-labelledby="boost-orders-heading">
        <div className="boost-orders-head">
          <h2 id="boost-orders-heading" className="boost-orders-title">My Orders</h2>
          <button type="button" className="boost-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
        {orders.length > 0 && (
          <div className="boost-orders-tabs">
            {(['all', 'pending', 'processing', 'completed'] as const).map((f) => (
              <button key={f} type="button" className={orderFilter === f ? 'boost-orders-tab active' : 'boost-orders-tab'} onClick={() => setOrderFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
        <div className="boost-orders-list">
          {filteredOrders.length === 0 ? (
            <div className="boost-orders-empty">
              <Inbox size={28} />
              <p>No orders yet. Place your first boost above.</p>
            </div>
          ) : (
            filteredOrders.map((o) => (
              <div key={o.id} className="boost-order-item">
                <div className="boost-order-top">
                  <div className="boost-order-service">
                    <div className="boost-order-icon"><PlatformMark platform={o.platform} size={16} /></div>
                    <span className="boost-order-title">{o.serviceTitle}</span>
                  </div>
                  <span className={`boost-order-badge st-${o.status}`}>{o.status}</span>
                </div>
                <div className="boost-order-details">
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Qty</span>
                    <span className="boost-order-detail-val">{formatQty(o.quantity)}</span>
                  </div>
                  <div className="boost-order-detail-item">
                    <span className="boost-order-detail-label">Amount</span>
                    <span className="boost-order-detail-val">{formatNaira(o.amount)}</span>
                  </div>
                </div>
                <div className="boost-order-footer">
                  <button type="button" className="boost-order-ref" onClick={() => handleCopy(o.id)}>
                    <Copy size={11} /> {o.id}
                  </button>
                  <span className="boost-order-date">
                    {new Date(o.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {activeSheet && (
        <div className="boost-sheet-root" role="dialog" aria-modal="true">
          <button type="button" className="boost-sheet-backdrop" onClick={closeSheet} aria-label="Close" />
          <div className="boost-sheet">
            <div className="boost-sheet-handle" aria-hidden />
            <div className="boost-sheet-head">
              <h3 className="boost-sheet-title">
                {activeSheet === 'platform' && 'Select Platform'}
                {activeSheet === 'category' && `Select ${platform.name} Category`}
                {activeSheet === 'service' && `Select ${platform.name} Package`}
              </h3>
              <button type="button" className="boost-sheet-close" onClick={closeSheet} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="boost-sheet-search">
              <div className="boost-sheet-search-wrap">
                <Search size={15} className="boost-sheet-search-icon" />
                <input
                  type="text"
                  className="boost-sheet-search-input"
                  placeholder={
                    activeSheet === 'platform'
                      ? 'Search platforms…'
                      : activeSheet === 'category'
                      ? 'Search categories…'
                      : 'Search package name or features…'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="boost-sheet-body">
              {activeSheet === 'platform' &&
                sheetPlatforms.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={p.id === platformId ? 'boost-sheet-item active' : 'boost-sheet-item'}
                    onClick={() => handleSelectPlatform(p.id)}
                  >
                    <div className="boost-sheet-item-icon"><PlatformMark platform={p.id} size={24} /></div>
                    <div className="boost-sheet-item-info">
                      <span className="boost-sheet-item-title">{p.name}</span>
                    </div>
                    {p.id === platformId ? <Check size={18} className="boost-sheet-item-check" /> : null}
                  </button>
                ))}

              {activeSheet === 'category' &&
                sheetCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={c.id === catFilter ? 'boost-sheet-item active' : 'boost-sheet-item'}
                    onClick={() => {
                      setCatFilter(c.id);
                      const list =
                        c.id === 'all'
                          ? platformServices
                          : platformServices.filter((s) => s.category === c.id);
                      if (list[0]) setServiceId(list[0].id);
                      closeSheet();
                    }}
                  >
                    <div className="boost-sheet-item-icon boost-sheet-item-icon-folder"><Inbox size={18} /></div>
                    <div className="boost-sheet-item-info">
                      <span className="boost-sheet-item-title">{c.label}</span>
                    </div>
                    {c.id === catFilter ? <Check size={18} className="boost-sheet-item-check" /> : null}
                  </button>
                ))}

              {activeSheet === 'service' &&
                sheetServices.map((s) => {
                  const isSelected = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={isSelected ? 'boost-sheet-item active' : 'boost-sheet-item'}
                      onClick={() => {
                        setServiceId(s.id);
                        const currentN = Number(qty);
                        if (Number.isFinite(currentN)) {
                          if (currentN < s.min) setQty(String(s.min));
                          else if (currentN > s.max) setQty(String(s.max));
                        }
                        closeSheet();
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
                          <span className="boost-sheet-item-price-unit">per 1,000</span>
                        </div>
                        {isSelected ? <Check size={18} className="boost-sheet-item-check" /> : null}
                      </div>
                    </button>
                  );
                })}

              {activeSheet === 'service' && sheetServices.length === 0 && (
                <div className="boost-sheet-empty">No packages match "{searchQuery}".</div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="boost-toast" role="status">
          <Info size={15} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
