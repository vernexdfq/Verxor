'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Phone,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import './airtime-page.css';

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

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

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

/** Session user phone (profile). Replace with auth context when wired. */
const MY_NUMBER = '08141620644';
const WALLET_BALANCE = 7570;

/** Complete Nigerian mobile prefixes (incl. newer 091x series). */
const NIGERIAN_PREFIXES: Record<NetworkId, string[]> = {
  mtn: [
    '0803',
    '0806',
    '0810',
    '0813',
    '0814',
    '0816',
    '0903',
    '0906',
    '0913',
    '0916',
    '0703',
    '0706',
  ],
  airtel: [
    '0802',
    '0808',
    '0812',
    '0701',
    '0708',
    '0901',
    '0902',
    '0904',
    '0907',
    '0911',
    '0912',
  ],
  glo: ['0805', '0807', '0811', '0815', '0905', '0915', '0705'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
};

function detectNetwork(raw: string): NetworkId | null {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234') && clean.length >= 13) {
    clean = '0' + clean.slice(3);
  }
  if (clean.length < 4) return null;
  const prefix = clean.slice(0, 4);
  for (const id of Object.keys(NIGERIAN_PREFIXES) as NetworkId[]) {
    if (NIGERIAN_PREFIXES[id].includes(prefix)) return id;
  }
  return null;
}

