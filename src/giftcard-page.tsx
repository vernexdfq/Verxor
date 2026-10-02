'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Gift,
  Tag,
  Wallet,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import './giftcard-page.css';

type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';
type BrandId = 'apple' | 'steam' | 'razer' | 'xbox' | 'google' | 'sephora' | 'playstation' | 'amazon';

type Brand = {
  id: BrandId;
  name: string;
  rate: number;
  currencies: Currency[];
};

const BRANDS: Brand[] = [
  { id: 'apple', name: 'iTunes / Apple', rate: 1333.15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'steam', name: 'Steam', rate: 1281.88, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'razer', name: 'Razer Gold', rate: 1154.71, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'xbox', name: 'Xbox', rate: 1281.88, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'google', name: 'Google Play', rate: 1175.22, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'sephora', name: 'Sephora', rate: 1117.8, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'playstation', name: 'PlayStation', rate: 1247.5, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'amazon', name: 'Amazon', rate: 1210.36, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
];

const CURRENCIES: Array<{ id: 'ALL' | Currency; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: 'US' },
  { id: 'CAD', flag: 'CA' },
  { id: 'AUD', flag: 'AU' },
  { id: 'EUR', flag: 'EU' },
  { id: 'GBP', flag: 'GB' },
  { id: 'SGD', flag: 'SG' },
];

const LIVE_TRADES = [
  { initial: 'D', masked: 'D******e', title: 'Apple & iTunes Gift Card', amount: 51250, time: '5 minutes ago' },
  { initial: 'M', masked: 'M*****n', title: 'Steam', amount: 166050, time: '12 minutes ago' },
  { initial: 'H', masked: 'H****1', title: 'Razer', amount: 56800, time: '18 minutes ago' },
  { initial: 'J', masked: 'J******k', title: 'Amazon Gift Card', amount: 150400, time: '27 minutes ago' },
];

