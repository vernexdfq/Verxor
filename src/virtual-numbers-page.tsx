'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Globe2,
  Info,
  Radio,
  Search,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import './virtual-numbers-page.css';

type PoolId =
  | 'usa-economy'
  | 'usa-standard'
  | 'worldwide-economy'
  | 'worldwide-standard'
  | 'usa-fast'
  | 'usa-premium'
  | 'worldwide-fast'
  | 'worldwide-premium';

type Tier = 'ECO' | 'STD' | 'FAST' | 'PREMIUM';

type Pool = {
  id: PoolId;
  title: string;
  server: 1 | 2;
  location: 'USA' | 'Worldwide';
  hint: string;
  tier: Tier;
  fromNgn: number;
};

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
};

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  poolTitle: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  otp?: string;
  createdAt: string;
};

type Service = {
  id: string;
  name: string;
};

const SERVER1_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', server: 1, location: 'USA', hint: 'Low cost (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 150 },
  { id: 'usa-standard', title: 'USA · Standard', server: 1, location: 'USA', hint: 'Reliable speed for standard apps', tier: 'STD', fromNgn: 380 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', server: 1, location: 'Worldwide', hint: 'Global coverage (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 280 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', server: 1, location: 'Worldwide', hint: 'Standard global delivery', tier: 'STD', fromNgn: 450 },
];

const SERVER2_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', server: 2, location: 'USA', hint: 'High OTP Success (Non-VoIP)', tier: 'FAST', fromNgn: 620 },
  { id: 'usa-premium', title: 'USA · Premium', server: 2, location: 'USA', hint: 'Maximum reliability & instant delivery', tier: 'PREMIUM', fromNgn: 990 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', server: 2, location: 'Worldwide', hint: 'Fast global delivery', tier: 'FAST', fromNgn: 750 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', server: 2, location: 'Worldwide', hint: 'Premium routes & highest success', tier: 'PREMIUM', fromNgn: 1100 },
];

const WORLDWIDE_COUNTRIES: Country[] = [
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dial: '+55' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '+27' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '+234' },
];

const USA_COUNTRY: Country = { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' };

const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'google', name: 'Google' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'twitter', name: 'X / Twitter' },
  { id: 'discord', name: 'Discord' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'apple', name: 'Apple' },
  { id: 'paypal', name: 'PayPal' },
];

const PROMO_SLIDES = [
  {
    id: 'web',
    title: 'Do you need a custom website or mobile app?',
    subtitle: 'Get a website today!',
    cta: 'Get Started →',
  },
  {
    id: 'panel',
    title: 'Own a Whitelabel Reseller Panel',
    subtitle: 'Powered by Verxor — sell numbers under your brand.',
    cta: 'Own a Panel →',
  },
  {
    id: 'otp',
    title: 'Receive OTPs in 60 Seconds',
    subtitle: 'Instant verification for all your social media & app accounts!',
    cta: 'Verify Now →',
  },
];

type Step = 'pools' | 'country' | 'services';

