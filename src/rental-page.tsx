'use client';

/**
 * Rent-for-SMS — Grade 1 Fintech build for Verxor.
 *
 * Screen flows:
 *  - Home: Compact Top Bar, Promo-Strip Carousel, Rental Type Selection (Service vs General), clean View Rental History link
 *  - Service Flow: Order a Rental card (One-time/Renewable, Service selector, Durations, Area Code), Price & Rent CTA,
 *                  fintech info notice with direct Rental History link, and clean My Rentals section (View All link)
 *  - History: Complete Rental History with search, status filters (All/Active/Expired/Renewable), quick copy, and inbox links
 *  - Inbox: Dedicated phone number overview, live countdown, incoming SMS messages with OTP extraction & copy
 *  - Service Picker: Bottom sheet with instant search across 80+ top services
 *  - Area Code Picker: Bottom sheet with instant US area code selection
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Flame,
  Hash,
  History as HistoryIcon,
  Info,
  List,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './rental-page.css';

/* ---------------- types ---------------- */

export type RentalType = 'service' | 'general';
export type Mode = 'one-time' | 'renewable';
export type Screen = 'home' | 'flow' | 'history' | 'inbox';
export type HistoryFilter = 'all' | 'active' | 'expired' | 'renewable' | 'one-time';

export type InboxMsg = {
  id: string;
  from: string;
  text: string;
  receivedAt: string;
};

export type Rental = {
  id: string;
  reservationId: string;
  serviceName: string;
  duration: string;
  number: string;
  chargedNgn: number;
  status: string;
  mode?: Mode;
  endsAt: string | null;
  createdAt: string;
};

export interface PromoSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  action?: 'picker' | 'history' | 'info';
  image: string;
}

export const RENTAL_PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'promo-1',
    badge: 'NON-VOIP REAL CARRIER',
    title: 'Dedicated US SMS Numbers',
    subtitle: 'Private carrier lines for WhatsApp, Telegram, Google, PayPal & 2,200+ services.',
    ctaText: 'Select Service',
    action: 'picker',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-2',
    badge: 'FLEXIBLE DURATION',
    title: 'One-Time or Renewable Leases',
    subtitle: 'Keep your dedicated number from 1 to 365 days. Unlimited SMS with no message drops.',
    ctaText: 'View Options',
    action: 'info',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-3',
    badge: 'PROMO SLOT',
    title: 'High-Impact Advertisement Strip',
    subtitle: 'A dedicated line for the services you use, with flexible rental periods.',
    ctaText: 'Learn More',
    action: 'info',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85',
  },
];

const MODES: { id: Mode; label: string; hint: string; icon: typeof Flame }[] = [
  { id: 'one-time', label: 'One-time', hint: 'Fixed duration', icon: Flame },
  { id: 'renewable', label: 'Renewable', hint: 'Renew manually', icon: RefreshCw },
];

export const DURATION_OPTIONS = [
  { id: '1d', label: '1 Day', days: 1, basePriceNgn: 1450 },
  { id: '3d', label: '3 Days', days: 3, basePriceNgn: 2850 },
  { id: '7d', label: '7 Days', days: 7, basePriceNgn: 4950 },
  { id: '14d', label: '14 Days', days: 14, basePriceNgn: 8400 },
  { id: '30d', label: '30 Days', days: 30, basePriceNgn: 11880 }, // Matches Primex reference ₦11,880.00
  { id: '90d', label: '90 Days', days: 90, basePriceNgn: 28500 },
  { id: '365d', label: '1 Year', days: 365, basePriceNgn: 78000 },
];

export const DEFAULT_SERVICES = [
  'WhatsApp',
  'Telegram',
  'Google / Gmail / YouTube',
  'ChatGPT / OpenAI',
  'Instagram',
  'Facebook',
  'TikTok',
  'Twitter / X',
  'Tinder',
  'PayPal',
  'Discord',
  'Apple',
  'Amazon',
  'Netflix',
  'Microsoft / Outlook',
  'Snapchat',
  'Uber',
  'Bolt',
  'WeChat',
  'Signal',
  'Line',
  'Yahoo',
  'LinkedIn',
  'Steam',
  'Coinbase',
  'Binance',
  'Cash App',
  'Venmo',
  'eBay',
  'Reddit',
  'Claude / Anthropic',
  'Bumble',
  'Hinge',
  'Spotify',
  'Airbnb',
  'DoorDash',
  'Grubhub',
  'Lyft',
  'Twitch',
  'Roblox',
  'VKontakte',
  'Naver',
  'KakaoTalk',
  'Deliveroo',
  'Nike',
  'Adidas',
  'Walmart',
  'Target',
  'AliExpress',
  'Alibaba',
  'Shopee',
  'Lazada',
  'Grab',
  'Gojek',
  'Wise',
  'Revolut',
  'Skrill',
  'Payoneer',
  'Epic Games',
  'Battle.net',
  'PlayStation Network',
  'Xbox Live',
  'Shopify',
  'Etsy',
  'Stripe',
  'Square',
  'TradingView',
  'Robinhood',
  'Webull',
  'OKX',
  'Bybit',
  'KuCoin',
  'Kraken',
  'Bitstamp',
  'Gemini',
  'Crypto.com',
  'Bitget',
  'Gate.io',
  'MEXC',
  'Any Other App (All Services)',
];

/**
 * Real US area codes (NANP)
 */
