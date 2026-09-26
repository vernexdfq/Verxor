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
  {
    id: 'usa-economy',
    title: 'USA · Economy',
    server: 1,
    location: 'USA',
    hint: 'Low cost (VoIP/Non-VoIP mix)',
    tier: 'ECO',
    fromNgn: 150,
  },
  {
    id: 'usa-standard',
    title: 'USA · Standard',
    server: 1,
    location: 'USA',
    hint: 'Reliable speed for standard apps',
    tier: 'STD',
    fromNgn: 380,
  },
  {
    id: 'worldwide-economy',
    title: 'Worldwide · Economy',
    server: 1,
    location: 'Worldwide',
    hint: 'Global coverage (VoIP/Non-VoIP mix)',
    tier: 'ECO',
    fromNgn: 280,
  },
  {
    id: 'worldwide-standard',
    title: 'Worldwide · Standard',
    server: 1,
    location: 'Worldwide',
    hint: 'Standard global delivery',
    tier: 'STD',
    fromNgn: 450,
  },
];

const SERVER2_POOLS: Pool[] = [
  {
    id: 'usa-fast',
    title: 'USA · Fast',
    server: 2,
    location: 'USA',
    hint: 'High OTP Success (Non-VoIP)',
    tier: 'FAST',
    fromNgn: 620,
  },
  {
    id: 'usa-premium',
    title: 'USA · Premium',
    server: 2,
    location: 'USA',
    hint: 'Maximum reliability & instant delivery',
    tier: 'PREMIUM',
    fromNgn: 990,
  },
  {
    id: 'worldwide-fast',
    title: 'Worldwide · Fast',
    server: 2,
    location: 'Worldwide',
    hint: 'Fast global delivery',
    tier: 'FAST',
    fromNgn: 750,
  },
  {
    id: 'worldwide-premium',
    title: 'Worldwide · Premium',
    server: 2,
    location: 'Worldwide',
    hint: 'Premium routes & highest success',
    tier: 'PREMIUM',
    fromNgn: 1100,
  },
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
              <h2 id="vn-s1">Server 1 — Economy &amp; Standard Routes</h2>
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
              <h2 id="vn-s2">Server 2 — High Speed &amp; Non-VoIP Routes</h2>
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
              <h3 id="vn-active-title">Your Active Numbers &amp; OTP Inboxes</h3>
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
                <span className="vn-service-icon">{service.name.slice(0, 1)}</span>
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
