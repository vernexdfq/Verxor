'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

type LivePlan = {
  id: number;
  networkId: number;
  network: string;
  name: string;
  type: string;
  days: string;
  price: number;
};

type Network = {
  id: NetworkId;
  label: string;
  color: string;
  bg: string;
};

const NETWORKS: Network[] = [
  { id: 'mtn', label: 'MTN', color: '#1A1A1A', bg: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', color: '#FFFFFF', bg: '#E60000' },
  { id: 'glo', label: 'Glo', color: '#FFFFFF', bg: '#00A651' },
  { id: '9mobile', label: '9mobile', color: '#FFFFFF', bg: '#006F3C' },
];

const MY_NUMBER = '08141620644';
const WALLET_BALANCE = 7570;

function detectNetwork(raw: string): NetworkId | null {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234')) clean = '0' + clean.slice(3);
  if (clean.length < 4) return null;
  const prefix = clean.substring(0, 4);

  const map: Record<string, NetworkId> = {
    '0803': 'mtn', '0806': 'mtn', '0810': 'mtn', '0813': 'mtn',
    '0814': 'mtn', '0816': 'mtn', '0903': 'mtn', '0906': 'mtn',
    '0913': 'mtn', '0916': 'mtn', '0703': 'mtn', '0706': 'mtn',
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

function normalizeType(raw: string): string {
  const t = String(raw || 'SME').trim().toUpperCase();
  if (t.includes('SME') && t.includes('2')) return 'SME2';
  if (t.includes('GIFT')) return 'GIFTING';
  if (t.includes('SHARE')) return 'SHARE';
  if (t.includes('CORP')) return 'CORPORATE';
  if (t.includes('COUP')) return 'COUPON';
  if (t.includes('SME')) return 'SME';
  return t || 'SME';
}

function typeLabel(t: string): string {
  if (t === 'SME2') return 'SME 2';
  return t.charAt(0) + t.slice(1).toLowerCase();
}

function NetworkLogo({ id, size = 28 }: { id: NetworkId; size?: number }) {
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

export function DataPage({ onBack }: { onBack: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId>('mtn');
  const [planType, setPlanType] = useState<string>('SME');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [livePlans, setLivePlans] = useState<LivePlan[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

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
        const types = Array.from(
          new Set(plans.map((p) => normalizeType(p.type))),
        );
        const nextType = types.includes(planType) ? planType : types[0] || 'SME';
        setPlanType(nextType);
        const filtered = plans.filter((p) => normalizeType(p.type) === nextType);
        if (filtered[0]) setSelectedPlanId(filtered[0].id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [networkId]);

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(livePlans.map((p) => normalizeType(p.type))));
    return types.length > 0 ? types : ['SME'];
  }, [livePlans]);

  const plans = useMemo(
    () => livePlans.filter((p) => normalizeType(p.type) === planType),
    [livePlans, planType],
  );

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  useEffect(() => {
    if (!availableTypes.includes(planType)) {
      setPlanType(availableTypes[0]);
    }
  }, [availableTypes, planType]);

  useEffect(() => {
    if (plans.length > 0) {
      if (!plans.some((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(plans[0].id);
      }
    } else {
      setSelectedPlanId(null);
    }
  }, [plans, selectedPlanId]);

  const phoneDigits = formatPhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);
  const price = selectedPlan?.price ?? 0;
  const insufficient = price > 0 && price > WALLET_BALANCE;
  const formReady = phoneValid && !!selectedPlan;

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
      const data = await res.json().catch(() => ({} as { ok?: boolean; error?: string; order?: { message?: string } }));
      if (!res.ok || !data.ok) {
        showToast(data.error || 'Data purchase failed');
        return;
      }
      showToast(data.order?.message || `${selectedPlan.name} sent to ${phoneDigits}`);
      setPhone('');
      setAutoDetected(false);
    } catch {
      showToast('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFund = () => showToast('Opening Fund Wallet...');

  let ctaLabel = 'Purchase Data Plan';
  let ctaAction: () => void | Promise<void> = handlePurchase;
  let ctaDisabled = submitting || !formReady || loadingPlans;
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
    ctaLabel = loadingPlans ? 'Loading plans...' : 'Select a data plan';
  } else if (submitting) {
    ctaLabel = 'Processing...';
  }

  return (
    <div className="data-page">
      <header className="data-topbar">
        <button type="button" className="data-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="data-title-wrap">
          <h1 className="data-title">Buy Data Bundle</h1>
          <p className="data-subtitle">Fast · Secure · Live prices</p>
        </div>
        <button type="button" className="data-wallet-btn" aria-label="Wallet" onClick={handleFund}>
          <Wallet size={18} strokeWidth={2.2} />
        </button>
      </header>

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
            {typeLabel(type)}
          </button>
        ))}
      </div>

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

      <section className="data-section">
        <div className="data-section-head">
          <h2>Data Bundles</h2>
          <p>
            {loadingPlans
              ? 'Loading live prices from provider…'
              : 'Select a bundle and get online instantly'}
          </p>
        </div>

        {loadingPlans ? (
          <div className="data-empty">Loading plans…</div>
        ) : plansError ? (
          <div className="data-empty">{plansError}</div>
        ) : plans.length === 0 ? (
          <div className="data-empty">
            No {typeLabel(planType)} plans available for this network right now.
          </div>
        ) : (
          <div className="data-plans-grid">
            {plans.map((plan) => {
              const active = selectedPlanId === plan.id;
              const validity =
                plan.days && plan.days !== '0'
                  ? `${plan.days} Day${plan.days === '1' ? '' : 's'}`
                  : 'Standard';
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={active ? 'data-plan-card active' : 'data-plan-card'}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <span className="data-plan-icon" aria-hidden>
                    <Globe2 size={14} strokeWidth={2.2} />
                  </span>
                  <strong className="data-plan-size">{plan.name}</strong>
                  <span className="data-plan-validity">{validity}</span>
                  <span className="data-plan-price">{money(plan.price)}</span>
                  <span className="data-plan-arrow" aria-hidden>
                    <ArrowRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        className={ctaClass}
        disabled={ctaDisabled}
        onClick={() => void ctaAction()}
      >
        {insufficient && formReady ? (
          <>
            <Wallet size={18} strokeWidth={2.2} /> {ctaLabel}
          </>
        ) : (
          <>
            <Rocket size={16} strokeWidth={2.4} /> {ctaLabel}
          </>
        )}
      </button>

      {price > 0 && (
        <div className="data-summary">
          <span>You pay</span>
          <strong>{moneyFull(price)}</strong>
          {insufficient && (
            <p className="data-summary-warn">
              Insufficient balance · Wallet {moneyFull(WALLET_BALANCE)}
            </p>
          )}
        </div>
      )}

      {toast && (
        <div className="data-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
