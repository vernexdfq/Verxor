'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
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
  Wallet as WalletIcon,
  X,
  Zap,
} from 'lucide-react';
import './giftcard-page.css';

type View = 'trade' | 'sell' | 'live' | 'wallet' | 'add-bank' | 'history';
type CurrencyId = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';
type BrandId = 'apple' | 'steam' | 'razer' | 'xbox' | 'google' | 'sephora' | 'playstation' | 'amazon';
type TxStatus = 'Pending' | 'Successful' | 'Rejected';
type TxKind = 'payout' | 'deposit' | 'withdrawal';

type Brand = {
  id: BrandId;
  name: string;
  category: string;
  usdRate: number;
  popular?: boolean;
};

type CardEntry = {
  id: number;
  faceValue: number;
  qty: number;
  pin: string;
  photos: Array<string | null>;
};

type Transaction = {
  id: number;
  title: string;
  brand?: BrandId;
  dateLabel: string;
  amount: number;
  status: TxStatus;
  kind: TxKind;
};

type LiveTrade = {
  id: number;
  initial: string;
  masked: string;
  color: string;
  brand: BrandId;
  label: string;
  amount: number;
  minutesAgo: number;
};

const BRANDS: Brand[] = [
  { id: 'apple', name: 'iTunes / Apple', category: 'Entertainment • Music • Apps', usdRate: 1333.15, popular: true },
  { id: 'steam', name: 'Steam', category: 'Gaming • Software', usdRate: 1281.88, popular: true },
  { id: 'razer', name: 'Razer Gold', category: 'Gaming • Entertainment', usdRate: 1154.71 },
  { id: 'xbox', name: 'Xbox', category: 'Gaming • Subscriptions', usdRate: 1281.88 },
  { id: 'google', name: 'Google Play', category: 'Entertainment • Games • Apps', usdRate: 1175.22 },
  { id: 'sephora', name: 'Sephora', category: 'Beauty • Cosmetics', usdRate: 1117.8 },
  { id: 'playstation', name: 'PlayStation', category: 'Gaming • Store Credit', usdRate: 1247.5 },
  { id: 'amazon', name: 'Amazon', category: 'Shopping • Retail', usdRate: 1210.36 },
];

const CURRENCIES: Array<{ id: 'ALL' | CurrencyId; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: '🇺🇸' },
  { id: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', flag: '🇸🇬' },
];

const CURRENCY_FACTOR: Record<CurrencyId, number> = {
  USD: 1,
  CAD: 0.72,
  AUD: 0.65,
  EUR: 1.09,
  GBP: 1.27,
  SGD: 0.74,
};

const GUIDELINE_STEPS = [
  'Ensure the gift card code and receipts are clearly visible in your uploaded photos.',
  'Physical cards must show the full card number; e-gift cards require the complete code / PIN.',
  'Cards must be from the United States, Canada, Australia, Europe, Singapore or the United Kingdom as selected.',
  'Partially used or already redeemed cards will be rejected after verification.',
  'Upload up to 5 photos per card; blurry or cropped images slow down verification.',
  'Payouts are credited to your Verxor wallet immediately after the card is confirmed.',
  'Fraudulent cards lead to a permanent account ban and possible legal action.',
];

const BANKS = [
  'GTBank',
  'Zenith Bank',
  'Access Bank',
  'First Bank',
  'United Bank for Africa',
  'Kuda Microfinance Bank',
  'Opay',
  'PalmPay',
];

const INITIAL_TX: Transaction[] = [
  {
    id: 1,
    title: 'Google Play Gift Card Trade Payout',
    brand: 'google',
    dateLabel: 'Apr 28, 2025 • 10:24 AM',
    amount: 134315,
    status: 'Successful',
    kind: 'payout',
  },
  {
    id: 2,
    title: 'Withdrawal to GTBank',
    dateLabel: 'Apr 27, 2025 • 04:32 PM',
    amount: -50000,
    status: 'Successful',
    kind: 'withdrawal',
  },
];

