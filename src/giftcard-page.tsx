'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Wallet,
  Plus,
  BarChart3,
  Users,
  Zap,
  ChevronRight,
  X,
  Upload,
  Copy,
  Check,
  Clock,
  Building2,
  ShieldCheck,
  Share2,
  MessageCircle,
  LayoutGrid,
  Landmark,
} from 'lucide-react';
import './giftcard-page.css';

type TabId = 'trade' | 'activity' | 'wallet';
type CurrencyFilter = 'ALL' | 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD';
type ActivityFilter = 'All' | 'Gift Cards' | 'Deposits' | 'Withdrawals';
type TradeStatus = 'pending' | 'completed' | 'declined' | 'successful';
type CardType = 'physical' | 'ecode';
type BrandId =
  | 'google-play'
  | 'amazon'
  | 'itunes'
  | 'steam'
  | 'sephora'
  | 'nordstrom'
  | 'razer'
  | 'xbox'
  | 'nike'
  | 'ebay';

type GiftCard = { id: BrandId; name: string; rate: number; currencies: CurrencyFilter[] };

type BankAccount = { id: string; bank: string; account: string; name: string; isDefault?: boolean };

type ActivityItem = {
  id: string;
  type: 'giftcard' | 'deposit' | 'withdrawal';
  title: string;
  subtitle: string;
  amount: number;
  status: TradeStatus;
  date: string;
};

