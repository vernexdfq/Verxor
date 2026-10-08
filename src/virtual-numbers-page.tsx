'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Info,
  Radio,
  Search,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import './virtual-numbers-page.css';

/* Types + data — see commit message for flow */

type PoolId =
  | 'usa-economy'
  | 'usa-standard'
  | 'usa-fast'
  | 'usa-premium'
  | 'worldwide-economy'
  | 'worldwide-standard'
  | 'worldwide-fast'
  | 'worldwide-premium';

type Tier = 'ECO' | 'STD' | 'FAST' | 'PREMIUM';
type Location = 'USA' | 'Worldwide';

type Pool = {
  id: PoolId;
  title: string;
  server: 1 | 2;
  location: Location;
  hint: string;
  tier: Tier;
  fromNgn: number;
};

type Country = { code: string; flag: string; name: string; dial: string };

type ServiceCategory =
  | 'all'
  | 'messengers'
  | 'social'
  | 'dating'
  | 'games'
  | 'payments'
  | 'other';

type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
};

type PriceOption = {
  id: string;
  provider: string;
  priceUsd: number;
  priceNgn: number;
  stock: number;
};

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  serviceId: string;
  country: string;
  poolTitle: string;
  status: 'waiting' | 'received' | 'completed' | 'cancelled';
  otp?: string;
  priceNgn: number;
  expiresAt: number;
  createdAt: string;
};

type Step = 'pools' | 'services' | 'countries' | 'activations' | 'orders' | 'inbox';

const SERVER1_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', server: 1, location: 'USA', hint: 'Low cost (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 150 },
  { id: 'usa-standard', title: 'USA · Standard', server: 1, location: 'USA', hint: 'Reliable speed for standard apps', tier: 'STD', fromNgn: 380 },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', server: 1, location: 'Worldwide', hint: 'Global coverage (VoIP/Non-VoIP mix)', tier: 'ECO', fromNgn: 280 },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', server: 1, location: 'Worldwide', hint: 'Standard global delivery', tier: 'STD', fromNgn: 450 },
];

const SERVER2_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', server: 2, location: 'USA', hint: 'High OTP success (Non-VoIP)', tier: 'FAST', fromNgn: 620 },
  { id: 'usa-premium', title: 'USA · Premium', server: 2, location: 'USA', hint: 'Maximum reliability & instant delivery', tier: 'PREMIUM', fromNgn: 990 },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', server: 2, location: 'Worldwide', hint: 'Fast global delivery', tier: 'FAST', fromNgn: 750 },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', server: 2, location: 'Worldwide', hint: 'Premium routes & highest success', tier: 'PREMIUM', fromNgn: 1100 },
];

const USA_COUNTRY: Country = { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' };

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
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', dial: '+63' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', dial: '+62' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', dial: '+66' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dial: '+81' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea', dial: '+82' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', dial: '+90' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351' },
];

const CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'messengers', label: 'Messengers' },
  { id: 'social', label: 'Social media' },
  { id: 'dating', label: 'Dating' },
  { id: 'games', label: 'Games' },
  { id: 'payments', label: 'Payment systems' },
  { id: 'other', label: 'Other' },
];