const BASE_LIVE_TRADES: LiveTrade[] = [
  { id: 1, initial: 'D', masked: 'D*******e', color: 'purple', brand: 'apple', label: 'Apple & iTunes Gift Card NL 50*1', amount: 51250, minutesAgo: 5 },
  { id: 2, initial: 'M', masked: 'M****n', color: 'blue', brand: 'steam', label: 'Steam CAD 185*1', amount: 166050, minutesAgo: 12 },
  { id: 3, initial: 'H', masked: 'H****1', color: 'green', brand: 'razer', label: 'Razer EUR 20*2', amount: 56800, minutesAgo: 18 },
  { id: 4, initial: 'J', masked: 'J******k', color: 'blue', brand: 'amazon', label: 'Amazon Gift Card US 100*1', amount: 150400, minutesAgo: 27 },
  { id: 5, initial: 'R', masked: 'R******n', color: 'orange', brand: 'google', label: 'Google Play Gift Card US 50*1', amount: 78900, minutesAgo: 36 },
  { id: 6, initial: 'T', masked: 'T****a', color: 'violet', brand: 'playstation', label: 'PlayStation Store USD 25*1', amount: 42300, minutesAgo: 48 },
];

function naira(n: number): string {
  return `₦${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskId(seed: number): string {
  return `260930${String(1000000000 + seed * 7919).slice(0, 9)}${String(1000 + seed).slice(-4)}`;
}

function relativeMinutes(min: number): string {
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? '' : 's'} ago`;
}

/* ------------------------------ Brand marks ------------------------------ */

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.7 12.9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6s1.6.6 2.6.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.9-2.2-3.1zM14.8 6.9c.5-.7.9-1.6.8-2.6-.8 0-1.8.6-2.3 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.3-1.1z" />
    </svg>
  );
}

