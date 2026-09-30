'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Gift,
  Tag,
  Wallet,
} from 'lucide-react';
import './giftcard-page.css';

type Currency = 'ALL' | 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';

type Card = {
  id: string;
  name: string;
  rate: string;
  currency: Exclude<Currency, 'ALL'>;
  kind:
    | 'apple'
    | 'steam'
    | 'razer'
    | 'xbox'
    | 'google'
    | 'sephora'
    | 'playstation'
    | 'amazon';
  popular?: boolean;
};

const currencies: Array<{ id: Currency; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: '🇺🇸' },
  { id: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', flag: '🇸🇬' },
];

const cards: Card[] = [
  { id: 'apple', name: 'iTunes / Apple', rate: '₦1,333.15', currency: 'USD', kind: 'apple', popular: true },
  { id: 'steam', name: 'Steam', rate: '₦1,281.88', currency: 'USD', kind: 'steam', popular: true },
  { id: 'razer', name: 'Razer Gold', rate: '₦1,154.71', currency: 'USD', kind: 'razer' },
  { id: 'xbox', name: 'Xbox', rate: '₦1,281.88', currency: 'USD', kind: 'xbox' },
  { id: 'google', name: 'Google Play', rate: '₦1,175.22', currency: 'USD', kind: 'google' },
  { id: 'sephora', name: 'Sephora', rate: '₦1,117.80', currency: 'USD', kind: 'sephora' },
  { id: 'playstation', name: 'PlayStation', rate: '₦1,247.50', currency: 'USD', kind: 'playstation' },
  { id: 'amazon', name: 'Amazon', rate: '₦1,210.36', currency: 'USD', kind: 'amazon' },
];

const trades = [
  { initial: 'J', line: 'j***N traded Steam AUD 85*3', amount: '₦175,207.95', time: '5 mins ago' },
  { initial: 'K', line: 'k***8 traded Apple $50', amount: '₦58,746.20', time: '8 mins ago' },
  { initial: 'A', line: 'a***1 traded Google Play $80', amount: '₦96,320.11', time: '12 mins ago' },
];

const promos = [
  {
    id: 1,
    title: 'Get 5% Bonus on Every Trade!',
    body: 'Trade your gift cards today and enjoy instant bonus on selected brands.',
  },
  {
    id: 2,
    title: "Trade at Today's Live Rates",
    body: 'Check the latest available payout rate before you sell your gift card.',
  },
  {
    id: 3,
    title: 'Sell Your Gift Card Today',
    body: 'Submit your card and track your trade securely from Verxor.',
  },
];

function AppleLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true" fill="currentColor">
      <path d="M43.4 34.1c0-6.9 5.6-10.2 5.8-10.4-3.2-4.7-8.1-5.3-9.8-5.4-4.1-.4-8 2.4-10.1 2.4-2.1 0-5.3-2.4-8.7-2.3-4.5.1-8.6 2.6-10.9 6.6-4.7 8.1-1.2 20 3.4 26.6 2.2 3.2 4.8 6.7 8.3 6.5 3.3-.1 4.6-2.1 8.7-2.1 4 0 5.2 2.1 8.7 2 3.6-.1 5.8-3.2 8-6.4 2.5-3.7 3.5-7.3 3.6-7.5-.1-.1-7-2.7-7-10zM36.8 14c1.8-2.2 3-5.2 2.6-8.2-2.6.1-5.7 1.7-7.5 3.9-1.6 1.9-3.1 5-2.7 7.9 2.9.2 5.8-1.4 7.6-3.6z" />
    </svg>
  );
}

function SteamLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="27" fill="currentColor" />
      <circle cx="42.5" cy="22" r="8.5" fill="white" />
      <circle cx="42.5" cy="22" r="4.2" fill="currentColor" />
      <circle cx="23" cy="39.5" r="7" fill="white" />
      <circle cx="23" cy="39.5" r="3.4" fill="currentColor" />
      <path d="M27.5 36.2l8.7-9.4" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function XboxLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="28" fill="white" />
      <path d="M17 21c5.3-4.6 10.3-6.8 15-6.8S41.7 16.4 47 21c-4.1-2.7-8.3-4.1-11.4-4.1-1.4 0-2.6.4-3.6 1.1-1-.7-2.2-1.1-3.6-1.1C25.3 16.9 21.1 18.3 17 21z" fill="currentColor" />
      <path d="M16 25c4.7 3.2 9.7 8.3 16 17.2C38.3 33.3 43.3 28.2 48 25c-.4 11.1-6.7 20.8-16 24-9.3-3.2-15.6-12.9-16-24z" fill="currentColor" />
    </svg>
  );
}

function GooglePlayLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true">
      <path d="M11 8.5l27.4 23.1L11 55.5c-1.1-.8-1.8-2.2-1.8-3.9V12.4c0-1.7.7-3.1 1.8-3.9z" fill="#35A854" />
      <path d="M38.4 31.6L45.7 25l-8.8-5-25.9-14.6c-.6-.3-1.2-.5-1.8-.5l29.2 26.7z" fill="#4285F4" />
      <path d="M38.4 32.4L9.2 59.1c.6 0 1.2-.2 1.8-.5l25.9-14.6 8.8-5-7.3-6.6z" fill="#EA4335" />
      <path d="M45.7 25l8.6 4.9c2.3 1.3 2.3 4.6 0 5.9l-8.6 4.9-7.3-6.6 7.3-6.6z" fill="#FBBC04" />
    </svg>
  );
}

function PlayStationLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true" fill="none">
      <path d="M23 48V16.5c0-2.1 1.2-3.1 3.1-2.5 7.1 2.1 12.4 6.7 12.4 14.7v14.1l-8.1 3.2V29.9c0-3.2-1.4-5.1-4.1-6.2v25.5L23 48z" fill="white" />
      <path d="M39.8 26.4c5.5 1.6 9.4 4.2 9.4 7.7 0 3.2-3.1 5.1-8.1 5.8l-5.7-2.1c3.6-.6 5.8-1.7 5.8-3.4 0-1.7-1.7-2.8-5.2-3.9l3.8-4.1z" fill="white" />
      <path d="M16.5 37.6c0-3.4 3.6-5.8 9.5-6.7v5.3c-2.8.5-4.3 1.2-4.3 2.3 0 1.1 1.5 1.7 4.3 2.2l-4.9 2.1c-2.9-.9-4.6-2.6-4.6-5.2z" fill="white" />
    </svg>
  );
}

function RazerLogo() {
  return (
    <svg viewBox="0 0 64 64" className="gc-svg" aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="22" fill="#F4B51B" />
      <path d="M32 18l4 9.5 10 1.4-7.3 6.8 2 9.8L32 40.5 23.3 45.5l2-9.8-7.3-6.8 10-1.4L32 18z" fill="#D88B00" />
    </svg>
  );
}

function SephoraLogo() {
  return <span className="gc-text-logo">SEPHORA</span>;
}

function AmazonLogo() {
  return <span className="gc-text-logo gc-amazon">amazon</span>;
}

function BrandMark({ kind }: { kind: Card['kind'] }) {
  if (kind === 'apple') return <AppleLogo />;
  if (kind === 'steam') return <SteamLogo />;
  if (kind === 'xbox') return <XboxLogo />;
  if (kind === 'google') return <GooglePlayLogo />;
  if (kind === 'playstation') return <PlayStationLogo />;
  if (kind === 'razer') return <RazerLogo />;
  if (kind === 'sephora') return <SephoraLogo />;
  return <AmazonLogo />;
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState<Currency>('ALL');
  const [promo, setPromo] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPromo((v) => (v + 1) % promos.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  const visibleCards = useMemo(() => {
    if (currency === 'ALL') return cards;
    return cards.filter((c) => c.currency === currency);
  }, [currency]);

  return (
    <div className="gc-page">
      <main className="gc-content">
        <header className="gc-header">
          <button className="gc-back" type="button" onClick={onBack} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <h1>Gift Card Trade</h1>
        </header>

        <section className="gc-primary-actions" aria-label="Gift card actions">
          <button type="button" className="gc-withdraw">
            <Wallet size={18} />
            <span>Withdraw</span>
          </button>
          <button type="button" className="gc-sale">
            <Tag size={18} />
            <span>Sell Now</span>
          </button>
        </section>

        <section className="gc-promo-wrap" aria-label="Promotions">
          <article className="gc-promo">
            <div className="gc-promo-copy">
              <span className="gc-eyebrow">
                <Gift size={13} /> LIMITED TIME BONUS
              </span>
              <h2>{promos[promo].title}</h2>
              <p>{promos[promo].body}</p>
              <button type="button">
                View Details <ArrowRight size={14} />
              </button>
            </div>
            <div className="gc-promo-art" aria-hidden="true">
              <div className="gc-art gc-art-one"></div>
              <div className="gc-art gc-art-two">▶</div>
              <div className="gc-art gc-art-three">◉</div>
              <strong>
                5%<small>BONUS</small>
              </strong>
            </div>
          </article>
          <div className="gc-dots">
            {promos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === promo ? 'active' : ''}
                aria-label={`Promotion ${index + 1}`}
                onClick={() => setPromo(index)}
              />
            ))}
          </div>
        </section>

        <section className="gc-live" aria-label="Live completed trades">
          <div className="gc-live-header">
            <strong>
              <i /> Live Completed Trades
            </strong>
            <button type="button">
              View All <ArrowRight size={13} />
            </button>
          </div>
          <div className="gc-live-track">
            {trades.map((trade) => (
              <article className="gc-trade" key={trade.line}>
                <span>{trade.initial}</span>
                <div>
                  <strong>{trade.line}</strong>
                  <p>
                    {trade.amount} <small>{trade.time}</small>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="gc-currencies" aria-label="Currencies">
          <div className="gc-currency-track">
            {currencies.map((item) => (
              <button
                type="button"
                key={item.id}
                className={currency === item.id ? 'active' : ''}
                onClick={() => setCurrency(item.id)}
              >
                {item.flag && <span>{item.flag}</span>}
                {item.id === 'ALL' ? 'All' : item.id}
              </button>
            ))}
          </div>
        </section>

        <section className="gc-catalog">
          <div className="gc-heading">
            <h2>Popular Gift Cards</h2>
            <button type="button">
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div className="gc-grid">
            {visibleCards.map((card) => (
              <article className="gc-card" key={card.id}>
                {card.popular && <span className="gc-popular">Popular</span>}
                <div className={`gc-mark gc-mark-${card.kind}`} aria-label={card.name}>
                  <BrandMark kind={card.kind} />
                </div>
                <div className="gc-card-body">
                  <strong>{card.name}</strong>
                  <p>$1 = {card.rate}</p>
                  <button className="gc-card-sell" type="button">
                    Sell <ArrowRight size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <nav className="gc-bottom-nav" aria-label="Gift card navigation">
        <button className="active" type="button" aria-current="page">
          <Tag size={20} />
          <span>Trade</span>
        </button>
        <button type="button">
          <Clock3 size={20} />
          <span>History</span>
        </button>
        <button type="button">
          <Wallet size={20} />
          <span>Wallet</span>
        </button>
      </nav>
    </div>
  );
}
