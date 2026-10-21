'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Globe2,
  Lock,
  Phone,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
  Wifi,
  X,
} from 'lucide-react';
import './data-page.css';
import type { AuthSession } from './auth/AuthFlow';

export type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

export type CategoryId = 'hot' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface LivePlan {
  id: number;
  networkId: number;
  network: string;
  name: string;
  type: string;
  days: string;
  price: number;
}

interface NetworkOption {
  id: NetworkId;
  label: string;
  prefixHint: string;
}

interface RecentRecipient {
  phone: string;
  networkId: NetworkId;
  lastUsed: number;
}

const NETWORKS: NetworkOption[] = [
  { id: 'mtn', label: 'MTN', prefixHint: '0803, 0806, 0814...' },
  { id: 'airtel', label: 'Airtel', prefixHint: '0802, 0808, 0812...' },
  { id: 'glo', label: 'Glo', prefixHint: '0805, 0807, 0815...' },
  { id: '9mobile', label: '9mobile', prefixHint: '0809, 0817, 0818...' },
];

const CATEGORIES: { id: CategoryId; label: string; icon?: string }[] = [
  { id: 'hot', label: 'Hot deals', icon: '🔥' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const RECENT_KEY = 'verxor_data_recent_recipients_v1';
const MY_NUMBER = '08141620644';

function detectNetwork(raw: string): NetworkId | null {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234')) clean = '0' + clean.slice(3);
  if (clean.length < 4) return null;
  const prefix = clean.substring(0, 4);

  const map: Record<string, NetworkId> = {
    '0803': 'mtn', '0806': 'mtn', '0810': 'mtn', '0813': 'mtn',
    '0814': 'mtn', '0816': 'mtn', '0903': 'mtn', '0906': 'mtn',
    '0913': 'mtn', '0916': 'mtn', '0703': 'mtn', '0706': 'mtn',
    '0704': 'mtn', '0702': 'mtn',
    '0802': 'airtel', '0808': 'airtel', '0812': 'airtel',
    '0701': 'airtel', '0708': 'airtel', '0901': 'airtel',
    '0902': 'airtel', '0904': 'airtel', '0907': 'airtel',
    '0911': 'airtel', '0912': 'airtel',
    '0805': 'glo', '0807': 'glo', '0811': 'glo', '0815': 'glo',
    '0905': 'glo', '0915': 'glo', '0705': 'glo',
    '0809': '9mobile', '0817': '9mobile', '0818': '9mobile',
    '0908': '9mobile', '0909': '9mobile',
  };
  return map[prefix] ?? null;
}

function formatPhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDisplay(raw: string): string {
  const digits = formatPhone(raw);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function money(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function parseVolume(name: string): string {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)/i);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const numStr = Number.isInteger(num) ? `${num}` : `${num}`;
    return `${numStr} ${unit}`;
  }
  return name;
}

function parseValidity(days: string, name: string): string {
  const dStr = (days || '').trim().toLowerCase();
  const nStr = (name || '').trim().toLowerCase();

  const mNum = dStr.match(/\d+/);
  if (mNum) {
    const num = parseInt(mNum[0], 10);
    if (num === 1) return '1 Day';
    if (num <= 3 && num > 1) return `${num} Days`;
    if (num === 7) return '7 Days';
    if (num === 14) return '14 Days';
    if (num === 30) return '30 Days';
    if (num === 60) return '60 Days';
    if (num === 90) return '90 Days';
    if (num >= 365) return '1 Year';
    return `${num} Days`;
  }

  const matchInName = nStr.match(/(\d+)\s*(day|days|month|months|week|weeks|year|years)/i);
  if (matchInName) {
    const val = parseInt(matchInName[1], 10);
    const unit = matchInName[2].toLowerCase();
    if (unit.startsWith('year') || val >= 365) return '1 Year';
    if (unit.startsWith('month')) return val === 1 ? '30 Days' : `${val * 30} Days`;
    if (unit.startsWith('week')) return `${val * 7} Days`;
    return val === 1 ? '1 Day' : `${val} Days`;
  }

  if (nStr.includes('daily')) return '1 Day';
  if (nStr.includes('weekly')) return '7 Days';
  if (nStr.includes('monthly')) return '30 Days';
  if (nStr.includes('yearly') || nStr.includes('annual')) return '1 Year';

  return '30 Days';
}

function getPlanCategory(plan: LivePlan): Exclude<CategoryId, 'hot'> {
  const v = parseValidity(plan.days, plan.name).toLowerCase();
  const m = v.match(/\d+/);
  const d = m ? parseInt(m[0], 10) : 30;

  if (v.includes('year') || d >= 120) return 'yearly';
  if (d >= 15) return 'monthly';
  if (d >= 4) return 'weekly';
  return 'daily';
}

function NetworkLogo({ id, size = 48 }: { id: NetworkId; size?: number }) {
  const assets: Record<NetworkId, { src: string; alt: string }> = {
    mtn: { src: '/brand/networks/mtn.png', alt: 'MTN' },
    airtel: { src: '/brand/networks/airtel.png', alt: 'Airtel' },
    glo: { src: '/brand/networks/glo.png', alt: 'Glo' },
    '9mobile': { src: '/brand/networks/9mobile.png', alt: '9mobile' },
  };
  const asset = assets[id];

  return (
    <span
      className={`air-network-logo air-network-logo-${id}`}
      style={{ width: size, height: size }}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        width={size}
        height={size}
        draggable={false}
      />
    </span>
  );
}

export interface DataPageProps {
  onBack: () => void;
  session?: AuthSession | null;
  onFund?: () => void;
}

export function DataPage({ onBack, session, onFund }: DataPageProps) {
  const walletBalance = session?.balanceNgn ?? 0;
  const userAccountPhone = session?.user?.phone || MY_NUMBER;

  const [networkId, setNetworkId] = useState<NetworkId>('mtn');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('hot');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [livePlans, setLivePlans] = useState<LivePlan[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3400);
  }, []);

  // Load recent recipients from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentRecipients(parsed.slice(0, 3));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveRecentRecipient = useCallback((p: string, net: NetworkId) => {
    try {
      const clean = formatPhone(p);
      if (clean.length !== 11) return;
      const prev = recentRecipients.filter((r) => r.phone !== clean);
      const next: RecentRecipient[] = [
        { phone: clean, networkId: net, lastUsed: Date.now() },
        ...prev,
      ].slice(0, 3);
      setRecentRecipients(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, [recentRecipients]);

  const clearRecentRecipients = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_KEY);
      setRecentRecipients([]);
      showToast('Recent recipients cleared');
    } catch {
      // Ignore
    }
  }, [showToast]);

  /** Load live plans whenever network changes */
  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    setPlansError(null);
    setSelectedPlanId(null);

    fetch(`/api/v1/data/plans?network=${networkId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to load plans');
        }
        return (data.plans || []) as LivePlan[];
      })
      .then((plans) => {
        if (cancelled) return;
        setLivePlans(plans);
      })
      .catch((err) => {
        if (cancelled) return;
        setLivePlans([]);
        setPlansError(err instanceof Error ? err.message : 'Failed to load plans');
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    return () => {
      cancelled = true;
    };
  }, [networkId]);

  // Group plans into Hot deals, Daily, Weekly, Monthly, Yearly
  const categorizedPlans = useMemo(() => {
    const daily: LivePlan[] = [];
    const weekly: LivePlan[] = [];
    const monthly: LivePlan[] = [];
    const yearly: LivePlan[] = [];

    // Sort all plans ascending by price
    const sorted = [...livePlans].sort((a, b) => a.price - b.price);

    sorted.forEach((p) => {
      const cat = getPlanCategory(p);
      if (cat === 'daily') daily.push(p);
      else if (cat === 'weekly') weekly.push(p);
      else if (cat === 'yearly') yearly.push(p);
      else monthly.push(p);
    });

    // Curate Hot deals: select popular bundle volumes across categories
    const targetSizes = [
      '1 gb', '2 gb', '2.5 gb', '3 gb', '5 gb', '10 gb',
      '500 mb', '1.5 gb', '20 gb',
    ];
    const hot: LivePlan[] = [];
    const seenSizes = new Set<string>();

    for (const target of targetSizes) {
      const match = sorted.find((p) => {
        const vol = parseVolume(p.name).toLowerCase();
        return vol === target && !seenSizes.has(vol);
      });
      if (match) {
        hot.push(match);
        seenSizes.add(parseVolume(match.name).toLowerCase());
      }
    }

    // Fill up to 6-9 deals if not enough target sizes found
    if (hot.length < 6) {
      const remaining = sorted.filter((p) => !hot.some((h) => h.id === p.id));
      hot.push(...remaining.slice(0, 9 - hot.length));
    }

    hot.sort((a, b) => a.price - b.price);

    return {
      hot,
      daily,
      weekly,
      monthly,
      yearly,
    };
  }, [livePlans]);

  const currentCategoryPlans = useMemo(() => {
    return categorizedPlans[activeCategory] || [];
  }, [categorizedPlans, activeCategory]);

  // Set default selected plan when plans load or category changes
  useEffect(() => {
    if (currentCategoryPlans.length > 0) {
      if (!currentCategoryPlans.some((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(currentCategoryPlans[0].id);
      }
    } else if (activeCategory === 'hot' && livePlans.length > 0) {
      setSelectedPlanId(livePlans[0].id);
    } else {
      setSelectedPlanId(null);
    }
  }, [currentCategoryPlans, activeCategory, livePlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    return livePlans.find((p) => p.id === selectedPlanId) ?? null;
  }, [livePlans, selectedPlanId]);

  const phoneDigits = formatPhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);
  const price = selectedPlan?.price ?? 0;
  const insufficient = price > 0 && price > walletBalance;
  const deficit = insufficient ? price - walletBalance : 0;
  const formReady = phoneValid && !!selectedPlan;

  // Auto-detect network from phone number
  useEffect(() => {
    if (phoneDigits.length < 4) {
      setAutoDetected(false);
      return;
    }
    const detected = detectNetwork(phoneDigits);
    if (detected && detected !== networkId) {
      setNetworkId(detected);
      setAutoDetected(true);
    } else if (detected && detected === networkId) {
      setAutoDetected(true);
    }
  }, [phoneDigits, networkId]);

  const handlePhoneChange = (v: string) => {
    setPhone(v.replace(/[^\d+]/g, ''));
  };

  const handleApplyPhone = (num: string, net?: NetworkId) => {
    const formatted = formatPhone(num);
    setPhone(formatted);
    const detected = net || detectNetwork(formatted);
    if (detected) {
      setNetworkId(detected);
      setAutoDetected(true);
    }
    setPickerOpen(false);
  };

  const handleNetworkSelect = (id: NetworkId) => {
    setNetworkId(id);
    setAutoDetected(false);
  };

  const handlePurchase = async () => {
    if (!formReady || insufficient || submitting || !selectedPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: networkId,
          phone: phoneDigits,
          dataPlanId: selectedPlan.id,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        order?: { message?: string };
      };
      if (!res.ok || !data.ok) {
        showToast(data.error || 'Data purchase failed. Check balance and try again.');
        return;
      }
      saveRecentRecipient(phoneDigits, networkId);
      showToast(
        data.order?.message ||
          `🎉 ${selectedPlan.name} sent to ${formatPhoneDisplay(phoneDigits)}!`
      );
      setPhone('');
      setAutoDetected(false);
    } catch {
      showToast('Network error — please verify connection and try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFund = () => {
    if (onFund) {
      onFund();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('verxor:fund-wallet'));
    } else {
      showToast('Opening Fund Wallet...');
    }
  };

  const selectedNetObj = NETWORKS.find((n) => n.id === networkId) || NETWORKS[0];

  return (
    <div className="air-page">
      {/* Top bar with back, title, and wallet balance */}
      <header className="air-topbar">
        <button
          type="button"
          className="air-back"
          onClick={onBack}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="air-title-wrap">
          <h1 className="air-title">Buy Data</h1>
          <p className="air-subtitle">Instant mobile data bundles</p>
        </div>
        <button
          type="button"
          className="air-wallet-btn"
          onClick={handleFund}
          title="Wallet balance · Tap to fund"
        >
          <Wallet size={13} className="air-wallet-btn-icon" />
          <span>{money(walletBalance)}</span>
          <span className="air-wallet-plus">+</span>
        </button>
      </header>

      {/* Card 1: Network Selection */}
      <section className="air-section">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Wifi size={18} />
          </div>
          <div className="air-head-text">
            <h2>Select Network</h2>
            <p>Auto-detect works when you type number</p>
          </div>
        </div>

        <div className="air-networks" role="listbox" aria-label="Mobile networks">
          {NETWORKS.map((net) => {
            const isSelected = net.id === networkId;
            return (
              <button
                key={net.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`air-net air-net-${net.id}${isSelected ? ' selected' : ''}`}
                onClick={() => handleNetworkSelect(net.id)}
              >
                {isSelected && (
                  <span className="air-net-badge" aria-hidden>
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
                <div className="air-net-logo-wrap">
                  <NetworkLogo id={net.id} size={48} />
                </div>
                <span className="air-net-label">{net.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Card 2: Choose Data Bundle (Recharge Details) */}
      <section className="air-section air-details">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Globe2 size={18} />
          </div>
          <div className="air-head-text">
            <h2>Choose Data Bundle</h2>
            <p>Enter recipient and select bundle</p>
          </div>
        </div>

        {/* Recipient Phone Field */}
        <div className="air-field">
          <div className="air-field-header">
            <label htmlFor="data-phone-input" className="air-field-label">
              Phone Number
            </label>
            <div className="air-field-actions">
              <button
                type="button"
                className="air-pill-btn air-pill-btn-sparkle"
                onClick={() => handleApplyPhone(userAccountPhone)}
              >
                <Sparkles size={11} />
                <span>Use My Number</span>
              </button>
              <button
                type="button"
                className="air-pill-btn"
                onClick={() => setPickerOpen(true)}
              >
                <RotateCcw size={11} />
                <span>Recent</span>
              </button>
            </div>
          </div>

          <div
            className={`air-input-wrap${
              phoneDigits.length === 11 && !phoneValid ? ' air-input-error' : ''
            }`}
          >
            <div className="air-input-lead-icon" aria-hidden>
              <Phone size={15} />
            </div>
            <input
              id="data-phone-input"
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 0801 234 5678"
              value={formatPhoneDisplay(phone)}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={13}
            />
            {phone && (
              <button
                type="button"
                className="air-input-clear"
                onClick={() => {
                  setPhone('');
                  setAutoDetected(false);
                }}
                aria-label="Clear phone number"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {autoDetected && phoneValid && (
            <div className="air-autodetect-hint">
              <Check size={11} />
              <span>Network auto-detected as {selectedNetObj.label}</span>
            </div>
          )}
        </div>

        {/* Category Tabs: Hot deals, Daily, Weekly, Monthly, Yearly */}
        <div className="data-tabs-wrap">
          <div className="data-tabs" role="tablist" aria-label="Data bundle validity">
            {CATEGORIES.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`data-tab${isActive ? ' active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.icon && <span className="data-tab-icon">{cat.icon}</span>}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bundle Cards Grid (3 Columns Moniepoint & OPay style) */}
        {loadingPlans ? (
          <div className="data-bundles-grid data-bundles-skeleton" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="data-bundle-card skeleton">
                <div className="skel-vol" />
                <div className="skel-val" />
                <div className="skel-pill" />
              </div>
            ))}
          </div>
        ) : plansError ? (
          <div className="data-empty-state error">
            <p>{plansError}</p>
            <button
              type="button"
              className="air-pill-btn"
              onClick={() => {
                setLoadingPlans(true);
                setPlansError(null);
                fetch(`/api/v1/data/plans?network=${networkId}`)
                  .then((r) => r.json())
                  .then((d) => setLivePlans(d.plans || []))
                  .catch((e) => setPlansError(e.message))
                  .finally(() => setLoadingPlans(false));
              }}
            >
              Retry
            </button>
          </div>
        ) : currentCategoryPlans.length === 0 ? (
          <div className="data-empty-state">
            <p>
              No {CATEGORIES.find((c) => c.id === activeCategory)?.label.toLowerCase()} plans currently listed for {selectedNetObj.label}.
            </p>
            <div className="data-empty-actions">
              <button
                type="button"
                className="air-pill-btn air-pill-btn-sparkle"
                onClick={() => setActiveCategory('monthly')}
              >
                View Monthly Bundles
              </button>
              <button
                type="button"
                className="air-pill-btn"
                onClick={() => setActiveCategory('hot')}
              >
                View Hot Deals
              </button>
            </div>
          </div>
        ) : (
          <div className="data-bundles-grid" role="radiogroup" aria-label="Available data plans">
            {currentCategoryPlans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              const volume = parseVolume(plan.name);
              const validity = parseValidity(plan.days, plan.name);
              const isHot = activeCategory === 'hot';

              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`data-bundle-card${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {isSelected && (
                    <span className="data-bundle-check" aria-hidden>
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                  {isHot && (
                    <span className="data-bundle-hot-badge">HOT</span>
                  )}
                  <strong className="data-bundle-volume">{volume}</strong>
                  <span className="data-bundle-validity">{validity}</span>
                  <span className="data-bundle-pay-pill">
                    Pay {money(plan.price)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Plan Summary Row */}
        {selectedPlan && (
          <div className="data-summary">
            <div className="data-summary-left">
              <div className="data-summary-plan">
                {selectedNetObj.label} · {parseVolume(selectedPlan.name)} ({parseValidity(selectedPlan.days, selectedPlan.name)})
              </div>
              <div className="data-summary-recipient">
                To: {phoneDigits ? formatPhoneDisplay(phoneDigits) : 'Recipient number'}
              </div>
            </div>
            <div className="data-summary-price">
              {money(selectedPlan.price)}
            </div>
          </div>
        )}

        {/* Insufficient Balance Notice */}
        {insufficient && formReady && (
          <div className="air-summary-warn">
            <div className="air-warn-text">
              <strong>Insufficient Balance:</strong> Need {money(deficit)} more
              (Available: {money(walletBalance)})
            </div>
            <button
              type="button"
              className="air-warn-fund-btn"
              onClick={handleFund}
            >
              Fund Wallet
            </button>
          </div>
        )}

        {/* Main CTA Button */}
        {insufficient && formReady ? (
          <button
            type="button"
            className="air-cta air-cta-fund"
            onClick={handleFund}
          >
            <Wallet size={16} />
            <span>Fund Wallet · Need {money(deficit)}</span>
          </button>
        ) : (
          <button
            type="button"
            className="air-cta"
            disabled={!formReady || submitting || loadingPlans}
            onClick={handlePurchase}
          >
            <Lock size={15} />
            <span>
              {submitting
                ? 'Processing Order...'
                : !phoneDigits
                ? 'Enter Phone Number'
                : !phoneValid
                ? 'Enter a Valid Number'
                : !selectedPlan
                ? (loadingPlans ? 'Loading Plans...' : 'Select a Data Plan')
                : `Buy Data · Pay ${money(price)}`}
            </span>
          </button>
        )}
      </section>

      {/* Card 3: Instant Delivery Trust Card */}
      <div className="air-trust">
        <div className="air-trust-icon" aria-hidden>
          <ShieldCheck size={20} />
        </div>
        <div className="air-trust-body">
          <h3>Instant Delivery</h3>
          <p>
            Data bundles are credited immediately to the recipient line after successful payment.
          </p>
        </div>
      </div>

      {/* Recipient Picker Modal */}
      {pickerOpen && (
        <div className="air-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="air-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Choose recipient"
          >
            <div className="air-modal-header">
              <div className="air-modal-title-wrap">
                <h3>Choose Recipient</h3>
                <p>Pick from your account or recent recharges</p>
              </div>
              <button
                type="button"
                className="air-modal-close"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div className="air-modal-list">
              <div className="air-modal-group-label">YOUR ACCOUNT</div>
              <button
                type="button"
                className="air-modal-item"
                onClick={() => handleApplyPhone(userAccountPhone)}
              >
                <div className="air-modal-item-icon account">
                  <User size={16} />
                </div>
                <div className="air-modal-item-info">
                  <div className="air-modal-item-top">
                    <span className="air-modal-item-name">Account Number</span>
                    <span className="air-modal-item-badge">You</span>
                  </div>
                  <div className="air-modal-item-phone">
                    {formatPhoneDisplay(userAccountPhone)}
                  </div>
                </div>
              </button>

              <div className="air-modal-group-header-row">
                <div className="air-modal-group-label">RECENT RECHARGES</div>
                {recentRecipients.length > 0 && (
                  <button
                    type="button"
                    className="air-modal-clear-link"
                    onClick={clearRecentRecipients}
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {recentRecipients.length === 0 ? (
                <div className="air-modal-empty">
                  No recent recharges yet. Numbers you recharge will appear here.
                </div>
              ) : (
                recentRecipients.map((rec) => {
                  const net = NETWORKS.find((n) => n.id === rec.networkId);
                  return (
                    <button
                      key={rec.phone}
                      type="button"
                      className="air-modal-item"
                      onClick={() => handleApplyPhone(rec.phone, rec.networkId)}
                    >
                      <div className="air-modal-item-icon recent">
                        <RotateCcw size={15} />
                      </div>
                      <div className="air-modal-item-info">
                        <div className="air-modal-item-top">
                          <span className="air-modal-item-name">
                            {net?.label || 'Phone Number'}
                          </span>
                          <span className="air-modal-item-date">
                            {new Date(rec.lastUsed).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="air-modal-item-phone">
                          {formatPhoneDisplay(rec.phone)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && <div className="air-toast">{toast}</div>}
    </div>
  );
}