function formatNgn(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

const DEMO_ACTIVE: CustomerNumberOrder[] = [
  {
    id: 'demo-1',
    number: '+1 (415) •••-4821',
    service: 'WhatsApp',
    poolTitle: 'USA · Premium',
    status: 'waiting',
    createdAt: new Date().toISOString(),
  },
];

/** Brand-colored official-style marks for each service. */
function ServiceLogo({ id }: { id: string }) {
  const s = { width: 22, height: 22, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  switch (id) {
    case 'whatsapp':
      return (
        <svg {...s} fill="#25D366">
          <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.97.55 3.8 1.52 5.4L2 22l5-1.3a10.1 10.1 0 0 0 5.04 1.32c5.46 0 9.89-4.4 9.89-9.82S17.5 2 12.04 2zm5.75 14.03c-.24.67-1.4 1.23-1.93 1.31-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.78-4.17-4.93-4.36-.14-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.45.51-.15.14-.3.29-.13.57.17.28.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.2-.29.39-.24.66-.14.27.1 1.72.81 2.02.96.3.15.5.22.57.34.08.13.08.75-.16 1.42z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg {...s} fill="#26A5E4">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8-1.6 7.56c-.12.54-.43.67-.87.42l-2.4-1.77-1.16 1.12c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.04c.19-.17-.04-.27-.3-.1l-5.53 3.48-2.38-.74c-.52-.16-.53-.52.11-.77l9.3-3.58c.43-.2.81.1.68.61z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...s}>
          <defs>
            <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f58529" />
              <stop offset="50%" stopColor="#dd2a7b" />
              <stop offset="100%" stopColor="#515bd4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
        </svg>
      );
    case 'google':
      return (
        <svg {...s}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...s} fill="#1877F2">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...s} fill="#000">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64 6.34 6.34 0 0 0 15.83 15.3V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.08-.36z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...s} fill="#0F1419">
          <path d="M18.24 2H21.5l-7.05 8.06L22.5 22h-6.17l-4.83-6.31L6.3 22H3.02l7.54-8.62L1.5 2h6.33l4.36 5.78L18.24 2zm-1.08 18.1h1.81L7.03 3.8H5.09l12.07 16.3z" />
        </svg>
      );
    case 'discord':
      return (
        <svg {...s} fill="#5865F2">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.36-.76-.54-1.09-.02-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.02 0-.03.01-.05.03C2.3 9.06 1.58 12.7 1.94 16.3c0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.03 0-.07-.02-.09-.57-.22-1.11-.48-1.64-.78-.03-.02-.03-.07 0-.1.11-.08.22-.17.33-.25.02-.02.06-.02.09-.01 3.44 1.57 7.15 1.57 10.55 0 .03-.01.07-.01.09.01.11.09.22.17.33.26.03.02.03.08 0 .1-.52.31-1.07.56-1.64.78-.03.01-.04.06-.02.09.32.61.68 1.19 1.07 1.74.02.03.05.04.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.42-4.16-.7-7.77-2.96-10.97-.01-.02-.03-.03-.05-.03zM8.52 14.18c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
        </svg>
      );
    case 'microsoft':
      return (
        <svg {...s}>
          <path fill="#F25022" d="M1 1h10v10H1z" />
          <path fill="#7FBA00" d="M13 1h10v10H13z" />
          <path fill="#00A4EF" d="M1 13h10v10H1z" />
          <path fill="#FFB900" d="M13 13h10v10H13z" />
        </svg>
      );
    case 'amazon':
      return (
        <svg {...s} fill="#FF9900">
          <path d="M15.5 17.2c-2.3 1.7-5.6 2.6-8.4 2.6-4 0-7.5-1.5-10.2-3.9-.2-.2 0-.45.23-.3 2.8 1.6 6.2 2.6 9.8 2.6 2.4 0 5-.5 7.5-1.5.36-.15.67.24.2.6z" transform="translate(4.5 -1)" />
          <path fill="#232F3E" d="M11.1 8.2c0-1 .22-2.3 1.6-2.3.3 0 .57.06.8.18l.2-.95a2.8 2.8 0 0 0-1.16-.25c-2 0-2.78 1.77-2.78 3.6 0 1.97.88 3.14 2.6 3.14.5 0 1.06-.13 1.4-.28l-.25-1a2.2 2.2 0 0 1-.9.21c-.93 0-1.52-.7-1.52-2.3zm-3.9-.07c.35 0 .63.07.88.18l.23-1A3.1 3.1 0 0 0 6.5 7c-2 0-3 1.8-3 3.65 0 2 .96 3.1 2.7 3.1.55 0 1.04-.12 1.36-.26l-.27-1a2 2 0 0 1-.86.2c-.91 0-1.55-.7-1.55-2.32 0-1.53.64-2.24 1.55-2.24zM2.5 14.3V5.1H1v9.2h1.5zm15.1-4c0-2.27-1.36-3.27-3.36-3.27-2.14 0-3.5 1.55-3.5 3.68 0 2.28 1.4 3.6 3.64 3.6 1.05 0 2-.24 2.72-.64l-.5-1.05a3.6 3.6 0 0 1-2.13.6c-1.27 0-2.18-.77-2.27-1.95h5.36c0-.18.04-.45.04-.97zm-5.36-.45c.14-1.14.86-1.91 1.95-1.91 1.05 0 1.68.73 1.77 1.91H12.24z" />
        </svg>
      );
    case 'apple':
      return (
        <svg {...s} fill="#111">
          <path d="M16.37 12.62c.03 3.18 2.79 4.24 2.82 4.25-.02.08-.44 1.5-1.45 2.97-.87 1.27-1.78 2.53-3.2 2.56-1.4.02-1.85-.83-3.45-.83-1.6 0-2.1.8-3.42.85-1.37.05-2.41-1.37-3.3-2.63-1.8-2.6-3.18-7.35-1.33-10.55.92-1.59 2.56-2.6 4.34-2.62 1.35-.03 2.63.91 3.45.91.82 0 2.35-1.12 3.96-.96.67.03 2.56.27 3.77 2.05-.1.06-2.25 1.31-2.19 3.9zM13.9 4.7c.73-.88 1.22-2.11 1.09-3.33-1.05.04-2.32.7-3.07 1.58-.68.78-1.27 2.03-1.11 3.22 1.17.09 2.36-.6 3.09-1.47z" />
        </svg>
      );
    case 'paypal':
      return (
        <svg {...s} viewBox="0 0 24 24">
          <path fill="#003087" d="M7.1 21.2H4.2L6.5 3.6h5.2c2.6 0 4.4.5 5.4 1.6.9 1 1.2 2.4.9 4.3-.4 2.4-1.5 4.1-3.2 5.1-1.3.8-2.9 1.1-4.8 1.1H8.6l-.7 5.5H7.1z" />
          <path fill="#009CDE" d="M18 9.5c-.1.5-.2.9-.4 1.4-.9 2.9-3 4.4-6.1 4.4H9.7l-.9 5.9H6.3L8.6 3.6h5.2c1.5 0 2.7.2 3.6.7.9.5 1.5 1.2 1.8 2.2.3.6.4 1.3.4 2.1.1.3.1.6 0 .9z" />
        </svg>
      );
    default:
      return <span className="vn-service-letter">{id.slice(0, 1).toUpperCase()}</span>;
  }
}

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications,
  orders = [],
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');
  const [promoIndex, setPromoIndex] = useState(0);
  const [balance] = useState(7570);

  const activeOrders = orders.length > 0 ? orders : DEMO_ACTIVE;

  useEffect(() => {
    const t = setInterval(() => {
      setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return WORLDWIDE_COUNTRIES;
    return WORLDWIDE_COUNTRIES.filter((country) =>
      [country.name, country.code, country.dial].some((value) => value.toLowerCase().includes(q)),
    );
  }, [countryQuery]);

  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((service) => service.name.toLowerCase().includes(q));
  }, [serviceQuery]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setCountryQuery('');
    setServiceQuery('');
    if (pool.location === 'USA') {
      setSelectedCountry(USA_COUNTRY);
      setStep('services');
    } else {
      setSelectedCountry(null);
      setStep('country');
    }
  };

  const handleBack = () => {
    if (step === 'pools') return onBack();
    if (step === 'country') {
      setSelectedPool(null);
      setStep('pools');
      return;
    }
    if (selectedPool?.location === 'Worldwide') {
      setSelectedCountry(null);
      setStep('country');
      return;
    }
    setSelectedPool(null);
    setSelectedCountry(null);
    setStep('pools');
  };

  const promo = PROMO_SLIDES[promoIndex];

  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={handleBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="vn-topbar-copy">
          <strong>Virtual Numbers (OTP)</strong>
          <small>Get verified with global numbers</small>
        </div>
        <button type="button" className="vn-balance" aria-label="Wallet balance">
          <WalletCards size={14} />
          <span>{formatNgn(balance)}</span>
        </button>
      </header>

      {step === 'pools' && (
        <>
          <div className="vn-info-banner">
            <Info size={15} strokeWidth={2.2} />
            <span>Choose a server route based on compatibility, speed, and pricing.</span>
          </div>

          <section className="vn-server-block" aria-labelledby="vn-s1">
            <div className="vn-server-head">
              <Database size={16} className="vn-server-icon" />
              <h2 id="vn-s1">Server 1 — Economy & Standard Routes</h2>
            </div>
            <div className="vn-card-grid">
              {SERVER1_POOLS.map((pool) => (
                <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
              ))}
            </div>
          </section>

          <section className="vn-server-block" aria-labelledby="vn-s2">
            <div className="vn-server-head">
              <Zap size={16} className="vn-server-icon vn-server-icon-zap" />
              <h2 id="vn-s2">Server 2 — High Speed & Non-VoIP Routes</h2>
            </div>
            <div className="vn-card-grid">
              {SERVER2_POOLS.map((pool) => (
                <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
              ))}
            </div>
          </section>

          <section className="vn-promo" aria-label="Promotions">
            <div className="vn-promo-slide">
              <div className="vn-promo-copy">
                <strong>{promo.title}</strong>
                <span>{promo.subtitle}</span>
              </div>
              <button type="button" className="vn-promo-cta">
                {promo.cta}
              </button>
            </div>
            <div className="vn-promo-dots" role="tablist">
              {PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={`vn-dot ${i === promoIndex ? 'active' : ''}`}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setPromoIndex(i)}
                />
              ))}
            </div>
          </section>

          <section className="vn-active" aria-labelledby="vn-active-title">
            <div className="vn-active-head">
              <Radio size={16} className="vn-active-icon" />
              <h3 id="vn-active-title">Your Active Numbers & OTP Inboxes</h3>
            </div>
            <div className="vn-active-list">
              {activeOrders.map((order) => (
                <article key={order.id} className="vn-active-row">
                  <span className="vn-active-app" aria-hidden>
                    {order.service.slice(0, 1)}
                  </span>
                  <div className="vn-active-meta">
                    <strong>{order.number}</strong>
                    <small>
                      <span className="vn-pulse" />
                      {order.status === 'waiting'
                        ? 'Pending SMS'
                        : order.status === 'received'
                          ? `OTP ${order.otp ?? 'ready'}`
                          : order.status}
                      {order.service ? ` · ${order.service}` : ''}
                    </small>
                  </div>
                  <button type="button" className="vn-inbox-btn">
                    View Inbox <ChevronRight size={14} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 'country' && selectedPool && (
        <section className="vn-step">
          <div className="vn-step-head">
            <h2>Select country</h2>
            <p>{selectedPool.title} · Worldwide pool</p>
          </div>
          <label className="vn-search">
            <Search size={16} />
            <input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="Search country"
              autoComplete="off"
            />
            {countryQuery ? (
              <button type="button" className="vn-clear" onClick={() => setCountryQuery('')} aria-label="Clear">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="vn-list">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                className="vn-list-item"
                onClick={() => {
                  setSelectedCountry(country);
                  setStep('services');
                }}
              >
                <span className="vn-flag">{country.flag}</span>
                <span className="vn-list-copy">
                  <strong>{country.name}</strong>
                  <small>{country.dial}</small>
                </span>
                <ChevronRight size={16} className="vn-chevron" />
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'services' && selectedPool && selectedCountry && (
        <section className="vn-step">
          <div className="vn-step-head">
            <h2>Select service</h2>
            <p>
              {selectedCountry.flag} {selectedCountry.name} · {selectedPool.title}
            </p>
          </div>
          <label className="vn-search">
            <Search size={16} />
            <input
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Search WhatsApp, Telegram…"
              autoComplete="off"
            />
            {serviceQuery ? (
              <button type="button" className="vn-clear" onClick={() => setServiceQuery('')} aria-label="Clear">
                <X size={14} />
              </button>
            ) : null}
          </label>
          <div className="vn-list">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                type="button"
                className="vn-list-item"
                onClick={() => {
                  void onOpenNotifications;
                  void service;
                }}
              >
                <span className={`vn-service-icon brand-${service.id}`}>
                  <ServiceLogo id={service.id} />
                </span>
                <span className="vn-list-copy">
                  <strong>{service.name}</strong>
                  <small>From {formatNgn(selectedPool.fromNgn)} / OTP</small>
                </span>
                <ChevronRight size={16} className="vn-chevron" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (p: Pool) => void }) {
  const isUsa = pool.location === 'USA';
  return (
    <button type="button" className="vn-pool-card" onClick={() => onSelect(pool)}>
      <div className="vn-pool-card-top">
        <span className={`vn-pool-mark ${isUsa ? 'usa' : 'world'}`}>
          {isUsa ? '🇺🇸' : <Globe2 size={16} />}
        </span>
        <span className={`vn-tier-badge tier-${pool.tier.toLowerCase()}`}>{pool.tier}</span>
      </div>
      <strong className="vn-pool-title">{pool.title}</strong>
      <small className="vn-pool-hint">{pool.hint}</small>
      <span className={`vn-price-pill tier-${pool.tier.toLowerCase()}`}>
        From {formatNgn(pool.fromNgn)} / OTP
      </span>
    </button>
  );
}
