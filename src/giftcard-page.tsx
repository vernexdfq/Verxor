'use client';

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Landmark,
  Minus,
  Plus,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Trash2,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import './giftcard-page.css';

type View = 'trade' | 'sell' | 'live' | 'wallet' | 'add-bank' | 'history';
type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';
type BrandId = 'apple' | 'steam' | 'razer' | 'xbox' | 'google' | 'sephora' | 'playstation' | 'amazon';

type Brand = {
  id: BrandId;
  name: string;
  rate: number;
  currencies: Currency[];
};

type Entry = {
  id: number;
  face: number;
  quantity: number;
  code: string;
  photos: string[];
};

type Tx = {
  id: number;
  title: string;
  brand?: BrandId;
  amount: number;
  status: 'Pending' | 'Successful' | 'Rejected';
  kind: 'payout' | 'deposit' | 'withdrawal';
  date: string;
};

const BRANDS: Brand[] = [
  { id: 'apple', name: 'iTunes / Apple', rate: 1333.15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'steam', name: 'Steam', rate: 1281.88, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'razer', name: 'Razer Gold', rate: 1154.71, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'xbox', name: 'Xbox', rate: 1281.88, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'google', name: 'Google Play', rate: 1175.22, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
  { id: 'sephora', name: 'Sephora', rate: 1117.80, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'playstation', name: 'PlayStation', rate: 1247.50, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'amazon', name: 'Amazon', rate: 1210.36, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'] },
];

const CURRENCIES: Array<{ id: 'ALL' | Currency; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: '🇺🇸' },
  { id: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', flag: '🇸🇬' },
];

const GUIDELINES = [
  'Select the correct gift-card brand, currency and card type before submitting.',
  'Physical cards should be clear and show the relevant card information without cropping.',
  'E-gift cards must include the complete code or PIN when requested.',
  'Do not submit cards that have already been redeemed, partially used or altered.',
  'Upload clear photos only. You can attach up to five images per card.',
  'Your trade enters verification before the final payout is released to the selected wallet.',
  'Never share your Verxor password, OTP or account credentials with another person.',
];

const BANKS = ['GTBank', 'Zenith Bank', 'Access Bank', 'First Bank', 'UBA', 'Kuda Microfinance Bank', 'Opay', 'PalmPay'];

const DEMO_TX: Tx[] = [
  { id: 1, title: 'Apple Gift Card Trade Payout', brand: 'apple', amount: 134315, status: 'Successful', kind: 'payout', date: 'Apr 28, 2025 • 10:24 AM' },
  { id: 2, title: 'Withdrawal to GTBank', amount: -50000, status: 'Successful', kind: 'withdrawal', date: 'Apr 27, 2025 • 04:32 PM' },
];

const LIVE_TRADES = [
  ['D', 'D******e', 'Apple & iTunes Gift Card', 'NL 50*1', 51250, '5 minutes ago'],
  ['M', 'M*****n', 'Steam', 'CAD 185*1', 166050, '12 minutes ago'],
  ['H', 'H****1', 'Razer', 'EUR 20*2', 56800, '18 minutes ago'],
  ['J', 'J******k', 'Amazon Gift Card', 'US 100*1', 150400, '27 minutes ago'],
  ['R', 'R******n', 'Google Play Gift Card', 'US 50*1', 78900, '36 minutes ago'],
  ['T', 'T*****a', 'PlayStation Store', 'USD 25*1', 42300, '48 minutes ago'],
] as const;

function money(value: number) {
  return `₦${Math.abs(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function brand(id: BrandId) {
  return BRANDS.find((item) => item.id === id) ?? BRANDS[0];
}

function BrandLogo({ id, large = false }: { id: BrandId; large?: boolean }) {
  const common = large ? 'gc-logo gc-logo-lg' : 'gc-logo';
  if (id === 'apple') return <span className={`${common} gc-logo-dark`}><svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M16.7 12.9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6s1.6.6 2.6.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.9-2.2-3.1zM14.8 6.9c.5-.7.9-1.6.8-2.6-.8 0-1.8.6-2.3 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.3-1.1z"/></svg></span>;
  if (id === 'google') return <span className={`${common} gc-logo-google`}><svg viewBox="0 0 32 32" aria-hidden><path d="M6 4v24l13-12z" fill="#4285F4"/><path d="M6 4l13 12 4-3.7L9.3 5.2A2 2 0 0 0 6 4z" fill="#34A853"/><path d="M19 16l4 3.7-3.4 2L6 28z" fill="#FBBC04"/><path d="M23 12.3L29 16l-6 3.7L19 16z" fill="#EA4335"/></svg></span>;
  if (id === 'steam') return <span className={`${common} gc-logo-steam`}><svg viewBox="0 0 32 32" fill="none" aria-hidden><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.4"/><circle cx="20.2" cy="11.7" r="3.5" stroke="currentColor" strokeWidth="2"/><circle cx="10.2" cy="21.3" r="2.8" stroke="currentColor" strokeWidth="2"/><path d="M12.4 19.5l5.1-5.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></span>;
  if (id === 'xbox') return <span className={`${common} gc-logo-xbox`}><svg viewBox="0 0 32 32" fill="none" aria-hidden><path d="M9 10c4 2.5 7 6.4 7 6.4S19 12.5 23 10" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><path d="M8.5 24c1.5-5 4.5-8.7 7.5-11.2C19 15.3 22 19 23.5 24" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/></svg></span>;
  if (id === 'razer') return <span className={`${common} gc-logo-razer`}><b>RAZER</b><small>GOLD</small></span>;
  if (id === 'sephora') return <span className={`${common} gc-logo-dark`}><b>SEPHORA</b></span>;
  if (id === 'playstation') return <span className={`${common} gc-logo-ps`}><b>PS</b></span>;
  return <span className={`${common} gc-logo-amazon`}><b>amazon</b><i /></span>;
}

function PageHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="gc-page-header">
      <button className="gc-icon-button" type="button" onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button>
      <h1>{title}</h1>
      <div className="gc-header-right">{right}</div>
    </header>
  );
}

function BottomNav({ active, go }: { active: 'trade' | 'history' | 'wallet'; go: (view: View) => void }) {
  return (
    <nav className="gc-bottom-nav" aria-label="Gift card navigation">
      <button className={active === 'trade' ? 'active' : ''} onClick={() => go('trade')} type="button">
        <Tag size={23} strokeWidth={active === 'trade' ? 2.5 : 2} /><span>Trade</span>
      </button>
      <button className={active === 'history' ? 'active' : ''} onClick={() => go('history')} type="button">
        <Clock3 size={23} strokeWidth={active === 'history' ? 2.5 : 2} /><span>History</span>
      </button>
      <button className={active === 'wallet' ? 'active' : ''} onClick={() => go('wallet')} type="button">
        <Wallet size={23} strokeWidth={active === 'wallet' ? 2.5 : 2} /><span>Wallet</span>
      </button>
    </nav>
  );
}

function GuidelinesSheet({ close }: { close: () => void }) {
  return (
    <div className="gc-overlay" onClick={close}>
      <div className="gc-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="gc-sheet-handle" />
        <div className="gc-sheet-title"><div><span className="gc-sheet-icon"><ClipboardCheck size={20} /></span><div><h2>Gift Card Selling Guidelines</h2><p>Follow these steps to avoid delays.</p></div></div><button onClick={close} type="button"><X size={19} /></button></div>
        <div className="gc-guide-list">
          {GUIDELINES.map((item, index) => <div className="gc-guide-row" key={item}><span>{index + 1}</span><p>{item}</p></div>)}
        </div>
      </div>
    </div>
  );
}

function CouponSheet({ apply, close }: { apply: () => void; close: () => void }) {
  const coupons = ['TRADE5', 'BONUS1000', 'VERXOR10'];
  return (
    <div className="gc-overlay" onClick={close}>
      <div className="gc-sheet gc-coupon-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="gc-sheet-handle" />
        <div className="gc-sheet-title"><div><span className="gc-sheet-icon green"><Gift size={20} /></span><div><h2>Bonus Coupon</h2><p>Select an available reward.</p></div></div><button onClick={close} type="button"><X size={19} /></button></div>
        <div className="gc-coupon-input"><Tag size={17} /><input placeholder="Enter coupon code" /></div>
        <div className="gc-coupon-list">{coupons.map((code, i) => <button key={code} type="button" onClick={apply}><span><b>{code}</b><small>{i === 0 ? '5% trade bonus' : i === 1 ? '₦1,000 extra payout' : 'Special rate bonus'}</small></span><ChevronRight size={18} /></button>)}</div>
      </div>
    </div>
  );
}

function TradeHome({ openSell, go, currency, setCurrency, cartCount, onBack }: {
  openSell: (id?: BrandId) => void;
  go: (view: View) => void;
  currency: 'ALL' | Currency;
  setCurrency: (value: 'ALL' | Currency) => void;
  cartCount: number;
  onBack: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const filteredBrands = useMemo(() => currency === 'ALL' ? BRANDS : BRANDS.filter((item) => item.currencies.includes(currency)), [currency]);

  return (
    <div className="gc-screen">
      <PageHeader title="Gift Card Trade" onBack={onBack} right={cartCount > 0 ? <span className="gc-cart"><ShoppingCart size={15} />{cartCount}</span> : undefined} />

      <div className="gc-action-row">
        <button className="gc-secondary-action" type="button" onClick={() => go('wallet')}><Wallet size={18} />Withdraw</button>
        <button className="gc-primary-action" type="button" onClick={() => openSell()}><Tag size={18} />Sell Now</button>
      </div>

      <section className="gc-promo">
        <div className="gc-promo-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
          <article className="gc-promo-slide gc-promo-blue">
            <span className="gc-promo-chip"><Gift size={13} /> LIMITED TIME BONUS</span>
            <h2>Get 5% Bonus<br />on Every Trade!</h2>
            <p>Trade your gift cards today and enjoy instant bonus on selected brands.</p>
            <button type="button" onClick={() => openSell()}>View Details <ArrowRight size={15} /></button>
            <div className="gc-promo-cards"><span><BrandLogo id="apple" /></span><span><BrandLogo id="google" /></span><span><BrandLogo id="steam" /></span></div>
            <b className="gc-five">5%<small>BONUS</small></b>
          </article>
          <article className="gc-promo-slide gc-promo-light"><span className="gc-promo-chip blue"><ShieldCheck size={13} /> SAFE TRADING</span><h2>Trade with confidence.</h2><p>Clear rates, protected submissions and visible transaction status.</p><button type="button" onClick={() => openSell()}>Sell a Gift Card <ArrowRight size={15} /></button></article>
          <article className="gc-promo-slide gc-promo-light"><span className="gc-promo-chip blue"><Zap size={13} /> LIVE RATES</span><h2>Rates are easy to see.</h2><p>Choose a brand and currency before you submit your cards.</p><button type="button" onClick={() => openSell()}>Check Rates <ArrowRight size={15} /></button></article>
          <article className="gc-promo-slide gc-promo-light"><span className="gc-promo-chip blue"><Gift size={13} /> REWARDS</span><h2>Unlock trade bonuses.</h2><p>Apply eligible coupons during checkout to increase your payout.</p><button type="button" onClick={() => openSell()}>View Rewards <ArrowRight size={15} /></button></article>
        </div>
        <div className="gc-promo-dots">{[0,1,2,3].map((i) => <button key={i} className={slide === i ? 'active' : ''} onClick={() => setSlide(i)} type="button" aria-label={`Slide ${i + 1}`} />)}</div>
      </section>

      <section className="gc-live-strip">
        <div className="gc-section-head"><h2><span className="gc-live-dot" />Live Completed Trades</h2><button type="button" onClick={() => go('live')}>View All <ArrowRight size={14} /></button></div>
        <div className="gc-live-scroll">
          {LIVE_TRADES.slice(0, 4).map(([initial, masked, title, detail, amount, time]) => (
            <div className="gc-mini-trade" key={masked}>
              <span className="gc-mini-avatar">{initial}</span>
              <div><p>{masked} traded {title}</p><strong>{money(amount)}</strong><small>{time}</small></div>
            </div>
          ))}
        </div>
      </section>

      <div className="gc-currency-scroll">
        {CURRENCIES.map((item) => <button key={item.id} className={currency === item.id ? 'active' : ''} type="button" onClick={() => setCurrency(item.id)}>{item.flag && <span>{item.flag}</span>}{item.id === 'ALL' ? 'All' : item.id}</button>)}
      </div>

      <section className="gc-popular">
        <div className="gc-section-head"><h2>Popular Gift Cards</h2><button type="button" onClick={() => setCurrency('ALL')}>View All <ArrowRight size={14} /></button></div>
        <div className="gc-brand-grid">
          {filteredBrands.map((item) => (
            <article className="gc-brand-card" key={item.id}>
              <BrandLogo id={item.id} large />
              <div className="gc-brand-copy"><h3>{item.name}</h3><p>$1 = {money(item.rate)}</p></div>
              <button type="button" onClick={() => openSell(item.id)}>Sell <ArrowRight size={14} /></button>
              {(item.id === 'apple' || item.id === 'steam') && <span className="gc-popular-badge">Popular</span>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [view, setView] = useState<View>('trade');
  const [currency, setCurrency] = useState<'ALL' | Currency>('ALL');
  const [brandId, setBrandId] = useState<BrandId>('apple');
  const [cartCount, setCartCount] = useState(0);
  const [balance, setBalance] = useState(7570);
  const [txs, setTxs] = useState<Tx[]>(DEMO_TX);

  const go = (next: View) => setView(next);
  const openSell = (id?: BrandId) => {
    if (id) setBrandId(id);
    setView('sell');
  };

  const activeTab: 'trade' | 'history' | 'wallet' =
    view === 'history' ? 'history' : view === 'wallet' || view === 'add-bank' ? 'wallet' : 'trade';

  return (
    <div className="gc-page">
      <div className="gc-shell">
        {view === 'trade' && (
          <TradeHome
            openSell={openSell}
            go={go}
            currency={currency}
            setCurrency={setCurrency}
            cartCount={cartCount}
            onBack={onBack ?? (() => undefined)}
          />
        )}
        {view === 'sell' && (
          <div className="gc-screen">
            <PageHeader title="Sell Gift Card" onBack={() => go('trade')} />
            <p className="gc-muted" style={{ padding: '1rem' }}>
              Select a brand from Trade, then complete your sale. Full sell flow stays available offline with demo rates.
            </p>
            <button className="gc-primary-action" type="button" onClick={() => go('trade')} style={{ margin: '0 1rem' }}>
              Back to Trade
            </button>
          </div>
        )}
        {view === 'live' && (
          <div className="gc-screen">
            <PageHeader title="Live Trades" onBack={() => go('trade')} />
            <div className="gc-live-scroll" style={{ flexDirection: 'column', padding: '0.75rem' }}>
              {LIVE_TRADES.map(([initial, masked, title, detail, amount, time]) => (
                <div className="gc-mini-trade" key={masked + String(amount)}>
                  <span className="gc-mini-avatar">{initial}</span>
                  <div>
                    <p>{masked} traded {title} ({detail})</p>
                    <strong>{money(amount)}</strong>
                    <small>{time}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {view === 'wallet' && (
          <div className="gc-screen">
            <PageHeader title="Wallet" onBack={() => go('trade')} />
            <div style={{ padding: '1rem' }}>
              <p className="gc-muted">Available balance</p>
              <h2 style={{ margin: '0.35rem 0 1rem' }}>{money(balance)}</h2>
              <button className="gc-primary-action" type="button" onClick={() => go('add-bank')}>Withdraw</button>
            </div>
          </div>
        )}
        {view === 'add-bank' && (
          <div className="gc-screen">
            <PageHeader title="Add Bank" onBack={() => go('wallet')} />
            <div style={{ padding: '1rem' }}>
              <p className="gc-muted">Bank list: {BANKS.join(', ')}</p>
            </div>
          </div>
        )}
        {view === 'history' && (
          <div className="gc-screen">
            <PageHeader title="History" onBack={() => go('trade')} />
            <div style={{ padding: '0.75rem' }}>
              {txs.map((tx) => (
                <div key={tx.id} className="gc-mini-trade" style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <p>{tx.title}</p>
                    <strong style={{ color: tx.amount < 0 ? '#e11d48' : '#14985c' }}>{tx.amount < 0 ? '-' : '+'}{money(tx.amount)}</strong>
                    <small>{tx.status} · {tx.date}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {view !== 'sell' && view !== 'add-bank' && <BottomNav active={activeTab} go={go} />}
      </div>
    </div>
  );
}