function normalizePhone(raw: string) {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234') && clean.length >= 13) {
    clean = '0' + clean.slice(3);
  }
  return clean.slice(0, 11);
}

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function moneyFull(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function NetworkLogo({ id, size = 28 }: { id: NetworkId; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 40 40' };
  switch (id) {
    case 'mtn':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#FFCC00" />
          <text
            x="20"
            y="25"
            textAnchor="middle"
            fill="#1A1A1A"
            fontSize="11"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
          >
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
          <text
            x="20"
            y="24"
            textAnchor="middle"
            fill="#fff"
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
          >
            glo
          </text>
        </svg>
      );
    case '9mobile':
      return (
        <svg {...s} aria-hidden>
          <rect width="40" height="40" rx="8" fill="#006F3C" />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fill="#FFD100"
            fontSize="18"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
          >
            9
          </text>
        </svg>
      );
    default:
      return <span className="air-mark-fallback">?</span>;
  }
}

export function AirtimePage({ onBack }: { onBack: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId | ''>('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const amount = useMemo(() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const phoneDigits = normalizePhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);

  const insufficient = amount > 0 && amount > WALLET_BALANCE;
  const formReady = !!networkId && phoneValid && amount >= 50 && amount <= 50000;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  /** Single path: set phone digits + auto-select network when prefix matches. */
  const applyPhone = useCallback((raw: string) => {
    const cleaned = normalizePhone(raw);
    setPhone(cleaned);
    if (cleaned.length < 4) {
      setAutoDetected(false);
      return;
    }
    const detected = detectNetwork(cleaned);
    if (detected) {
      setNetworkId(detected);
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  }, []);

  const handlePhoneChange = (v: string) => {
    applyPhone(v);
  };

  const handleUseMyNumber = () => {
    applyPhone(MY_NUMBER);
  };

  const handleQuickAmount = (n: number) => {
    setAmountStr(String(n));
  };

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^\d.,]/g, '');
    setAmountStr(cleaned);
  };

  const handleBuy = async () => {
    if (!formReady || insufficient || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setPhone('');
    setAmountStr('');
    setNetworkId('');
    setAutoDetected(false);
    showToast('Airtime purchase successful');
  };

  const handleFund = async () => {
    showToast('Opening Fund Wallet...');
  };

  let ctaLabel = 'Buy Airtime';
  let ctaAction: () => void | Promise<void> = handleBuy;
  let ctaClass = 'air-cta';
  let ctaDisabled = submitting || !formReady;

  if (insufficient && formReady) {
    ctaLabel = 'Fund Wallet';
    ctaAction = handleFund;
    ctaClass = 'air-cta air-cta-fund';
    ctaDisabled = false;
  } else if (!networkId) {
    ctaLabel = 'Select a network';
  } else if (!phoneDigits) {
    ctaLabel = 'Enter phone number';
  } else if (!phoneValid) {
    ctaLabel = 'Enter a valid number';
  } else if (amount <= 0) {
    ctaLabel = 'Enter amount';
  } else if (amount < 50) {
    ctaLabel = 'Minimum is \u20a650';
  } else if (amount > 50000) {
    ctaLabel = 'Maximum is \u20a650,000';
  } else if (submitting) {
    ctaLabel = 'Processing...';
  }

  return (
    <div className="air-page">
      <header className="air-topbar">
        <button type="button" className="air-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="air-title-wrap">
          <h1 className="air-title">Buy Airtime</h1>
          <p className="air-subtitle">Instant mobile top-up</p>
        </div>
        <button type="button" className="air-wallet-btn" aria-label="Wallet" onClick={handleFund}>
          <Wallet size={18} strokeWidth={2.2} />
        </button>
      </header>

      <section className="air-balance-card" aria-label="Wallet balance">
        <div className="air-balance-left">
          <span className="air-balance-label">Wallet Balance</span>
          <strong className="air-balance-amount">{moneyFull(WALLET_BALANCE)}</strong>
          <button type="button" className="air-quick-topup" onClick={handleFund}>
            <Zap size={12} strokeWidth={2.5} /> Quick Topup
          </button>
        </div>
        <div className="air-balance-art" aria-hidden>
          <div className="air-wallet-glow">
            <Wallet size={28} strokeWidth={1.6} />
            <span className="air-naira-badge">{'\u20a6'}</span>
          </div>
          <ArrowRight size={14} className="air-balance-chevron" />
        </div>
      </section>

      <section className="air-section">
        <div className="air-section-head">
          <h2>Select Network</h2>
          <p>
            {autoDetected && networkId
              ? 'Network detected from your number.'
              : 'Auto-detect works when you type number.'}
          </p>
        </div>
        <div className="air-networks" role="listbox" aria-label="Mobile networks">
          {NETWORKS.map((net) => {
            const selected = networkId === net.id;
            return (
              <button
                key={net.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? 'air-net selected' : 'air-net'}
                onClick={() => {
                  setNetworkId(net.id);
                  setAutoDetected(false);
                }}
              >
                {selected && (
                  <span className="air-net-check" aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span className="air-net-logo" style={{ background: net.bg }}>
                  <NetworkLogo id={net.id} size={36} />
                </span>
                <span className="air-net-label">{net.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="air-section air-details">
        <div className="air-section-head">
          <h2>Recharge Details</h2>
          <p>Enter recipient and amount.</p>
        </div>

        <div className="air-field">
          <div className={phoneDigits && !phoneValid ? 'air-input-wrap is-error' : 'air-input-wrap'}>
            <Phone size={16} className="air-input-icon" aria-hidden />
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-label="Phone number"
            />
            <button type="button" className="air-use-mine" onClick={handleUseMyNumber}>
              Use My Number
            </button>
          </div>
          {phoneDigits && !phoneValid && (
            <p className="air-field-error" role="alert">
              Enter a valid 11-digit Nigerian number
            </p>
          )}
        </div>

        <div className="air-field">
          <div className="air-input-wrap">
            <Wallet size={16} className="air-input-icon" aria-hidden />
            <span className="air-naira" aria-hidden>
              {'\u20a6'}
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              aria-label="Amount"
            />
            {amountStr ? (
              <button
                type="button"
                className="air-clear"
                aria-label="Clear amount"
                onClick={() => setAmountStr('')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="air-quick">
          <span className="air-quick-label">Quick Amounts</span>
          <div className="air-quick-row">
            {QUICK_AMOUNTS.map((n) => {
              const active = amount === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={active ? 'air-chip active' : 'air-chip'}
                  onClick={() => handleQuickAmount(n)}
                >
                  {money(n)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {amount > 0 && (
        <div className="air-summary">
          <span>You pay</span>
          <strong>{moneyFull(amount)}</strong>
          {insufficient && (
            <p className="air-summary-warn">
              Insufficient balance · Wallet {moneyFull(WALLET_BALANCE)}
            </p>
          )}
        </div>
      )}

      <button type="button" className={ctaClass} disabled={ctaDisabled} onClick={ctaAction}>
        {insufficient && formReady ? (
          <>
            <Wallet size={18} strokeWidth={2.2} /> {ctaLabel}
          </>
        ) : (
          <>
            <Lock size={16} strokeWidth={2.4} /> {ctaLabel}
          </>
        )}
      </button>

      <div className="air-trust">
        <span className="air-trust-icon" aria-hidden>
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <strong>Instant Delivery</strong>
          <p>Airtime is delivered immediately after successful payment.</p>
        </div>
      </div>

      {toast && (
        <div className="air-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