function BrandLogo({ id, size = 36 }: { id: BrandId; size?: number }) {
  const s = size;
  switch (id) {
    case 'google-play':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <path d="M8.5 4.2c-.9.5-1.5 1.5-1.5 2.6v34.4c0 1.1.6 2.1 1.5 2.6l19.8-19.8L8.5 4.2z" fill="#00A0FF" />
          <path d="M28.3 24l-5.2 5.2 9.1 5.2c.9.5 2 .5 2.9 0l6.1-3.5L28.3 24z" fill="#FFCE00" />
          <path d="M41.2 16.9l-6.1-3.5-9.1 5.2 5.2 5.2 13.1-7.5c-.3-.8-1-1.4-1.8-1.8-.5-.3-1-.4-1.3-.4z" fill="#FF3A44" />
          <path d="M23.1 18.8L8.5 4.2l19.8 19.8 5.2-5.2-10.4-6z" fill="#00F076" />
          <path d="M8.5 43.8c.5.3 1 .4 1.5.4.6 0 1.1-.1 1.6-.4l17.7-10.2-5.2-5.2L8.5 43.8z" fill="#FFCE00" />
        </svg>
      );
    case 'amazon':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#232F3E" />
          <text x="9" y="29" fontFamily="Arial,Helvetica,sans-serif" fontWeight="700" fontSize="22" fill="#fff">a</text>
          <path d="M13 33.5c6.5 4 17 5 25 0" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M34.5 30.5l4 3.5-1.5-4.8" stroke="#FF9900" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'itunes':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" aria-hidden>
          <defs>
            <linearGradient id="itunesG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FA2D48" />
              <stop offset="50%" stopColor="#C800DE" />
              <stop offset="100%" stopColor="#7B2BFF" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="11" fill="url(#itunesG)" />
          <path d="M31.2 12.8c-1.1 1.3-2.9 2.2-4.6 2.1.1-1.8.8-3.5 1.9-4.7 1.2-1.3 3-2.2 4.7-2.2.1 1.9-.7 3.6-2 4.8z" fill="#fff" />
          <path d="M24.1 16.2c-1.5 0-2.9.7-3.9 1.1-1-.4-2.2-1.2-3.7-1.2-2.9.1-5.6 2.4-5.6 6.9 0 5.4 4.5 11.8 6.6 11.8 1.3 0 2.2-.9 3.8-.9 1.6 0 2.4.9 3.9.9 2.1 0 5.1-5.2 5.1-9.5 0-.1-3.5-1.4-3.5-5.4 0-3.4 2.7-4.9 2.8-5-.1 0-3.1-2.7-5.5-2.7z" fill="#fff" />
        </svg>
      );
    case 'steam':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#1B2838" />
          <circle cx="31.5" cy="16.5" r="8" stroke="#c7d5e0" strokeWidth="2.6" fill="none" />
          <circle cx="31.5" cy="16.5" r="3.4" fill="#66C0F4" />
          <path d="M10 31.5l9.5-4.8 4 7.5-9.5 4.8c-2.8 1.4-6.2.2-7.5-2.6-1.3-2.7.1-5.9 2.9-7.1z" fill="#c7d5e0" />
          <circle cx="12.5" cy="33.8" r="2.6" fill="#1B2838" />
          <path d="M19.5 26.7l7.5-4.2" stroke="#c7d5e0" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    case 'sephora':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#000" />
          <path d="M24 8c-4 5-7 10.5-7 16.5S20 35 24 40c4-5 7-10 7-15.5S28 13 24 8z" fill="#fff" />
        </svg>
      );
    case 'nordstrom':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#000" />
          <text x="24" y="33" textAnchor="middle" fontFamily="Georgia,'Times New Roman',serif" fontWeight="700" fontSize="26" fill="#fff">N</text>
        </svg>
      );
    case 'razer':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#111" />
          <path d="M8 31c5.5-11 11-18.5 16-22.5C29 12.5 34.5 20 40 31c-5.5-2.8-11-4.5-16-4.5S13.5 28.2 8 31z" fill="#44D62C" />
          <path d="M16.5 33c2.8-1.3 5.5-2 7.5-2s4.7.7 7.5 2" stroke="#44D62C" strokeWidth="1.8" fill="none" />
        </svg>
      );
    case 'xbox':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="#107C10" />
          <path d="M12.5 14.5c2.8-4 6.8-6.5 11.5-6.5s8.7 2.5 11.5 6.5c-3.8 5.5-7.5 15-11.5 22.5-4-7.5-7.7-17-11.5-22.5z" fill="#fff" />
          <path d="M8.5 29c5 7.5 10.8 13 15.5 15 4.7-2 10.5-7.5 15.5-15-5.8 2.8-10.5 4.2-15.5 4.2S14.3 31.8 8.5 29z" fill="#fff" opacity=".92" />
        </svg>
      );
    case 'nike':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#111" />
          <path d="M6 29.5c11 1.6 24-3.2 35-13-1.3 1.3-2.7 2.6-3.5 3.2C26 30 15.5 35.5 6 32.5v-3z" fill="#fff" />
        </svg>
      );
    case 'ebay':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden>
          <rect width="48" height="48" rx="10" fill="#F8FAFC" stroke="#E2E8F0" />
          <text x="3.5" y="31" fontFamily="Arial Black,Arial,sans-serif" fontWeight="900" fontSize="15">
            <tspan fill="#E53238">e</tspan>
            <tspan fill="#0064D2">b</tspan>
            <tspan fill="#F5AF02">a</tspan>
            <tspan fill="#86B817">y</tspan>
          </text>
        </svg>
      );
    default:
      return null;
  }
}

const GIFT_CARDS: GiftCard[] = [
  { id: 'google-play', name: 'Google Play', rate: 1250, currencies: ['USD', 'CAD', 'EUR', 'GBP'] },
  { id: 'amazon', name: 'Amazon', rate: 1250, currencies: ['USD', 'CAD', 'GBP'] },
  { id: 'itunes', name: 'iTunes', rate: 1180, currencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD'] },
  { id: 'steam', name: 'Steam', rate: 1100, currencies: ['USD', 'EUR', 'GBP'] },
  { id: 'sephora', name: 'Sephora', rate: 1200, currencies: ['USD', 'CAD'] },
  { id: 'nordstrom', name: 'Nordstrom', rate: 1150, currencies: ['USD'] },
  { id: 'razer', name: 'Razer Gold', rate: 1160, currencies: ['USD'] },
  { id: 'xbox', name: 'Xbox', rate: 1280, currencies: ['USD', 'EUR'] },
  { id: 'nike', name: 'Nike', rate: 1090, currencies: ['USD'] },
  { id: 'ebay', name: 'eBay', rate: 1050, currencies: ['USD', 'GBP'] },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'giftcard', title: 'Amazon USD $100', subtitle: 'E-code • 2 cards', amount: 125000, status: 'completed', date: 'Today, 09:14' },
  { id: 'a2', type: 'giftcard', title: 'iTunes USD $50', subtitle: 'Physical card', amount: 59000, status: 'pending', date: 'Today, 08:02' },
  { id: 'a3', type: 'withdrawal', title: 'Withdrawal to GTBank', subtitle: '012****789', amount: 50000, status: 'successful', date: 'Yesterday, 16:40' },
  { id: 'a4', type: 'deposit', title: 'Wallet Deposit', subtitle: 'Paystack • ****4242', amount: 200000, status: 'successful', date: 'Yesterday, 11:20' },
  { id: 'a5', type: 'giftcard', title: 'Steam EUR €65', subtitle: 'E-code', amount: 149531, status: 'completed', date: '2 days ago' },
  { id: 'a6', type: 'giftcard', title: 'Google Play $200', subtitle: 'E-code', amount: 250000, status: 'declined', date: '3 days ago' },
];