const SERVICES: Service[] = [
  { id: 'whatsapp', name: 'WhatsApp', category: 'messengers' },
  { id: 'telegram', name: 'Telegram', category: 'messengers' },
  { id: 'signal', name: 'Signal', category: 'messengers' },
  { id: 'discord', name: 'Discord', category: 'messengers' },
  { id: 'imo', name: 'Imo', category: 'messengers' },
  { id: 'viber', name: 'Viber', category: 'messengers' },
  { id: 'wechat', name: 'WeChat', category: 'messengers' },
  { id: 'line', name: 'Line messenger', category: 'messengers' },
  { id: 'facebook', name: 'Facebook', category: 'social' },
  { id: 'instagram', name: 'Instagram + Threads', category: 'social' },
  { id: 'tiktok', name: 'TikTok', category: 'social' },
  { id: 'twitter', name: 'Twitter / X', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social' },
  { id: 'tinder', name: 'Tinder', category: 'dating' },
  { id: 'badoo', name: 'Badoo', category: 'dating' },
  { id: 'bumble', name: 'Bumble', category: 'dating' },
  { id: 'steam', name: 'Steam', category: 'games' },
  { id: 'pubg', name: 'PUBG', category: 'games' },
  { id: 'paypal', name: 'PayPal', category: 'payments' },
  { id: 'googlepay', name: 'Google Pay', category: 'payments' },
  { id: 'google', name: 'Google, Gmail, YouTube', category: 'other' },
  { id: 'microsoft', name: 'Microsoft + Outlook', category: 'other' },
  { id: 'apple', name: 'Apple', category: 'other' },
  { id: 'amazon', name: 'Amazon', category: 'other' },
];

const PROMO_SLIDES = [
  { id: 'web', title: 'Do you need a custom website or mobile app?', subtitle: 'Get a website today!', cta: 'Get Started →' },
  { id: 'panel', title: 'Own a Whitelabel Reseller Panel', subtitle: 'Powered by Verxor — sell numbers under your brand.', cta: 'Own a Panel →' },
  { id: 'otp', title: 'Receive OTPs in 60 Seconds', subtitle: 'Instant verification for all your social media & app accounts!', cta: 'Verify Now →' },
];

function mockPrices(pool: Pool, _serviceId: string, _countryCode: string): PriceOption[] {
  const all: PriceOption[] = [
    { id: 'p1', provider: 'Grizzly', priceUsd: 0.15, priceNgn: 150, stock: 37417 },
    { id: 'p2', provider: '5sim', priceUsd: 0.32, priceNgn: 280, stock: 91044 },
    { id: 'p3', provider: 'SMSBower', priceUsd: 0.44, priceNgn: 380, stock: 8652 },
    { id: 'p4', provider: 'PVAPins', priceUsd: 0.65, priceNgn: 450, stock: 12400 },
    { id: 'p5', provider: 'Grizzly', priceUsd: 0.9, priceNgn: 620, stock: 8300 },
    { id: 'p6', provider: '5sim', priceUsd: 1.2, priceNgn: 750, stock: 4100 },
    { id: 'p7', provider: 'SMSBower', priceUsd: 1.8, priceNgn: 990, stock: 2200 },
    { id: 'p8', provider: 'PVAPins', priceUsd: 2.5, priceNgn: 1100, stock: 980 },
    { id: 'p9', provider: 'Grizzly', priceUsd: 3.2, priceNgn: 1400, stock: 410 },
  ];
  return all.filter((p) => {
    if (pool.tier === 'ECO') return p.priceUsd < 0.5;
    if (pool.tier === 'STD') return p.priceUsd >= 0.5 && p.priceUsd < 1;
    if (pool.tier === 'FAST') return p.priceUsd >= 1 && p.priceUsd < 2;
    return p.priceUsd >= 2;
  });
}

function formatNgn(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

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
    case 'facebook':
      return (
        <svg {...s} fill="#1877F2">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />
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
    case 'tiktok':
      return (
        <svg {...s} fill="#000">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3 6.34 6.34 0 0 0 9.49 21.64 6.34 6.34 0 0 0 15.83 15.3V8.95a8.27 8.27 0 0 0 4.84 1.55V7.05a4.85 4.85 0 0 1-1.08-.36z" />
        </svg>
      );
    case 'google':
    case 'googlepay':
      return (
        <svg {...s}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    case 'discord':
      return (
        <svg {...s} fill="#5865F2">
          <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.1 16.1 0 0 0-4.8 0c-.14-.34-.36-.76-.54-1.09-.02-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.02 0-.03.01-.05.03C2.3 9.06 1.58 12.7 1.94 16.3c0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.03 0-.07-.02-.09-.57-.22-1.11-.48-1.64-.78-.03-.02-.03-.07 0-.1.11-.08.22-.17.33-.25.02-.02.06-.02.09-.01 3.44 1.57 7.15 1.57 10.55 0 .03-.01.07-.01.09.01.11.09.22.17.33.26.03.02.03.08 0 .1-.52.31-1.07.56-1.64.78-.03.01-.04.06-.02.09.32.61.68 1.19 1.07 1.74.02.03.05.04.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.42-4.16-.7-7.77-2.96-10.97-.01-.02-.03-.03-.05-.03z" />
        </svg>
      );
    case 'paypal':
      return (
        <svg {...s} viewBox="0 0 24 24">
          <path fill="#003087" d="M7.1 21.2H4.2L6.5 3.6h5.2c2.6 0 4.4.5 5.4 1.6.9 1 1.2 2.4.9 4.3-.4 2.4-1.5 4.1-3.2 5.1-1.3.8-2.9 1.1-4.8 1.1H8.6l-.7 5.5H7.1z" />
          <path fill="#009CDE" d="M18 9.5c-.1.5-.2.9-.4 1.4-.9 2.9-3 4.4-6.1 4.4H9.7l-.9 5.9H6.3L8.6 3.6h5.2c1.5 0 2.7.2 3.6.7.9.5 1.5 1.2 1.8 2.2.3.6.4 1.3.4 2.1.1.3.1.6 0 .9z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...s} fill="#0F1419">
          <path d="M18.24 2H21.5l-7.05 8.06L22.5 22h-6.17l-4.83-6.31L6.3 22H3.02l7.54-8.62L1.5 2h6.33l4.36 5.78L18.24 2zm-1.08 18.1h1.81L7.03 3.8H5.09l12.07 16.3z" />
        </svg>
      );
    default:
      return <span className="vn-service-letter">{id.slice(0, 1).toUpperCase()}</span>;
  }
}

function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (p: Pool) => void }) {
  const tierClass =
    pool.tier === 'ECO' ? 'tier-eco' : pool.tier === 'STD' ? 'tier-std' : pool.tier === 'FAST' ? 'tier-fast' : 'tier-premium';
  return (
    <button type="button" className="vn-pool-card" onClick={() => onSelect(pool)}>
      <div className="vn-pool-card-top">
        <span className="vn-pool-mark">{pool.location === 'USA' ? '🇺🇸' : '🌍'}</span>
        <span className={`vn-tier-badge ${tierClass}`}>{pool.tier}</span>
      </div>
      <span className="vn-pool-title">{pool.title}</span>
      <span className="vn-pool-hint">{pool.hint}</span>
      <span className={`vn-price-pill ${tierClass}`}>From {formatNgn(pool.fromNgn)}</span>
    </button>
  );
}

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications: _onOpenNotifications,
  orders: externalOrders = [],
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [category, setCategory] = useState<ServiceCategory>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [promoIndex, setPromoIndex] = useState(0);
  const [balance] = useState(7570);
  const [localOrders, setLocalOrders] = useState<CustomerNumberOrder[]>(externalOrders);
  const [inboxOrder, setInboxOrder] = useState<CustomerNumberOrder | null>(null);
  const [priceSheet, setPriceSheet] = useState<{
    open: boolean;
    options: PriceOption[];
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [confirmSheet, setConfirmSheet] = useState<{
    option: PriceOption;
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const activeOrders = useMemo(
    () => localOrders.filter((o) => o.status === 'waiting' || o.status === 'received'),
    [localOrders],
  );
  const pastOrders = useMemo(
    () => localOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled' || o.status === 'received'),
    [localOrders],
  );

  const filteredServices = useMemo(() => {
    let list = SERVICES;
    if (category !== 'all') list = list.filter((s) => s.category === category);
    const q = serviceQuery.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    return list;
  }, [category, serviceQuery]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return WORLDWIDE_COUNTRIES;
    return WORLDWIDE_COUNTRIES.filter((c) =>
      [c.name, c.code, c.dial].some((v) => v.toLowerCase().includes(q)),
    );
  }, [countryQuery]);

  const selectPool = (pool: Pool) => {
    setSelectedPool(pool);
    setSelectedService(null);
    setSelectedCountry(pool.location === 'USA' ? USA_COUNTRY : null);
    setServiceQuery('');
    setCountryQuery('');
    setCategory('all');
    setStep('services');
  };

  const selectService = (service: Service) => {
    if (!selectedPool) return;
    setSelectedService(service);
    if (selectedPool.location === 'USA') {
      const options = mockPrices(selectedPool, service.id, 'US');
      setPriceSheet({ open: true, options, service, country: USA_COUNTRY, pool: selectedPool });
    } else {
      setCountryQuery('');
      setStep('countries');
    }
  };

  const selectCountry = (country: Country) => {
    if (!selectedPool || !selectedService) return;
    setSelectedCountry(country);
    const options = mockPrices(selectedPool, selectedService.id, country.code);
    setPriceSheet({ open: true, options, service: selectedService, country, pool: selectedPool });
  };

  const openConfirm = (option: PriceOption) => {
    if (!priceSheet) return;
    setConfirmSheet({
      option,
      service: priceSheet.service,
      country: priceSheet.country,
      pool: priceSheet.pool,
    });
  };

  const confirmPurchase = () => {
    if (!confirmSheet) return;
    const { option, service, country, pool } = confirmSheet;
    const order: CustomerNumberOrder = {
      id: `ord-${Date.now()}`,
      number:
        country.dial +
        ' ' +
        String(Math.floor(100000000 + Math.random() * 899999999)).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3'),
      service: service.name,
      serviceId: service.id,
      country: country.name,
      poolTitle: pool.title,
      status: 'waiting',
      priceNgn: option.priceNgn,
      expiresAt: Date.now() + 20 * 60 * 1000,
      createdAt: new Date().toISOString(),
    };
    setLocalOrders((prev) => [order, ...prev]);
    setConfirmSheet(null);
    setPriceSheet(null);
    setStep('activations');
  };

  const cancelOrder = (id: string) => {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o)));
  };

  const copyOtp = async (otp: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleBack = () => {
    if (step === 'pools') return onBack();
    if (step === 'services') {
      setSelectedPool(null);
      setSelectedService(null);
      setSelectedCountry(null);
      setStep('pools');
      return;
    }
    if (step === 'countries') {
      setSelectedService(null);
      setStep('services');
      return;
    }
    if (step === 'activations' || step === 'orders') {
      setStep('pools');
      return;
    }
    if (step === 'inbox') {
      setInboxOrder(null);
      setStep('activations');
    }
  };

  const promo = PROMO_SLIDES[promoIndex];

  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={handleBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="vn-topbar-copy">
          <strong>
            {step === 'services' && selectedService
              ? selectedService.name
              : step === 'countries'
                ? selectedService?.name ?? 'Select country'
                : step === 'activations'
                  ? 'Current activations'
                  : step === 'orders'
                    ? 'My Orders'
                    : step === 'inbox'
                      ? 'Inbox'
                      : 'Virtual Numbers (OTP)'}
          </strong>
          <small>
            {step === 'services' && selectedPool
              ? selectedPool.title
              : step === 'countries'
                ? 'Select country'
                : step === 'activations'
                  ? 'Waiting for SMS'
                  : step === 'orders'
                    ? 'Purchase history'
                    : 'Get verified with global numbers'}
          </small>
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
              <img className="vn-promo-logo" src="/brand/verxor-logo.svg" alt="Verxor" width="28" height="28" />
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
              <h3 id="vn-active-title">Your Active Numbers</h3>
              <button type="button" className="vn-link-btn" onClick={() => setStep('activations')}>
                View all
              </button>
            </div>
            {activeOrders.length === 0 ? (
              <p className="vn-active-empty">No active numbers yet. Buy a number to receive OTP here.</p>
            ) : (
              <div className="vn-active-list">
                {activeOrders.slice(0, 3).map((order) => (
                  <article key={order.id} className="vn-active-row">
                    <span className="vn-active-app" aria-hidden>
                      <ServiceLogo id={order.serviceId} />
                    </span>
                    <div className="vn-active-meta">
                      <strong>{order.number}</strong>
                      <small>
                        <span className="vn-pulse" />
                        {order.status === 'waiting' ? 'Pending SMS' : order.otp ? `OTP ${order.otp}` : order.status}
                        {order.service ? ` · ${order.service}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="vn-inbox-btn"
                      onClick={() => {
                        setInboxOrder(order);
                        setStep('inbox');
                      }}
                    >
                      View Inbox <ChevronRight size={14} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {step === 'services' && selectedPool && (
        <section className="vn-step vn-services-step">
          <label className="vn-search">
            <Search size={16} />
            <input
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="Search services"
              autoComplete="off"
            />
            <span className="vn-search-count">{filteredServices.length} services</span>
          </label>

          <div className="vn-cats" role="tablist">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                className={`vn-cat ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="vn-list">
            {filteredServices.map((service) => (
              <button key={service.id} type="button" className="vn-list-item" onClick={() => selectService(service)}>
                <span className={`vn-service-icon brand-${service.id}`}>
                  <ServiceLogo id={service.id} />
                </span>
                <span className="vn-list-copy">
                  <strong>{service.name}</strong>
                </span>
                <ChevronRight size={16} className="vn-chevron" />
              </button>
            ))}
            {filteredServices.length === 0 && <p className="vn-active-empty">No services match your search.</p>}
          </div>
        </section>
      )}

      {step === 'countries' && selectedPool && selectedService && (
        <section className="vn-step">
          <div className="vn-step-head">
            <h2>Select country</h2>
            <p>
              {selectedService.name} · {selectedPool.title}
            </p>
          </div>
          <label className="vn-search">
            <Search size={16} />
            <input
              value={countryQuery}
              onChange={(e) => setCountryQuery(e.target.value)}
              placeholder="Search countries"
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
              <button key={country.code} type="button" className="vn-list-item" onClick={() => selectCountry(country)}>
                <span className="vn-flag">{country.flag}</span>
                <span className="vn-list-copy">
                  <strong>{country.name}</strong>
                  <small>{country.dial}</small>
                </span>
                <ChevronRight size={16} className="vn-chevron" />
              </button>
            ))}
            {filteredCountries.length === 0 && <p className="vn-active-empty">No countries match your search.</p>}
          </div>
        </section>
      )}

      {step === 'activations' && (
        <section className="vn-step">
          <div className="vn-tabs">
            <button type="button" className="vn-tab active">
              Current
            </button>
            <button type="button" className="vn-tab" onClick={() => setStep('orders')}>
              My Orders
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <p className="vn-active-empty">No active numbers. Buy a number to wait for SMS here.</p>
          ) : (
            <div className="vn-activation-list">
              {activeOrders.map((order) => {
                const left = order.expiresAt - Date.now();
                return (
                  <article key={order.id} className="vn-activation-card">
                    <div className="vn-activation-top">
                      <span className="vn-service-icon">
                        <ServiceLogo id={order.serviceId} />
                      </span>
                      <div className="vn-activation-meta">
                        <strong>{order.number}</strong>
                        <small>
                          {order.service} · {order.country}
                        </small>
                      </div>
                      <span className="vn-timer">
                        <Clock3 size={12} />
                        {formatTimer(left)}
                      </span>
                    </div>

                    {order.otp ? (
                      <div className="vn-otp-box">
                        <span className="vn-otp-code">{order.otp}</span>
                        <button type="button" className="vn-copy-btn" onClick={() => copyOtp(order.otp!)}>
                          <Copy size={14} />
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <div className="vn-waiting">
                        <span className="vn-pulse" />
                        Waiting for SMS…
                      </div>
                    )}

                    <div className="vn-activation-actions">
                      <button type="button" className="vn-cancel-btn" onClick={() => cancelOrder(order.id)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="vn-inbox-btn"
                        onClick={() => {
                          setInboxOrder(order);
                          setStep('inbox');
                        }}
                      >
                        View Inbox
                      </button>
                    </div>

                    <p className="vn-warning">
                      We cannot guarantee 100% SMS delivery. 15–20 attempts can be normal. If SMS is not received, the
                      cost is refunded to your balance.
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {step === 'orders' && (
        <section className="vn-step">
          <div className="vn-tabs">
            <button type="button" className="vn-tab" onClick={() => setStep('activations')}>
              Current
            </button>
            <button type="button" className="vn-tab active">
              My Orders
            </button>
          </div>
          {pastOrders.length === 0 && activeOrders.length === 0 ? (
            <p className="vn-active-empty">No orders yet.</p>
          ) : (
            <div className="vn-list">
              {[...activeOrders, ...pastOrders.filter((o) => o.status !== 'waiting')].map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className="vn-list-item"
                  onClick={() => {
                    setInboxOrder(order);
                    setStep('inbox');
                  }}
                >
                  <span className="vn-service-icon">
                    <ServiceLogo id={order.serviceId} />
                  </span>
                  <span className="vn-list-copy">
                    <strong>{order.number}</strong>
                    <small>
                      {order.service} · {order.status} · {formatNgn(order.priceNgn)}
                    </small>
                  </span>
                  <ChevronRight size={16} className="vn-chevron" />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 'inbox' && inboxOrder && (
        <section className="vn-step">
          <div className="vn-activation-card">
            <div className="vn-activation-top">
              <span className="vn-service-icon">
                <ServiceLogo id={inboxOrder.serviceId} />
              </span>
              <div className="vn-activation-meta">
                <strong>{inboxOrder.number}</strong>
                <small>
                  {inboxOrder.service} · {inboxOrder.country}
                </small>
              </div>
            </div>
            {inboxOrder.otp ? (
              <div className="vn-otp-box">
                <span className="vn-otp-code">{inboxOrder.otp}</span>
                <button type="button" className="vn-copy-btn" onClick={() => copyOtp(inboxOrder.otp!)}>
                  <Copy size={14} />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <div className="vn-waiting">
                <span className="vn-pulse" />
                No SMS received yet
              </div>
            )}
            <p className="vn-warning">
              Last OTP received for this number appears above. Messages stay available in My Orders.
            </p>
          </div>
        </section>
      )}

      {priceSheet?.open && (
        <div className="vn-sheet-backdrop" onClick={() => setPriceSheet(null)} role="presentation">
          <div className="vn-sheet" role="dialog" aria-label="Available numbers" onClick={(e) => e.stopPropagation()}>
            <div className="vn-sheet-handle" />
            <div className="vn-sheet-head">
              <span className="vn-flag">{priceSheet.country.flag}</span>
              <div>
                <strong>
                  {priceSheet.country.name}
                  {priceSheet.pool.location === 'USA' ? ' (virtual)' : ''}
                </strong>
                <small>
                  {priceSheet.service.name} · {priceSheet.pool.title}
                </small>
              </div>
              <button type="button" className="vn-clear" onClick={() => setPriceSheet(null)} aria-label="Close">
                <X size={14} />
              </button>
            </div>
            {priceSheet.options.length === 0 ? (
              <p className="vn-active-empty">No numbers available in this tier right now.</p>
            ) : (
              <div className="vn-price-list">
                {priceSheet.options.map((opt) => (
                  <button key={opt.id} type="button" className="vn-price-row" onClick={() => openConfirm(opt)}>
                    <span className="vn-price-stock">{opt.stock.toLocaleString()} pcs.</span>
                    <span className="vn-price-tag">
                      {formatNgn(opt.priceNgn)}
                      <small>{formatUsd(opt.priceUsd)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {confirmSheet && (
        <div className="vn-sheet-backdrop" onClick={() => setConfirmSheet(null)} role="presentation">
          <div
            className="vn-sheet vn-confirm-sheet"
            role="dialog"
            aria-label="Confirm purchase"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vn-sheet-handle" />
            <h3 className="vn-confirm-title">Confirm purchase</h3>
            <div className="vn-confirm-rows">
              <div className="vn-confirm-row">
                <span>Service</span>
                <strong>{confirmSheet.service.name}</strong>
              </div>
              <div className="vn-confirm-row">
                <span>Country</span>
                <strong>
                  {confirmSheet.country.flag} {confirmSheet.country.name}
                </strong>
              </div>
              <div className="vn-confirm-row">
                <span>Price</span>
                <strong>{formatNgn(confirmSheet.option.priceNgn)}</strong>
              </div>
            </div>
            <p className="vn-confirm-note">
              The amount in your account will be frozen. If no SMS is received on your number, the cost will be returned
              to your balance.
            </p>
            <button type="button" className="vn-confirm-btn" onClick={confirmPurchase}>
              Confirm purchase
            </button>
            <button type="button" className="vn-cancel-link" onClick={() => setConfirmSheet(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