function BrandMark({ kind, size = 'md' }: { kind: BrandId; size?: 'sm' | 'md' }) {
  const cls = `gc-brand-mark gc-brand-${size} gc-mark-${kind}`;
  switch (kind) {
    case 'apple':
      return (
        <span className={cls}>
          <AppleGlyph />
        </span>
      );
    case 'steam':
      return (
        <span className={cls}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <circle cx="15.5" cy="9" r="2.6" />
            <circle cx="8.5" cy="15.5" r="2" />
            <path d="M10.2 14.2 13.4 10.6" />
          </svg>
        </span>
      );
    case 'razer':
      return (
        <span className={cls}>
          <span className="gc-mark-text gc-mark-text-razer">RAZER</span>
          <span className="gc-mark-sub">GOLD</span>
        </span>
      );
    case 'xbox':
      return (
        <span className={cls}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M7 7c3 2.4 7 7.4 10 10M17 7c-3 2.4-7 7.4-10 10" />
          </svg>
        </span>
      );
    case 'google':
      return (
        <span className={`${cls} gc-mark-light`}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 3.5v17l9-8.5z" fill="#4285F4" />
            <path d="M4 3.5 13 12l2.8-2.6L6.4 4.4A1.6 1.6 0 0 0 4 3.5z" fill="#34A853" />
            <path d="M13 12l2.8 2.6-2.4 1.4L4 20.5z" fill="#FBBC04" />
            <path d="M15.8 9.4 20 12l-4.2 2.6L13 12z" fill="#EA4335" />
          </svg>
        </span>
      );
    case 'sephora':
      return (
        <span className={cls}>
          <span className="gc-mark-text">SEPHORA</span>
        </span>
      );
    case 'playstation':
      return (
        <span className={cls}>
          <span className="gc-mark-ps">PS</span>
        </span>
      );
    case 'amazon':
      return (
        <span className={`${cls} gc-mark-light`}>
          <span className="gc-mark-amazon">
            amazon
            <svg viewBox="0 0 40 10" aria-hidden>
              <path d="M2 2c10 6 26 6 36 0" fill="none" stroke="#FF9900" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------------ Main page ------------------------------ */

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [view, setView] = useState<View>('trade');
  const [currency, setCurrency] = useState<'ALL' | CurrencyId>('ALL');
  const [slide, setSlide] = useState(0);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>(BASE_LIVE_TRADES);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [balance] = useState(250000);
  const [pendingEscrow] = useState(15000);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TX);
  const [cartCount, setCartCount] = useState(0);

  // Sell page state
  const [sellBrandId, setSellBrandId] = useState<BrandId>('google');
  const [cardType, setCardType] = useState<'physical' | 'egift'>('physical');
  const [entries, setEntries] = useState<CardEntry[]>([
    { id: 1, faceValue: 100, qty: 1, pin: '', photos: [null, null, null, null, null] },
  ]);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  // Wallet state
  const [payoutDest, setPayoutDest] = useState<'wallet' | 'bank'>('wallet');
  const [savedBank, setSavedBank] = useState<{ bank: string; last4: string; name: string; isDefault: boolean } | null>(null);
  const [activityFilter, setActivityFilter] = useState<'All' | 'Deposits' | 'Withdrawals' | 'Trade Payouts'>('All');

  // Add bank state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('Nathaniel Sanchez');
  const [defaultToggle, setDefaultToggle] = useState(true);

  // History state
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Pending' | 'Success' | 'Rejected'>('All');

  const nextEntryId = useRef(2);
  const nextTxId = useRef(100);
  const liveRef = useRef<HTMLDivElement | null>(null);

  const sellBrand = useMemo(() => BRANDS.find((b) => b.id === sellBrandId) ?? BRANDS[0], [sellBrandId]);
  const activeCurrency: CurrencyId = currency === 'ALL' ? 'USD' : currency;

  const rateFor = (brand: Brand, cur: CurrencyId) => brand.usdRate * CURRENCY_FACTOR[cur];

  // Hero carousel auto-play
  useEffect(() => {
    if (view !== 'trade') return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % 4), 4000);
    return () => window.clearInterval(t);
  }, [view]);

  const brandForKind = (kind: BrandId) => BRANDS.find((b) => b.id === kind) ?? BRANDS[0];

  /* ------------------------------ Actions ------------------------------ */

  const openSell = (brandId?: BrandId) => {
    if (brandId) setSellBrandId(brandId);
    setView('sell');
    window.scrollTo({ top: 0 });
  };

  const goView = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const updateEntry = (id: number, patch: Partial<CardEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: nextEntryId.current++, faceValue: 0, qty: 1, pin: '', photos: [null, null, null, null, null] },
    ]);
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const handlePhoto = (entryId: number, slot: number, file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateEntry(entryId, {
      photos: entries.find((e) => e.id === entryId)?.photos.map((p, i) => (i === slot ? url : p)) ?? [],
    });
  };

  const baseAmount = entries.reduce((sum, e) => sum + e.faceValue * e.qty * rateFor(sellBrand, activeCurrency), 0);
  const bonus = couponApplied ? 1000 : 0;
  const finalPayout = baseAmount + bonus;

  const addToCart = () => {
    setCartCount((c) => c + entries.reduce((s, e) => s + e.qty, 0));
  };

  const submitTrade = () => {
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    setTransactions((prev) => [
      {
        id: nextTxId.current++,
        title: `${sellBrand.name} Gift Card Trade Payout`,
        brand: sellBrand.id,
        dateLabel: 'Just now',
        amount: Math.round(baseAmount),
        status: 'Pending',
        kind: 'payout',
      },
      ...prev,
    ]);
    setEntries([{ id: nextEntryId.current++, faceValue: 100, qty: 1, pin: '', photos: [null, null, null, null, null] }]);
    setCouponApplied(false);
    setCouponInput('');
    setCouponOpen(false);
    goView('history');
  };

  const saveBank = () => {
    const last4 = accountNumber.slice(-4) || '0000';
    const isDefault = defaultToggle || !savedBank;
    setSavedBank({ bank: bankName || 'GTBank', last4, name: accountName, isDefault });
    if (isDefault) setPayoutDest('bank');
    goView('wallet');
  };

  const loadMoreLiveTrades = () => {
    setLiveTrades((prev) => {
      const next: LiveTrade[] = [];
      for (let i = 0; i < 6; i += 1) {
        const idx = prev.length + i + 1;
        const brand = BRANDS[idx % BRANDS.length];
        next.push({
          id: idx,
          initial: String.fromCharCode(65 + (idx * 7) % 26),
          masked: `${String.fromCharCode(65 + (idx * 7) % 26)}****${String.fromCharCode(97 + (idx * 5) % 26)}`,
          color: ['purple', 'blue', 'green', 'orange', 'violet'][idx % 5],
          brand: brand.id,
          label: `${brand.name} Gift Card ${['US', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'][idx % 6]} ${25 + ((idx * 13) % 90)}*1`,
          amount: 20000 + ((idx * 9771) % 140000),
          minutesAgo: 50 + idx * 9,
        });
      }
      return [...prev, ...next];
    });
  };

  const onLiveScroll = () => {
    const el = liveRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      loadMoreLiveTrades();
    }
  };

  const filteredTxs = transactions.filter((t) => {
    if (historyFilter === 'All') return true;
    if (historyFilter === 'Pending') return t.status === 'Pending';
    if (historyFilter === 'Success') return t.status === 'Successful';
    return t.status === 'Rejected';
  });

  const filteredActivity = transactions.filter((t) => {
    if (activityFilter === 'All') return true;
    if (activityFilter === 'Deposits') return t.kind === 'deposit';
    if (activityFilter === 'Withdrawals') return t.kind === 'withdrawal';
    return t.kind === 'payout';
  });

  const activeTab: 'trade' | 'history' | 'wallet' =
    view === 'history' ? 'history' : view === 'wallet' || view === 'add-bank' ? 'wallet' : 'trade';

  return (
    <div className="gc-root">
      <div className="gc-shell">
        {/* ============================ 1. TRADE HOME ============================ */}
        {view === 'trade' && (
          <div className="gc-screen">
            <header className="gc-top-header">
              <button className="gc-back" type="button" onClick={onBack} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <h1>Gift Card Trade</h1>
              {cartCount > 0 && (
                <span className="gc-cart-pill" type="button">
                  <ShoppingCart size={14} /> {cartCount}
                </span>
              )}
            </header>

            <div className="gc-action-row">
              <button className="gc-btn-outline" type="button" onClick={() => goView('wallet')}>
                <WalletIcon size={18} /> Withdraw
              </button>
              <button className="gc-btn-primary" type="button" onClick={() => openSell()}>
                <Tag size={18} /> Sell Now
              </button>
            </div>

            <div className="gc-hero">
              <div className="gc-hero-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
                <div className="gc-hero-slide gc-hero-main">
                  <span className="gc-hero-pill">
                    <Gift size={13} /> LIMITED TIME BONUS
                  </span>
                  <h2>
                    Get 5% Bonus
                    <br />
                    on Every Trade!
                  </h2>
                  <p>Trade your gift cards today and enjoy instant bonus on selected brands.</p>
                  <button className="gc-hero-cta" type="button" onClick={() => openSell()}>
                    View Details <ArrowRight size={15} />
                  </button>
                  <span className="gc-hero-badge">5% BONUS</span>
                  <span className="gc-hero-cards">
                    <i className="gc-hero-chip gc-chip-apple"><AppleGlyph /></i>
                    <i className="gc-hero-chip gc-chip-play">▶</i>
                    <i className="gc-hero-chip gc-chip-steam">STEAM</i>
                  </span>
                </div>
                <div className="gc-hero-slide gc-hero-alt1">
                  <h2>Zero fees on your first withdrawal</h2>
                  <p>Fund, trade and withdraw with no hidden charges.</p>
                </div>
                <div className="gc-hero-slide gc-hero-alt2">
                  <h2>Refer &amp; earn ₦500</h2>
                  <p>Invite a friend and both of you get paid.</p>
                </div>
                <div className="gc-hero-slide gc-hero-alt3">
                  <h2>Rates updated live</h2>
                  <p>Get the best market rate on every brand, every time.</p>
                </div>
              </div>
              <div className="gc-hero-dots">
                {[0, 1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === slide ? 'on' : ''}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <section className="gc-panel">
              <div className="gc-panel-head">
                <span className="gc-panel-title">
                  <i className="gc-live-dot" /> Live Completed Trades
                </span>
                <button className="gc-link" type="button" onClick={() => goView('live')}>
                  View All <ArrowRight size={13} />
                </button>
              </div>
              <div className="gc-live-row">
                {liveTrades.slice(0, 6).map((t) => (
                  <div className="gc-live-card" key={t.id}>
                    <i className={`gc-avatar gc-avatar-${t.color}`}>{t.initial}</i>
                    <div>
                      <p className="gc-live-label">{t.masked} traded {brandForKind(t.brand).name.split(' ')[0]}</p>
                      <strong className="gc-live-amount">{naira(t.amount)}</strong>
                      <span className="gc-live-time">{relativeMinutes(t.minutesAgo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="gc-pills">
              {CURRENCIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`gc-pill ${currency === c.id ? 'on' : ''}`}
                  onClick={() => setCurrency(c.id)}
                >
                  {c.flag ? `${c.flag} ${c.id}` : 'All'}
                </button>
              ))}
            </div>

            <section className="gc-grid-section">
              <div className="gc-panel-head">
                <h3>Popular Gift Cards</h3>
                <button className="gc-link" type="button" onClick={() => goView('live')}>
                  View All <ArrowRight size={13} />
                </button>
              </div>
              <div className="gc-grid">
                {BRANDS.map((brand) => (
                  <article className="gc-card" key={brand.id}>
                    {brand.popular && <span className="gc-badge-popular">Popular</span>}
                    <BrandMark kind={brand.id} />
                    <div className="gc-card-body">
                      <strong>{brand.name}</strong>
                      <p>
                        $1 = {naira(rateFor(brand, activeCurrency))}
                      </p>
                      <button className="gc-btn-sell" type="button" onClick={() => openSell(brand.id)}>
                        Sell <ArrowRight size={12} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ============================ 2. SELL GIFT CARD ============================ */}
        {view === 'sell' && (
          <div className="gc-screen">
            <header className="gc-top-header">
              <button className="gc-back" type="button" onClick={() => goView('trade')} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <h1>Sell Gift Card</h1>
              <div className="gc-sell-header-right">
                {cartCount > 0 && (
                  <span className="gc-cart-pill">
                    <ShoppingCart size={14} /> {cartCount}
                  </span>
                )}
                <button className="gc-guidelines-trigger" type="button" onClick={() => setGuidelinesOpen(true)}>
                  <ClipboardList size={20} />
                  <span>Guidelines</span>
                </button>
              </div>
            </header>

            <button className="gc-guide-banner" type="button" onClick={() => setGuidelinesOpen(true)}>
              <i className="gc-guide-banner-icon">
                <ClipboardList size={18} />
              </i>
              <span>
                <strong>Gift Card Selling Guidelines</strong>
                <small>How to sell your gift cards safely and get the best rates.</small>
              </span>
              <ChevronDown size={18} />
            </button>

            <section className="gc-card gc-brand-card">
              <div className="gc-brand-row">
                <BrandMark kind={sellBrand.id} size="lg" />
                <div className="gc-brand-info">
                  <strong>{sellBrand.name} Gift Card</strong>
                  <span>{sellBrand.category}</span>
                </div>
                <ChevronRight size={18} />
              </div>
              <div className="gc-type-toggle">
                <button
                  type="button"
                  className={cardType === 'physical' ? 'on' : ''}
                  onClick={() => setCardType('physical')}
                >
                  <CreditCard size={16} /> Physical Card
                </button>
                <button type="button" className={cardType === 'egift' ? 'on' : ''} onClick={() => setCardType('egift')}>
                  <Gift size={16} /> E-Gift Card
                </button>
              </div>
            </section>

            <section className="gc-rate-card">
              <div className="gc-rate-left">
                <i className="gc-rate-icon">
                  <Zap size={16} />
                </i>
                <div>
                  <strong>Live Rate</strong>
                  <span>Get the best rates for your {sellBrand.name} cards</span>
                </div>
              </div>
              <div className="gc-rate-right">
                <span className="gc-rate-chip">Current Rate</span>
                <strong>
                  $100 - $500 = {naira(rateFor(sellBrand, activeCurrency))}/$
                </strong>
              </div>
              <ChevronRight size={16} />
            </section>

            {entries.map((entry, idx) => (
              <section className="gc-card gc-entry" key={entry.id}>
                <div className="gc-entry-head">
                  <span className="gc-entry-num">{idx + 1}</span>
                  <strong>Card {idx + 1}</strong>
                  <button
                    className="gc-entry-trash"
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    aria-label="Remove card"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="gc-entry-fields">
                  <label className="gc-field">
                    <span>Face Value (USD)</span>
                    <div className="gc-input-wrap">
                      <input
                        type="number"
                        min={0}
                        value={entry.faceValue || ''}
                        placeholder="0"
                        onChange={(e) => updateEntry(entry.id, { faceValue: Number(e.target.value) || 0 })}
                      />
                      <i>$</i>
                    </div>
                  </label>
                  <label className="gc-field">
                    <span>Quantity</span>
                    <div className="gc-input-wrap">
                      <input type="number" min={1} value={entry.qty} onChange={(e) => updateEntry(entry.id, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                      <div className="gc-qty">
                        <button type="button" onClick={() => updateEntry(entry.id, { qty: Math.max(1, entry.qty - 1) })} aria-label="Decrease">
                          <Minus size={13} />
                        </button>
                        <button type="button" onClick={() => updateEntry(entry.id, { qty: entry.qty + 1 })} aria-label="Increase">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </label>
                </div>
                <label className="gc-field gc-pin-field">
                  <div className="gc-input-wrap">
                    <CreditCard size={17} />
                    <input
                      type="text"
                      value={entry.pin}
                      placeholder="Enter Card Code / PIN (Optional)"
                      onChange={(e) => updateEntry(entry.id, { pin: e.target.value })}
                    />
                  </div>
                </label>
                <div className="gc-upload-head">
                  <i>
                    <Camera size={15} />
                  </i>
                  <span>Upload Card Photos (Up to 5)</span>
                </div>
                <div className="gc-uploads">
                  {entry.photos.map((photo, slot) => (
                    <label className="gc-upload-slot" key={slot}>
                      {photo ? <img src={photo} alt={`Card photo ${slot + 1}`} /> : <Camera size={18} />}
                      {!photo && <Plus size={13} />}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhoto(entry.id, slot, e.target.files?.[0])}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <button className="gc-add-card" type="button" onClick={addEntry}>
              <Plus size={16} /> Add Another Card
            </button>

            <section className={`gc-coupon ${couponApplied ? 'applied' : ''}`}>
              <button className="gc-coupon-head" type="button" onClick={() => setCouponOpen((o) => !o)}>
                <i>
                  <Gift size={17} />
                </i>
                <span>
                  <strong>Apply Bonus Coupon</strong>
                  <small>Use a valid coupon to get extra bonus on your trade</small>
                </span>
                <ChevronRight size={16} />
              </button>
              {couponOpen && !couponApplied && (
                <div className="gc-coupon-body">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (couponInput.trim().length > 0) setCouponApplied(true);
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
              {couponApplied && (
                <div className="gc-coupon-done">
                  <CheckCircle2 size={15} /> Coupon <strong>{couponInput.toUpperCase()}</strong> applied — +₦1,000.00 bonus
                </div>
              )}
            </section>

            <section className="gc-payout">
              <div className="gc-payout-head">
                <i>
                  <Gift size={15} />
                </i>
                <strong>Payout Breakdown</strong>
              </div>
              <div className="gc-payout-body">
                <div className="gc-payout-left">
                  <span>Base Amount</span>
                  <strong>{naira(baseAmount)}</strong>
                  <span className="gc-payout-bonus-label">Bonus</span>
                  <em>+{naira(bonus)}</em>
                </div>
                <div className="gc-payout-divider" />
                <div className="gc-payout-right">
                  <span>Final Payout</span>
                  <strong>{naira(finalPayout)}</strong>
                </div>
              </div>
            </section>

            <div className="gc-submit-row">
              <button className="gc-btn-outline" type="button" onClick={addToCart}>
                <ShoppingCart size={17} /> Add to Cart
              </button>
              <button className="gc-btn-primary" type="button" onClick={submitTrade}>
                <Send size={16} /> Submit Trade Now
              </button>
            </div>

            {guidelinesOpen && (
              <div className="gc-drawer-backdrop" onClick={() => setGuidelinesOpen(false)}>
                <div className="gc-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="gc-drawer-head">
                    <strong>Gift Card Selling Guidelines</strong>
                    <button type="button" onClick={() => setGuidelinesOpen(false)} aria-label="Close">
                      <X size={18} />
                    </button>
                  </div>
                  <ol className="gc-drawer-steps">
                    {GUIDELINE_STEPS.map((step, i) => (
                      <li key={i}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================ 3. LIVE COMPLETED TRADES ============================ */}
        {view === 'live' && (
          <div className="gc-screen" ref={liveRef} onScroll={onLiveScroll}>
            <header className="gc-top-header">
              <button className="gc-back" type="button" onClick={() => goView('trade')} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1>Live Completed Trades</h1>
                <p className="gc-sub">Real-time activity from our trusted users</p>
              </div>
            </header>

            <div className="gc-notice">
              <i>
                <ShieldCheck size={18} />
              </i>
              <span>
                <strong>All trades are verified and completed safely.</strong>
                <small>You can view real-time activity from our community.</small>
              </span>
            </div>

            <div className="gc-feed">
              {liveTrades.map((t) => (
                <article className="gc-feed-card" key={t.id}>
                  <div className="gc-feed-user">
                    <i className={`gc-avatar gc-avatar-lg gc-avatar-${t.color}`}>
                      <User size={26} />
                    </i>
                    <span>{t.masked}</span>
                  </div>
                  <div className="gc-feed-main">
                    <div className="gc-feed-title">
                      <BrandMark kind={t.brand} size="sm" />
                      <strong>{t.label}</strong>
                    </div>
                    <span className="gc-feed-id">ID: {maskId(t.id)}</span>
                    <span className="gc-feed-time">
                      <Clock3 size={13} /> {relativeMinutes(t.minutesAgo)}
                    </span>
                  </div>
                  <div className="gc-feed-right">
                    <strong>{naira(t.amount)}</strong>
                    <span className="gc-badge-completed">
                      <Check size={11} /> Completed
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ============================ 4. WALLET ============================ */}
        {view === 'wallet' && (
          <div className="gc-screen">
            <header className="gc-top-header gc-wallet-header">
              <h1>My Wallet</h1>
              <div className="gc-wallet-icons">
                <button type="button" className="gc-icon-btn" aria-label="Notifications">
                  <Bell size={19} />
                  <i className="gc-dot" />
                </button>
                <button type="button" className="gc-icon-btn" aria-label="Settings">
                  <Settings size={19} />
                </button>
              </div>
            </header>

            <section className="gc-balance-card">
              <div className="gc-balance-top">
                <i className="gc-balance-icon">
                  <WalletIcon size={16} />
                </i>
                <span>Total Available Balance</span>
                <button type="button" onClick={() => setBalanceHidden((h) => !h)} aria-label="Toggle balance">
                  {balanceHidden ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <strong className="gc-balance-amount">
                {balanceHidden ? '••••••••' : naira(balance)}
              </strong>
              <div className="gc-balance-divider" />
              <div className="gc-balance-foot">
                <span>
                  Pending / Escrow: <strong>{balanceHidden ? '••••••' : naira(pendingEscrow)}</strong>
                </span>
                <span className="gc-shield">
                  <i>
                    <ShieldCheck size={13} />
                  </i>
                  Shield Verified
                </span>
              </div>
            </section>

            <div className="gc-quick-row">
              <button type="button" onClick={() => goView('history')}>
                <i>
                  <Plus size={17} />
                </i>
                Fund Wallet
              </button>
              <button type="button">
                <i>
                  <ArrowLeft size={17} className="gc-rotate-down" />
                </i>
                Withdraw Cash
              </button>
              <button type="button">
                <i>
                  <ArrowLeftRight size={17} />
                </i>
                Transfer
              </button>
            </div>

            <p className="gc-section-label">DEFAULT PAYOUT DESTINATION</p>
            <div className="gc-dest-list">
              <button
                type="button"
                className={`gc-dest ${payoutDest === 'wallet' ? 'on' : ''}`}
                onClick={() => setPayoutDest('wallet')}
              >
                <i className="gc-dest-icon">
                  <WalletIcon size={19} />
                </i>
                <span>
                  <strong>Verxor In-App Wallet</strong>
                  <small>Instant Transfer • Zero Fees</small>
                </span>
                <i className={`gc-radio ${payoutDest === 'wallet' ? 'on' : ''}`} />
              </button>
              {savedBank && (
                <button
                  type="button"
                  className={`gc-dest ${payoutDest === 'bank' ? 'on' : ''}`}
                  onClick={() => setPayoutDest('bank')}
                >
                  <i className="gc-dest-icon">
                    <Landmark size={19} />
                  </i>
                  <span>
                    <strong>{savedBank.bank}</strong>
                    <small>•••• {savedBank.last4}</small>
                  </span>
                  <i className={`gc-radio ${payoutDest === 'bank' ? 'on' : ''}`} />
                </button>
              )}
              <button className="gc-add-bank" type="button" onClick={() => goView('add-bank')}>
                <Plus size={15} /> Add Personal Bank Account
              </button>
            </div>

            <div className="gc-panel-head gc-activity-head">
              <h3>Recent Activity</h3>
              <button className="gc-link" type="button" onClick={() => goView('history')}>
                View All <ChevronRight size={13} />
              </button>
            </div>
            <div className="gc-pills">
              {(['All', 'Deposits', 'Withdrawals', 'Trade Payouts'] as const).map((f) => (
                <button key={f} type="button" className={`gc-pill ${activityFilter === f ? 'on' : ''}`} onClick={() => setActivityFilter(f)}>
                  {f}
                </button>
              ))}
            </div>
            <div className="gc-activity">
              {filteredActivity.slice(0, 4).map((t) => (
                <article className="gc-activity-card" key={t.id}>
                  <i className={`gc-activity-icon ${t.kind === 'withdrawal' ? 'gc-activity-bank' : ''}`}>
                    {t.brand ? <BrandMark kind={t.brand} size="sm" /> : <Landmark size={18} />}
                  </i>
                  <div className="gc-activity-main">
                    <strong>{t.title}</strong>
                    <span>{t.dateLabel}</span>
                  </div>
                  <div className="gc-activity-right">
                    <strong className={t.amount >= 0 ? 'pos' : 'neg'}>
                      {t.amount >= 0 ? '+' : '−'}
                      {naira(t.amount)}
                    </strong>
                    <span className={`gc-status gc-status-${t.status.toLowerCase()}`}>{t.status === 'Successful' ? 'Successful' : t.status}</span>
                  </div>
                  <ChevronRight size={15} />
                </article>
              ))}
              {filteredActivity.length === 0 && <p className="gc-empty-inline">No activity in this category yet.</p>}
            </div>
          </div>
        )}

        {/* ============================ 5. ADD BANK ACCOUNT ============================ */}
        {view === 'add-bank' && (
          <div className="gc-screen">
            <header className="gc-top-header">
              <button className="gc-back" type="button" onClick={() => goView('wallet')} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <h1>Add Bank Account</h1>
            </header>

            <div className="gc-warning">
              <i>
                <ShieldCheck size={20} />
              </i>
              <span>
                <strong>Please use a traditional commercial bank</strong>
                (GTBank, Zenith, Access) or supported microfinance bank. Ensure the bank account name matches your registered account.
              </span>
            </div>

            <section className="gc-card gc-bank-form">
              <label className="gc-field">
                <span>Bank Name</span>
                <div className="gc-input-wrap">
                  <Landmark size={17} />
                  <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
                    <option value="">Select Bank</option>
                    {BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>

              <label className="gc-field">
                <span>Account Number</span>
                <div className="gc-input-wrap">
                  <CreditCard size={17} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </label>

              <label className="gc-field">
                <span>Account Holder Name</span>
                <div className="gc-input-wrap">
                  <User size={17} />
                  <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                  {accountNumber.length === 10 && (
                    <i className="gc-verified">
                      <Check size={13} />
                    </i>
                  )}
                </div>
              </label>
              {accountNumber.length === 10 && (
                <p className="gc-verified-note">
                  <Check size={13} /> Account verified automatically
                </p>
              )}
            </section>

            <section className="gc-card gc-default-row">
              <i>
                <ShieldCheck size={19} />
              </i>
              <span>
                <strong>Set as default payout account</strong>
                <small>This will be used for all future withdrawals.</small>
              </span>
              <button
                type="button"
                className={`gc-switch ${defaultToggle ? 'on' : ''}`}
                onClick={() => setDefaultToggle((v) => !v)}
                aria-label="Toggle default payout"
              >
                <i />
              </button>
            </section>

            <button className="gc-btn-primary gc-save-btn" type="button" onClick={saveBank}>
              Save Bank Account <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ============================ 6. HISTORY ============================ */}
        {view === 'history' && (
          <div className="gc-screen">
            <header className="gc-top-header">
              <button className="gc-back" type="button" onClick={onBack} aria-label="Back">
                <ArrowLeft size={18} />
              </button>
              <h1>History</h1>
            </header>

            <div className="gc-history-tabs">
              {(['All', 'Pending', 'Success', 'Rejected'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={historyFilter === f ? 'on' : ''}
                  onClick={() => setHistoryFilter(f)}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {filteredTxs.length === 0 ? (
              <div className="gc-empty">
                <div className="gc-empty-art">
                  <ClipboardList size={72} />
                  <i className="gc-empty-check">
                    <Check size={26} />
                  </i>
                </div>
                <h2>Start your first trade</h2>
                <p>Sell a gift card today and get your first-trade bonus.</p>
                <button className="gc-btn-primary" type="button" onClick={() => openSell()}>
                  <Tag size={17} /> Sell Gift Card <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="gc-history-list">
                {filteredTxs.map((t) => (
                  <article className="gc-history-card" key={t.id}>
                    <i className={`gc-history-icon ${t.kind === 'withdrawal' ? 'gc-activity-bank' : ''}`}>
                      {t.brand ? <BrandMark kind={t.brand} size="sm" /> : <Landmark size={18} />}
                    </i>
                    <div className="gc-history-main">
                      <strong>{t.title}</strong>
                      <span>{t.dateLabel}</span>
                    </div>
                    <div className="gc-history-right">
                      <strong className={t.amount >= 0 ? 'pos' : 'neg'}>
                        {t.amount >= 0 ? '+' : '−'}
                        {naira(t.amount)}
                      </strong>
                      <span className={`gc-status gc-status-${t.status.toLowerCase()}`}>{t.status}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================ BOTTOM NAV ============================ */}
        <nav className="gc-bottom-nav" aria-label="Gift card navigation">
          <button type="button" className={activeTab === 'trade' ? 'active' : ''} onClick={() => goView('trade')}>
            <Tag size={20} />
            <span>Trade</span>
          </button>
          <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => goView('history')}>
            <Clock3 size={20} />
            <span>History</span>
          </button>
          <button type="button" className={activeTab === 'wallet' ? 'active' : ''} onClick={() => goView('wallet')}>
            <WalletIcon size={20} />
            <span>Wallet</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