function money(value: number) {
  return (
    '\u20A6' +
    Math.abs(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function BrandLogo({ id, large = false }: { id: BrandId; large?: boolean }) {
  const common = large ? 'gc-logo gc-logo-lg' : 'gc-logo';
  const label = id === 'playstation' ? 'PS' : id === 'sephora' ? 'SEPHORA' : id.toUpperCase();
  return (
    <span className={common + ' gc-logo-dark'}>
      <b>{label}</b>
    </span>
  );
}

function PageHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="gc-page-header">
      <button className="gc-icon-button" type="button" onClick={onBack} aria-label="Back">
        <ArrowLeft size={20} />
      </button>
      <h1>{title}</h1>
      <div className="gc-header-right">{right}</div>
    </header>
  );
}

function BottomNav({ active }: { active: 'trade' | 'history' | 'wallet' }) {
  return (
    <nav className="gc-bottom-nav" aria-label="Gift card navigation">
      <button className={active === 'trade' ? 'active' : ''} type="button">
        <Tag size={23} />
        <span>Trade</span>
      </button>
      <button className={active === 'history' ? 'active' : ''} type="button">
        <Clock3 size={23} />
        <span>History</span>
      </button>
      <button className={active === 'wallet' ? 'active' : ''} type="button">
        <Wallet size={23} />
        <span>Wallet</span>
      </button>
    </nav>
  );
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [currency, setCurrency] = useState<'ALL' | Currency>('ALL');
  const [slide, setSlide] = useState(0);

  const filteredBrands = useMemo(() => {
    if (currency === 'ALL') return BRANDS;
    return BRANDS.filter((item) => item.currencies.includes(currency));
  }, [currency]);

  return (
    <div className="gc-page">
      <div className="gc-shell">
        <div className="gc-screen">
          <PageHeader title="Gift Card Trade" onBack={onBack || (function () {})} />

          <div className="gc-action-row">
            <button className="gc-secondary-action" type="button">
              <Wallet size={18} />
              Withdraw
            </button>
            <button className="gc-primary-action" type="button">
              <Tag size={18} />
              Sell Now
            </button>
          </div>

          <section className="gc-promo">
            <div
              className="gc-promo-track"
              style={{ transform: 'translateX(-' + String(slide * 100) + '%)' }}
            >
              <article className="gc-promo-slide gc-promo-blue">
                <span className="gc-promo-chip">
                  <Gift size={13} /> LIMITED TIME BONUS
                </span>
                <h2>
                  Get 5% Bonus
                  <br />
                  on Every Trade!
                </h2>
                <p>Trade your gift cards today and enjoy instant bonus on selected brands.</p>
                <button type="button">
                  View Details <ArrowRight size={15} />
                </button>
                <div className="gc-promo-cards">
                  <span>
                    <BrandLogo id="apple" />
                  </span>
                  <span>
                    <BrandLogo id="google" />
                  </span>
                  <span>
                    <BrandLogo id="steam" />
                  </span>
                </div>
                <b className="gc-five">
                  5%<small>BONUS</small>
                </b>
              </article>
              <article className="gc-promo-slide gc-promo-light">
                <span className="gc-promo-chip blue">
                  <ShieldCheck size={13} /> SAFE TRADING
                </span>
                <h2>Trade with confidence.</h2>
                <p>Clear rates, protected submissions and visible transaction status.</p>
              </article>
              <article className="gc-promo-slide gc-promo-light">
                <span className="gc-promo-chip blue">
                  <Zap size={13} /> LIVE RATES
                </span>
                <h2>Rates are easy to see.</h2>
                <p>Choose a brand and currency before you submit your cards.</p>
              </article>
            </div>
            <div className="gc-promo-dots">
              {[0, 1, 2].map(function (i) {
                return (
                  <button
                    key={i}
                    className={slide === i ? 'active' : ''}
                    onClick={function () {
                      setSlide(i);
                    }}
                    type="button"
                    aria-label={'Slide ' + String(i + 1)}
                  />
                );
              })}
            </div>
          </section>

          <section className="gc-live-strip">
            <div className="gc-section-head">
              <h2>
                <span className="gc-live-dot" />
                Live Completed Trades
              </h2>
              <button type="button">
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="gc-live-scroll">
              {LIVE_TRADES.map(function (trade) {
                return (
                  <div className="gc-mini-trade" key={trade.masked}>
                    <span className="gc-mini-avatar">{trade.initial}</span>
                    <div>
                      <p>
                        {trade.masked} traded {trade.title}
                      </p>
                      <strong>{money(trade.amount)}</strong>
                      <small>{trade.time}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="gc-currency-scroll">
            {CURRENCIES.map(function (item) {
              return (
                <button
                  key={item.id}
                  className={currency === item.id ? 'active' : ''}
                  type="button"
                  onClick={function () {
                    setCurrency(item.id);
                  }}
                >
                  {item.flag ? <span>{item.flag}</span> : null}
                  {item.id === 'ALL' ? 'All' : item.id}
                </button>
              );
            })}
          </div>

          <section className="gc-popular">
            <div className="gc-section-head">
              <h2>Popular Gift Cards</h2>
              <button
                type="button"
                onClick={function () {
                  setCurrency('ALL');
                }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>
            <div className="gc-brand-grid">
              {filteredBrands.map(function (item) {
                return (
                  <article className="gc-brand-card" key={item.id}>
                    <BrandLogo id={item.id} large />
                    <div className="gc-brand-copy">
                      <h3>{item.name}</h3>
                      <p>$1 = {money(item.rate)}</p>
                    </div>
                    <button type="button">
                      Sell <ArrowRight size={14} />
                    </button>
                    {item.id === 'apple' || item.id === 'steam' ? (
                      <span className="gc-popular-badge">Popular</span>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
        <BottomNav active="trade" />
      </div>
    </div>
  );
}