const NIGERIAN_BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Kuda', 'Moniepoint', 'OPay', 'PalmPay', 'Sterling Bank', 'Fidelity Bank', 'Union Bank'];
const CURRENCIES: CurrencyFilter[] = ['ALL', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'];

const money = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);

const statusClass = (s: string) => {
  if (s === 'completed' || s === 'successful') return 'gc-badge-success';
  if (s === 'pending') return 'gc-badge-pending';
  return 'gc-badge-declined';
};

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<TabId>('trade');
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<CurrencyFilter>('ALL');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');
  const [savedBanks, setSavedBanks] = useState<BankAccount[]>([]);
  const [tradeCard, setTradeCard] = useState<GiftCard | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardType, setCardType] = useState<CardType>('ecode');
  const [faceValue, setFaceValue] = useState('');
  const [eCode, setECode] = useState('');
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newBank, setNewBank] = useState('GTBank');
  const [newAccount, setNewAccount] = useState('');
  const [newName, setNewName] = useState('');
  const [resolving, setResolving] = useState(false);
  const balance = 450000;
  const referralEarnings = 12500;

  const filteredCards = useMemo(() => {
    if (currency === 'ALL') return GIFT_CARDS;
    return GIFT_CARDS.filter((c) => c.currencies.includes(currency));
  }, [currency]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'All') return MOCK_ACTIVITY;
    if (activityFilter === 'Gift Cards') return MOCK_ACTIVITY.filter((a) => a.type === 'giftcard');
    if (activityFilter === 'Deposits') return MOCK_ACTIVITY.filter((a) => a.type === 'deposit');
    return MOCK_ACTIVITY.filter((a) => a.type === 'withdrawal');
  }, [activityFilter]);

  const livePayout = useMemo(() => {
    if (!tradeCard || !faceValue) return 0;
    const val = parseFloat(faceValue);
    if (isNaN(val) || val <= 0) return 0;
    return Math.round(val * tradeCard.rate);
  }, [tradeCard, faceValue]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard?.writeText('https://verxor.com/ref/DESTINY2026').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSubmitTrade = () => {
    if (!faceValue || parseFloat(faceValue) <= 0) return;
    setTradeSubmitting(true);
    setTimeout(() => {
      setTradeSubmitting(false);
      setTradeSuccess(true);
    }, 1200);
  };

  const handleConfirmWithdraw = () => {
    setShowPin(false);
    setWithdrawSuccess(true);
  };

  const handlePinChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...pin];
    next[idx] = val.slice(-1);
    setPin(next);
    if (val && idx < 3) pinRefs.current[idx + 1]?.focus();
  };

  const closeTradeModal = () => {
    setTradeCard(null);
    setFaceValue('');
    setECode('');
    setCardType('ecode');
    setTradeSuccess(false);
  };

  const resolveAccountName = () => {
    if (newAccount.length !== 10) return;
    setResolving(true);
    setTimeout(() => {
      setNewName('Nathaniel S.');
      setResolving(false);
    }, 800);
  };

  const saveBank = () => {
    if (!newBank || newAccount.length !== 10 || !newName) return;
    const entry: BankAccount = {
      id: `b${Date.now()}`,
      bank: newBank,
      account: `${newAccount.slice(0, 3)}****${newAccount.slice(-3)}`,
      name: newName,
      isDefault: savedBanks.length === 0,
    };
    setSavedBanks((prev) => [...prev, entry]);
    if (!selectedBank) setSelectedBank(entry.id);
    setShowAddBank(false);
    setNewAccount('');
    setNewName('');
  };

  const openWithdraw = () => {
    setShowWithdraw(true);
    setWithdrawSuccess(false);
    setShowPin(false);
    setPin(['', '', '', '']);
    setWithdrawAmount('');
    if (savedBanks.length && !selectedBank) setSelectedBank(savedBanks[0].id);
  };

  return (
    <div className="gc-shell">
      <div className="gc-scroll">
        {tab === 'trade' && (
          <div className="gc-page">
            <div className="gc-header">
              {onBack && (
                <button type="button" className="gc-back" onClick={onBack} aria-label="Back">
                  <ArrowLeft size={20} strokeWidth={2} />
                </button>
              )}
              <div>
                <p className="gc-welcome">Welcome to your</p>
                <h1 className="gc-title">Gift Card Page</h1>
              </div>
            </div>
            <div className="gc-wallet-card">
              <div className="gc-wallet-top">
                <div>
                  <div className="gc-balance-label">
                    Available Balance
                    <button type="button" className="gc-eye-btn" onClick={() => setShowBalance((v) => !v)} aria-label={showBalance ? 'Hide balance' : 'Show balance'}>
                      {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                  </div>
                  <div className="gc-balance-value">{showBalance ? money(balance) : '₦***,***.**'}</div>
                </div>
                <button type="button" className="gc-withdraw-btn" onClick={openWithdraw}>
                  <Wallet size={15} /> Withdraw <ChevronRight size={14} />
                </button>
              </div>
              <div className="gc-wallet-actions">
                <button type="button" className="gc-wallet-action" onClick={() => setShowDeposit(true)}>
                  <span className="gc-action-icon"><Plus size={16} /></span>
                  <div><strong>Deposit</strong><span>Add funds to your wallet</span></div>
                  <ChevronRight size={15} className="gc-action-chevron" />
                </button>
                <div className="gc-wallet-divider" />
                <button type="button" className="gc-wallet-action" onClick={() => setTab('activity')}>
                  <span className="gc-action-icon"><BarChart3 size={16} /></span>
                  <div><strong>Trade Stats</strong><span>View your activity</span></div>
                  <ChevronRight size={15} className="gc-action-chevron" />
                </button>
              </div>
            </div>
            <button type="button" className="gc-referral-banner" onClick={() => setShowReferral(true)}>
              <div className="gc-referral-content">
                <div className="gc-referral-icon"><Users size={18} /></div>
                <div>
                  <h3>Earn 10% + ₦1,000</h3>
                  <p>on deposits and gift card trades!</p>
                </div>
              </div>
              <div className="gc-referral-cta">Invite & Earn <ChevronRight size={13} /></div>
              <div className="gc-referral-art" aria-hidden>
                <svg width="96" height="88" viewBox="0 0 96 88" fill="none">
                  <ellipse cx="62" cy="78" rx="28" ry="6" fill="#1D4ED8" opacity=".25" />
                  <rect x="36" y="38" width="48" height="36" rx="6" fill="#60A5FA" />
                  <rect x="36" y="38" width="48" height="10" rx="3" fill="#3B82F6" />
                  <path d="M60 38v36" stroke="#93C5FD" strokeWidth="3" />
                  <path d="M48 28c0-6 5-10 12-10s12 4 12 10v10H48V28z" fill="#93C5FD" />
                  <rect x="54" y="22" width="12" height="8" rx="2" fill="#BFDBFE" />
                  <circle cx="28" cy="58" r="14" fill="#2563EB" />
                  <path d="M28 50v16M20 58h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M72 20l4 8 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1 4-8z" fill="#93C5FD" opacity=".9" />
                </svg>
              </div>
            </button>
            <div className="gc-section-head">
              <h2>Sell Gift Cards</h2>
              <span className="gc-live-tag"><Zap size={11} /> Best Rates Live</span>
            </div>
            <div className="gc-currency-row">
              {CURRENCIES.map((c) => (
                <button key={c} type="button" className={`gc-currency-pill ${currency === c ? 'active' : ''}`} onClick={() => setCurrency(c)}>{c}</button>
              ))}
            </div>
            <div className="gc-card-grid">
              {filteredCards.map((card) => (
                <button key={card.id} type="button" className="gc-brand-card" onClick={() => { setTradeCard(card); setTradeSuccess(false); }}>
                  <div className="gc-brand-logo"><BrandLogo id={card.id} size={40} /></div>
                  <div className="gc-brand-info">
                    <strong>{card.name}</strong>
                    <span className="gc-rate-badge">Up to ₦{card.rate.toLocaleString()}/$</span>
                  </div>
                  <ChevronRight size={15} className="gc-brand-arrow" />
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === 'activity' && (
          <div className="gc-page">
            <div className="gc-header"><div><p className="gc-welcome">History</p><h1 className="gc-title">Trade & Wallet Activity</h1></div></div>
            <div className="gc-filter-row">
              {(['All', 'Gift Cards', 'Deposits', 'Withdrawals'] as ActivityFilter[]).map((f) => (
                <button key={f} type="button" className={`gc-filter-pill ${activityFilter === f ? 'active' : ''}`} onClick={() => setActivityFilter(f)}>{f}</button>
              ))}
            </div>
            <div className="gc-activity-list">
              {filteredActivity.map((item) => (
                <div key={item.id} className="gc-activity-item">
                  <div className="gc-activity-left">
                    <div className={`gc-activity-icon ${item.type}`}>
                      {item.type === 'giftcard' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 12h18M12 8v12" stroke="currentColor" strokeWidth="1.8" /></svg>}
                      {item.type === 'deposit' && <Plus size={16} />}
                      {item.type === 'withdrawal' && <Wallet size={16} />}
                    </div>
                    <div><strong>{item.title}</strong><span>{item.subtitle}</span><span className="gc-activity-date">{item.date}</span></div>
                  </div>
                  <div className="gc-activity-right">
                    <strong className={item.type === 'withdrawal' ? 'out' : 'in'}>{item.type === 'withdrawal' ? '−' : '+'}{money(item.amount)}</strong>
                    <span className={`gc-badge ${statusClass(item.status)}`}>{item.status === 'successful' ? 'Successful' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'wallet' && (
          <div className="gc-page">
            <div className="gc-header"><div><p className="gc-welcome">Manage funds</p><h1 className="gc-title">Wallet</h1></div></div>
            <div className="gc-summary-grid">
              <div className="gc-summary-card"><span>Total Earnings</span><strong>{money(680000)}</strong></div>
              <div className="gc-summary-card"><span>Total Withdrawn</span><strong>{money(230000)}</strong></div>
              <div className="gc-summary-card full"><span>Available Balance</span><strong className="emerald">{money(balance)}</strong></div>
            </div>
            <div className="gc-section-head"><h2>Bank Accounts</h2></div>
            {savedBanks.length === 0 ? (
              <div className="gc-bank-empty">
                <div className="gc-bank-empty-icon"><Landmark size={28} strokeWidth={1.5} /></div>
                <strong>No bank account connected yet</strong>
                <p>Add a Nigerian bank account to withdraw your earnings.</p>
                <button type="button" className="gc-primary-cta compact" onClick={() => setShowAddBank(true)}><Plus size={16} /> Add Bank Account</button>
              </div>
            ) : (
              <div className="gc-bank-list">
                {savedBanks.map((b) => (
                  <div key={b.id} className="gc-bank-item">
                    <div className="gc-bank-icon"><Building2 size={18} /></div>
                    <div><strong>{b.bank}</strong><span>{b.account} · {b.name}</span></div>
                    {b.isDefault && <span className="gc-default-tag">Default</span>}
                  </div>
                ))}
                <button type="button" className="gc-add-bank" onClick={() => setShowAddBank(true)}><Plus size={18} /> Add New Bank Account</button>
              </div>
            )}
            <button type="button" className="gc-primary-cta" onClick={openWithdraw} style={{ marginTop: '1rem' }}><Wallet size={18} /> Withdraw Funds</button>
          </div>
        )}
      </div>
      <nav className="gc-bottom-nav">
        <button type="button" className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}><LayoutGrid size={22} /><span>Trade</span></button>
        <button type="button" className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><Clock size={22} /><span>Activity</span></button>
        <button type="button" className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}><Wallet size={22} /><span>Wallet</span></button>
      </nav>
      {tradeCard && (
        <div className="gc-modal-overlay" onClick={closeTradeModal}>
          <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gc-modal-handle" />
            <div className="gc-modal-header">
              <div className="gc-modal-brand">
                <span className="gc-modal-logo"><BrandLogo id={tradeCard.id} size={44} /></span>
                <div><h3>{tradeCard.name}</h3><span className="gc-rate-badge">₦{tradeCard.rate.toLocaleString()}/$</span></div>
              </div>
              <button type="button" className="gc-modal-close" onClick={closeTradeModal}><X size={18} /></button>
            </div>
            {tradeSuccess ? (
              <div className="gc-success-panel">
                <div className="gc-success-check"><Check size={28} /></div>
                <h3>Trade Submitted</h3>
                <p>Your {tradeCard.name} card is under review. Payout of {money(livePayout)} will credit after approval.</p>
                <button type="button" className="gc-primary-cta" onClick={closeTradeModal}>Back to Marketplace</button>
              </div>
            ) : (
              <>
                <div className="gc-type-toggle">
                  <button type="button" className={cardType === 'ecode' ? 'active' : ''} onClick={() => setCardType('ecode')}>E-Gift Card</button>
                  <button type="button" className={cardType === 'physical' ? 'active' : ''} onClick={() => setCardType('physical')}>Physical Card</button>
                </div>
                <label className="gc-field"><span>Face Value (USD)</span><div className="gc-input-wrap"><span className="gc-prefix">$</span><input type="number" inputMode="decimal" placeholder="0.00" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} /></div></label>
                {livePayout > 0 && <div className="gc-payout-preview">You get <strong>{money(livePayout)}</strong></div>}
                {cardType === 'ecode' && (<label className="gc-field"><span>Card Code / PIN</span><textarea placeholder="Paste e-code here" value={eCode} onChange={(e) => setECode(e.target.value)} rows={2} /></label>)}
                <div className="gc-field"><span>Card Images (max 5)</span><div className="gc-upload-zone"><Upload size={22} /><p>Tap to upload receipt or card photo</p></div></div>
                <button type="button" className="gc-primary-cta" disabled={!faceValue || parseFloat(faceValue) <= 0 || tradeSubmitting} onClick={handleSubmitTrade}>{tradeSubmitting ? 'Submitting…' : 'Submit Trade Now'}</button>
              </>
            )}
          </div>
        </div>
      )}
      {showWithdraw && (
        <div className="gc-modal-overlay" onClick={() => setShowWithdraw(false)}>
          <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gc-modal-handle" />
            <div className="gc-modal-header"><h3>Withdraw</h3><button type="button" className="gc-modal-close" onClick={() => setShowWithdraw(false)}><X size={18} /></button></div>
            {withdrawSuccess ? (
              <div className="gc-success-panel"><div className="gc-success-check"><Check size={28} /></div><h3>Withdrawal Initiated</h3><p>Funds are on the way.</p><button type="button" className="gc-primary-cta" onClick={() => { setShowWithdraw(false); setWithdrawSuccess(false); }}>Back to Dashboard</button></div>
            ) : showPin ? (
              <div className="gc-pin-panel"><ShieldCheck size={28} className="gc-pin-icon" /><h3>Enter Transaction PIN</h3><p className="gc-muted">Confirm withdrawal of {money(parseFloat(withdrawAmount) || 0)}</p><div className="gc-pin-row">{pin.map((d, i) => (<input key={i} ref={(el) => { pinRefs.current[i] = el; }} type="password" inputMode="numeric" maxLength={1} value={d} onChange={(e) => handlePinChange(i, e.target.value)} className="gc-pin-digit" />))}</div><button type="button" className="gc-primary-cta" disabled={pin.some((d) => !d)} onClick={handleConfirmWithdraw}>Confirm Payout</button></div>
            ) : savedBanks.length === 0 ? (
              <div className="gc-success-panel"><div className="gc-bank-empty-icon" style={{ margin: '0 auto 1rem' }}><Landmark size={28} /></div><h3>No bank account</h3><p className="gc-muted">Add a bank account before withdrawing.</p><button type="button" className="gc-primary-cta" onClick={() => { setShowWithdraw(false); setShowAddBank(true); }}><Plus size={16} /> Add Bank Account</button></div>
            ) : (
              <><div className="gc-balance-chip">Available: <strong>{money(balance)}</strong></div><label className="gc-field"><span>Destination Account</span><select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>{savedBanks.map((b) => (<option key={b.id} value={b.id}>{b.bank} · {b.account}</option>))}</select></label><label className="gc-field"><span>Amount (₦)</span><div className="gc-input-wrap"><span className="gc-prefix">₦</span><input type="number" inputMode="decimal" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} /><button type="button" className="gc-all-btn" onClick={() => setWithdrawAmount(String(balance))}>All</button></div></label><div className="gc-fee-box"><div><span>Fee</span><strong>₦0.00</strong></div><div><span>Net Payout</span><strong>{money(parseFloat(withdrawAmount) || 0)}</strong></div><div><span>Processing</span><strong>< 2 mins</strong></div></div><button type="button" className="gc-primary-cta" disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance} onClick={() => setShowPin(true)}>Continue</button></>
            )}
          </div>
        </div>
      )}
      {showAddBank && (
        <div className="gc-modal-overlay" onClick={() => setShowAddBank(false)}>
          <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gc-modal-handle" /><div className="gc-modal-header"><h3>Add Bank Account</h3><button type="button" className="gc-modal-close" onClick={() => setShowAddBank(false)}><X size={18} /></button></div>
            <label className="gc-field"><span>Bank Name</span><select value={newBank} onChange={(e) => setNewBank(e.target.value)}>{NIGERIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select></label>
            <label className="gc-field"><span>Account Number</span><div className="gc-input-wrap"><input type="text" inputMode="numeric" maxLength={10} placeholder="10-digit account number" value={newAccount} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setNewAccount(v); setNewName(''); if (v.length === 10) resolveAccountName(); }} /></div></label>
            {(resolving || newName) && <div className="gc-resolved-name">{resolving ? 'Verifying account…' : <>Account Name: <strong>{newName}</strong></>}</div>}
            <button type="button" className="gc-primary-cta" disabled={newAccount.length !== 10 || !newName || resolving} onClick={saveBank}>Save Account</button>
          </div>
        </div>
      )}
      {showReferral && (
        <div className="gc-modal-overlay" onClick={() => setShowReferral(false)}>
          <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gc-modal-handle" /><div className="gc-modal-header"><h3>Invite & Earn</h3><button type="button" className="gc-modal-close" onClick={() => setShowReferral(false)}><X size={18} /></button></div>
            <div className="gc-ref-summary"><span>Total Referral Bonus</span><strong>{money(referralEarnings)}</strong></div>
            <div className="gc-ref-breakdown"><div><span>10% Deposit Bonus</span><strong>{money(8500)}</strong></div><div><span>₦1,000 Trade Bonus</span><strong>{money(4000)}</strong></div></div>
            <div className="gc-ref-rules"><p>• When a referred user deposits → you earn <strong>10%</strong> of that deposit.</p><p>• When they complete a gift-card trade → you earn a flat <strong>₦1,000</strong>.</p></div>
            <div className="gc-ref-link-box"><code>https://verxor.com/ref/DESTINY2026</code><button type="button" onClick={handleCopyLink}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div>
            <div className="gc-share-row"><button type="button" className="gc-share-btn whatsapp"><MessageCircle size={16} /> WhatsApp</button><button type="button" className="gc-share-btn"><Share2 size={16} /> Share</button></div>
          </div>
        </div>
      )}
      {showDeposit && (
        <div className="gc-modal-overlay" onClick={() => setShowDeposit(false)}>
          <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gc-modal-handle" /><div className="gc-modal-header"><h3>Deposit Funds</h3><button type="button" className="gc-modal-close" onClick={() => setShowDeposit(false)}><X size={18} /></button></div>
            <p className="gc-muted" style={{ textAlign: 'center', padding: '1.5rem 0' }}>Deposit gateway will open here (Paystack / Flutterwave).</p>
            <button type="button" className="gc-primary-cta" onClick={() => setShowDeposit(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GiftCardPage;
