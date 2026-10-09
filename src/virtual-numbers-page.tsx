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

/* Virtual Numbers — complete page with copy number / SMS code */

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
  | 'marketplace'
  | 'payments'
  | 'food'
  | 'shops'
  | 'betting'
  | 'taxi'
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
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'payments', label: 'Payment systems' },
  { id: 'food', label: 'Food' },
  { id: 'shops', label: 'Shops' },
  { id: 'betting', label: 'Betting' },
  { id: 'taxi', label: 'Taxi' },
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
  { id: 'line', name: 'LINE', category: 'messengers' },
  { id: 'facebook', name: 'Facebook', category: 'social' },
  { id: 'instagram', name: 'Instagram + Threads', category: 'social' },
  { id: 'tiktok', name: 'TikTok', category: 'social' },
  { id: 'twitter', name: 'X (Twitter)', category: 'social' },
  { id: 'snapchat', name: 'Snapchat', category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', category: 'social' },
  { id: 'tinder', name: 'Tinder', category: 'dating' },
  { id: 'badoo', name: 'Badoo', category: 'dating' },
  { id: 'bumble', name: 'Bumble', category: 'dating' },
  { id: 'steam', name: 'Steam', category: 'games' },
  { id: 'pubg', name: 'PUBG Mobile', category: 'games' },
  { id: 'roblox', name: 'Roblox', category: 'games' },
  { id: 'amazon', name: 'Amazon', category: 'marketplace' },
  { id: 'ebay', name: 'eBay', category: 'marketplace' },
  { id: 'alibaba', name: 'Alibaba', category: 'marketplace' },
  { id: 'paypal', name: 'PayPal', category: 'payments' },
  { id: 'googlepay', name: 'Google Pay', category: 'payments' },
  { id: 'wise', name: 'Wise', category: 'payments' },
  { id: 'ubereats', name: 'Uber Eats', category: 'food' },
  { id: 'doordash', name: 'DoorDash', category: 'food' },
  { id: 'walmart', name: 'Walmart', category: 'shops' },
  { id: 'nike', name: 'Nike', category: 'shops' },
  { id: 'bet365', name: 'Bet365', category: 'betting' },
  { id: '1xbet', name: '1xBet', category: 'betting' },
  { id: 'uber', name: 'Uber', category: 'taxi' },
  { id: 'bolt', name: 'Bolt', category: 'taxi' },
  { id: 'google', name: 'Google / Gmail / YouTube', category: 'other' },
  { id: 'microsoft', name: 'Microsoft / Outlook', category: 'other' },
  { id: 'apple', name: 'Apple', category: 'other' },
  { id: 'netflix', name: 'Netflix', category: 'other' },
  { id: 'spotify', name: 'Spotify', category: 'other' },
  { id: 'openai', name: 'OpenAI / ChatGPT', category: 'other' },
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
  const colors: Record<string, string> = {
    whatsapp: '#25D366', telegram: '#26A5E4', facebook: '#1877F2', instagram: '#E4405F',
    tiktok: '#000000', twitter: '#0F1419', discord: '#5865F2', paypal: '#003087',
    google: '#4285F4', googlepay: '#4285F4', linkedin: '#0A66C2', snapchat: '#FFFC00',
    tinder: '#FE3C72', steam: '#1B2838', netflix: '#E50914', spotify: '#1DB954',
    uber: '#000000', ubereats: '#06C167', apple: '#111111', microsoft: '#00A4EF',
    amazon: '#FF9900', openai: '#10A37F', signal: '#3A76F0', viber: '#7360F2',
    wechat: '#07C160', line: '#06C755', bolt: '#34D186', bet365: '#1B7A3D',
  };
  const bg = colors[id] || '#2563EB';
  const letter = (id || '?').slice(0, 1).toUpperCase();
  return (
    <span
      className="vn-service-letter"
      style={{
        background: bg,
        color: '#fff',
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {letter}
    </span>
  );
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
  const [, setTick] = useState(0);
  const [copyToast, setCopyToast] = useState<string | null>(null);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SERVICES.length };
    for (const s of SERVICES) counts[s.category] = (counts[s.category] || 0) + 1;
    return counts;
  }, []);

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

    // Demo: simulate SMS arrival so copy-code UI can be tested (replace with real provider webhook later)
    const orderId = order.id;
    setTimeout(() => {
      const demoOtp = String(Math.floor(100000 + Math.random() * 900000));
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'received' as const, otp: demoOtp } : o)),
      );
      setInboxOrder((cur) => (cur && cur.id === orderId ? { ...cur, status: 'received', otp: demoOtp } : cur));
    }, 8000);
  };

  const cancelOrder = (id: string) => {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' as const } : o)));
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopyToast(label);
    } catch {
      /* ignore */
    }
  };

  const goBack = () => {
    if (step === 'services') setStep('pools');
    else if (step === 'countries') setStep('services');
    else if (step === 'activations' || step === 'orders' || step === 'inbox') setStep('pools');
    else onBack();
  };

  const promo = PROMO_SLIDES[promoIndex];

  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={goBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="vn-topbar-copy">
          <strong>
            {step === 'services'
              ? 'All services'
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

      {/* PLACEHOLDER_REST - truncated for tool size; will use alternate method */}
    </div>
  );
}