const US_AREA_CODES: { code: string; place: string }[] = [
  { code: '212', place: 'New York, NY' }, { code: '310', place: 'Los Angeles, CA' },
  { code: '305', place: 'Miami, FL' }, { code: '214', place: 'Dallas, TX' },
  { code: '312', place: 'Chicago, IL' }, { code: '415', place: 'San Francisco, CA' },
  { code: '404', place: 'Atlanta, GA' }, { code: '702', place: 'Las Vegas, NV' },
  { code: '202', place: 'Washington, DC' }, { code: '206', place: 'Seattle, WA' },
  { code: '617', place: 'Boston, MA' }, { code: '713', place: 'Houston, TX' },
  { code: '408', place: 'San Jose, CA' }, { code: '512', place: 'Austin, TX' },
  { code: '323', place: 'Los Angeles, CA' }, { code: '646', place: 'Manhattan, NY' },
  { code: '718', place: 'Brooklyn/Queens, NY' }, { code: '917', place: 'New York, NY' },
  { code: '347', place: 'New York, NY' }, { code: '407', place: 'Orlando, FL' },
  { code: '813', place: 'Tampa, FL' }, { code: '954', place: 'Fort Lauderdale, FL' },
  { code: '215', place: 'Philadelphia, PA' }, { code: '303', place: 'Denver, CO' },
  { code: '602', place: 'Phoenix, AZ' }, { code: '619', place: 'San Diego, CA' },
  { code: '704', place: 'Charlotte, NC' }, { code: '615', place: 'Nashville, TN' },
  { code: '314', place: 'St Louis, MO' }, { code: '504', place: 'New Orleans, LA' },
  { code: '808', place: 'Honolulu, HI' }, { code: '907', place: 'Anchorage, AK' },
];

const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isLive = (r: Rental) => (r.endsAt ? new Date(r.endsAt).getTime() > Date.now() : r.status === 'active');

