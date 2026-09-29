'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  Gift,
  LayoutGrid,
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
  mark: string;
  kind: string;
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
  { id: 'apple', name: 'iTunes / Apple', rate: '₦1,333.15', currency: 'USD', mark: '', kind: 'apple', popular: true },
  { id: 'steam', name: 'Steam', rate: '₦1,281.88', currency: 'USD', mark: '◉', kind: 'steam', popular: true },
  { id: 'razer', name: 'Razer Gold', rate: '₦1,154.71', currency: 'USD', mark: 'Z', kind: 'razer' },
  { id: 'xbox', name: 'Xbox', rate: '₦1,281.88', currency: 'USD', mark: 'X', kind: 'xbox' },
  { id: 'google', name: 'Google Play', rate: '₦1,175.22', currency: 'USD', mark: '▶', kind: 'google' },
  { id: 'sephora', name: 'Sephora', rate: '₦1,117.80', currency: 'USD', mark: 'SEPHORA', kind: 'sephora' },
  { id: 'playstation', name: 'PlayStation', rate: '₦1,247.50', currency: 'USD', mark: 'PS', kind: 'playstation' },
  { id: 'amazon', name: 'Amazon', rate: '₦1,210.36', currency: 'USD', mark: 'amazon', kind: 'amazon' },
];

const trades = [
  { initial: 'J', line: 'j***N traded Steam AUD 85*3', amount: '₦175,207.95', time: '5 mins ago' },
  { initial: 'K', line: 'k***8 traded Apple $50', amount: '₦58,746.20', time: '8 mins ago' },
  { initial: 'A', line: 'a***1 traded Google Play $80', amount: '₦96,320.11', time: '11 mins ago' },
];

const promos = [
  { id: 1, title: 'Get 5% Bonus on Every Trade!', body: 'Trade selected gift cards today and enjoy an instant bonus.' },
  { id: 2, title: 'Trade at Today’s Live Rates', body: 'Check the latest available payout rate before you sell.' },
  { id: 3, title: 'Sell Your Gift Card Today', body: 'Submit your card and track the trade from Verxor.' },
];

function CardMark({ card }: { card: Card }) {
  return <div className={'gc-mark gc-mark-' + card.kind} aria-label={card.name}>{card.mark}</div>;
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState<Currency>('ALL');
  const [promo, setPromo] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPromo((value) => (value + 1) % promos.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  const visibleCards = currency === 'ALL'
    ? cards
    : cards.filter((card) => card.currency === currency);

  return (
    <div className="gc-page">
      <main className="gc-content">
        <header className="gc-header">
          <button className="gc-back" type="button" onClick={onBack} aria-label="Back to Verxor dashboard">
            <ArrowLeft size={22} />
          </button>
          <h1>Gift Card Trade</h1>
        </header>

        <section className="gc-primary-actions" aria-label="Gift card actions">
          <button type="button" className="gc-withdraw" aria-label="Open gift card wallet and withdrawal">
            <Wallet size={21} />
            <span>Withdraw</span>
            <ChevronRight size={18} />
          </button>
          <button type="button" className="gc-sale">
            <Tag size={21} />
            <span>Sell Now</span>
            <ChevronRight size={18} />
          </button>
        </section>

        <section className="gc-promo-wrap" aria-label="Gift card promotions">
          <article className="gc-promo">
            <div className="gc-promo-copy">
              <span className="gc-eyebrow"><Gift size={14} /> LIMITED TIME BONUS</span>
              <h2>{promos[promo].title}</h2>
              <p>{promos[promo].body}</p>
              <button type="button">View Details <ArrowRight size={15} /></button>
            </div>
            <div className="gc-promo-art" aria-hidden="true">
              <div className="gc-art gc-art-one"></div>
              <div className="gc-art gc-art-two">▶</div>
              <div className="gc-art gc-art-three">◉</div>
              <strong>5%<small>BONUS</small></strong>
            </div>
          </article>
          <div className="gc-dots">
            {promos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === promo ? 'active' : ''}
                aria-label={'Promotion ' + (index + 1)}
                onClick={() => setPromo(index)}
              />
            ))}
          </div>
        </section>

        <section className="gc-live" aria-label="Live completed trades">
          <div className="gc-live-header">
            <strong><i />Live Completed Trades</strong>
            <button type="button">View All <ArrowRight size={14} /></button>
          </div>
          <div className="gc-live-track">
            {trades.map((trade) => (
              <article className="gc-trade" key={trade.line}>
                <span>{trade.initial}</span>
                <div>
                  <strong>{trade.line}</strong>
                  <p>{trade.amount} <small>{trade.time}</small></p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="gc-currencies" aria-label="Gift card currencies">
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
            <button type="button">View All <ArrowRight size={14} /></button>
          </div>

          <div className="gc-grid">
            {visibleCards.map((card) => (
              <article className="gc-card" key={card.id}>
                <div className="gc-card-image">
                  <CardMark card={card} />
                  {card.popular && <span>Popular</span>}
                </div>
                <div className="gc-card-details">
                  <strong>{card.name}</strong>
                  <p>$1 = {card.rate}</p>
                </div>
                <button className="gc-card-sell" type="button">
                  Sell <ArrowRight size={13} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <nav className="gc-bottom-nav" aria-label="Gift card navigation">
        <button className="active" type="button" aria-current="page">
          <LayoutGrid size={22} />
          <span>Trade</span>
        </button>
        <button type="button">
          <Clock3 size={22} />
          <span>History</span>
        </button>
        <button type="button">
          <Wallet size={22} />
          <span>Wallet</span>
        </button>
      </nav>
    </div>
  );
}
