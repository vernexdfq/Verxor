'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  LayoutGrid,
  Tag,
  Wallet,
} from 'lucide-react';
import './giftcard-page.css';

type GiftCardCurrency = 'ALL' | 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';

type GiftCardBrand = {
  id: string;
  name: string;
  rate: string;
  currency: Exclude<GiftCardCurrency, 'ALL'>;
  logo: 'apple' | 'steam' | 'razer' | 'xbox' | 'google' | 'sephora' | 'playstation' | 'amazon';
  popular?: boolean;
};

type Promo = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  tone: 'blue' | 'indigo' | 'sky';
};

const PROMOS: Promo[] = [
  {
    id: 'bonus',
    eyebrow: 'LIMITED TIME BONUS',
    title: 'Get 5% Bonus on Every Trade!',
    description: 'Trade selected gift cards today and enjoy an instant bonus.',
    badge: '5% BONUS',
    tone: 'blue',
  },
  {
    id: 'rates',
    eyebrow: 'LIVE RATES',
    title: 'Trade at today’s active rates',
    description: 'Check the latest available payout rate before you sell.',
    badge: 'LIVE',
    tone: 'indigo',
  },
  {
    id: 'fast',
    eyebrow: 'FAST SETTLEMENT',
    title: 'Sell. Get verified. Get paid.',
    description: 'Submit your gift card and track the trade from Verxor.',
    badge: 'FAST',
    tone: 'sky',
  },
];

const CURRENCIES: Array<{ id: GiftCardCurrency; label: string; flag?: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'USD', label: 'USD', flag: '🇺🇸' },
  { id: 'CAD', label: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', label: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', label: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', label: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', label: 'SGD', flag: '🇸🇬' },
];

const GIFT_CARDS: GiftCardBrand[] = [
  { id: 'apple', name: 'iTunes / Apple', rate: '₦1,333.15', currency: 'USD', logo: 'apple', popular: true },
  { id: 'steam', name: 'Steam', rate: '₦1,281.88', currency: 'USD', logo: 'steam', popular: true },
  { id: 'razer', name: 'Razer Gold', rate: '₦1,154.71', currency: 'USD', logo: 'razer' },
  { id: 'xbox', name: 'Xbox', rate: '₦1,281.88', currency: 'USD', logo: 'xbox' },
  { id: 'google', name: 'Google Play', rate: '₦1,175.22', currency: 'USD', logo: 'google' },
  { id: 'sephora', name: 'Sephora', rate: '₦1,117.80', currency: 'USD', logo: 'sephora' },
  { id: 'playstation', name: 'PlayStation', rate: '₦1,247.50', currency: 'USD', logo: 'playstation' },
  { id: 'amazon', name: 'Amazon', rate: '₦1,210.36', currency: 'USD', logo: 'amazon' },
];

const LIVE_TRADES = [
  { initial: 'J', text: 'j***N traded Steam AUD 85*3', amount: '₦175,207.95', time: '5 mins ago' },
  { initial: 'K', text: 'k***8 traded Apple $50', amount: '₦58,746.20', time: '8 mins ago' },
  { initial: 'A', text: 'a***1 traded Google Play $80', amount: '₦96,320.11', time: '11 mins ago' },
];