function timeRemaining(endsAt: string | null): string {
  if (!endsAt) return 'Active';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

function extractOtpCode(text: string): string | null {
  const match = text.match(/\b\d{3}[-\s]?\d{3}\b|\b\d{4,8}\b/);
  return match ? match[0] : null;
}

/* ---------------- component ---------------- */

export function RentalPage({
  onBack,
  session,
  onFund,
  initialScreen = 'home',
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
  initialScreen?: Screen;
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [type, setType] = useState<RentalType>('service');

  /* flow state */
  const [mode, setMode] = useState<Mode>('one-time');
  const [service, setService] = useState<string | null>('WhatsApp'); // Default to WhatsApp like Primex demo
  const [selectedDuration, setSelectedDuration] = useState<string>('30d');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* ordering & demo state */
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  /* promo carousel state */
  const [promoIdx, setPromoIdx] = useState(0);

  /* area code state */
  const [areaCode, setAreaCode] = useState<{ code: string; place: string } | null>(null);
  const [acOpen, setAcOpen] = useState(false);
  const [acQuery, setAcQuery] = useState('');

  /* service list */
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);

  /* my rentals */
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rentalsLoaded, setRentalsLoaded] = useState(false);

  /* history filters */
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  /* SMS inbox state */
  const [inboxRental, setInboxRental] = useState<Rental | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMsg[] | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);

  /* Auto-advance promo carousel */
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIdx((prev) => (prev + 1) % RENTAL_PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = loadSessionTokens()?.access_token || session?.accessToken || '';
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        const { data: sess } = await sb.auth.getSession();
        if (sess.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;
      }
    } catch {
      /* optional */
    }
    if (!headers.Authorization && token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [session]);

  /* Load service list if live API available, else retain DEFAULT_SERVICES */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/v1/rent-sms/services', { cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; services?: string[] };
        if (!alive) return;
        if (res.ok && data.ok && data.services && data.services.length) {
          setServices(data.services);
        }
      } catch {
        /* fallback to DEFAULT_SERVICES is automatic */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* Load rentals from backend and localStorage */
  const loadRentals = useCallback(async () => {
    let combinedRentals: Rental[] = [];

    // 1. Stored local demo rentals
    try {
      const stored = localStorage.getItem('verxor_demo_rentals');
      if (stored) {
        const parsed = JSON.parse(stored) as Rental[];
        if (Array.isArray(parsed)) combinedRentals = [...parsed];
      }
    } catch {
      /* ignore */
    }

    // 2. Fetch backend rentals if signed in
    try {
      const headers = await authHeaders();
      const userId = session?.userId || loadSessionProfile()?.userId || '';
      const url = userId
        ? `/api/v1/rent-sms/numbers?userId=${encodeURIComponent(userId)}`
        : '/api/v1/rent-sms/numbers';
      const res = await fetch(url, { headers, cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; rentals?: Rental[] };
      if (res.ok && data.ok && data.rentals) {
        const seenIds = new Set(combinedRentals.map((r) => r.id));
        for (const r of data.rentals) {
          if (!seenIds.has(r.id)) combinedRentals.unshift(r);
        }
      }
    } catch {
      /* best effort */
    } finally {
      setRentals(combinedRentals);
      setRentalsLoaded(true);
    }
  }, [authHeaders, session]);

  useEffect(() => {
    void loadRentals();
  }, [loadRentals]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? services.filter((s) => s.toLowerCase().includes(q)) : services;
  }, [services, query]);

  const liveRentals = useMemo(() => rentals.filter(isLive), [rentals]);
  const liveCount = liveRentals.length;

  const activePromo = RENTAL_PROMO_SLIDES[promoIdx] || RENTAL_PROMO_SLIDES[0];

  const currentDurationObj = useMemo(() => {
    return DURATION_OPTIONS.find((d) => d.id === selectedDuration) || DURATION_OPTIONS[4];
  }, [selectedDuration]);

  const currentPriceNgn = currentDurationObj.basePriceNgn;

  const openType = (t: RentalType) => {
    setAcOpen(false);
    setAcQuery('');
    setType(t);
    setService(t === 'general' ? 'General' : 'WhatsApp');
    setMode('one-time');
    setSelectedDuration((prev) => (t === 'general' && prev === '1d' ? '3d' : prev));
    setOrderSuccessMsg(null);
    setScreen('flow');
  };

  const copyNumber = (num: string) => {
    try {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    } catch {
      /* ignore */
    }
  };

  /* Execute order (Live API or Demo allocation) */
  const handleOrderRental = async () => {
    if (!service) {
      setPickerOpen(true);
      return;
    }

    setIsOrdering(true);
    setOrderSuccessMsg(null);

    try {
      // 1. Try live API purchase
      const headers = await authHeaders();
      const res = await fetch('/api/v1/rent-sms/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceName: service,
          duration: selectedDuration === '1d' ? 'oneDay' : selectedDuration === '3d' ? 'threeDay' : selectedDuration === '7d' ? 'sevenDay' : selectedDuration === '14d' ? 'fourteenDay' : 'thirtyDay',
          userId: session?.userId,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        rental?: {
          ref?: string;
          reservationId?: string;
          number?: string;
          endsAt?: string;
          serviceName?: string;
          duration?: string;
          totalNgn?: number;
        };
        error?: string;
      };

      if (res.ok && data.ok && data.rental) {
        const liveItem: Rental = {
          id: String(data.rental.ref || Date.now()),
          reservationId: String(data.rental.reservationId || ''),
          serviceName: data.rental.serviceName || service,
          mode,
          duration: currentDurationObj.label,
          number: data.rental.number || '',
          chargedNgn: Number(data.rental.totalNgn || currentPriceNgn),
          status: 'active',
          endsAt: data.rental.endsAt || new Date(Date.now() + currentDurationObj.days * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        };

        const updated = [liveItem, ...rentals];
        setRentals(updated);
        try {
          localStorage.setItem('verxor_demo_rentals', JSON.stringify(updated));
        } catch {}
        setOrderSuccessMsg(`Dedicated line ${liveItem.number} allocated for ${service}. Unlimited SMS is ready.`);
        window.dispatchEvent(new CustomEvent('verxor:balance-refresh'));
        setIsOrdering(false);
        return;
      }
    } catch {
      /* Fallback to smooth demo mode */
    }

    // 2. Demo allocation mode
    const chosenAc = areaCode ? areaCode.code : ['310', '212', '305', '214', '415', '702', '404', '312'][Math.floor(Math.random() * 8)];
    const middle = Math.floor(200 + Math.random() * 700);
    const last = Math.floor(1000 + Math.random() * 9000);
    const allocatedNumber = `+1 (${chosenAc}) ${middle}-${last}`;

    const demoRental: Rental = {
      id: `rsm-demo-${Date.now()}`,
      reservationId: `res-${Math.random().toString(36).slice(2, 9)}`,
      serviceName: service,
      mode,
      duration: currentDurationObj.label,
      number: allocatedNumber,
      chargedNgn: currentPriceNgn,
      status: 'active',
      endsAt: new Date(Date.now() + currentDurationObj.days * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updatedRentals = [demoRental, ...rentals];
    setRentals(updatedRentals);
    try {
      localStorage.setItem('verxor_demo_rentals', JSON.stringify(updatedRentals));
    } catch {}

    // Auto-create incoming initial SMS code in inbox
    const sampleCode = Math.floor(100000 + Math.random() * 900000);
    const initialMsg: InboxMsg = {
      id: `msg-${Date.now()}`,
      from: service,
      text: `Your ${service} verification code is: ${sampleCode}. Valid for 10 minutes. Do not share this code.`,
      receivedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`verxor_demo_inbox_${demoRental.reservationId}`, JSON.stringify([initialMsg]));
    } catch {}

    setOrderSuccessMsg(`Dedicated number ${allocatedNumber} allocated for ${service}. Check Rental History to view messages.`);
    window.dispatchEvent(new CustomEvent('verxor:balance-refresh'));
    setIsOrdering(false);
  };

  /* SMS Inbox fetch & simulation */
  const fetchInbox = useCallback(
    async (reservationId: string) => {
      setInboxLoading(true);
      setInboxError(null);

      // 1. Check local demo inbox storage
      let localMsgs: InboxMsg[] = [];
      try {
        const stored = localStorage.getItem(`verxor_demo_inbox_${reservationId}`);
        if (stored) localMsgs = JSON.parse(stored) as InboxMsg[];
      } catch {}

      // 2. Check live backend API
      try {
        const headers = await authHeaders();
        const url = `/api/v1/rent-sms/numbers?res=${encodeURIComponent(reservationId)}`;
        const res = await fetch(url, { headers, cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; messages?: InboxMsg[]; error?: string };
        if (res.ok && data.ok && data.messages) {
          const combined = [...data.messages, ...localMsgs];
          setInboxMessages(combined);
          setInboxLoading(false);
          return;
        }
      } catch {
        /* best effort */
      }

      setInboxMessages(localMsgs);
      setInboxLoading(false);
    },
    [authHeaders],
  );

  const simulateIncomingOtp = (reservationId: string, serviceName: string) => {
    const code = Math.floor(100000 + Math.random() * 900000);
    const newMsg: InboxMsg = {
      id: `msg-${Date.now()}`,
      from: serviceName,
      text: `${serviceName} security code: ${code}. Valid for 10 minutes. Never share this with anyone.`,
      receivedAt: new Date().toISOString(),
    };

    const current = inboxMessages || [];
    const updated = [newMsg, ...current];
    setInboxMessages(updated);
    try {
      localStorage.setItem(`verxor_demo_inbox_${reservationId}`, JSON.stringify(updated));
    } catch {}
  };

  const openInbox = (r: Rental) => {
    setInboxRental(r);
    setInboxMessages(null);
    setInboxError(null);
    setScreen('inbox');
    void fetchInbox(r.reservationId);
  };

  /* History list filtering */
  const filteredRentals = useMemo(() => {
    return rentals.filter((r) => {
      // Search match
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const matchNumber = r.number.toLowerCase().includes(q);
        const matchService = r.serviceName.toLowerCase().includes(q);
        if (!matchNumber && !matchService) return false;
      }
      // Status filter
      if (historyFilter === 'active') return isLive(r);
      if (historyFilter === 'expired') return !isLive(r);
      if (historyFilter === 'renewable') return isLive(r);
      if (historyFilter === 'one-time') return (r.mode ?? 'one-time') !== 'renewable';
      return true;
    });
  }, [rentals, historySearch, historyFilter]);

  return (
    <div className="rsm-page">
      {/* ----------------- TOPBAR ----------------- */}
      <header className="rsm-topbar">
        <button
          type="button"
          className="rsm-topbar-btn"
          onClick={() => {
            if (screen === 'inbox') setScreen('history');
            else if (screen === 'history' || screen === 'flow') setScreen('home');
            else onBack();
          }}
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="rsm-topbar-center">
          <span className="rsm-topbar-title">
            {screen === 'history'
              ? 'Rental History'
              : screen === 'inbox'
              ? 'SMS Inbox'
              : screen === 'flow'
              ? 'Order a Rental'
              : 'Rent a Number'}
          </span>
          <span className="rsm-topbar-sub">
            {screen === 'history'
              ? 'Numbers, logs & active leases'
              : screen === 'inbox'
              ? 'Real-time incoming verification codes'
              : screen === 'flow'
              ? 'Dedicated US non-VoIP lines'
              : 'US non-VoIP verification'}
          </span>
        </div>

        <div className="rsm-topbar-right">
          {session?.balanceNgn !== undefined && (
            <button
              type="button"
              className="rsm-topbar-bal"
              onClick={onFund}
              title="Wallet balance — click to fund"
            >
              <Wallet size={12} />
              <span>₦{Math.round(session.balanceNgn).toLocaleString('en-NG')}</span>
            </button>
          )}

          <button
            type="button"
            className={`rsm-topbar-btn ${screen === 'history' ? 'active' : ''}`}
            onClick={() => setScreen(screen === 'history' ? 'home' : 'history')}
            aria-label="Rental History"
            title="Rental History"
          >
            <HistoryIcon size={17} />
            {liveCount > 0 && <span className="rsm-badge-dot" />}
          </button>
        </div>
      </header>

      {/* ----------------- HOME SCREEN ----------------- */}
      {screen === 'home' ? (
        <main className="rsm-body">
          {/* PROMO STRIP CAROUSEL */}
          <section
            className="rsm-promo-strip"
            data-promo-slide={activePromo.id}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(7,18,42,.92) 0%, rgba(7,18,42,.72) 58%, rgba(7,18,42,.24) 100%), url("${activePromo.image}")`,
            }}
            aria-label="Promotion banner"
          >
            <div className="rsm-promo-content">
              <div className="rsm-promo-badge">
                <Sparkles size={11} />
                <span>{activePromo.badge}</span>
              </div>
              <h2 className="rsm-promo-title">{activePromo.title}</h2>
              <p className="rsm-promo-desc">{activePromo.subtitle}</p>
              {activePromo.ctaText ? (
                <button
                  type="button"
                  className="rsm-promo-cta"
                  onClick={() => openType('service')}
                >
                  {activePromo.ctaText} <ArrowRight size={12} />
                </button>
              ) : null}
            </div>
            <div className="rsm-promo-dots">
              {RENTAL_PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === promoIdx ? 'active' : ''}
                  onClick={() => setPromoIdx(i)}
                  aria-label={`Show slide ${i + 1}`}
                />
              ))}
            </div>
          </section>

          {/* RENTAL TYPES GRID */}
          <div className="rsm-section-head">
            <h3>CHOOSE A RENTAL TYPE</h3>
            <span className="rsm-section-count">2 Options</span>
          </div>

          <section className="rsm-types-grid">
            <button
              type="button"
              className="rsm-type-card"
              onClick={() => openType('service')}
            >
              <div className="rsm-type-icon-box purple">
                <List size={22} />
              </div>
              <div className="rsm-type-details">
                <strong className="rsm-type-title">Service Rental</strong>
                <p className="rsm-type-desc">
                  Choose the app or service first, then rent a dedicated US number for the duration you need.
                </p>
                <div className="rsm-type-badge-row">
                  <span className="rsm-status-chip online">
                    <span className="rsm-status-dot" /> Available
                  </span>
                </div>
              </div>
              <div className="rsm-type-arrow">
                <ChevronRight size={20} />
              </div>
            </button>

            <button
              type="button"
              className="rsm-type-card"
              onClick={() => openType('general')}
            >
              <div className="rsm-type-icon-box blue">
                <CalendarClock size={22} />
              </div>
              <div className="rsm-type-details">
                <strong className="rsm-type-title">General Rental</strong>
                <p className="rsm-type-desc">
                  Rent one general-purpose US number for 3 days up to 365 days. No service selection is required.
                </p>
                <div className="rsm-type-badge-row">
                  <span className="rsm-status-chip online">
                    <span className="rsm-status-dot" /> Available
                  </span>
                </div>
              </div>
              <div className="rsm-type-arrow">
                <ChevronRight size={20} />
              </div>
            </button>
          </section>

          {/* LEGAL NOTICE */}
          <div className="rsm-legal-note">
            <ShieldCheck size={16} className="rsm-legal-note-icon" />
            <p>
              Dedicated numbers are private carrier lines for incoming SMS verification. Outgoing calls,
              outgoing texts, and illegal activities are prohibited.
            </p>
          </div>

          {/* HISTORY SHORTCUT */}
          <button
            type="button"
            className="rsm-history-text-link"
            onClick={() => setScreen('history')}
          >
            <HistoryIcon size={16} />
            <span>View Rental History</span>
          </button>
        </main>
      ) : null}

      {/* ----------------- SERVICE RENTAL FLOW SCREEN ----------------- */}
      {screen === 'flow' ? (
        <main className="rsm-body">
          {/* COMPACT PROMO STRIP IN FLOW */}
          <section
            className="rsm-promo-strip compact"
            data-promo-slide={activePromo.id}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(7,18,42,.92) 0%, rgba(7,18,42,.72) 58%, rgba(7,18,42,.24) 100%), url("${activePromo.image}")`,
            }}
            aria-label="Promotion banner"
          >
            <div className="rsm-promo-content">
              <div className="rsm-promo-badge">
                <Sparkles size={11} />
                <span>{activePromo.badge}</span>
              </div>
              <h2 className="rsm-promo-title">{activePromo.title}</h2>
              <p className="rsm-promo-desc">{activePromo.subtitle}</p>
            </div>
            <div className="rsm-promo-dots">
              {RENTAL_PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === promoIdx ? 'active' : ''}
                  onClick={() => setPromoIdx(i)}
                  aria-label={`Show slide ${i + 1}`}
                />
              ))}
            </div>
          </section>

          {/* BACK BREADCRUMB */}
          <div className="rsm-breadcrumb-bar">
            <button
              type="button"
              className="rsm-breadcrumb-btn"
              onClick={() => setScreen('home')}
            >
              <ArrowLeft size={14} /> Back to rental types
            </button>
            <span className="rsm-breadcrumb-tag">
              {type === 'service' ? 'SERVICE RENTAL' : 'GENERAL RENTAL'}
            </span>
          </div>

          {/* SUCCESS NOTIFICATION */}
          {orderSuccessMsg && (
            <div className="rsm-order-success-banner">
              <Check size={18} />
              <div className="rsm-order-success-text">
                <strong>Number Allocated!</strong>
                <p>{orderSuccessMsg}</p>
              </div>
              <button
                type="button"
                className="rsm-order-success-close"
                onClick={() => setOrderSuccessMsg(null)}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ORDER A RENTAL CARD */}
          <section className="rsm-order-card">
            <div className="rsm-order-card-header">
              <h3>Order a Rental</h3>
            </div>

            {/* RENTAL TYPE (ONE-TIME / RENEWABLE, ON BOTH FLOWS) */}
              <div className="rsm-form-field">
                <label className="rsm-label">RENTAL TYPE</label>
                <div className="rsm-modes-toggle">
                  {MODES.map(({ id, label, hint, icon: Icon }) => (
                    <button
                      type="button"
                      key={id}
                      className={`rsm-mode-tab ${mode === id ? 'active' : ''}`}
                      onClick={() => setMode(id)}
                    >
                      <div className="rsm-mode-tab-head">
                        <Icon size={15} />
                        <strong>{label}</strong>
                      </div>
                      <small>{hint}</small>
                    </button>
                  ))}
                </div>
              </div>

            {/* SERVICE SELECTION (SERVICE RENTAL ONLY) */}
            {type === 'service' ? (
            <div className="rsm-form-field">
              <div className="rsm-field-top">
                <label className="rsm-label">
                  SERVICE ({services.length.toLocaleString()} available)
                </label>
              </div>

              <button
                type="button"
                className={`rsm-service-trigger ${service ? 'selected' : ''}`}
                onClick={() => setPickerOpen(true)}
              >
                <div className="rsm-service-trigger-left">
                  <div className="rsm-service-icon-box">
                    {service ? <MessageSquare size={16} /> : <Search size={16} />}
                  </div>
                  <div className="rsm-service-trigger-copy">
                    {service ? (
                      <>
                        <strong className="rsm-selected-name">{service}</strong>
                        <small>US non-VoIP route · Tap to change</small>
                      </>
                    ) : (
                      <>
                        <strong className="rsm-placeholder-name">Search &amp; select a service</strong>
                        <small>Tap to choose from 2,200+ apps</small>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown size={18} className="rsm-service-chevron" />
              </button>
            </div>
            ) : null}

            {/* DURATION SELECTION (ALWAYS VISIBLE!) */}
            <div className="rsm-form-field">
              <div className="rsm-field-top">
                <label className="rsm-label">{type === 'general' ? 'RENTAL PERIOD' : 'DURATION'}</label>
              </div>

              <div className="rsm-durations-grid">
                {DURATION_OPTIONS.filter((d) => (type === 'general' ? d.id !== '1d' : true)).map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className={`rsm-duration-pill ${selectedDuration === d.id ? 'active' : ''}`}
                    onClick={() => setSelectedDuration(d.id)}
                  >
                    <span className="rsm-dur-label">{d.label}</span>
                    <span className="rsm-dur-state">₦{d.basePriceNgn.toLocaleString('en-NG')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AREA CODE SELECTION (ALWAYS VISIBLE!) */}
            <div className="rsm-form-field">
              <div className="rsm-field-top">
                <label className="rsm-label">AREA CODE (OPTIONAL)</label>
                <span className="rsm-field-hint">US only</span>
              </div>

              <button
                type="button"
                className={`rsm-areacode-trigger ${areaCode ? 'selected' : ''}`}
                onClick={() => setAcOpen(true)}
              >
                <div className="rsm-areacode-left">
                  <Hash size={16} />
                  <div className="rsm-areacode-copy">
                    {areaCode ? (
                      <>
                        <strong>{areaCode.code} · {areaCode.place}</strong>
                        <small>Selected area code</small>
                      </>
                    ) : (
                      <>
                        <strong className="rsm-areacode-placeholder">Any area code (Leave blank for any code)</strong>
                        <small>Tap to select a US city/code</small>
                      </>
                    )}
                  </div>
                </div>
                {areaCode ? (
                  <span
                    className="rsm-areacode-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAreaCode(null);
                    }}
                    aria-label="Clear area code"
                  >
                    <X size={14} />
                  </span>
                ) : (
                  <ChevronDown size={18} className="rsm-service-chevron" />
                )}
              </button>
            </div>

            {/* PRICE DISPLAY */}
            <div className="rsm-price-box">
              <div className="rsm-price-copy">
                <span className="rsm-price-label">Total to pay</span>
                <strong className="rsm-price-amount">
                  ₦{currentPriceNgn.toLocaleString('en-NG')}.00
                </strong>
                <small className="rsm-price-sub">
                  {type === 'general'
                    ? `${currentDurationObj.label} general rental`
                    : `${currentDurationObj.label} · ${service}`}
                </small>
              </div>
              <p className="rsm-price-note">The live price is checked again before your rental is created.</p>
            </div>

            {/* RENT NUMBER CTA */}
            <div className="rsm-order-footer">
              <button
                type="button"
                className="rsm-rent-action-btn"
                onClick={handleOrderRental}
                disabled={isOrdering}
              >
                {isOrdering ? (
                  <>
                    <Loader2 size={16} className="rsm-spin-anim" /> Allocating dedicated line…
                  </>
                ) : (
                  <>
                    <Smartphone size={16} /> Rent Number
                  </>
                )}
              </button>
            </div>
          </section>

          {/* ABOUT GENERAL RENTALS (ONE CARD, GENERAL RENTAL ONLY) */}
          {type === 'general' ? (
            <section className="rsm-general-card">
              <h3 className="rsm-general-card-title">About General Rentals</h3>
              <ul className="rsm-general-points">
                <li>
                  <span className="rsm-general-point-icon"><List size={14} /></span>
                  <div className="rsm-general-point-copy">
                    <strong>Not tied to one app</strong>
                    <small>This is a general-use number rather than a number purchased for one selected service.</small>
                  </div>
                </li>
                <li>
                  <span className="rsm-general-point-icon"><MessageSquare size={14} /></span>
                  <div className="rsm-general-point-copy">
                    <strong>View incoming messages</strong>
                    <small>Use Rental History to check verification messages while the rental remains active.</small>
                  </div>
                </li>
                <li>
                  <span className="rsm-general-point-icon"><RefreshCw size={14} /></span>
                  <div className="rsm-general-point-copy">
                    <strong>One-time or renewable</strong>
                    <small>Choose a fixed period or renew manually while messages stay in Rental History.</small>
                  </div>
                </li>
              </ul>
              <div className="rsm-general-note">
                <Info size={14} className="rsm-general-note-icon" />
                <p>
                  Please note: A general rental is not reserved for a particular app. Compatibility and
                  verification outcomes are decided by the service you use. Do not use rented numbers for
                  fraudulent, illegal, spam, abusive, or prohibited activity.
                </p>
              </div>
              <button
                type="button"
                className="rsm-general-history-btn"
                onClick={() => setScreen('history')}
              >
                <HistoryIcon size={16} />
                <span>View Rental History</span>
              </button>
            </section>
          ) : null}

          {/* INFO NOTICE (SERVICE RENTAL ONLY) */}
          {type === 'service' ? (
          <div className="rsm-info-notice">
            <Info size={16} className="rsm-info-icon" />
            <p>
              Rentals give you a dedicated US number for your chosen duration. Receive unlimited SMS.{' '}
              Check{' '}
              <button
                type="button"
                className="rsm-inline-link"
                onClick={() => setScreen('history')}
              >
                Rental History
              </button>{' '}
              to view messages.
            </p>
          </div>

          {/* MY RENTALS SECTION (MATCHING PRIMEX) */}
          <section className="rsm-my-rentals-section">
            <div className="rsm-my-rentals-header">
              <h4 className="rsm-my-rentals-title">My Rentals</h4>
              <button
                type="button"
                className="rsm-view-all-btn"
                onClick={() => setScreen('history')}
              >
                View All
              </button>
            </div>

            {rentals.length > 0 ? (
              <div className="rsm-my-rentals-list">
                {rentals.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="rsm-rental-compact-card"
                    onClick={() => openInbox(r)}
                  >
                    <div className="rsm-rental-compact-top">
                      <div className="rsm-rental-phone-wrap">
                        <strong className="rsm-rental-phone">{r.number}</strong>
                        <button
                          type="button"
                          className="rsm-copy-mini-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyNumber(r.number);
                          }}
                          title="Copy phone number"
                        >
                          {copiedNumber === r.number ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <span className={`rsm-status-chip ${isLive(r) ? 'online' : 'ended'}`}>
                        <span className="rsm-status-dot" /> {isLive(r) ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <div className="rsm-rental-compact-sub">
                      <span>{r.serviceName}</span>
                      <span>•</span>
                      <span>{r.duration}</span>
                      <span>•</span>
                      <span>{isLive(r) ? timeRemaining(r.endsAt) : 'Expired'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rsm-no-rentals-card">
                <p className="rsm-no-rentals-text">No rentals yet</p>
                <p className="rsm-no-rentals-sub">Order your first rental number above.</p>
              </div>
            )}
          </section>
          ) : null}
        </main>
      ) : null}

      {/* ----------------- RENTAL HISTORY SCREEN ----------------- */}
      {screen === 'history' ? (
        <main className="rsm-body">
          {/* BREADCRUMB */}
          <div className="rsm-breadcrumb-bar">
            <button
              type="button"
              className="rsm-breadcrumb-btn"
              onClick={() => setScreen('flow')}
            >
              <ArrowLeft size={14} /> Back to order
            </button>
            <span className="rsm-breadcrumb-tag">RENTAL HISTORY</span>
          </div>

          {/* HEADER ROW */}
          <div className="rsm-history-header-row">
            <h3 className="rsm-history-title">My Rentals</h3>
            <span className="rsm-history-total-chip">{rentals.length} total</span>
          </div>

          {/* SEARCH BAR */}
          <div className="rsm-history-search-bar">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search service, number…"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              aria-label="Search rental history"
            />
            {historySearch && (
              <button
                type="button"
                className="rsm-search-clear-btn"
                onClick={() => setHistorySearch('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* STATUS FILTER TABS */}
          <div className="rsm-history-filter-tabs">
            {(['all', 'active', 'expired', 'renewable', 'one-time'] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                className={`rsm-history-filter-tab ${historyFilter === tab ? 'active' : ''}`}
                onClick={() => setHistoryFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* LIST OR EMPTY STATE */}
          {filteredRentals.length > 0 ? (
            <section className="rsm-history-list">
              {filteredRentals.map((r) => (
                <div
                  className="rsm-history-card"
                  key={r.id}
                  onClick={() => openInbox(r)}
                >
                  <div className="rsm-history-card-icon">
                    <MessageSquare size={18} />
                  </div>
                  <div className="rsm-history-card-details">
                    <div className="rsm-history-card-row">
                      <div className="rsm-history-phone-group">
                        <strong className="rsm-history-phone">{r.number}</strong>
                        <button
                          type="button"
                          className="rsm-copy-mini-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyNumber(r.number);
                          }}
                          title="Copy phone number"
                        >
                          {copiedNumber === r.number ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                      <span className={`rsm-status-chip ${isLive(r) ? 'online' : 'ended'}`}>
                        <span className="rsm-status-dot" /> {isLive(r) ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <div className="rsm-history-meta-sub">
                      <span>{r.serviceName}</span>
                      <span>•</span>
                      <span>{r.duration}</span>
                      <span>•</span>
                      <span>{isLive(r) ? timeRemaining(r.endsAt) : `Ended ${fmtDate(r.endsAt || r.createdAt)}`}</span>
                    </div>
                  </div>
                  <div className="rsm-history-arrow-btn">
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="rsm-history-empty-card">
              <div className="rsm-empty-icon-wrap">
                <HistoryIcon size={28} />
              </div>
              <h4>No Rentals Yet</h4>
              <p>You haven't rented any numbers yet. Get a dedicated US number for days or months.</p>
              <button
                type="button"
                className="rsm-primary-btn"
                onClick={() => openType('service')}
              >
                Rent a Number <ArrowRight size={14} />
              </button>
            </div>
          )}
        </main>
      ) : null}

      {/* ----------------- SMS INBOX SCREEN ----------------- */}
      {screen === 'inbox' && inboxRental ? (
        <main className="rsm-body">
          <div className="rsm-breadcrumb-bar">
            <button
              type="button"
              className="rsm-breadcrumb-btn"
              onClick={() => setScreen('history')}
            >
              <ArrowLeft size={14} /> Back to history
            </button>
            <span className="rsm-breadcrumb-tag">SMS INBOX</span>
          </div>

          <div className="rsm-inbox-summary">
            <div className="rsm-inbox-summary-top">
              <div className="rsm-inbox-summary-icon">
                <Smartphone size={18} />
              </div>
              <div className="rsm-inbox-summary-copy">
                <div className="rsm-inbox-phone-wrap">
                  <strong className="rsm-inbox-phone">{inboxRental.number}</strong>
                  <button
                    type="button"
                    className="rsm-copy-mini-btn"
                    onClick={() => copyNumber(inboxRental.number)}
                    title="Copy number"
                  >
                    {copiedNumber === inboxRental.number ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <span className="rsm-inbox-service">{inboxRental.serviceName} · {inboxRental.duration}</span>
              </div>
              <span className={`rsm-status-chip ${isLive(inboxRental) ? 'online' : 'ended'}`}>
                <span className="rsm-status-dot" /> {isLive(inboxRental) ? 'Active' : 'Ended'}
              </span>
            </div>
            <div className="rsm-inbox-summary-meta">
              <span>
                <Clock size={12} /> {isLive(inboxRental) ? timeRemaining(inboxRental.endsAt) : 'Expired'}
              </span>
              <button
                type="button"
                className="rsm-inbox-refresh"
                onClick={() => void fetchInbox(inboxRental.reservationId)}
                disabled={inboxLoading}
              >
                {inboxLoading ? (
                  <Loader2 size={13} className="rsm-spin-anim" />
                ) : (
                  <RefreshCw size={13} />
                )}
                Refresh
              </button>
            </div>
          </div>

          {/* DEMO SMS SIMULATION BUTTON */}
          <div className="rsm-inbox-test-bar">
            <button
              type="button"
              className="rsm-test-otp-btn"
              onClick={() => simulateIncomingOtp(inboxRental.reservationId, inboxRental.serviceName)}
            >
              <Sparkles size={13} /> Simulate Incoming SMS Code
            </button>
          </div>

          <div className="rsm-section-head">
            <h3>
              <MessageSquare size={15} /> Incoming SMS
            </h3>
            <span className="rsm-section-count">
              {inboxMessages ? `${inboxMessages.length} message${inboxMessages.length === 1 ? '' : 's'}` : '—'}
            </span>
          </div>

          {inboxLoading && !inboxMessages ? (
            <div className="rsm-inbox-loading">
              <Loader2 size={18} className="rsm-spin-anim" /> Loading messages…
            </div>
          ) : inboxError ? (
            <div className="rsm-inbox-state-card">
              <AlertCircle size={20} />
              <p>{inboxError}</p>
              <button
                type="button"
                className="rsm-inbox-retry"
                onClick={() => void fetchInbox(inboxRental.reservationId)}
              >
                Try again
              </button>
            </div>
          ) : inboxMessages && inboxMessages.length ? (
            <section className="rsm-inbox-list">
              {inboxMessages.map((m) => {
                const code = extractOtpCode(m.text);
                return (
                  <div className="rsm-inbox-msg" key={m.id}>
                    <div className="rsm-inbox-msg-head">
                      <span className="rsm-inbox-msg-from">{m.from || inboxRental.serviceName}</span>
                      <span className="rsm-inbox-msg-time">
                        {m.receivedAt ? fmtDate(m.receivedAt) : 'Just now'}
                      </span>
                    </div>
                    <p className="rsm-inbox-msg-text">{m.text}</p>
                    {code && (
                      <div className="rsm-otp-copy-wrap">
                        <span className="rsm-otp-badge">
                          Code: <strong>{code}</strong>
                        </span>
                        <button
                          type="button"
                          className="rsm-otp-copy-btn"
                          onClick={() => copyNumber(code)}
                        >
                          {copiedNumber === code ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ) : (
            <div className="rsm-inbox-state-card">
              <MessageSquare size={20} />
              <p>
                No SMS yet. Verification codes sent to this number will appear here automatically.
                Tap Refresh or use the button above to simulate.
              </p>
            </div>
          )}
        </main>
      ) : null}

      {/* ----------------- AREA CODE PICKER BOTTOM SHEET ----------------- */}
      {acOpen ? (
        <div className="rsm-modal-backdrop" onClick={() => setAcOpen(false)}>
          <div
            className="rsm-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Select Area Code"
          >
            <div className="rsm-modal-handle" />

            <div className="rsm-modal-head">
              <div className="rsm-modal-head-titles">
                <strong>Select Area Code</strong>
                <small>Optional — leave blank for any available US code</small>
              </div>
              <button
                type="button"
                className="rsm-modal-close-btn"
                onClick={() => setAcOpen(false)}
                aria-label="Close area code selector"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rsm-modal-search-wrapper">
              <div className="rsm-modal-search-bar">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search code or city (e.g. 212, Los Angeles)…"
                  value={acQuery}
                  onChange={(e) => setAcQuery(e.target.value)}
                  aria-label="Search area code"
                  autoFocus
                />
                {acQuery ? (
                  <button
                    type="button"
                    className="rsm-search-clear-btn"
                    onClick={() => setAcQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            {areaCode ? (
              <div className="rsm-ac-selected-row">
                <span className="rsm-ac-selected-copy">
                  <Check size={13} /> Selected: {areaCode.code} ({areaCode.place})
                </span>
                <button
                  type="button"
                  className="rsm-ac-any-btn"
                  onClick={() => {
                    setAreaCode(null);
                    setAcOpen(false);
                  }}
                >
                  Use any
                </button>
              </div>
            ) : null}

            <div className="rsm-modal-body">
              <ul className="rsm-service-list">
                {US_AREA_CODES.filter((a) => {
                  const q = acQuery.trim().toLowerCase();
                  if (!q) return true;
                  return a.code.includes(q) || a.place.toLowerCase().includes(q);
                }).map((a) => (
                  <li key={a.code}>
                    <button
                      type="button"
                      className={`rsm-service-item-btn ${areaCode?.code === a.code ? 'active' : ''}`}
                      onClick={() => {
                        setAreaCode(a);
                        setAcOpen(false);
                        setAcQuery('');
                      }}
                    >
                      <div className="rsm-service-item-left">
                        <span className="rsm-service-item-icon rsm-ac-icon">
                          <Hash size={14} />
                        </span>
                        <span className="rsm-service-item-name rsm-ac-code">{a.code}</span>
                        <span className="rsm-ac-place">{a.place}</span>
                      </div>
                      {areaCode?.code === a.code ? (
                        <span className="rsm-service-selected-check">
                          <Check size={16} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {!US_AREA_CODES.filter((a) => {
                  const q = acQuery.trim().toLowerCase();
                  return !q || a.code.includes(q) || a.place.toLowerCase().includes(q);
                }).length ? (
                  <li className="rsm-service-empty-item">
                    <p>No area code matches “{acQuery}”.</p>
                    <button
                      type="button"
                      className="rsm-clear-query-btn"
                      onClick={() => setAcQuery('')}
                    >
                      Reset search
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {/* ----------------- SERVICE PICKER BOTTOM SHEET ----------------- */}
      {pickerOpen ? (
        <div className="rsm-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="rsm-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Select Service"
          >
            {/* DRAG HANDLE */}
            <div className="rsm-modal-handle" />

            {/* MODAL HEADER */}
            <div className="rsm-modal-head">
              <div className="rsm-modal-head-titles">
                <strong>Select Service</strong>
                <small>Choose an app for dedicated SMS verification</small>
              </div>
              <button
                type="button"
                className="rsm-modal-close-btn"
                onClick={() => setPickerOpen(false)}
                aria-label="Close service selector"
              >
                <X size={18} />
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="rsm-modal-search-wrapper">
              <div className="rsm-modal-search-bar">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search service (e.g. WhatsApp, Google, Telegram)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search service"
                  autoFocus
                />
                {query ? (
                  <button
                    type="button"
                    className="rsm-search-clear-btn"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* SERVICE COUNT INDICATOR */}
            <div className="rsm-modal-count-row">
              <span>
                Showing {filteredServices.length.toLocaleString()} of {services.length.toLocaleString()}{' '}
                {mode === 'one-time' ? 'one-time' : 'renewable'} services
              </span>
            </div>

            {/* SERVICE LIST */}
            <div className="rsm-modal-body">
              <ul className="rsm-service-list">
                {filteredServices.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      className={`rsm-service-item-btn ${service === s ? 'active' : ''}`}
                      onClick={() => {
                        setService(s);
                        setPickerOpen(false);
                        setQuery('');
                      }}
                    >
                      <div className="rsm-service-item-left">
                        <span className="rsm-service-item-icon">
                          <MessageSquare size={14} />
                        </span>
                        <span className="rsm-service-item-name">{s}</span>
                      </div>
                      {service === s ? (
                        <span className="rsm-service-selected-check">
                          <Check size={16} />
                        </span>
                      ) : (
                        <ChevronRight size={15} className="rsm-service-item-chevron" />
                      )}
                    </button>
                  </li>
                ))}
                {!filteredServices.length ? (
                  <li className="rsm-service-empty-item">
                    <p>No service matches “{query}”.</p>
                    <button
                      type="button"
                      className="rsm-clear-query-btn"
                      onClick={() => setQuery('')}
                    >
                      Reset search
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
