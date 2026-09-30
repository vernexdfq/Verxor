'use client';

import { useMemo, useRef, useState } from 'react';
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
  return \`₦\${Math.abs(value).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
}

function brand(id: BrandId) {
  return BRANDS.find((item) => item.id === id) ?? BRANDS[0];
}

function BrandLogo({ id, large = false }: { id: BrandId; large?: boolean }) {
  const common = large ? 'gc-logo gc-logo-lg' : 'gc-logo';
  if (id === 'apple') return <span className={\`\${common} gc-logo-dark\`}><svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M16.7 12.9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.1 2.5 2 1 0 1.4-.6 2.6-.6s1.6.6 2.6.6c1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.9-2.2-3.1zM14.8 6.9c.5-.7.9-1.6.8-2.6-.8 0-1.8.6-2.3 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.4 2.3-1.1z"/></svg></span>;
  if (id === 'google') return <span className={\`\${common} gc-logo-google\`}><svg viewBox="0 0 32 32" aria-hidden><path d="M6 4v24l13-12z" fill="#4285F4"/><path d="M6 4l13 12 4-3.7L9.3 5.2A2 2 0 0 0 6 4z" fill="#34A853"/><path d="M19 16l4 3.7-3.4 2L6 28z" fill="#FBBC04"/><path d="M23 12.3L29 16l-6 3.7L19 16z" fill="#EA4335"/></svg></span>;
  if (id === 'steam') return <span className={\`\${common} gc-logo-steam\`}><svg viewBox="0 0 32 32" fill="none" aria-hidden><circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.4"/><circle cx="20.2" cy="11.7" r="3.5" stroke="currentColor" strokeWidth="2"/><circle cx="10.2" cy="21.3" r="2.8" stroke="currentColor" strokeWidth="2"/><path d="M12.4 19.5l5.1-5.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg></span>;
  if (id === 'xbox') return <span className={\`\${common} gc-logo-xbox\`}><svg viewBox="0 0 32 32" fill="none" aria-hidden><path d="M9 10c4 2.5 7 6.4 7 6.4S19 12.5 23 10" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/><path d="M8.5 24c1.5-5 4.5-8.7 7.5-11.2C19 15.3 22 19 23.5 24" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round"/></svg></span>;
  if (id === 'razer') return <span className={\`\${common} gc-logo-razer\`}><b>RAZER</b><small>GOLD</small></span>;
  if (id === 'sephora') return <span className={\`\${common} gc-logo-dark\`}><b>SEPHORA</b></span>;
  if (id === 'playstation') return <span className={\`\${common} gc-logo-ps\`}><b>PS</b></span>;
  return <span className={\`\${common} gc-logo-amazon\`}><b>amazon</b><i /></span>;
}

function PageHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
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
        <div className="gc-promo-track" style={{ transform: \`translateX(-\${slide * 100}%)\` }}>
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
        <div className="gc-promo-dots">{[0,1,2,3].map((i) => <button key={i} className={slide === i ? 'active' : ''} onClick={() => setSlide(i)} type="button" aria-label={\`Slide \${i + 1}\`} />)}</div>
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

function SellPage({ brandId, setBrandId, go, cartCount, addToCart, submit }: {
  brandId: BrandId;
  setBrandId: (id: BrandId) => void;
  go: (view: View) => void;
  cartCount: number;
  addToCart: (count: number) => void;
  submit: (amount: number, brandId: BrandId) => void;
}) {
  const [type, setType] = useState<'physical' | 'egift'>('physical');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [entries, setEntries] = useState<Entry[]>([{ id: 1, face: 100, quantity: 1, code: '', photos: [] }]);
  const [guidelines, setGuidelines] = useState(false);
  const [coupon, setCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const nextId = useRef(2);
  const selected = brand(brandId);
  const rate = selected.rate;
  const base = entries.reduce((sum, item) => sum + item.face * item.quantity * rate, 0);
  const bonus = couponApplied ? 1000 : 0;
  const total = base + bonus;

  const patch = (id: number, changes: Partial<Entry>) => setEntries((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));

  const addPhoto = (id: number, file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const item = entries.find((entry) => entry.id === id);
    if (!item || item.photos.length >= 5) return;
    patch(id, { photos: [...item.photos, url] });
  };

  return (
    <div className="gc-screen gc-form-screen">
      <PageHeader title="Sell Gift Card" onBack={() => go('trade')} right={<button className="gc-guidelines-link" type="button" onClick={() => setGuidelines(true)}><ClipboardCheck size={18} /><span>Guidelines</span></button>} />

      <button className="gc-guideline-banner" type="button" onClick={() => setGuidelines(true)}>
        <span className="gc-guideline-icon"><ClipboardCheck size={20} /></span><span><b>Gift Card Selling Guidelines</b><small>How to sell your gift cards safely and get the best rates.</small></span><ChevronDown size={20} />
      </button>

      <section className="gc-sell-brand">
        <button type="button" className="gc-sell-brand-main" onClick={() => setBrandId(brandId === 'google' ? 'apple' : 'google')}>
          <BrandLogo id={brandId} large />
          <span><b>{selected.name} Gift Card</b><small>Entertainment • Games • Apps</small></span>
          <ChevronRight size={21} />
        </button>
        <div className="gc-type-toggle">
          <button className={type === 'physical' ? 'active' : ''} type="button" onClick={() => setType('physical')}><CreditCard size={18} />Physical Card</button>
          <button className={type === 'egift' ? 'active' : ''} type="button" onClick={() => setType('egift')}><Send size={18} />E-Gift Card</button>
        </div>
      </section>

      <button className="gc-rate-card" type="button">
        <span className="gc-rate-icon"><Zap size={21} /></span>
        <span><b>Live Rate</b><small>Get the best rates for your {selected.name} cards</small></span>
        <span className="gc-rate-value"><small>Current Rate</small><strong>$100 – $500 = {money(rate)}/$</strong></span>
        <ChevronRight size={20} />
      </button>

      {entries.map((entry, index) => (
        <section className="gc-entry-card" key={entry.id}>
          <div className="gc-entry-title"><span>{index + 1}</span><b>Card {index + 1}</b>{entries.length > 1 && <button type="button" onClick={() => setEntries((items) => items.filter((item) => item.id !== entry.id))}><Trash2 size={17} /></button>}</div>
          <div className="gc-two-fields">
            <label><span>Face Value ({currency})</span><div><input inputMode="decimal" value={entry.face || ''} onChange={(e) => patch(entry.id, { face: Number(e.target.value) || 0 })} /><b>$</b></div></label>
            <label><span>Quantity</span><div className="gc-quantity"><button type="button" onClick={() => patch(entry.id, { quantity: Math.max(1, entry.quantity - 1) })}><Minus size={15} /></button><b>{entry.quantity}</b><button type="button" onClick={() => patch(entry.id, { quantity: entry.quantity + 1 })}><Plus size={15} /></button></div></label>
          </div>
          <label className="gc-code-field"><CreditCard size={18} /><input placeholder={type === 'physical' ? 'Enter Card Code / PIN (Optional)' : 'Enter E-Gift Card Code / PIN'} value={entry.code} onChange={(e) => patch(entry.id, { code: e.target.value })} /></label>
          <div className="gc-upload-title"><Camera size={17} /><b>Upload Card Photos <small>(Up to 5)</small></b></div>
          <div className="gc-upload-grid">
            {Array.from({ length: 5 }).map((_, slot) => {
              const photo = entry.photos[slot];
              return <label className="gc-upload-slot" key={slot}>{photo ? <img src={photo} alt="" /> : <><Camera size={19} /><span>+</span></>}<input type="file" accept="image/*" onChange={(e) => addPhoto(entry.id, e.target.files?.[0])} /></label>;
            })}
          </div>
        </section>
      ))}

      <button className="gc-add-card" type="button" onClick={() => setEntries((items) => [...items, { id: nextId.current++, face: 0, quantity: 1, code: '', photos: [] }])}><Plus size={19} />Add Another Card</button>

      <button className={couponApplied ? 'gc-coupon-row applied' : 'gc-coupon-row'} type="button" onClick={() => setCoupon(true)}>
        <span className="gc-coupon-icon"><Gift size={20} /></span><span><b>{couponApplied ? 'Bonus Coupon Applied' : 'Apply Bonus Coupon'}</b><small>{couponApplied ? '+₦1,000 bonus added to payout' : 'Use a valid coupon to get extra bonus on your trade'}</small></span><ChevronRight size={19} />
      </button>

      <section className="gc-payout">
        <div className="gc-payout-head"><span className="gc-payout-icon"><Gift size={17} /></span><b>Payout Breakdown</b></div>
        <div className="gc-payout-body"><div><small>Base Amount</small><strong>{money(base)}</strong><small>Bonus</small><strong className="positive">+{money(bonus)}</strong></div><i /><div><small>Final Payout</small><strong className="gc-final">{money(total)}</strong></div></div>
      </section>

      <div className="gc-submit-bar">
        <button type="button" onClick={() => addToCart(entries.reduce((sum, item) => sum + item.quantity, 0))}><ShoppingCart size={18} />Add to Cart{cartCount > 0 && <span>{cartCount}</span>}</button>
        <button type="button" onClick={() => submit(Math.round(total), brandId)}><Send size={17} />Submit Trade Now</button>
      </div>

      {guidelines && <GuidelinesSheet close={() => setGuidelines(false)} />}
      {coupon && <CouponSheet close={() => setCoupon(false)} apply={() => { setCouponApplied(true); setCoupon(false); }} />}
    </div>
  );
}

function LivePage({ go }: { go: (view: View) => void }) {
  return (
    <div className="gc-screen">
      <PageHeader title="Live Completed Trades" onBack={() => go('trade')} />
      <div className="gc-live-intro"><ShieldCheck size={22} /><div><b>All trades are verified and completed safely.</b><span>You can view recent activity from our community.</span></div></div>
      <div className="gc-live-list">
        {LIVE_TRADES.map(([initial, masked, title, detail, amount, time], index) => (
          <article className="gc-live-full" key={masked}>
            <div className={\`gc-user-avatar avatar-\${index % 4}\`}><User size={25} /></div>
            <div className="gc-live-details"><b>{title}</b><strong>{detail}</strong><small>ID: 260930********{String(3090 + index * 221).slice(-4)}</small><span><Clock3 size={14} />{time}</span></div>
            <div className="gc-live-payout"><b>{money(amount)}</b><span><CheckCircle2 size={13} />Completed</span></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function WalletPage({ go, balanceHidden, setBalanceHidden, savedBank, setSavedBank, transactions }: {
  go: (view: View) => void;
  balanceHidden: boolean;
  setBalanceHidden: (hidden: boolean) => void;
  savedBank: { bank: string; last4: string; name: string } | null;
  setSavedBank: (bank: { bank: string; last4: string; name: string } | null) => void;
  transactions: Tx[];
}) {
  const [activity, setActivity] = useState<'All' | 'Deposits' | 'Withdrawals' | 'Trade Payouts'>('All');
  const activityItems = transactions.filter((tx) => activity === 'All' || (activity === 'Deposits' && tx.kind === 'deposit') || (activity === 'Withdrawals' && tx.kind === 'withdrawal') || (activity === 'Trade Payouts' && tx.kind === 'payout'));

  return (
    <div className="gc-screen">
      <header className="gc-wallet-header"><h1>My Wallet</h1><div><button type="button"><Bell size={22} /><i /></button><button type="button"><Settings size={22} /></button></div></header>
      <section className="gc-balance-card">
        <div className="gc-balance-top"><span><Wallet size={19} />Total Available Balance</span><button type="button" onClick={() => setBalanceHidden(!balanceHidden)}>{balanceHidden ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
        <strong>{balanceHidden ? '••••••••' : '₦250,000.00'}</strong>
        <div className="gc-balance-bottom"><span>Pending / Escrow: <b>₦15,000.00</b></span><em><ShieldCheck size={16} />Shield Verified</em></div>
      </section>

      <div className="gc-wallet-actions">
        <button type="button" onClick={() => alert('Fund Wallet is ready to connect to the Verxor funding flow.')}><span><Plus size={21} /></span>Fund Wallet</button>
        <button type="button"><span><ArrowLeft size={21} /></span>Withdraw Cash</button>
        <button type="button"><span><ArrowLeft size={21} /></span>Transfer</button>
      </div>

      <section className="gc-wallet-section"><label>DEFAULT PAYOUT DESTINATION</label>
        <button className={savedBank ? 'gc-payout-destination has-bank' : 'gc-payout-destination'} type="button" onClick={() => setSavedBank(savedBank)}>
          <span className="gc-destination-icon"><Wallet size={22} /></span><span><b>{savedBank ? savedBank.bank : 'Verxor In-App Wallet'}</b><small>{savedBank ? \`•••• \${savedBank.last4} • \${savedBank.name}\` : 'Instant Transfer • Zero Fees'}</small></span><span className="gc-radio active" />
        </button>
        <button className="gc-add-bank-link" type="button" onClick={() => go('add-bank')}><Plus size={17} />Add Personal Bank Account</button>
      </section>

      <section className="gc-wallet-section">
        <div className="gc-section-head"><h2>Recent Activity</h2><button type="button" onClick={() => go('history')}>View All <ChevronRight size={16} /></button></div>
        <div className="gc-filter-pills">{(['All', 'Deposits', 'Withdrawals', 'Trade Payouts'] as const).map((item) => <button key={item} className={activity === item ? 'active' : ''} type="button" onClick={() => setActivity(item)}>{item}</button>)}</div>
        <div className="gc-activity-list">
          {activityItems.length ? activityItems.slice(0, 4).map((tx) => <div className="gc-activity-card" key={tx.id}><span className="gc-activity-icon">{tx.brand ? <BrandLogo id={tx.brand} /> : <Landmark size={18} />}</span><div><b>{tx.title}</b><small>{tx.date}</small></div><strong className={tx.amount >= 0 ? 'positive' : 'negative'}>{tx.amount >= 0 ? '+' : '-'}{money(tx.amount)}</strong><ChevronRight size={18} /></div>) : <p className="gc-empty-inline">No activity in this filter.</p>}
        </div>
      </section>
      <BottomNav active="wallet" go={go} />
    </div>
  );
}

function AddBankPage({ go, savedBank, setSavedBank }: {
  go: (view: View) => void;
  savedBank: { bank: string; last4: string; name: string } | null;
  setSavedBank: (bank: { bank: string; last4: string; name: string } | null) => void;
}) {
  const [bankName, setBankName] = useState(savedBank?.bank ?? '');
  const [number, setNumber] = useState(savedBank?.last4 ? \`000000\${savedBank.last4}\` : '');
  const [name] = useState(savedBank?.name ?? 'Nathaniel Sanchez');
  const [isDefault, setIsDefault] = useState(true);

  const save = () => {
    if (number.length < 10) return;
    setSavedBank({ bank: bankName || 'GTBank', last4: number.slice(-4), name });
    go('wallet');
  };

  return (
    <div className="gc-screen gc-add-bank-screen">
      <PageHeader title="Add Bank Account" onBack={() => go('wallet')} />
      <div className="gc-warning"><span><Zap size={22} /></span><p><b>Please use a traditional commercial bank</b><strong>(GTBank, Zenith, Access) or supported microfinance bank.</strong><small>Ensure the bank account name matches your registered account.</small></p></div>
      <section className="gc-bank-form">
        <label><b>Bank Name</b><button type="button"><Landmark size={20} /><span>{bankName || 'Select Bank'}</span><ChevronDown size={19} /></button></label>
        <div className="gc-bank-options">{BANKS.map((bankNameItem) => <button type="button" key={bankNameItem} onClick={() => setBankName(bankNameItem)}>{bankNameItem}<Check size={16} /></button>)}</div>
        <label><b>Account Number</b><div className="gc-input-wrap"><CreditCard size={20} /><input inputMode="numeric" maxLength={10} placeholder="0123456789" value={number} onChange={(e) => setNumber(e.target.value.replace(/\\D/g, ''))} /></div></label>
        <label><b>Account Holder Name</b><div className="gc-input-wrap"><User size={20} /><input value={name} readOnly /><CheckCircle2 size={21} className="verified" /></div><small className="gc-verified-note"><CheckCircle2 size={15} />Account verified automatically</small></label>
      </section>
      <div className="gc-default-bank"><span><ShieldCheck size={21} /></span><div><b>Set as default payout account</b><small>This will be used for future withdrawals.</small></div><button type="button" className={isDefault ? 'on' : ''} onClick={() => setIsDefault(!isDefault)}><i /></button></div>
      <button className="gc-save-bank" type="button" onClick={save}>Save Bank Account <ArrowRight size={18} /></button>
    </div>
  );
}

function HistoryPage({ go, transactions }: { go: (view: View) => void; transactions: Tx[] }) {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Success' | 'Rejected'>('All');
  const items = transactions.filter((tx) => filter === 'All' || (filter === 'Pending' && tx.status === 'Pending') || (filter === 'Success' && tx.status === 'Successful') || (filter === 'Rejected' && tx.status === 'Rejected'));

  return (
    <div className="gc-screen gc-history-screen">
      <PageHeader title="History" onBack={() => go('trade')} />
      <div className="gc-history-tabs">{(['All', 'Pending', 'Success', 'Rejected'] as const).map((item) => <button className={filter === item ? 'active' : ''} key={item} type="button" onClick={() => setFilter(item)}>{item.toUpperCase()}</button>)}</div>
      {items.length ? <div className="gc-history-list">{items.map((tx) => <article className="gc-history-card" key={tx.id}><span>{tx.brand ? <BrandLogo id={tx.brand} /> : <Landmark size={19} />}</span><div><b>{tx.title}</b><small>{tx.date}</small></div><div><strong className={tx.amount >= 0 ? 'positive' : 'negative'}>{tx.amount >= 0 ? '+' : '-'}{money(tx.amount)}</strong><em className={\`status-\${tx.status.toLowerCase()}\`}>{tx.status}</em></div><ChevronRight size={18} /></article>)}</div> : <div className="gc-empty"><div className="gc-empty-art"><ClipboardCheck size={100} strokeWidth={1.4} /><span><Check size={25} /></span></div><h2>Start your first trade</h2><p>Sell a gift card today and get your first-trade bonus.</p><button type="button" onClick={() => go('sell')}><Tag size={18} />Sell Gift Card <ArrowRight size={18} /></button></div>}
      <BottomNav active="history" go={go} />
    </div>
  );
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [view, setView] = useState<View>('trade');
  const [currency, setCurrency] = useState<'ALL' | Currency>('ALL');
  const [sellBrandId, setSellBrandId] = useState<BrandId>('google');
  const [cartCount, setCartCount] = useState(0);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [transactions, setTransactions] = useState<Tx[]>(DEMO_TX);
  const [savedBank, setSavedBank] = useState<{ bank: string; last4: string; name: string } | null>(null);

  const go = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSell = (id?: BrandId) => {
    if (id) setSellBrandId(id);
    go('sell');
  };

  const addToCart = (count: number) => setCartCount((value) => value + count);

  const submitTrade = (amount: number, id: BrandId) => {
    setTransactions((items) => [
      {
        id: Date.now(),
        title: \`\${brand(id).name} Gift Card Trade\`,
        brand: id,
        amount,
        status: 'Pending',
        kind: 'payout',
        date: 'Just now',
      },
      ...items,
    ]);
    setCartCount(0);
    go('history');
  };

  const activeTab = view === 'wallet' || view === 'add-bank' ? 'wallet' : view === 'history' ? 'history' : 'trade';

  return (
    <div className="gc-root">
      <div className="gc-shell">
        {view === 'trade' && <TradeHome openSell={openSell} go={go} currency={currency} setCurrency={setCurrency} cartCount={cartCount} onBack={() => onBack?.()} />}
        {view === 'sell' && <SellPage brandId={sellBrandId} setBrandId={setSellBrandId} go={go} cartCount={cartCount} addToCart={addToCart} submit={submitTrade} />}
        {view === 'live' && <LivePage go={go} />}
        {view === 'wallet' && <WalletPage go={go} balanceHidden={balanceHidden} setBalanceHidden={setBalanceHidden} savedBank={savedBank} setSavedBank={setSavedBank} transactions={transactions} />}
        {view === 'add-bank' && <AddBankPage go={go} savedBank={savedBank} setSavedBank={setSavedBank} />}
        {view === 'history' && <HistoryPage go={go} transactions={transactions} />}
        {view !== 'sell' && view !== 'live' && view !== 'add-bank' && <BottomNav active={activeTab} go={go} />}
      </div>
    </div>
  );
}