function BrandLogo({ type }: { type: GiftCardBrand['logo'] }) {
  if (type === 'apple') return <div className="gc-brand-logo gc-brand-apple" aria-label="Apple"></div>;
  if (type === 'steam') return <div className="gc-brand-logo gc-brand-steam" aria-label="Steam">◉</div>;
  if (type === 'razer') return <div className="gc-brand-logo gc-brand-razer" aria-label="Razer Gold"><strong>R</strong><small>RAZER<br />GOLD</small></div>;
  if (type === 'xbox') return <div className="gc-brand-logo gc-brand-xbox" aria-label="Xbox"><strong>⌁</strong></div>;
  if (type === 'google') return <div className="gc-brand-logo gc-brand-google" aria-label="Google Play">▶</div>;
  if (type === 'sephora') return <div className="gc-brand-logo gc-brand-sephora" aria-label="Sephora">SEPHORA</div>;
  if (type === 'playstation') return <div className="gc-brand-logo gc-brand-playstation" aria-label="PlayStation"><strong>PS</strong></div>;
  return <div className="gc-brand-logo gc-brand-amazon" aria-label="Amazon"><strong>amazon</strong><span>⌣</span></div>;
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState<GiftCardCurrency>('ALL');
  const [promoIndex, setPromoIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPromoIndex((current) => (current + 1) % PROMOS.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const promo = PROMOS[promoIndex];

  const visibleCards = useMemo(
    () => currency === 'ALL' ? GIFT_CARDS : GIFT_CARDS.filter((card) => card.currency === currency),
    [currency],
  );

  return (
    <div className="gc-shell">
      <main className="gc-canvas">
        <header className="gc-topbar">
          <button type="button" className="gc-back" onClick={onBack} aria-label="Back to Verxor dashboard">
            <ArrowLeft size={21} strokeWidth={2.2} />
          </button>
          <h1>Gift Card Trade</h1>
        </header>

        <section className="gc-promo" aria-label="Gift card promotion">
          <div className={'gc-promo-card gc-promo-' + promo.tone}>
            <div className="gc-promo-copy">
              <span className="gc-promo-eyebrow"><Gift size={13} />{promo.eyebrow}</span>
              <h2>{promo.title}</h2>
              <p>{promo.description}</p>
              <button type="button" className="gc-promo-cta">View Details <ArrowRight size={14} /></button>
            </div>
            <div className="gc-promo-art" aria-hidden="true">
              <div className="gc-art-card gc-art-apple"></div>
              <div className="gc-art-card gc-art-google">▶</div>
              <div className="gc-art-card gc-art-steam">◉</div>
              <span className="gc-bonus-badge">{promo.badge}</span>
            </div>
          </div>
          <div className="gc-promo-dots" aria-label="Promotion slides">
            {PROMOS.map((item, index) => (
              <button key={item.id} type="button" aria-label={'Show ' + item.title} aria-current={index === promoIndex} className={index === promoIndex ? 'is-active' : ''} onClick={() => setPromoIndex(index)} />
            ))}
          </div>
        </section>

        <section className="gc-live-trades" aria-label="Live completed trades">
          <div className="gc-live-head">
            <div><span className="gc-live-dot" /><strong>Live Completed Trades</strong></div>
            <button type="button">View All <ArrowRight size={13} /></button>
          </div>
          <div className="gc-live-scroll">
            {LIVE_TRADES.map((trade) => (
              <article className="gc-live-item" key={trade.text}>
                <span className="gc-live-avatar">{trade.initial}</span>
                <div><strong>{trade.text}</strong><span>{trade.amount} <small>{trade.time}</small></span></div>
              </article>
            ))}
          </div>
        </section>

        <section className="gc-actions" aria-label="Gift card actions">
          <button type="button" className="gc-action gc-action-withdraw" aria-label="Withdraw from gift card wallet">
            <span className="gc-action-icon"><Wallet size={21} /></span>
            <span><strong>Withdraw</strong><small>Get your funds to your bank</small></span>
            <ChevronRight size={19} />
          </button>
          <button type="button" className="gc-action gc-action-sell" aria-label="Sell gift card">
            <span className="gc-action-icon"><Tag size={21} /></span>
            <span><strong>Sale Now</strong><small>Sell your gift cards instantly</small></span>
            <ChevronRight size={19} />
          </button>
        </section>

        <section className="gc-currency-section" aria-label="Gift card currencies">
          <div className="gc-currency-scroll">
            {CURRENCIES.map((item) => (
              <button type="button" key={item.id} className={currency === item.id ? 'gc-currency is-active' : 'gc-currency'} onClick={() => setCurrency(item.id)}>
                {item.flag ? <span>{item.flag}</span> : null}{item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="gc-catalog" aria-label="Popular gift cards">
          <div className="gc-section-heading">
            <h2>Popular Gift Cards</h2>
            <button type="button">View All <ArrowRight size={13} /></button>
          </div>
          <div className="gc-grid">
            {visibleCards.map((brand) => (
              <article className="gc-card" key={brand.id}>
                <div className="gc-card-logo-wrap">
                  <BrandLogo type={brand.logo} />
                  {brand.popular ? <span className="gc-popular">Popular</span> : null}
                </div>
                <div className="gc-card-info">
                  <strong>{brand.name}</strong>
                  <span>$1 = {brand.rate}</span>
                </div>
                <button type="button" className="gc-sell">Sell <ArrowRight size={13} /></button>
              </article>
            ))}
          </div>
          {visibleCards.length === 0 ? (
            <div className="gc-no-results">
              <CheckCircle2 size={20} /><strong>No gift cards available for {currency}</strong><p>Choose another currency to view available brands.</p>
            </div>
          ) : null}
        </section>
      </main>

      <nav className="gc-nav" aria-label="Gift card navigation">
        <button type="button" className="is-active" aria-current="page"><LayoutGrid size={22} /><span>Trade</span></button>
        <button type="button" aria-label="History — next build step"><Clock3 size={22} /><span>History</span></button>
        <button type="button" aria-label="Wallet — next build step"><Wallet size={22} /><span>Wallet</span></button>
      </nav>
    </div>
  );
}
