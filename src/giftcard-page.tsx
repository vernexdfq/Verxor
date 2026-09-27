'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
  CreditCard,
  Building2,
  ShieldCheck,
  Share2,
  MessageCircle,
  Home,
  LayoutGrid,
} from 'lucide-react';
import './giftcard-page.css';

/* ───────────────── Types ───────────────── */
type TabId = 'trade' | 'activity' | 'wallet';
type CurrencyFilter = 'ALL' | 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD';
type ActivityFilter = 'All' | 'Gift Cards' | 'Deposits' | 'Withdrawals';
type TradeStatus = 'pending' | 'completed' | 'declined';
type CardType = 'physical' | 'ecode';

type GiftCard = {
  id: string;
  name: string;
  logo: string;
  rate: number; // Naira per $
  currencies: CurrencyFilter[];
  color: string;
};

type ActivityItem = {
  id: string;
  type: 'giftcard' | 'deposit' | 'withdrawal';
  title: string;
  subtitle: string;
  amount: number;
  status: TradeStatus | 'successful' | 'pending';
  date: string;
  brand?: string;
};

/* ───────────────── Data ───────────────── */
const GIFT_CARDS: GiftCard[] = [
  { id: 'google-play', name: 'Google Play', logo: '🎮', rate: 1250, currencies: ['USD', 'CAD', 'EUR', 'GBP'], color: '#34A853' },
  { id: 'amazon', name: 'Amazon', logo: '📦', rate: 1250, currencies: ['USD', 'CAD', 'GBP'], color: '#FF9900' },
  { id: 'itunes', name: 'iTunes', logo: '🍎', rate: 1180, currencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD'], color: '#A2AAAD' },
  { id: 'steam', name: 'Steam', logo: '🎯', rate: 1100, currencies: ['USD', 'EUR', 'GBP'], color: '#1B2838' },
  { id: 'sephora', name: 'Sephora', logo: '💄', rate: 1200, currencies: ['USD', 'CAD'], color: '#000000' },
  { id: 'nordstrom', name: 'Nordstrom', logo: '🛍️', rate: 1150, currencies: ['USD'], color: '#000000' },
  { id: 'razer', name: 'Razer Gold', logo: '💚', rate: 1160, currencies: ['USD'], color: '#44D62C' },
  { id: 'xbox', name: 'Xbox', logo: '🟢', rate: 1280, currencies: ['USD', 'EUR'], color: '#107C10' },
  { id: 'nike', name: 'Nike', logo: '✔️', rate: 1090, currencies: ['USD'], color: '#111111' },
  { id: 'ebay', name: 'eBay', logo: '🏷️', rate: 1050, currencies: ['USD', 'GBP'], color: '#E53238' },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', type: 'giftcard', title: 'Amazon USD $100', subtitle: 'E-code • 2 cards', amount: 125000, status: 'completed', date: 'Today, 09:14', brand: 'Amazon' },
  { id: 'a2', type: 'giftcard', title: 'iTunes USD $50', subtitle: 'Physical card', amount: 59000, status: 'pending', date: 'Today, 08:02', brand: 'iTunes' },
  { id: 'a3', type: 'withdrawal', title: 'Withdrawal to GTBank', subtitle: '012****789', amount: 50000, status: 'successful', date: 'Yesterday, 16:40' },
  { id: 'a4', type: 'deposit', title: 'Wallet Deposit', subtitle: 'Paystack • ****4242', amount: 200000, status: 'successful', date: 'Yesterday, 11:20' },
  { id: 'a5', type: 'giftcard', title: 'Steam EUR €65', subtitle: 'E-code', amount: 149531, status: 'completed', date: '2 days ago', brand: 'Steam' },
  { id: 'a6', type: 'giftcard', title: 'Google Play $200', subtitle: 'E-code', amount: 250000, status: 'declined', date: '3 days ago', brand: 'Google Play' },
];

const SAVED_BANKS = [
  { id: 'b1', bank: 'GTBank', account: '012****789', name: 'Nathaniel S.' },
  { id: 'b2', bank: 'Access Bank', account: '023****456', name: 'Nathaniel S.' },
];

const CURRENCIES: CurrencyFilter[] = ['ALL', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'];

/* ───────────────── Helpers ───────────────── */
const money = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);

const statusClass = (s: string) => {
  if (s === 'completed' || s === 'successful') return 'gc-badge-success';
  if (s === 'pending') return 'gc-badge-pending';
  return 'gc-badge-declined';
};

/* ───────────────── Component ───────────────── */
export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<TabId>('trade');
  const [showBalance, setShowBalance] = useState(true);
  const [currency, setCurrency] = useState<CurrencyFilter>('ALL');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All');

  // Modals
  const [tradeCard, setTradeCard] = useState<GiftCard | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trade form state
  const [cardType, setCardType] = useState<CardType>('ecode');
  const [faceValue, setFaceValue] = useState('');
  const [eCode, setECode] = useState('');
  const [tradeSubmitting, setTradeSubmitting] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState(false);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState(SAVED_BANKS[0]?.id || '');
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  /* ───────────── TRADE DASHBOARD ───────────── */
  const renderTrade = () => (
    <div className="gc-page">
      {/* Header */}
      <div className="gc-header">
        {onBack && (
          <button type="button" className="gc-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <p className="gc-welcome">Welcome to your</p>
          <h1 className="gc-title">Gift Card Page</h1>
        </div>
      </div>

      {/* Wallet Card */}
      <div className="gc-wallet-card">
        <div className="gc-wallet-top">
          <div>
            <div className="gc-balance-label">
              Available Balance
              <button
                type="button"
                className="gc-eye-btn"
                onClick={() => setShowBalance((v) => !v)}
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <div className="gc-balance-value">
              {showBalance ? money(balance) : '₦***,***.**'}
            </div>
          </div>
          <button
            type="button"
            className="gc-withdraw-btn"
            onClick={() => {
              setShowWithdraw(true);
              setWithdrawSuccess(false);
              setPin(['', '', '', '']);
            }}
          >
            <Wallet size={16} />
            Withdraw
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="gc-wallet-actions">
          <button type="button" className="gc-wallet-action" onClick={() => setShowDeposit(true)}>
            <span className="gc-action-icon"><Plus size={18} /></span>
            <div>
              <strong>Deposit</strong>
              <span>Add funds to your wallet</span>
            </div>
            <ChevronRight size={16} className="gc-action-chevron" />
          </button>
          <div className="gc-wallet-divider" />
          <button type="button" className="gc-wallet-action" onClick={() => setTab('activity')}>
            <span className="gc-action-icon"><BarChart3 size={18} /></span>
            <div>
              <strong>Trade Stats</strong>
              <span>View your activity</span>
            </div>
            <ChevronRight size={16} className="gc-action-chevron" />
          </button>
        </div>
      </div>

      {/* Referral Banner */}
      <button type="button" className="gc-referral-banner" onClick={() => setShowReferral(true)}>
        <div className="gc-referral-content">
          <div className="gc-referral-icon">
            <Users size={20} />
          </div>
          <div>
            <h3>Earn 10% + ₦1,000</h3>
            <p>on deposits and gift card trades!</p>
          </div>
        </div>
        <div className="gc-referral-cta">
          Invite & Earn <ChevronRight size={14} />
        </div>
        <div className="gc-referral-art" aria-hidden>
          🎁
        </div>
      </button>

      {/* Marketplace */}
      <div className="gc-section-head">
        <h2>Sell Gift Cards</h2>
        <span className="gc-live-tag">
          <Zap size={12} /> Best Rates Live
        </span>
      </div>

      {/* Currency Filters */}
      <div className="gc-currency-row">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`gc-currency-pill ${currency === c ? 'active' : ''}`}
            onClick={() => setCurrency(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      <div className="gc-card-grid">
        {filteredCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="gc-brand-card"
            onClick={() => {
              setTradeCard(card);
              setTradeSuccess(false);
            }}
          >
            <div className="gc-brand-logo" style={{ background: `${card.color}14` }}>
              <span style={{ fontSize: 28 }}>{card.logo}</span>
            </div>
            <div className="gc-brand-info">
              <strong>{card.name}</strong>
              <span className="gc-rate-badge">Up to ₦{card.rate.toLocaleString()}/$</span>
            </div>
            <ChevronRight size={16} className="gc-brand-arrow" />
          </button>
        ))}
      </div>
    </div>
  );

  /* ───────────── ACTIVITY ───────────── */
  const renderActivity = () => (
    <div className="gc-page">
      <div className="gc-header">
        <div>
          <p className="gc-welcome">History</p>
          <h1 className="gc-title">Trade & Wallet Activity</h1>
        </div>
      </div>

      <div className="gc-filter-row">
        {(['All', 'Gift Cards', 'Deposits', 'Withdrawals'] as ActivityFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`gc-filter-pill ${activityFilter === f ? 'active' : ''}`}
            onClick={() => setActivityFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="gc-activity-list">
        {filteredActivity.length === 0 ? (
          <div className="gc-empty">
            <Clock size={40} strokeWidth={1.2} />
            <p>No transactions yet</p>
          </div>
        ) : (
          filteredActivity.map((item) => (
            <div key={item.id} className="gc-activity-item">
              <div className="gc-activity-left">
                <div className={`gc-activity-icon ${item.type}`}>
                  {item.type === 'giftcard' && '🎁'}
                  {item.type === 'deposit' && <Plus size={16} />}
                  {item.type === 'withdrawal' && <Wallet size={16} />}
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                  <span className="gc-activity-date">{item.date}</span>
                </div>
              </div>
              <div className="gc-activity-right">
                <strong className={item.type === 'withdrawal' ? 'out' : 'in'}>
                  {item.type === 'withdrawal' ? '−' : '+'}
                  {money(item.amount)}
                </strong>
                <span className={`gc-badge ${statusClass(item.status)}`}>
                  {item.status === 'successful' ? 'Successful' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  /* ───────────── WALLET ───────────── */
  const renderWallet = () => (
    <div className="gc-page">
      <div className="gc-header">
        <div>
          <p className="gc-welcome">Manage funds</p>
          <h1 className="gc-title">Wallet</h1>
        </div>
      </div>

      <div className="gc-summary-grid">
        <div className="gc-summary-card">
          <span>Total Earnings</span>
          <strong>{money(680000)}</strong>
        </div>
        <div className="gc-summary-card">
          <span>Total Withdrawn</span>
          <strong>{money(230000)}</strong>
        </div>
        <div className="gc-summary-card full">
          <span>Available Balance</span>
          <strong className="emerald">{money(balance)}</strong>
        </div>
      </div>

      <div className="gc-section-head">
        <h2>Bank Accounts</h2>
      </div>

      <div className="gc-bank-list">
        {SAVED_BANKS.map((b) => (
          <div key={b.id} className="gc-bank-item">
            <div className="gc-bank-icon">
              <Building2 size={18} />
            </div>
            <div>
              <strong>{b.bank}</strong>
              <span>{b.account} · {b.name}</span>
            </div>
            <span className="gc-default-tag">Default</span>
          </div>
        ))}
        <button type="button" className="gc-add-bank">
          <Plus size={18} />
          Add New Bank Account
        </button>
      </div>

      <button
        type="button"
        className="gc-primary-cta"
        onClick={() => {
          setShowWithdraw(true);
          setWithdrawSuccess(false);
        }}
      >
        <Wallet size={18} />
        Withdraw Funds
      </button>
    </div>
  );

  /* ───────────── TRADE MODAL ───────────── */
  const renderTradeModal = () => {
    if (!tradeCard) return null;
    return (
      <div className="gc-modal-overlay" onClick={closeTradeModal}>
        <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-modal-handle" />
          <div className="gc-modal-header">
            <div className="gc-modal-brand">
              <span className="gc-modal-logo">{tradeCard.logo}</span>
              <div>
                <h3>{tradeCard.name}</h3>
                <span className="gc-rate-badge">₦{tradeCard.rate.toLocaleString()}/$</span>
              </div>
            </div>
            <button type="button" className="gc-modal-close" onClick={closeTradeModal}>
              <X size={20} />
            </button>
          </div>

          {tradeSuccess ? (
            <div className="gc-success-panel">
              <div className="gc-success-check">
                <Check size={32} />
              </div>
              <h3>Trade Submitted</h3>
              <p>Your {tradeCard.name} card is under review. Payout of {money(livePayout)} will credit after approval.</p>
              <button type="button" className="gc-primary-cta" onClick={closeTradeModal}>
                Back to Marketplace
              </button>
            </div>
          ) : (
            <>
              <div className="gc-type-toggle">
                <button
                  type="button"
                  className={cardType === 'ecode' ? 'active' : ''}
                  onClick={() => setCardType('ecode')}
                >
                  E-Gift Card
                </button>
                <button
                  type="button"
                  className={cardType === 'physical' ? 'active' : ''}
                  onClick={() => setCardType('physical')}
                >
                  Physical Card
                </button>
              </div>

              <label className="gc-field">
                <span>Face Value (USD)</span>
                <div className="gc-input-wrap">
                  <span className="gc-prefix">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={faceValue}
                    onChange={(e) => setFaceValue(e.target.value)}
                  />
                </div>
              </label>

              {livePayout > 0 && (
                <div className="gc-payout-preview">
                  You get <strong>{money(livePayout)}</strong>
                </div>
              )}

              {cardType === 'ecode' && (
                <label className="gc-field">
                  <span>Card Code / PIN</span>
                  <textarea
                    placeholder="Paste e-code here"
                    value={eCode}
                    onChange={(e) => setECode(e.target.value)}
                    rows={2}
                  />
                </label>
              )}

              <div className="gc-field">
                <span>Card Images (max 5)</span>
                <div className="gc-upload-zone">
                  <Upload size={22} />
                  <p>Tap to upload receipt or card photo</p>
                </div>
              </div>

              <button
                type="button"
                className="gc-primary-cta"
                disabled={!faceValue || parseFloat(faceValue) <= 0 || tradeSubmitting}
                onClick={handleSubmitTrade}
              >
                {tradeSubmitting ? 'Submitting…' : 'Submit Trade Now'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ───────────── WITHDRAW MODAL ───────────── */
  const renderWithdrawModal = () => {
    if (!showWithdraw) return null;
    return (
      <div className="gc-modal-overlay" onClick={() => setShowWithdraw(false)}>
        <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-modal-handle" />
          <div className="gc-modal-header">
            <h3>Withdraw</h3>
            <button type="button" className="gc-modal-close" onClick={() => setShowWithdraw(false)}>
              <X size={20} />
            </button>
          </div>

          {withdrawSuccess ? (
            <div className="gc-success-panel">
              <div className="gc-success-check">
                <Check size={32} />
              </div>
              <h3>Withdrawal Initiated</h3>
              <p>Funds are on the way. Ref: VX-WD-{Date.now().toString().slice(-8)}</p>
              <p className="gc-muted">Usually arrives in under 2 minutes.</p>
              <button
                type="button"
                className="gc-primary-cta"
                onClick={() => {
                  setShowWithdraw(false);
                  setWithdrawSuccess(false);
                }}
              >
                Back to Dashboard
              </button>
            </div>
          ) : showPin ? (
            <div className="gc-pin-panel">
              <ShieldCheck size={28} className="gc-pin-icon" />
              <h3>Enter Transaction PIN</h3>
              <p className="gc-muted">Confirm this withdrawal of {money(parseFloat(withdrawAmount) || 0)}</p>
              <div className="gc-pin-row">
                {pin.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { pinRefs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    className="gc-pin-digit"
                  />
                ))}
              </div>
              <button
                type="button"
                className="gc-primary-cta"
                disabled={pin.some((d) => !d)}
                onClick={handleConfirmWithdraw}
              >
                Confirm Payout
              </button>
            </div>
          ) : (
            <>
              <div className="gc-balance-chip">
                Available: <strong>{money(balance)}</strong>
              </div>

              <label className="gc-field">
                <span>Destination Account</span>
                <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                  {SAVED_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank} · {b.account}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gc-field">
                <span>Amount (₦)</span>
                <div className="gc-input-wrap">
                  <span className="gc-prefix">₦</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    className="gc-all-btn"
                    onClick={() => setWithdrawAmount(String(balance))}
                  >
                    All
                  </button>
                </div>
              </label>

              <div className="gc-fee-box">
                <div><span>Fee</span><strong>₦0.00</strong></div>
                <div><span>Net Payout</span><strong>{money(parseFloat(withdrawAmount) || 0)}</strong></div>
                <div><span>Processing</span><strong>&lt; 2 mins</strong></div>
              </div>

              <button
                type="button"
                className="gc-primary-cta"
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                onClick={() => setShowPin(true)}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ───────────── REFERRAL SHEET ───────────── */
  const renderReferral = () => {
    if (!showReferral) return null;
    return (
      <div className="gc-modal-overlay" onClick={() => setShowReferral(false)}>
        <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-modal-handle" />
          <div className="gc-modal-header">
            <h3>Invite & Earn</h3>
            <button type="button" className="gc-modal-close" onClick={() => setShowReferral(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="gc-ref-summary">
            <span>Total Referral Bonus</span>
            <strong>{money(referralEarnings)}</strong>
          </div>

          <div className="gc-ref-breakdown">
            <div>
              <span>10% Deposit Bonus</span>
              <strong>{money(8500)}</strong>
            </div>
            <div>
              <span>₦1,000 Trade Bonus</span>
              <strong>{money(4000)}</strong>
            </div>
          </div>

          <div className="gc-ref-rules">
            <p>• When a referred user deposits → you earn <strong>10%</strong> of that deposit.</p>
            <p>• When they complete a gift-card trade → you earn a flat <strong>₦1,000</strong>.</p>
          </div>

          <div className="gc-ref-link-box">
            <code>https://verxor.com/ref/DESTINY2026</code>
            <button type="button" onClick={handleCopyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="gc-share-row">
            <button type="button" className="gc-share-btn whatsapp">
              <MessageCircle size={18} /> WhatsApp
            </button>
            <button type="button" className="gc-share-btn">
              <Share2 size={18} /> Share
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ───────────── DEPOSIT PLACEHOLDER ───────────── */
  const renderDeposit = () => {
    if (!showDeposit) return null;
    return (
      <div className="gc-modal-overlay" onClick={() => setShowDeposit(false)}>
        <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gc-modal-handle" />
          <div className="gc-modal-header">
            <h3>Deposit Funds</h3>
            <button type="button" className="gc-modal-close" onClick={() => setShowDeposit(false)}>
              <X size={20} />
            </button>
          </div>
          <p className="gc-muted" style={{ textAlign: 'center', padding: '24px 0' }}>
            Deposit gateway will open here (Paystack / Flutterwave).
          </p>
          <button type="button" className="gc-primary-cta" onClick={() => setShowDeposit(false)}>
            Close
          </button>
        </div>
      </div>
    );
  };

  /* ───────────── ROOT ───────────── */
  return (
    <div className="gc-shell">
      <div className="gc-scroll">
        {tab === 'trade' && renderTrade()}
        {tab === 'activity' && renderActivity()}
        {tab === 'wallet' && renderWallet()}
      </div>

      {/* Bottom Nav */}
      <nav className="gc-bottom-nav">
        <button
          type="button"
          className={tab === 'trade' ? 'active' : ''}
          onClick={() => setTab('trade')}
        >
          <LayoutGrid size={22} />
          <span>Trade</span>
        </button>
        <button
          type="button"
          className={tab === 'activity' ? 'active' : ''}
          onClick={() => setTab('activity')}
        >
          <Clock size={22} />
          <span>Activity</span>
        </button>
        <button
          type="button"
          className={tab === 'wallet' ? 'active' : ''}
          onClick={() => setTab('wallet')}
        >
          <Wallet size={22} />
          <span>Wallet</span>
        </button>
      </nav>

      {renderTradeModal()}
      {renderWithdrawModal()}
      {renderReferral()}
      {renderDeposit()}
    </div>
  );
}

export default GiftCardPage;
