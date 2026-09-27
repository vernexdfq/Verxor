'use client';

/**
 * Verxor Gift Card Trading & Wallet Hub
 * Trade · Activity · Wallet — mock data isolated for API swap.
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  LayoutGrid,
  Plus,
  Share2,
  Upload,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import './giftcard-page.css';

type TabId = 'trade' | 'activity' | 'wallet';
type CurrencyFilter = 'ALL' | 'USD' | 'CAD' | 'EUR' | 'GBP' | 'AUD';
type ActivityFilter = 'all' | 'gift' | 'deposit' | 'withdrawal';
type TradeCardType = 'ecode' | 'physical';
type ModalId = null | 'trade' | 'withdraw' | 'deposit' | 'referral' | 'add-bank' | 'pin';

type Brand = {
  id: string;
  name: string;
  currencies: CurrencyFilter[];
  rateNgnPerUsd: number;
  logo: string;
  logoBg: string;
};

type ActivityItem = {
  id: string;
  kind: 'gift' | 'deposit' | 'withdrawal';
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: 'pending' | 'completed' | 'declined' | 'successful';
  brandId?: string;
};

type BankAccount = {
  id: string;
  bank: string;
  masked: string;
  name: string;
};

const BRANDS: Brand[] = [
  { id: 'google-play', name: 'Google Play', currencies: ['USD', 'CAD', 'EUR', 'GBP'], rateNgnPerUsd: 1250, logo: '▶', logoBg: '#EA4335' },
  { id: 'amazon', name: 'Amazon', currencies: ['USD', 'CAD', 'EUR', 'GBP'], rateNgnPerUsd: 1250, logo: 'a', logoBg: '#FF9900' },
  { id: 'itunes', name: 'iTunes', currencies: ['USD', 'CAD', 'EUR', 'GBP', 'AUD'], rateNgnPerUsd: 1180, logo: '', logoBg: 'linear-gradient(135deg,#A855F7,#EC4899)' },
  { id: 'steam', name: 'Steam', currencies: ['USD', 'EUR', 'GBP'], rateNgnPerUsd: 1100, logo: '◈', logoBg: '#1B2838' },
  { id: 'sephora', name: 'Sephora', currencies: ['USD', 'CAD'], rateNgnPerUsd: 1200, logo: 'S', logoBg: '#000000' },
  { id: 'nordstrom', name: 'Nordstrom', currencies: ['USD'], rateNgnPerUsd: 1150, logo: 'N', logoBg: '#111111' },
  { id: 'ebay', name: 'eBay', currencies: ['USD', 'GBP'], rateNgnPerUsd: 1120, logo: 'e', logoBg: '#E53238' },
  { id: 'razer', name: 'Razer Gold', currencies: ['USD'], rateNgnPerUsd: 1080, logo: 'R', logoBg: '#44D62C' },
  { id: 'nike', name: 'Nike', currencies: ['USD'], rateNgnPerUsd: 1050, logo: '✓', logoBg: '#111111' },
  { id: 'vanilla', name: 'Vanilla', currencies: ['USD'], rateNgnPerUsd: 980, logo: 'V', logoBg: '#6366F1' },
];

const DEMO_ACTIVITY: ActivityItem[] = [
  { id: 'a1', kind: 'gift', title: 'Amazon USD $100', subtitle: 'Pending approval', amount: '₦125,000.00', date: '27 Sep · 10:14', status: 'pending', brandId: 'amazon' },
  { id: 'a2', kind: 'gift', title: 'Google Play USD $50', subtitle: 'Trade completed', amount: '₦62,500.00', date: '25 Sep · 16:02', status: 'completed', brandId: 'google-play' },
  { id: 'a3', kind: 'withdrawal', title: 'Access Bank', subtitle: '012****789 · Nathaniel S.', amount: '₦50,000.00', date: '24 Sep · 09:41', status: 'successful' },
  { id: 'a4', kind: 'deposit', title: 'Wallet deposit', subtitle: 'Bank transfer · Paga', amount: '+₦20,000.00', date: '22 Sep · 11:20', status: 'completed' },
  { id: 'a5', kind: 'gift', title: 'iTunes USD $25', subtitle: 'Declined — unclear code', amount: '₦0.00', date: '20 Sep · 14:55', status: 'declined', brandId: 'itunes' },
];

const DEMO_BANKS: BankAccount[] = [
  { id: 'b1', bank: 'GTBank', masked: '012****789', name: 'Nathaniel S.' },
  { id: 'b2', bank: 'Access Bank', masked: '069****221', name: 'Nathaniel S.' },
];

const CURRENCIES: CurrencyFilter[] = ['ALL', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'];

const money = (n: number) =>
  `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function BrandMark({ brand, size = 40 }: { brand: Brand; size?: number }) {
  if (brand.id === 'itunes') {
    return (
      <div className="gc-brand-logo" style={{ width: size, height: size, background: brand.logoBg, fontSize: size * 0.45 }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="white" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      </div>
    );
  }
  if (brand.id === 'google-play') {
    return (
      <div className="gc-brand-logo" style={{ width: size, height: size, background: '#fff', border: '1px solid #E2E8F0' }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" aria-hidden>
          <path fill="#EA4335" d="M3 20.5V3.5c0-.6.4-1 1-1.2l11.4 8.7L3 20.5z" />
          <path fill="#FBBC04" d="M15.4 11l3.9-2.9c.5-.4 1.2-.1 1.2.5v7c0 .6-.7.9-1.2.5L15.4 13v-2z" />
          <path fill="#34A853" d="M3 20.5c.3.5.9.6 1.4.3L15.4 13 3 20.5z" />
          <path fill="#4285F4" d="M15.4 11L4.4 2.6C3.9 2.3 3.3 2.4 3 2.9L15.4 11z" />
        </svg>
      </div>
    );
  }
  if (brand.id === 'amazon') {
    return (
      <div className="gc-brand-logo" style={{ width: size, height: size, background: '#fff', border: '1px solid #E2E8F0', color: '#FF9900', fontWeight: 800, fontSize: size * 0.42, fontFamily: 'serif' }}>
        a
      </div>
    );
  }
  if (brand.id === 'steam') {
    return (
      <div className="gc-brand-logo" style={{ width: size, height: size, background: '#1B2838', color: '#fff', fontSize: size * 0.4 }}>
        ◈
      </div>
    );
  }
  return (
    <div className="gc-brand-logo" style={{ width: size, height: size, background: brand.logoBg, color: '#fff', fontSize: size * 0.4, fontWeight: 700 }}>
      {brand.logo || brand.name.charAt(0)}
    </div>
  );
}

function StatusPill({ status }: { status: ActivityItem['status'] }) {
  const map: Record<ActivityItem['status'], string> = {
    pending: 'pill-pending',
    completed: 'pill-ok',
    successful: 'pill-ok',
    declined: 'pill-bad',
  };
  const label: Record<ActivityItem['status'], string> = {
    pending: 'Pending Approval',
    completed: 'Completed',
    successful: 'Successful',
    declined: 'Declined',
  };
  return <span className={`gc-status ${map[status]}`}>{label[status]}</span>;
}

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<TabId>('trade');
  const [currency, setCurrency] = useState<CurrencyFilter>('ALL');
  const [showBalance, setShowBalance] = useState(true);
  const [balance] = useState(450_000);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [modal, setModal] = useState<ModalId>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [cardType, setCardType] = useState<TradeCardType>('ecode');
  const [faceValue, setFaceValue] = useState('');
  const [eCode, setECode] = useState('');
  const [tradeNote, setTradeNote] = useState('');

  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [selectedBank, setSelectedBank] = useState(DEMO_BANKS[0]?.id ?? '');
  const [pin, setPin] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const [copied, setCopied] = useState(false);
  const referralLink = 'https://verxor.app/r/dennykay';

  const filteredBrands = useMemo(() => {
    if (currency === 'ALL') return BRANDS;
    return BRANDS.filter((b) => b.currencies.includes(currency));
  }, [currency]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return DEMO_ACTIVITY;
    if (activityFilter === 'gift') return DEMO_ACTIVITY.filter((a) => a.kind === 'gift');
    if (activityFilter === 'deposit') return DEMO_ACTIVITY.filter((a) => a.kind === 'deposit');
    return DEMO_ACTIVITY.filter((a) => a.kind === 'withdrawal');
  }, [activityFilter]);

  const faceNum = Number(faceValue) || 0;
  const payout = selectedBrand && faceNum > 0 ? Math.round(faceNum * selectedBrand.rateNgnPerUsd) : 0;

  const openTrade = (brand: Brand) => {
    setSelectedBrand(brand);
    setCardType('ecode');
    setFaceValue('');
    setECode('');
    setTradeNote('');
    setModal('trade');
  };

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const closeModal = () => {
    setModal(null);
    setWithdrawSuccess(false);
    setPin('');
  };

  const confirmWithdraw = () => {
    if (pin.length < 4) return;
    setWithdrawSuccess(true);
  };

  return (
    <div className="gc-shell">
      <div className="gc-scroll">
        {tab === 'trade' && (
          <div className="gc-page">
            <header className="gc-top">
              <button type="button" className="gc-back" onClick={onBack} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <div className="gc-welcome">
                <span>Welcome to your</span>
                <h1>Gift Card Page</h1>
              </div>
            </header>

            <section className="gc-balance-card">
              <div className="gc-balance-top">
                <div>
                  <div className="gc-balance-label">
                    Available Balance
                    <button type="button" className="gc-eye" onClick={() => setShowBalance((v) => !v)} aria-label={showBalance ? 'Hide balance' : 'Show balance'}>
                      {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                  <div className="gc-balance-value">{showBalance ? money(balance) : '₦***,***.**'}</div>
                </div>
                <button type="button" className="gc-withdraw-btn" onClick={() => setModal('withdraw')}>
                  <Wallet size={16} />
                  Withdraw
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="gc-balance-actions">
                <button type="button" onClick={() => setModal('deposit')}>
                  <span className="gc-action-icon"><Plus size={16} /></span>
                  <span>
                    <strong>Deposit</strong>
                    <small>Add funds to your wallet</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <button type="button" onClick={() => setTab('activity')}>
                  <span className="gc-action-icon"><BarChart3 size={16} /></span>
                  <span>
                    <strong>Trade Stats</strong>
                    <small>View your activity</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>

            <section className="gc-referral">
              <div className="gc-referral-copy">
                <div className="gc-referral-icon"><Share2 size={18} /></div>
                <h3>
                  Earn <em>10%</em> + <em>₦1,000</em>
                </h3>
                <p>on deposits and gift card trades!</p>
                <button type="button" className="gc-invite-btn" onClick={() => setModal('referral')}>
                  Invite & Earn
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="gc-referral-art" aria-hidden>
                <Gift size={56} strokeWidth={1.25} />
              </div>
            </section>

            <section className="gc-market">
              <div className="gc-market-head">
                <h2>Sell Gift Cards</h2>
                <span className="gc-live">
                  <Zap size={12} /> Best Rates Live
                </span>
              </div>

              <div className="gc-currency-row">
                {CURRENCIES.map((c) => (
                  <button key={c} type="button" className={currency === c ? 'active' : ''} onClick={() => setCurrency(c)}>
                    {c}
                  </button>
                ))}
              </div>

              <div className="gc-brand-grid">
                {filteredBrands.map((brand) => (
                  <button key={brand.id} type="button" className="gc-brand-card" onClick={() => openTrade(brand)}>
                    <BrandMark brand={brand} />
                    <div className="gc-brand-meta">
                      <strong>{brand.name}</strong>
                      <span className="gc-rate">Up to {money(brand.rateNgnPerUsd).replace('.00', '')}/$</span>
                    </div>
                    <ChevronRight size={16} className="gc-brand-chevron" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'activity' && (
          <div className="gc-page">
            <header className="gc-page-header">
              <button type="button" className="gc-back" onClick={() => setTab('trade')} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <h1>Trade & Wallet Activity</h1>
              <button type="button" className="gc-icon-btn" aria-label="Refresh">
                <Clock size={18} />
              </button>
            </header>

            <div className="gc-filter-row">
              {([
                ['all', 'All'],
                ['gift', 'Gift Cards'],
                ['deposit', 'Deposits'],
                ['withdrawal', 'Withdrawals'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={activityFilter === id ? 'active' : ''} onClick={() => setActivityFilter(id)}>
                  {label}
                </button>
              ))}
            </div>

            {filteredActivity.length === 0 ? (
              <div className="gc-empty">
                <Gift size={40} strokeWidth={1.25} />
                <strong>No activity yet</strong>
                <p>Your trades, deposits and withdrawals will show here.</p>
              </div>
            ) : (
              <ul className="gc-activity-list">
                {filteredActivity.map((item) => {
                  const brand = BRANDS.find((b) => b.id === item.brandId);
                  return (
                    <li key={item.id} className="gc-activity-card">
                      <div className="gc-activity-top">
                        {brand ? (
                          <BrandMark brand={brand} size={36} />
                        ) : (
                          <div className="gc-brand-logo soft">
                            {item.kind === 'withdrawal' ? <CreditCard size={18} /> : <Wallet size={18} />}
                          </div>
                        )}
                        <div className="gc-activity-body">
                          <strong>{item.title}</strong>
                          <small>{item.subtitle}</small>
                        </div>
                        <StatusPill status={item.status} />
                      </div>
                      <div className="gc-activity-foot">
                        <span>{item.date}</span>
                        <strong className={item.amount.startsWith('+') ? 'credit' : ''}>{item.amount}</strong>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'wallet' && (
          <div className="gc-page">
            <header className="gc-page-header">
              <button type="button" className="gc-back" onClick={() => setTab('trade')} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <h1>Wallet</h1>
              <span className="gc-spacer" />
            </header>

            <section className="gc-wallet-summary">
              <div>
                <small>Available</small>
                <strong>{money(balance)}</strong>
              </div>
              <div>
                <small>Total earned</small>
                <strong>{money(612_500)}</strong>
              </div>
              <div>
                <small>Withdrawn</small>
                <strong>{money(162_500)}</strong>
              </div>
            </section>

            <section className="gc-section">
              <div className="gc-section-head">
                <h2>Bank accounts</h2>
                <button type="button" className="gc-text-link" onClick={() => setModal('add-bank')}>
                  + Add new
                </button>
              </div>
              <ul className="gc-bank-list">
                {DEMO_BANKS.map((b) => (
                  <li key={b.id}>
                    <div className="gc-brand-logo soft">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <strong>
                        {b.bank} · {b.masked}
                      </strong>
                      <small>{b.name}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <button type="button" className="gc-primary-btn" onClick={() => setModal('withdraw')}>
              Withdraw to bank
            </button>
          </div>
        )}
      </div>

      <nav className="gc-bottom-nav" aria-label="Gift card hub">
        <button type="button" className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>
          <LayoutGrid size={22} />
          <span>Trade</span>
        </button>
        <button type="button" className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>
          <Clock size={22} />
          <span>Activity</span>
        </button>
        <button type="button" className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}>
          <Wallet size={22} />
          <span>Wallet</span>
        </button>
      </nav>

      {modal && (
        <div className="gc-sheet-layer">
          <button type="button" className="gc-sheet-bg" onClick={closeModal} aria-label="Close" />
          <div className="gc-sheet">
            <div className="gc-sheet-head">
              <strong>
                {modal === 'trade' && selectedBrand
                  ? `Sell ${selectedBrand.name}`
                  : modal === 'withdraw'
                    ? withdrawSuccess
                      ? 'Withdrawal sent'
                      : 'Withdraw'
                    : modal === 'deposit'
                      ? 'Deposit'
                      : modal === 'referral'
                        ? 'Invite & Earn'
                        : modal === 'add-bank'
                          ? 'Add bank account'
                          : 'Confirm PIN'}
              </strong>
              <button type="button" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="gc-sheet-body">
              {modal === 'trade' && selectedBrand && (
                <>
                  <div className="gc-trade-rate">
                    <BrandMark brand={selectedBrand} size={44} />
                    <div>
                      <strong>{selectedBrand.name}</strong>
                      <small>Up to {money(selectedBrand.rateNgnPerUsd).replace('.00', '')} per $1</small>
                    </div>
                  </div>

                  <label className="gc-field-label">Card type</label>
                  <div className="gc-seg">
                    <button type="button" className={cardType === 'ecode' ? 'active' : ''} onClick={() => setCardType('ecode')}>
                      E-code
                    </button>
                    <button type="button" className={cardType === 'physical' ? 'active' : ''} onClick={() => setCardType('physical')}>
                      Physical
                    </button>
                  </div>

                  <label className="gc-field-label">Face value (USD)</label>
                  <input
                    className="gc-input"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    placeholder="e.g. 100"
                    value={faceValue}
                    onChange={(e) => setFaceValue(e.target.value)}
                  />

                  {cardType === 'ecode' && (
                    <>
                      <label className="gc-field-label">Card code</label>
                      <textarea
                        className="gc-textarea"
                        rows={3}
                        placeholder="Paste e-code here"
                        value={eCode}
                        onChange={(e) => setECode(e.target.value)}
                      />
                    </>
                  )}

                  {cardType === 'physical' && (
                    <div className="gc-upload">
                      <Upload size={22} />
                      <strong>Upload card images</strong>
                      <small>Clear photos of front (and back if needed)</small>
                    </div>
                  )}

                  <label className="gc-field-label">Note (optional)</label>
                  <input className="gc-input" placeholder="Any extra detail for reviewers" value={tradeNote} onChange={(e) => setTradeNote(e.target.value)} />

                  <div className="gc-payout-box">
                    <span>You receive</span>
                    <strong>{money(payout)}</strong>
                  </div>

                  <button
                    type="button"
                    className="gc-primary-btn"
                    disabled={faceNum <= 0 || (cardType === 'ecode' && !eCode.trim())}
                    onClick={closeModal}
                  >
                    Submit Trade Now
                  </button>
                </>
              )}

              {modal === 'withdraw' && !withdrawSuccess && (
                <>
                  <label className="gc-field-label">Destination account</label>
                  <select className="gc-input" value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}>
                    {DEMO_BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank} · {b.masked} · {b.name}
                      </option>
                    ))}
                  </select>

                  <label className="gc-field-label">Amount (₦)</label>
                  <div className="gc-input-row">
                    <input
                      className="gc-input"
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={withdrawAmt}
                      onChange={(e) => setWithdrawAmt(e.target.value)}
                    />
                    <button type="button" className="gc-chip" onClick={() => setWithdrawAmt(String(balance))}>
                      All
                    </button>
                  </div>

                  <div className="gc-fee-box">
                    <div>
                      <span>Fee</span>
                      <strong>₦0.00</strong>
                    </div>
                    <div>
                      <span>Net payout</span>
                      <strong>{money(Number(withdrawAmt) || 0)}</strong>
                    </div>
                    <div>
                      <span>Speed</span>
                      <strong>Instant · &lt; 2 mins</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="gc-primary-btn"
                    disabled={!withdrawAmt || Number(withdrawAmt) <= 0 || Number(withdrawAmt) > balance}
                    onClick={() => setModal('pin')}
                  >
                    Continue
                  </button>
                </>
              )}

              {modal === 'withdraw' && withdrawSuccess && (
                <div className="gc-success">
                  <div className="gc-success-icon">
                    <Check size={32} />
                  </div>
                  <strong>Withdrawal processing</strong>
                  <p>
                    {money(Number(withdrawAmt) || 0)} is on its way. Ref: WDR-{Date.now().toString(36).toUpperCase()}
                  </p>
                  <button type="button" className="gc-primary-btn" onClick={closeModal}>
                    Back to dashboard
                  </button>
                </div>
              )}

              {modal === 'pin' && (
                <>
                  <p className="gc-lead">Enter your 4-digit transaction PIN to confirm this withdrawal.</p>
                  <input
                    className="gc-input gc-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  <button
                    type="button"
                    className="gc-primary-btn"
                    disabled={pin.length < 4}
                    onClick={() => {
                      setModal('withdraw');
                      confirmWithdraw();
                    }}
                  >
                    Confirm withdrawal
                  </button>
                </>
              )}

              {modal === 'deposit' && (
                <>
                  <p className="gc-lead">Fund your gift-card wallet via bank transfer. Same Verxor funding rails.</p>
                  <button
                    type="button"
                    className="gc-primary-btn"
                    onClick={() => {
                      closeModal();
                      onBack?.();
                    }}
                  >
                    Open Fund Wallet
                  </button>
                </>
              )}

              {modal === 'referral' && (
                <>
                  <div className="gc-ref-stats">
                    <div>
                      <small>Total bonus earned</small>
                      <strong>{money(12_500)}</strong>
                    </div>
                    <div>
                      <small>10% deposit share</small>
                      <strong>{money(8_500)}</strong>
                    </div>
                    <div>
                      <small>₦1,000 trade bonuses</small>
                      <strong>{money(4_000)}</strong>
                    </div>
                  </div>
                  <label className="gc-field-label">Your invite link</label>
                  <div className="gc-input-row">
                    <input className="gc-input" readOnly value={referralLink} />
                    <button type="button" className="gc-chip" onClick={copyRef}>
                      <Copy size={14} />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="gc-lead">Friends get a smooth start. You earn 10% on their first deposit and ₦1,000 when they complete a trade.</p>
                </>
              )}

              {modal === 'add-bank' && (
                <>
                  <label className="gc-field-label">Bank</label>
                  <select className="gc-input" defaultValue="">
                    <option value="" disabled>
                      Select bank
                    </option>
                    <option>GTBank</option>
                    <option>Access Bank</option>
                    <option>Zenith Bank</option>
                    <option>UBA</option>
                    <option>Opay</option>
                    <option>Palmpay</option>
                  </select>
                  <label className="gc-field-label">Account number</label>
                  <input className="gc-input" inputMode="numeric" maxLength={10} placeholder="10-digit NUBAN" />
                  <p className="gc-lead">Name enquiry runs automatically after 10 digits.</p>
                  <button type="button" className="gc-primary-btn" onClick={closeModal}>
                    Save account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GiftCardPage;
