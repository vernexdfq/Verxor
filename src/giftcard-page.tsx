'use client';

import { useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Gift,
  HelpCircle,
  History,
  Image as ImageIcon,
  Info,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './giftcard-page.css';

export type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP' | 'SGD';
export type BrandId =
  | 'apple'
  | 'steam'
  | 'razer'
  | 'xbox'
  | 'google'
  | 'sephora'
  | 'playstation'
  | 'amazon'
  | 'vanilla'
  | 'nordstrom'
  | 'ebay'
  | 'nike';

export type Brand = {
  id: BrandId;
  name: string;
  category: string;
  rate: number;
  physicalRateBonus: number;
  currencies: Currency[];
  popular?: boolean;
};

export const BRANDS: Brand[] = [
  { id: 'apple', name: 'iTunes / Apple', category: 'Music & Apps', rate: 1335.0, physicalRateBonus: 20, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'], popular: true },
  { id: 'steam', name: 'Steam', category: 'Games & PC', rate: 1285.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'], popular: true },
  { id: 'razer', name: 'Razer Gold', category: 'Gaming Credits', rate: 1160.0, physicalRateBonus: 10, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'], popular: true },
  { id: 'google', name: 'Google Play', category: 'Apps & Games', rate: 1180.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'], popular: true },
  { id: 'xbox', name: 'Xbox Live / Game Pass', category: 'Console Gaming', rate: 1280.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'sephora', name: 'Sephora', category: 'Beauty & Lifestyle', rate: 1120.0, physicalRateBonus: 25, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'playstation', name: 'PlayStation Network', category: 'Console Gaming', rate: 1250.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP'] },
  { id: 'amazon', name: 'Amazon Store', category: 'Shopping & Retail', rate: 1215.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'EUR', 'GBP', 'SGD'], popular: true },
  { id: 'vanilla', name: 'Vanilla Visa / MC', category: 'Prepaid Visa', rate: 1220.0, physicalRateBonus: 30, currencies: ['USD', 'CAD'] },
  { id: 'nordstrom', name: 'Nordstrom', category: 'Fashion & Retail', rate: 1130.0, physicalRateBonus: 20, currencies: ['USD', 'CAD'] },
  { id: 'ebay', name: 'eBay', category: 'Online Marketplace', rate: 1190.0, physicalRateBonus: 15, currencies: ['USD', 'CAD', 'AUD', 'GBP'] },
  { id: 'nike', name: 'Nike', category: 'Sportswear & Shoes', rate: 1140.0, physicalRateBonus: 20, currencies: ['USD', 'CAD', 'GBP'] },
];

export const CURRENCIES: Array<{ id: 'ALL' | Currency; flag?: string }> = [
  { id: 'ALL' },
  { id: 'USD', flag: '🇺🇸' },
  { id: 'CAD', flag: '🇨🇦' },
  { id: 'AUD', flag: '🇦🇺' },
  { id: 'EUR', flag: '🇪🇺' },
  { id: 'GBP', flag: '🇬🇧' },
  { id: 'SGD', flag: '🇸🇬' },
];

export const INITIAL_LIVE_TRADES = [
  { id: 'VX-GC-9284', user: 'D******e', initials: 'D', brand: 'Apple & iTunes', detail: 'USD 50 x 1', amount: 67750, time: '3 minutes ago' },
  { id: 'VX-GC-9281', user: 'M****n', initials: 'M', brand: 'Steam Wallet', detail: 'USD 100 x 1', amount: 130000, time: '9 minutes ago' },
  { id: 'VX-GC-9279', user: 'H****1', initials: 'H', brand: 'Razer Gold', detail: 'EUR 50 x 2', amount: 116000, time: '15 minutes ago' },
  { id: 'VX-GC-9275', user: 'J*******k', initials: 'J', brand: 'Amazon Card', detail: 'USD 100 x 1', amount: 123000, time: '24 minutes ago' },
  { id: 'VX-GC-9270', user: 'K****o', initials: 'K', brand: 'Google Play', detail: 'USD 25 x 2', amount: 59750, time: '38 minutes ago' },
];

export type TradeStatus = 'Pending' | 'Processing' | 'Completed' | 'Rejected';

export interface TradeRecord {
  id: string;
  brandId: BrandId;
  brandName: string;
  cardType: 'Physical' | 'E-Gift';
  currency: Currency;
  faceValue: number;
  totalCards: number;
  rate: number;
  payoutNgn: number;
  status: TradeStatus;
  createdAt: string;
  codes?: string[];
  couponUsed?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

const DEFAULT_BANKS: BankAccount[] = [
  {
    id: 'b1',
    bankName: 'OPay',
    accountNumber: '8141620644',
    accountName: 'DESTINY IKEDICHUKWU',
    isDefault: true,
  },
];

function money(value: number) {
  return (
    '₦' +
    Math.abs(value).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function BrandLogo({ id, large = false }: { id: BrandId; large?: boolean }) {
  const common = large ? 'gc-logo gc-logo-lg' : 'gc-logo';
  let content: ReactNode = id.toUpperCase();
  let modifier = 'gc-logo-dark';

  if (id === 'apple') {
    content = <b>APPLE</b>;
    modifier = 'gc-logo-dark';
  } else if (id === 'google') {
    content = <b style={{ color: '#4285F4' }}>G<span style={{ color: '#EA4335' }}>o</span><span style={{ color: '#FBBC05' }}>o</span>g</b>;
    modifier = 'gc-logo-google';
  } else if (id === 'steam') {
    content = <b>STEAM</b>;
    modifier = 'gc-logo-steam';
  } else if (id === 'xbox') {
    content = <b>XBOX</b>;
    modifier = 'gc-logo-xbox';
  } else if (id === 'razer') {
    content = <div style={{ textAlign: 'center' }}><b style={{ color: '#00E700', fontSize: '9px' }}>RAZER</b><small style={{ fontSize: '7px', display: 'block', color: '#888' }}>GOLD</small></div>;
    modifier = 'gc-logo-razer';
  } else if (id === 'playstation') {
    content = <b>PS</b>;
    modifier = 'gc-logo-ps';
  } else if (id === 'amazon') {
    content = <div><b>amazon</b><i /></div>;
    modifier = 'gc-logo-amazon';
  } else if (id === 'vanilla') {
    content = <b style={{ fontSize: '10px' }}>VISA</b>;
    modifier = 'gc-logo-dark';
  } else if (id === 'sephora') {
    content = <b style={{ fontSize: '9px', letterSpacing: '1px' }}>SEPHORA</b>;
    modifier = 'gc-logo-dark';
  } else if (id === 'ebay') {
    content = <b style={{ color: '#E53238', fontSize: '12px' }}>e<span style={{ color: '#0064D2' }}>b</span><span style={{ color: '#F5AF02' }}>a</span><span style={{ color: '#86B817' }}>y</span></b>;
    modifier = 'gc-logo-google';
  } else if (id === 'nike') {
    content = <b style={{ fontStyle: 'italic', fontSize: '11px' }}>NIKE</b>;
    modifier = 'gc-logo-dark';
  } else if (id === 'nordstrom') {
    content = <b style={{ fontSize: '8px' }}>NORDSTROM</b>;
    modifier = 'gc-logo-dark';
  }

  return <span className={`${common} ${modifier}`}>{content}</span>;
}

export function GiftCardPage({
  onBack,
  session,
}: {
  onBack?: () => void;
  session?: AuthSession | null;
}) {
  const [activeTab, setActiveTab] = useState<'trade' | 'sell' | 'history' | 'wallet'>('trade');
  const [currency, setCurrency] = useState<'ALL' | Currency>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [slide, setSlide] = useState(0);

  // Sell form state
  const [selectedBrandId, setSelectedBrandId] = useState<BrandId>('apple');
  const [cardType, setCardType] = useState<'Physical' | 'E-Gift'>('Physical');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [denomination, setDenomination] = useState<number>(100);
  const [customValue, setCustomValue] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [cardCode, setCardCode] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Modals & sheets
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showLiveTrades, setShowLiveTrades] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<TradeRecord | null>(null);

  // Wallet state
  const [showBalance, setShowBalance] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | TradeStatus>('ALL');

  // Stored state
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [walletBalance, setWalletBalance] = useState(145000);
  const [banks, setBanks] = useState<BankAccount[]>(DEFAULT_BANKS);
  const [newBankName, setNewBankName] = useState('OPay');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  // Load persistence
  useEffect(() => {
    try {
      const savedTrades = localStorage.getItem('verxor_gc_trades');
      if (savedTrades) {
        setTrades(JSON.parse(savedTrades));
      } else {
        const initial: TradeRecord[] = [
          {
            id: 'VX-GC-9284',
            brandId: 'apple',
            brandName: 'iTunes / Apple',
            cardType: 'Physical',
            currency: 'USD',
            faceValue: 50,
            totalCards: 1,
            rate: 1355,
            payoutNgn: 67750,
            status: 'Completed',
            createdAt: 'Today, 11:20 AM',
          },
          {
            id: 'VX-GC-9150',
            brandId: 'steam',
            brandName: 'Steam',
            cardType: 'E-Gift',
            currency: 'USD',
            faceValue: 100,
            totalCards: 1,
            rate: 1285,
            payoutNgn: 128500,
            status: 'Completed',
            createdAt: 'Yesterday, 04:15 PM',
          },
        ];
        setTrades(initial);
        localStorage.setItem('verxor_gc_trades', JSON.stringify(initial));
      }

      const savedWallet = localStorage.getItem('verxor_gc_wallet');
      if (savedWallet) {
        setWalletBalance(Number(savedWallet));
      }

      const savedBanks = localStorage.getItem('verxor_gc_banks');
      if (savedBanks) {
        setBanks(JSON.parse(savedBanks));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const currentBrand = useMemo(() => {
    return BRANDS.find((b) => b.id === selectedBrandId) || BRANDS[0];
  }, [selectedBrandId]);

  // Rate calculation
  const currentRate = useMemo(() => {
    let rate = currentBrand.rate;
    if (cardType === 'Physical') {
      rate += currentBrand.physicalRateBonus;
    }
    return rate;
  }, [currentBrand, cardType]);

  const activeFaceValue = useMemo(() => {
    if (customValue && Number(customValue) > 0) {
      return Number(customValue);
    }
    return denomination;
  }, [denomination, customValue]);

  const totalFaceValue = useMemo(() => {
    return activeFaceValue * Math.max(1, quantity);
  }, [activeFaceValue, quantity]);

  const basePayout = useMemo(() => {
    return totalFaceValue * currentRate;
  }, [totalFaceValue, currentRate]);

  const bonusPayout = useMemo(() => {
    return appliedCoupon ? basePayout * 0.05 : 0;
  }, [appliedCoupon, basePayout]);

  const totalPayout = useMemo(() => {
    return basePayout + bonusPayout;
  }, [basePayout, bonusPayout]);

  // Filtered brands for catalog
  const filteredBrands = useMemo(() => {
    return BRANDS.filter((item) => {
      const matchesCurrency = currency === 'ALL' || item.currencies.includes(currency);
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCurrency && matchesSearch;
    });
  }, [currency, searchQuery]);

  // Filtered trades history
  const filteredTrades = useMemo(() => {
    if (historyFilter === 'ALL') return trades;
    return trades.filter((t) => t.status === historyFilter);
  }, [trades, historyFilter]);

  const handleStartSell = (brandId?: BrandId) => {
    if (brandId) {
      setSelectedBrandId(brandId);
    }
    setActiveTab('sell');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyCoupon = (code: string) => {
    if (code.toUpperCase().trim() === 'VERXOR5') {
      setCoupon('VERXOR5');
      setAppliedCoupon(true);
      setShowCouponModal(false);
    } else {
      alert('Invalid coupon code. Try VERXOR5 for a 5% bonus!');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...newUrls].slice(0, 5));
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTrade = () => {
    if (totalFaceValue <= 0) {
      alert('Please select or enter a valid card denomination.');
      return;
    }
    if (cardType === 'E-Gift' && !cardCode.trim()) {
      alert('Please enter your gift card code or PIN for digital redemption.');
      return;
    }
    if (cardType === 'Physical' && imageFiles.length === 0 && !cardCode.trim()) {
      alert('Please upload clear photos of your physical card or enter the card code.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newTrade: TradeRecord = {
        id: `VX-GC-${Math.floor(1000 + Math.random() * 9000)}`,
        brandId: currentBrand.id,
        brandName: currentBrand.name,
        cardType,
        currency: selectedCurrency,
        faceValue: activeFaceValue,
        totalCards: quantity,
        rate: currentRate,
        payoutNgn: totalPayout,
        status: 'Processing',
        createdAt: 'Just now',
        codes: cardCode ? [cardCode] : undefined,
        couponUsed: appliedCoupon ? 'VERXOR5' : undefined,
      };

      const updated = [newTrade, ...trades];
      setTrades(updated);
      try {
        localStorage.setItem('verxor_gc_trades', JSON.stringify(updated));
      } catch {}

      setIsSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('history');
      }, 1500);
    }, 1200);
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber || newAccountNumber.length < 10) {
      alert('Please enter a valid 10-digit account number.');
      return;
    }
    const resolvedName = newAccountName || session?.name || 'DESTINY IKEDICHUKWU';
    const newBank: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName,
      accountNumber: newAccountNumber,
      accountName: resolvedName,
      isDefault: banks.length === 0,
    };
    const updated = [...banks, newBank];
    setBanks(updated);
    try {
      localStorage.setItem('verxor_gc_banks', JSON.stringify(updated));
    } catch {}
    setShowAddBankModal(false);
    setNewAccountNumber('');
    setNewAccountName('');
  };

  const handleWithdraw = () => {
    const amt = Number(withdrawAmount);
    if (!amt || amt < 1000) {
      alert('Minimum withdrawal amount is ₦1,000.00');
      return;
    }
    if (amt > walletBalance) {
      alert('Insufficient gift card earnings balance.');
      return;
    }
    const newBal = walletBalance - amt;
    setWalletBalance(newBal);
    try {
      localStorage.setItem('verxor_gc_wallet', String(newBal));
    } catch {}
    setWithdrawSuccess(true);
    setTimeout(() => {
      setWithdrawSuccess(false);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    }, 1500);
  };

  return (
    <div className="gc-root">
      <div className="gc-shell">
        {/* ===================== TAB 1: TRADE HOME ===================== */}
        {activeTab === 'trade' && (
          <div className="gc-screen">
            <header className="gc-page-header">
              <button
                className="gc-icon-button"
                type="button"
                onClick={onBack || (() => {})}
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <h1>Gift Card Trade</h1>
              <div className="gc-header-right">
                <button
                  type="button"
                  className="gc-icon-button"
                  onClick={() => setShowGuidelines(true)}
                  aria-label="Trading rules"
                >
                  <HelpCircle size={20} color="#2563eb" />
                </button>
              </div>
            </header>

            {/* Top Quick Actions */}
            <div className="gc-action-row">
              <button
                className="gc-secondary-action"
                type="button"
                onClick={() => setActiveTab('wallet')}
              >
                <Wallet size={18} />
                Withdraw
              </button>
              <button
                className="gc-primary-action"
                type="button"
                onClick={() => handleStartSell()}
              >
                <Tag size={18} />
                Sell Now
              </button>
            </div>

            {/* Promo Banner Carousel */}
            <section className="gc-promo">
              <div
                className="gc-promo-track"
                style={{ transform: `translateX(-${slide * 100}%)` }}
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
                  <p>Use code VERXOR5 during checkout to enjoy an instant 5% bonus payout.</p>
                  <button type="button" onClick={() => handleStartSell()}>
                    Sell Now <ArrowRight size={15} />
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
                  <h2>Instant Payouts. Zero Hidden Fees.</h2>
                  <p>Bank transfers delivered directly to your OPay, PalmPay, or commercial bank within 5–15 mins.</p>
                  <button type="button" onClick={() => setShowGuidelines(true)}>
                    Read Rules <ArrowRight size={15} />
                  </button>
                </article>

                <article className="gc-promo-slide gc-promo-light">
                  <span className="gc-promo-chip blue">
                    <Zap size={13} /> HIGHEST RATES
                  </span>
                  <h2>Competitive Live Rates.</h2>
                  <p>Transparent rates locked in immediately when your card is submitted.</p>
                  <button type="button" onClick={() => handleStartSell()}>
                    Check Rates <ArrowRight size={15} />
                  </button>
                </article>
              </div>

              <div className="gc-promo-dots">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    className={slide === i ? 'active' : ''}
                    onClick={() => setSlide(i)}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </section>

            {/* Live Completed Trades Ticker */}
            <section className="gc-live-strip">
              <div className="gc-section-head">
                <h2>
                  <span className="gc-live-dot" />
                  Live Completed Trades
                </h2>
                <button type="button" onClick={() => setShowLiveTrades(true)}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              <div className="gc-live-scroll">
                {INITIAL_LIVE_TRADES.map((trade) => (
                  <div className="gc-mini-trade" key={trade.id}>
                    <span className="gc-mini-avatar">{trade.initials}</span>
                    <div>
                      <p>
                        {trade.user} sold {trade.brand}
                      </p>
                      <strong>{money(trade.amount)}</strong>
                      <small>{trade.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Search and Currency Filter */}
            <div style={{ marginBottom: 12 }}>
              <div className="gc-code-field" style={{ margin: '0 0 10px' }}>
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search gift card brand (e.g. Apple, Steam)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ border: 0, background: 'none', color: '#94a3b8' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="gc-currency-scroll">
                {CURRENCIES.map((item) => (
                  <button
                    key={item.id}
                    className={currency === item.id ? 'active' : ''}
                    type="button"
                    onClick={() => setCurrency(item.id)}
                  >
                    {item.flag && <span>{item.flag}</span>}
                    {item.id === 'ALL' ? 'All' : item.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands Catalog */}
            <section className="gc-popular">
              <div className="gc-section-head">
                <h2>Supported Gift Cards</h2>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  {filteredBrands.length} brands
                </span>
              </div>
              <div className="gc-brand-grid">
                {filteredBrands.map((item) => (
                  <article className="gc-brand-card" key={item.id}>
                    <BrandLogo id={item.id} large />
                    <div className="gc-brand-copy">
                      <h3>{item.name}</h3>
                      <p>$1 = {money(item.rate)}</p>
                    </div>
                    <button type="button" onClick={() => handleStartSell(item.id)}>
                      Sell <ArrowRight size={14} />
                    </button>
                    {item.popular && <span className="gc-popular-badge">Popular</span>}
                  </article>
                ))}
              </div>

              {filteredBrands.length === 0 && (
                <div className="gc-empty" style={{ minHeight: 200 }}>
                  <p>No gift cards found matching your search or currency filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrency('ALL');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================== TAB 2: SELL FORM ===================== */}
        {activeTab === 'sell' && (
          <div className="gc-screen gc-form-screen">
            <header className="gc-page-header">
              <button
                className="gc-icon-button"
                type="button"
                onClick={() => setActiveTab('trade')}
                aria-label="Back to catalog"
              >
                <ArrowLeft size={20} />
              </button>
              <h1>Sell Gift Card</h1>
              <div className="gc-header-right">
                <button
                  type="button"
                  className="gc-guidelines-link"
                  onClick={() => setShowGuidelines(true)}
                >
                  <ShieldCheck size={16} />
                  Rules
                </button>
              </div>
            </header>

            {/* Brand Banner & Selector */}
            <section className="gc-sell-brand">
              <div className="gc-sell-brand-main">
                <BrandLogo id={currentBrand.id} large />
                <div>
                  <b>{currentBrand.name}</b>
                  <small>{currentBrand.category}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value as BrandId)}
                    style={{
                      opacity: 0,
                      position: 'absolute',
                      inset: 0,
                      cursor: 'pointer',
                    }}
                    aria-label="Select card brand"
                  >
                    {BRANDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={20} color="#2563eb" />
                </div>
              </div>

              {/* Physical vs E-Gift Toggle */}
              <div className="gc-type-toggle">
                <button
                  type="button"
                  className={cardType === 'Physical' ? 'active' : ''}
                  onClick={() => setCardType('Physical')}
                >
                  {cardType === 'Physical' && <Check size={14} />} Physical Card
                </button>
                <button
                  type="button"
                  className={cardType === 'E-Gift' ? 'active' : ''}
                  onClick={() => setCardType('E-Gift')}
                >
                  {cardType === 'E-Gift' && <Check size={14} />} E-Code / Digital
                </button>
              </div>
            </section>

            {/* Live Rate Card */}
            <section className="gc-rate-card">
              <div className="gc-rate-icon">
                <Zap size={22} />
              </div>
              <div>
                <b>Live Exchange Rate</b>
                <small>
                  {cardType === 'Physical' ? 'Includes physical card bonus' : 'Standard digital code rate'}
                </small>
              </div>
              <div className="gc-rate-value">
                <small>LIVE RATE</small>
                <strong>$1 = {money(currentRate)}</strong>
              </div>
            </section>

            {/* Currency Selector */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                CARD CURRENCY
              </label>
              <div className="gc-currency-scroll" style={{ marginBottom: 0 }}>
                {currentBrand.currencies.map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    className={selectedCurrency === curr ? 'active' : ''}
                    onClick={() => setSelectedCurrency(curr)}
                    style={{ minWidth: 64, height: 42 }}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Denomination & Quantity */}
            <section className="gc-entry-card">
              <div className="gc-entry-title">
                <span>1</span>
                <b>Card Details & Denomination</b>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  Quick Select Face Value ($)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {[25, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setDenomination(val);
                        setCustomValue('');
                      }}
                      style={{
                        height: 38,
                        borderRadius: 10,
                        border: '1px solid',
                        borderColor: denomination === val && !customValue ? '#2563eb' : '#d9e3ef',
                        background: denomination === val && !customValue ? '#eff6ff' : '#fff',
                        color: denomination === val && !customValue ? '#2563eb' : '#334155',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gc-two-fields">
                <label>
                  <span>Custom Value ({selectedCurrency})</span>
                  <div>
                    <b>$</b>
                    <input
                      type="number"
                      placeholder="e.g. 75"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                    />
                  </div>
                </label>

                <label>
                  <span>Quantity</span>
                  <div className="gc-quantity">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <b>{quantity}</b>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </label>
              </div>

              {/* Code or PIN input */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Card Code / PIN (Required for E-Gift)
                </span>
                <div className="gc-code-field">
                  <Lock size={16} />
                  <input
                    type="text"
                    placeholder="Enter 16-digit card code or claim code"
                    value={cardCode}
                    onChange={(e) => setCardCode(e.target.value)}
                  />
                </div>
              </div>

              {/* Image Upload for Physical cards */}
              <div style={{ marginTop: 14 }}>
                <div className="gc-upload-title">
                  <ImageIcon size={16} />
                  <b>Upload Card & Receipt Photos</b>
                  <small>({imageFiles.length}/5)</small>
                </div>

                <div className="gc-upload-grid">
                  {imageFiles.map((url, idx) => (
                    <div className="gc-upload-slot" key={idx} style={{ borderStyle: 'solid' }}>
                      <img src={url} alt={`Card upload ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 0,
                          display: 'grid',
                          placeItems: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {imageFiles.length < 5 && (
                    <label className="gc-upload-slot" style={{ cursor: 'pointer' }}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                      <UploadCloud size={18} />
                      <span>+Add</span>
                    </label>
                  )}
                </div>
                <small style={{ color: '#94a3b8', fontSize: '10px', display: 'block', marginTop: 5 }}>
                  Ensure front, back, and receipt are clear and legible.
                </small>
              </div>
            </section>

            {/* Coupon Promo Row */}
            <button
              type="button"
              className={`gc-coupon-row ${appliedCoupon ? 'applied' : ''}`}
              onClick={() => setShowCouponModal(true)}
            >
              <div className="gc-coupon-icon">
                <Sparkles size={18} />
              </div>
              <div>
                <b>{appliedCoupon ? 'Coupon Applied: VERXOR5 (+5% Bonus)' : 'Have a Promo or Referral Code?'}</b>
                <small>{appliedCoupon ? 'Extra 5% added to your final payout' : 'Tap here to enter code'}</small>
              </div>
              <ChevronRight size={18} color="#16a34a" />
            </button>

            {/* Real-time Payout Breakdown */}
            <section className="gc-payout">
              <div className="gc-payout-head">
                <div className="gc-payout-icon">
                  <CheckCircle2 size={16} />
                </div>
                <b>Estimated Instant Payout</b>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                  5–15 mins settlement
                </span>
              </div>

              <div className="gc-payout-body">
                <div>
                  <small>Face Value Total</small>
                  <strong>${totalFaceValue.toFixed(2)} {selectedCurrency}</strong>
                  {appliedCoupon && (
                    <>
                      <small style={{ marginTop: 6 }}>Promo Bonus (+5%)</small>
                      <strong className="positive">+{money(bonusPayout)}</strong>
                    </>
                  )}
                </div>
                <i />
                <div>
                  <small>Exchange Rate</small>
                  <strong>$1 = {money(currentRate)}</strong>
                  <small style={{ marginTop: 6 }}>Final Payout Amount</small>
                  <strong className="gc-final">{money(totalPayout)}</strong>
                </div>
              </div>
            </section>

            {/* Submit Action Bar */}
            <div className="gc-submit-bar">
              <button
                type="button"
                onClick={() => {
                  setCardCode('');
                  setImageFiles([]);
                  setQuantity(1);
                  setDenomination(100);
                  setCustomValue('');
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSubmitTrade}
                disabled={isSubmitting || submitSuccess}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Verifying...
                  </>
                ) : submitSuccess ? (
                  <>
                    <Check size={16} /> Submitted!
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Submit Trade
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: HISTORY ===================== */}
        {activeTab === 'history' && (
          <div className="gc-screen gc-history-screen">
            <header className="gc-page-header">
              <button
                className="gc-icon-button"
                type="button"
                onClick={() => setActiveTab('trade')}
                aria-label="Back to trade"
              >
                <ArrowLeft size={20} />
              </button>
              <h1>Trade History</h1>
              <div className="gc-header-right">
                <button
                  type="button"
                  className="gc-icon-button"
                  onClick={() => handleStartSell()}
                  aria-label="Sell card"
                >
                  <Plus size={20} color="#2563eb" />
                </button>
              </div>
            </header>

            {/* Filter Tabs */}
            <div className="gc-history-tabs">
              {(['ALL', 'Processing', 'Completed', 'Rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={historyFilter === filter ? 'active' : ''}
                  onClick={() => setHistoryFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Trades List */}
            {filteredTrades.length > 0 ? (
              <div className="gc-history-list">
                {filteredTrades.map((t) => (
                  <div
                    className="gc-history-card"
                    key={t.id}
                    onClick={() => setSelectedTradeDetail(t)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>
                      <BrandLogo id={t.brandId} />
                    </span>
                    <div>
                      <b>{t.brandName}</b>
                      <small>
                        ${t.faceValue} {t.currency} · {t.cardType} · {t.createdAt}
                      </small>
                    </div>
                    <div>
                      <strong>{money(t.payoutNgn)}</strong>
                      <em
                        className={
                          t.status === 'Completed'
                            ? 'status-successful'
                            : t.status === 'Processing'
                            ? 'status-pending'
                            : 'status-rejected'
                        }
                      >
                        {t.status}
                      </em>
                    </div>
                    <ChevronRight size={18} color="#94a3b8" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="gc-empty">
                <div className="gc-empty-art">
                  <Tag size={64} />
                  <span>
                    <Check size={24} />
                  </span>
                </div>
                <h2>No Trades Found</h2>
                <p>You haven't submitted any gift cards under this status yet. Start a new trade today!</p>
                <button type="button" onClick={() => handleStartSell()}>
                  <Tag size={16} /> Sell Gift Card Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 4: WALLET ===================== */}
        {activeTab === 'wallet' && (
          <div className="gc-screen">
            <header className="gc-wallet-header">
              <button
                className="gc-icon-button"
                type="button"
                onClick={() => setActiveTab('trade')}
                aria-label="Back to trade"
              >
                <ArrowLeft size={20} />
              </button>
              <h1>Gift Card Earnings</h1>
              <div style={{ width: 42 }} />
            </header>

            {/* Balance Card */}
            <section className="gc-balance-card">
              <div className="gc-balance-top">
                <span>
                  <Wallet size={16} /> Available Earnings
                </span>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  aria-label="Toggle balance visibility"
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <strong>{showBalance ? money(walletBalance) : '₦••••••••'}</strong>

              <div className="gc-balance-bottom">
                <span>Instant Settlement to Bank</span>
                <em>
                  <CheckCircle2 size={13} /> Active
                </em>
              </div>
            </section>

            {/* Wallet Actions */}
            <div className="gc-wallet-actions">
              <button type="button" onClick={() => setShowWithdrawModal(true)}>
                <span>
                  <ArrowRight size={18} />
                </span>
                Withdraw to Bank
              </button>
              <button type="button" onClick={() => handleStartSell()}>
                <span>
                  <Tag size={18} />
                </span>
                Sell More Cards
              </button>
              <button type="button" onClick={() => setShowAddBankModal(true)}>
                <span>
                  <Plus size={18} />
                </span>
                Add Bank
              </button>
            </div>

            {/* Payout Destination Banks */}
            <section className="gc-wallet-section">
              <label>PAYOUT DESTINATION</label>
              {banks.map((b) => (
                <div className="gc-payout-destination" key={b.id}>
                  <div className="gc-destination-icon">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <b>
                      {b.bankName} · {b.accountNumber}
                    </b>
                    <small>{b.accountName}</small>
                  </div>
                  <div className="gc-radio" />
                </div>
              ))}

              <button
                type="button"
                className="gc-add-bank-link"
                onClick={() => setShowAddBankModal(true)}
              >
                <Plus size={15} /> Add Another Bank Account
              </button>
            </section>

            {/* Trading Safety Note */}
            <section className="gc-warning">
              <span>
                <Info size={20} />
              </span>
              <div>
                <b>Instant Wallet Credits</b>
                <small>
                  Funds earned from gift card trades are credited immediately to your earnings balance once cards are verified. You can withdraw 24/7.
                </small>
              </div>
            </section>
          </div>
        )}

        {/* ===================== BOTTOM NAVIGATION ===================== */}
        <nav className="gc-bottom-nav" aria-label="Gift card navigation">
          <button
            className={activeTab === 'trade' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('trade')}
          >
            <Tag size={20} />
            <span>Trade</span>
          </button>
          <button
            className={activeTab === 'sell' ? 'active' : ''}
            type="button"
            onClick={() => handleStartSell()}
          >
            <Plus size={20} />
            <span>Sell Card</span>
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>History</span>
          </button>
          <button
            className={activeTab === 'wallet' ? 'active' : ''}
            type="button"
            onClick={() => setActiveTab('wallet')}
          >
            <Wallet size={20} />
            <span>Wallet</span>
          </button>
        </nav>

        {/* ===================== MODALS & SHEETS ===================== */}

        {/* 1. Trading Guidelines Sheet */}
        {showGuidelines && (
          <div className="gc-overlay" onClick={() => setShowGuidelines(false)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2>Gift Card Trading Rules</h2>
                    <p>Read carefully before submitting your cards</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowGuidelines(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="gc-guide-list">
                <div className="gc-guide-row">
                  <span>1</span>
                  <div>
                    <b>Legible Images & Receipts</b>
                    <p>For physical cards, take clear photos of the back with the PIN scratched off, alongside the purchase receipt.</p>
                  </div>
                </div>
                <div className="gc-guide-row">
                  <span>2</span>
                  <div>
                    <b>Unredeemed Codes Only</b>
                    <p>Make sure the card has not been redeemed or checked on multiple third-party balance checkers before trading.</p>
                  </div>
                </div>
                <div className="gc-guide-row">
                  <span>3</span>
                  <div>
                    <b>Fast 5–15 Minute Verification</b>
                    <p>Automated and staff verification processes your card within 5 to 15 minutes. Payouts are credited instantly.</p>
                  </div>
                </div>
                <div className="gc-guide-row">
                  <span>4</span>
                  <div>
                    <b>Support & Escalation</b>
                    <p>If you experience any delay or need assistance, reach Verxor support on WhatsApp (+2348062362896).</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="gc-save-bank"
                style={{ marginTop: 20 }}
                onClick={() => setShowGuidelines(false)}
              >
                Got It, Let's Trade
              </button>
            </div>
          </div>
        )}

        {/* 2. Live Completed Trades Sheet */}
        {showLiveTrades && (
          <div className="gc-overlay" onClick={() => setShowLiveTrades(false)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon green">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2>Live Completed Trades</h2>
                    <p>Real-time verified trades across Verxor</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowLiveTrades(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="gc-live-list" style={{ marginTop: 14 }}>
                {INITIAL_LIVE_TRADES.concat([
                  { id: 'VX-GC-9265', user: 'R******n', initials: 'R', brand: 'Google Play', detail: 'USD 50 x 1', amount: 59000, time: '52 minutes ago' },
                  { id: 'VX-GC-9258', user: 'T****a', initials: 'T', brand: 'PlayStation Store', detail: 'USD 25 x 2', amount: 62500, time: '1 hour ago' },
                  { id: 'VX-GC-9250', user: 'A*****i', initials: 'A', brand: 'Apple / iTunes', detail: 'USD 100 x 2', amount: 271000, time: '1 hour ago' },
                ]).map((trade, i) => (
                  <div className="gc-live-full" key={trade.id + i}>
                    <div className={`gc-user-avatar avatar-${i % 4}`}>
                      <b>{trade.initials}</b>
                    </div>
                    <div className="gc-live-details">
                      <b>{trade.user} traded {trade.brand}</b>
                      <strong>{trade.detail}</strong>
                      <small>{trade.time}</small>
                    </div>
                    <div className="gc-live-payout">
                      <b>{money(trade.amount)}</b>
                      <span><CheckCircle2 size={10} /> Completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Promo Coupon Modal */}
        {showCouponModal && (
          <div className="gc-overlay" onClick={() => setShowCouponModal(false)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2>Apply Promo Coupon</h2>
                    <p>Enjoy extra percentage bonuses on your payout</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowCouponModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="gc-coupon-input">
                <Tag size={16} />
                <input
                  type="text"
                  placeholder="Enter code (e.g. VERXOR5)"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(coupon)}
                  style={{
                    border: 0,
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: '11px',
                  }}
                >
                  Apply
                </button>
              </div>

              <div className="gc-coupon-list">
                <button type="button" onClick={() => handleApplyCoupon('VERXOR5')}>
                  <div>
                    <b>VERXOR5</b>
                    <small>Get 5% extra bonus on every gift card trade</small>
                  </div>
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '12px' }}>USE</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Withdraw Modal */}
        {showWithdrawModal && (
          <div className="gc-overlay" onClick={() => setShowWithdrawModal(false)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2>Withdraw Earnings</h2>
                    <p>Available: {money(walletBalance)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowWithdrawModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 5 }}>
                  WITHDRAWAL AMOUNT (₦)
                </label>
                <div className="gc-code-field">
                  <b>₦</b>
                  <input
                    type="number"
                    placeholder="Enter amount (min ₦1,000)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(walletBalance))}
                    style={{
                      border: 0,
                      background: '#eff6ff',
                      color: '#2563eb',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    MAX
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 5 }}>
                    DESTINATION BANK
                  </label>
                  {banks.map((b) => (
                    <div className="gc-payout-destination" key={b.id} style={{ margin: '6px 0' }}>
                      <div className="gc-destination-icon">
                        <Wallet size={18} />
                      </div>
                      <div>
                        <b>{b.bankName} · {b.accountNumber}</b>
                        <small>{b.accountName}</small>
                      </div>
                      <div className="gc-radio" />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="gc-save-bank"
                  style={{ marginTop: 18 }}
                  onClick={handleWithdraw}
                  disabled={withdrawSuccess}
                >
                  {withdrawSuccess ? (
                    <>
                      <Check size={16} /> Withdrawal Sent!
                    </>
                  ) : (
                    'Confirm Instant Withdrawal'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Add Bank Account Modal */}
        {showAddBankModal && (
          <div className="gc-overlay" onClick={() => setShowAddBankModal(false)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h2>Add Bank Account</h2>
                    <p>For receiving instant gift card trade payouts</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAddBankModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddBank} style={{ marginTop: 14 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 5 }}>
                    SELECT BANK
                  </label>
                  <select
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    style={{
                      width: '100%',
                      height: 48,
                      borderRadius: 11,
                      border: '1px solid #d9e3ef',
                      padding: '0 12px',
                      background: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <option value="OPay">OPay</option>
                    <option value="PalmPay">PalmPay</option>
                    <option value="Kuda Bank">Kuda Bank</option>
                    <option value="Moniepoint">Moniepoint</option>
                    <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 5 }}>
                    10-DIGIT ACCOUNT NUMBER
                  </label>
                  <div className="gc-code-field">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 8141620644"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: 5 }}>
                    ACCOUNT NAME
                  </label>
                  <div className="gc-code-field">
                    <input
                      type="text"
                      placeholder={session?.name || 'DESTINY IKEDICHUKWU'}
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="gc-save-bank" style={{ marginTop: 16 }}>
                  Save Bank Account
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 6. Trade Detail / Receipt Modal */}
        {selectedTradeDetail && (
          <div className="gc-overlay" onClick={() => setSelectedTradeDetail(null)}>
            <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gc-sheet-handle" />
              <div className="gc-sheet-title">
                <div>
                  <div className="gc-sheet-icon">
                    <BrandLogo id={selectedTradeDetail.brandId} />
                  </div>
                  <div>
                    <h2>{selectedTradeDetail.brandName}</h2>
                    <p>Reference: {selectedTradeDetail.id}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedTradeDetail(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gap: 8,
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Status</span>
                    <strong style={{ color: selectedTradeDetail.status === 'Completed' ? '#16a34a' : '#d97706' }}>
                      {selectedTradeDetail.status}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Card Type</span>
                    <b>{selectedTradeDetail.cardType}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Face Value</span>
                    <b>${selectedTradeDetail.faceValue} {selectedTradeDetail.currency} x {selectedTradeDetail.totalCards}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Locked Rate</span>
                    <b>$1 = {money(selectedTradeDetail.rate)}</b>
                  </div>
                  {selectedTradeDetail.couponUsed && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Coupon Bonus</span>
                      <b style={{ color: '#16a34a' }}>+5% ({selectedTradeDetail.couponUsed})</b>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#1e293b', fontWeight: 700 }}>Total Payout</span>
                    <strong style={{ color: '#16a34a', fontSize: '15px' }}>
                      {money(selectedTradeDetail.payoutNgn)}
                    </strong>
                  </div>
                </div>

                {/* WhatsApp Support CTA */}
                <a
                  href="https://wa.me/2348062362896?text=Hello%20Verxor%20Support,%20I%20have%20an%20inquiry%20regarding%20my%20Gift%20Card%20Trade%20ID%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gc-guideline-banner"
                  style={{ marginTop: 14, textDecoration: 'none' }}
                >
                  <div className="gc-guideline-icon">
                    <ExternalLink size={18} />
                  </div>
                  <span>
                    <b>Need Help With This Trade?</b>
                    <small>Chat with Verxor Gift Card verification team on WhatsApp</small>
                  </span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
