'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  Phone,
  Rocket,
  Wallet,
  Zap,
} from 'lucide-react';
import './data-page.css';

/* ──────────────────────────────────────────
   Types
────────────────────────────────────────── */
type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

type PlanType =
  | 'SME'
  | 'SME2'
  | 'GIFTING'
  | 'SHARE'
  | 'CORPORATE'
  | 'COUPON';

type DataPlan = {
  id: string;
  size: string;
  validity: string;
  price: number;
  badge?: 'Best Value' | 'Hot' | 'Popular';
};

type Network = {
  id: NetworkId;
  label: string;
  color: string;
  bg: string;
};

/* ──────────────────────────────────────────
   Constants
────────────────────────────────────────── */
const NETWORKS: Network[] = [
  { id: 'mtn', label: 'MTN', color: '#1A1A1A', bg: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', color: '#FFFFFF', bg: '#E60000' },
  { id: 'glo', label: 'Glo', color: '#FFFFFF', bg: '#00A651' },
  { id: '9mobile', label: '9mobile', color: '#FFFFFF', bg: '#006F3C' },
];

/** Dynamic tabs per network — only render what exists */
const NETWORK_PLAN_TYPES: Record<NetworkId, PlanType[]> = {
  mtn: ['SME', 'SME2', 'GIFTING', 'SHARE', 'CORPORATE', 'COUPON'],
  airtel: ['SME', 'GIFTING', 'SHARE', 'CORPORATE', 'COUPON'],
  glo: ['SME', 'GIFTING', 'CORPORATE'],
  '9mobile': ['SME', 'GIFTING', 'CORPORATE'],
};

/** Sample catalogue — replace with live API payload in Phase 1 */
const DATA_CATALOG: Record<NetworkId, Partial<Record<PlanType, DataPlan[]>>> = {
  mtn: {
    SME: [
      { id: 'mtn-sme-1', size: '1GB', validity: '30 Days', price: 280, badge: 'Best Value' },
      { id: 'mtn-sme-2', size: '2GB', validity: '30 Days', price: 560, badge: 'Best Value' },
      { id: 'mtn-sme-5', size: '5GB', validity: '30 Days', price: 1400 },
      { id: 'mtn-sme-10', size: '10GB', validity: '30 Days', price: 2800 },
      { id: 'mtn-sme-15', size: '15GB', validity: '30 Days', price: 4200 },
      { id: 'mtn-sme-20', size: '20GB', validity: '30 Days', price: 5500 },
    ],
    SME2: [
      { id: 'mtn-sme2-1', size: '1.5GB', validity: '30 Days', price: 350 },
      { id: 'mtn-sme2-3', size: '3GB', validity: '30 Days', price: 700 },
    ],
    GIFTING: [
      { id: 'mtn-gift-1', size: '1GB', validity: '7 Days', price: 350 },
      { id: 'mtn-gift-3', size: '3.5GB', validity: '30 Days', price: 1200 },
      { id: 'mtn-gift-5', size: '5GB', validity: '30 Days', price: 1800 },
    ],
    SHARE: [
      { id: 'mtn-share-1', size: '1GB', validity: '30 Days', price: 300 },
      { id: 'mtn-share-2', size: '2GB', validity: '30 Days', price: 600 },
    ],
    CORPORATE: [
      { id: 'mtn-corp-1', size: '1GB', validity: '30 Days', price: 290 },
      { id: 'mtn-corp-5', size: '5GB', validity: '30 Days', price: 1450 },
      { id: 'mtn-corp-10', size: '10GB', validity: '30 Days', price: 2900 },
    ],
    COUPON: [
      { id: 'mtn-cpn-1', size: '1GB', validity: '30 Days', price: 275 },
      { id: 'mtn-cpn-2', size: '2GB', validity: '30 Days', price: 540 },
    ],
  },
  airtel: {
    SME: [
      { id: 'air-sme-1', size: '1GB', validity: '30 Days', price: 285, badge: 'Best Value' },
      { id: 'air-sme-2', size: '2GB', validity: '30 Days', price: 570, badge: 'Best Value' },
      { id: 'air-sme-5', size: '5GB', validity: '30 Days', price: 1425 },
      { id: 'air-sme-10', size: '10GB', validity: '30 Days', price: 2850 },
    ],
    GIFTING: [
      { id: 'air-gift-1', size: '1GB', validity: '7 Days', price: 360 },
      { id: 'air-gift-3', size: '3GB', validity: '30 Days', price: 1100 },
    ],
    SHARE: [
      { id: 'air-share-1', size: '1GB', validity: '30 Days', price: 310 },
    ],
    CORPORATE: [
      { id: 'air-corp-1', size: '1GB', validity: '30 Days', price: 295 },
      { id: 'air-corp-5', size: '5GB', validity: '30 Days', price: 1475 },
    ],
    COUPON: [
      { id: 'air-cpn-1', size: '1GB', validity: '30 Days', price: 280 },
    ],
  },
  glo: {
    SME: [
      { id: 'glo-sme-1', size: '1GB', validity: '30 Days', price: 275, badge: 'Best Value' },
      { id: 'glo-sme-2', size: '2GB', validity: '30 Days', price: 550 },
      { id: 'glo-sme-5', size: '5GB', validity: '30 Days', price: 1375 },
      { id: 'glo-sme-10', size: '10GB', validity: '30 Days', price: 2750 },
    ],
    GIFTING: [
      { id: 'glo-gift-1', size: '1GB', validity: '14 Days', price: 340 },
      { id: 'glo-gift-3', size: '3GB', validity: '30 Days', price: 1050 },
    ],
    CORPORATE: [
      { id: 'glo-corp-1', size: '1GB', validity: '30 Days', price: 285 },
      { id: 'glo-corp-5', size: '5GB', validity: '30 Days', price: 1420 },
    ],
  },
  '9mobile': {
    SME: [
      { id: '9m-sme-1', size: '1GB', validity: '30 Days', price: 290, badge: 'Best Value' },
      { id: '9m-sme-2', size: '2GB', validity: '30 Days', price: 580 },
      { id: '9m-sme-5', size: '5GB', validity: '30 Days', price: 1450 },
    ],
    GIFTING: [
      { id: '9m-gift-1', size: '1GB', validity: '7 Days', price: 370 },
    ],
    CORPORATE: [
      { id: '9m-corp-1', size: '1GB', validity: '30 Days', price: 300 },
      { id: '9m-corp-5', size: '5GB', validity: '30 Days', price: 1500 },
    ],
  },
};

const MY_NUMBER = '08141620644';
const WALLET_BALANCE = 7570;

/* ──────────────────────────────────────────
   Utils
────────────────────────────────────────── */
function detectNetwork(raw: string): NetworkId | null {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234')) clean = '0' + clean.slice(3);
  if (clean.length < 4) return null;
  const prefix = clean.substring(0, 4);

  const map: Record<string, NetworkId> = {
    // MTN
    '0803': 'mtn', '0806': 'mtn', '0810': 'mtn', '0813': 'mtn',
    '0814': 'mtn', '0816': 'mtn', '0903': 'mtn', '0906': 'mtn',
    '0913': 'mtn', '0916': 'mtn', '0703': 'mtn', '0706': 'mtn',
    // Airtel (includes 0911)
    '0802': 'airtel', '0808': 'airtel', '0812': 'airtel',
    '0701': 'airtel', '0708': 'airtel', '0901': 'airtel',
    '0902': 'airtel', '0904': 'airtel', '0907': 'airtel',
    '0911': 'airtel', '0912': 'airtel',
    // Glo
    '0805': 'glo', '0807': 'glo', '0811': 'glo', '0815': 'glo',
    '0905': 'glo', '0915': 'glo', '0705': 'glo',
    // 9mobile
    '0809': '9mobile', '0817': '9mobile', '0818': '9mobile',
    '0908': '9mobile', '0909': '9mobile',
  };
  return map[prefix] ?? null;
}

function formatPhone(raw: string) {
  return raw.replace(/\D/g, '').slice(0, 11);
}

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function moneyFull(n: number) {
  return (
    '\u20a6' +
    n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/* ──────────────────────────────────────────
   Network logo (inline SVG for crispness)
────────────────────────────────────────── */
function NetworkLogo({ id, size = 28 }: { id: NetworkId; size?: number }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const domain: Record<NetworkId, string> = {
    mtn: 'mtn.ng',
    airtel: 'airtel.com.ng',
    glo: 'gloworld.com',
    '9mobile': '9mobile.com.ng',
  };

  if (!logoFailed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain[id]}&sz=128`}
        alt={`${id === '9mobile' ? '9mobile' : id.toUpperCase()} network logo`}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setLogoFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    );
  }
  const s = { width: size, height: size, viewBox: '0 0 40 40' };
  switch (id) {
    case 'mtn':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#FFCC00" />
          <text x="20" y="25" textAnchor="middle" fill="#1A1A1A" fontSize="11" fontWeight="800" fontFamily="Inter, system-ui, sans-serif">
            MTN
          </text>
        </svg>
      );
    case 'airtel':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#E60000" />
          <path
            d="M20 10c-3.5 0-6 2.2-6 5.2 0 2.4 1.4 4.4 3.5 5.4L14 30h4.2l2.2-6.2c.2 0 .4.05.6.05.2 0 .4 0 .6-.05L23.8 30H28l-3.5-9.4c2.1-1 3.5-3 3.5-5.4 0-3-2.5-5.2-6-5.2zm0 3.2c1.7 0 2.9 1.1 2.9 2.6S21.7 18.4 20 18.4s-2.9-1.1-2.9-2.6 1.2-2.6 2.9-2.6z"
            fill="#fff"
          />
        </svg>
      );
    case 'glo':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#00A651" />
          <circle cx="20" cy="20" r="10" fill="none" stroke="#fff" strokeWidth="2.2" />
          <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            glo
          </text>
        </svg>
      );
    case '9mobile':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#006F3C" />
          <text x="20" y="26" textAnchor="middle" fill="#FFD100" fontSize="18" fontWeight="800" fontFamily="Inter, system-ui, sans-serif">
            9
          </text>
        </svg>
      );
    default:
      return <span className="data-mark-fallback">?</span>;
  }
}

/* ──────────────────────────────────────────
   Page
────────────────────────────────────────── */
export function DataPage({ onBack }: { onBack: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId>('mtn');
  const [planType, setPlanType] = useState<PlanType>('SME');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const availableTypes = NETWORK_PLAN_TYPES[networkId];
  const plans = DATA_CATALOG[networkId]?.[planType] ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  const phoneDigits = formatPhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);
  const price = selectedPlan?.price ?? 0;
  const insufficient = price > 0 && price > WALLET_BALANCE;
  const formReady = phoneValid && !!selectedPlan;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  /* Auto-detect network from typed number */
  useEffect(() => {
    if (phoneDigits.length < 4) {
      setAutoDetected(false);
      return;
    }
    const detected = detectNetwork(phoneDigits);
    if (detected) {
      setNetworkId(detected);
      setAutoDetected(true);
    }
  }, [phoneDigits]);

  /* Keep planType valid when network changes */
  useEffect(() => {
    if (!availableTypes.includes(planType)) {
      setPlanType(availableTypes[0]);
    }
  }, [networkId, availableTypes, planType]);

  /* Auto-select first plan when type/network changes */
  useEffect(() => {
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    } else {
      setSelectedPlanId('');
    }
  }, [networkId, planType, plans]);

  const handlePhoneChange = (v: string) => {
    setPhone(v.replace(/[^\d+]/g, ''));
  };

  const handleUseMyNumber = () => {
    setPhone(MY_NUMBER);
    const d = detectNetwork(MY_NUMBER);
    if (d) {
      setNetworkId(d);
      setAutoDetected(true);
    }
  };

  const handleNetworkSelect = (id: NetworkId) => {
    setNetworkId(id);
    setAutoDetected(false);
  };

  const handlePurchase = async () => {
    if (!formReady || insufficient || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    showToast(`${selectedPlan?.size} sent to ${phoneDigits}`);
    setPhone('');
    setSelectedPlanId('');
    setAutoDetected(false);
  };

  const handleFund = () => showToast('Opening Fund Wallet...');

  /* CTA state machine */
  let ctaLabel = 'Purchase Data Plan';
  let ctaAction: () => void | Promise<void> = handlePurchase;
  let ctaDisabled = submitting || !formReady;
  let ctaClass = 'data-cta';

  if (insufficient && formReady) {
    ctaLabel = 'Fund Wallet';
    ctaAction = handleFund;
    ctaClass = 'data-cta data-cta-fund';
    ctaDisabled = false;
  } else if (!phoneDigits) {
    ctaLabel = 'Enter phone number';
  } else if (!phoneValid) {
    ctaLabel = 'Enter a valid number';
  } else if (!selectedPlan) {
    ctaLabel = 'Select a data plan';
  } else if (submitting) {
    ctaLabel = 'Processing...';
  }

  return (
    <div className="data-page">
      {/* ── Header ── */}
      <header className="data-topbar">
        <button type="button" className="data-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="data-title-wrap">
          <h1 className="data-title">Buy Data Bundle</h1>
          <p className="data-subtitle">Fast • Secure • Reliable</p>
        </div>
        <button type="button" className="data-wallet-btn" aria-label="Wallet" onClick={handleFund}>
          <Wallet size={18} strokeWidth={2.2} />
        </button>
      </header>

      {/* ── Balance Card ── */}
      <section className="data-balance-card" aria-label="Wallet balance">
        <div className="data-balance-left">
          <span className="data-balance-label">Wallet Balance</span>
          <strong className="data-balance-amount">{moneyFull(WALLET_BALANCE)}</strong>
          <button type="button" className="data-quick-topup" onClick={handleFund}>
            <Zap size={12} strokeWidth={2.5} /> Quick Topup
          </button>
        </div>
        <div className="data-balance-art" aria-hidden>
          <div className="data-wallet-glow">
            <Wallet size={36} strokeWidth={1.6} />
            <span className="data-naira-badge">₦</span>
          </div>
          <ArrowRight size={16} className="data-balance-chevron" />
        </div>
      </section>

      {/* ── Network Selector ── */}
      <section className="data-section">
        <div className="data-section-head">
          <h2>Select Network</h2>
          <p>
            {autoDetected
              ? `Detected ${NETWORKS.find((n) => n.id === networkId)?.label} from your number`
              : 'Choose your preferred network'}
          </p>
        </div>
        <div className="data-networks" role="listbox" aria-label="Mobile networks">
          {NETWORKS.map((net) => {
            const selected = networkId === net.id;
            return (
              <button
                key={net.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? 'data-net selected' : 'data-net'}
                onClick={() => handleNetworkSelect(net.id)}
              >
                {selected && (
                  <span className="data-net-check" aria-hidden>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <span className="data-net-logo">
                  <NetworkLogo id={net.id} size={40} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Plan Type Segment ── */}
      <div className="data-segment" role="tablist" aria-label="Plan type">
        {availableTypes.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={planType === type}
            className={planType === type ? 'data-seg-btn active' : 'data-seg-btn'}
            onClick={() => setPlanType(type)}
          >
            {type === 'SME2' ? 'SME 2' : type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* ── Phone Input ── */}
      <section className="data-section data-phone-section">
        <div className="data-section-head">
          <h2>Recipient Number</h2>
          <p>Who should receive this data?</p>
        </div>
        <div className={phoneDigits && !phoneValid ? 'data-input-wrap is-error' : 'data-input-wrap'}>
          <Phone size={16} className="data-input-icon" aria-hidden />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08012345678"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            aria-label="Recipient phone number"
          />
          <button type="button" className="data-use-mine" onClick={handleUseMyNumber}>
            Use My Number
          </button>
        </div>
        {phoneDigits && !phoneValid && (
          <p className="data-field-error" role="alert">
            Enter a valid 11-digit Nigerian number
          </p>
        )}
      </section>

      {/* ── Data Bundles Grid ── */}
      <section className="data-section">
        <div className="data-section-head">
          <h2>Data Bundles</h2>
          <p>Select a bundle and get online instantly</p>
        </div>

        {plans.length === 0 ? (
          <div className="data-empty">
            No {planType} plans available for this network right now.
          </div>
        ) : (
          <div className="data-plans-grid">
            {plans.map((plan) => {
              const active = selectedPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={active ? 'data-plan-card active' : 'data-plan-card'}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {plan.badge && (
                    <span className="data-plan-badge">{plan.badge}</span>
                  )}
                  <span className="data-plan-icon" aria-hidden>
                    <Globe2 size={14} strokeWidth={2.2} />
                  </span>
                  <strong className="data-plan-size">{plan.size}</strong>
                  <span className="data-plan-validity">{plan.validity}</span>
                  <span className="data-plan-price">{money(plan.price)}</span>
                  <ArrowRight size={14} className="data-plan-arrow" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Summary (when plan selected) ── */}
      {selectedPlan && (
        <div className="data-summary">
          <span>
            {selectedPlan.size} · {selectedPlan.validity}
          </span>
          <strong>{moneyFull(selectedPlan.price)}</strong>
          {insufficient && (
            <p className="data-summary-warn">
              Insufficient balance · Wallet {moneyFull(WALLET_BALANCE)}
            </p>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      <button
        type="button"
        className={ctaClass}
        disabled={ctaDisabled}
        onClick={ctaAction}
      >
        {insufficient && formReady ? (
          <>
            <Wallet size={18} strokeWidth={2.2} /> {ctaLabel}
          </>
        ) : (
          <>
            <Rocket size={16} strokeWidth={2.2} /> {ctaLabel}
          </>
        )}
      </button>

      {/* ── Trust ── */}
      <div className="data-trust">
        <span className="data-trust-icon" aria-hidden>
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <strong>Instant Delivery</strong>
          <p>Data is delivered immediately after successful payment.</p>
        </div>
      </div>

      {toast && (
        <div className="data-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
