'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Phone,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import './airtime-page.css';
import type { AuthSession } from './auth/AuthFlow';

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

type Network = {
  id: NetworkId;
  label: string;
  brandColor: string;
  bg: string;
};

const NETWORKS: Network[] = [
  { id: 'mtn', label: 'MTN', brandColor: '#FFCC00', bg: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', brandColor: '#E60000', bg: '#E60000' },
  { id: 'glo', label: 'Glo', brandColor: '#00A651', bg: '#00A651' },
  { id: '9mobile', label: '9mobile', brandColor: '#006F3C', bg: '#006F3C' },
];

/** Quick amounts requested: Row 1 = 100, 200, 500, 1000 | Row 2 = 2000, 5000, 10000 */
const QUICK_AMOUNTS_ROW_1 = [100, 200, 500, 1000];
const QUICK_AMOUNTS_ROW_2 = [2000, 5000, 10000];

const RECENT_RECIPIENTS_KEY = 'verxor_airtime_recent_numbers';

type RecentRecipient = {
  phone: string;
  networkId?: NetworkId;
  lastUsed: number;
};

/** Complete Nigerian mobile prefixes (including 091x, 070x, 080x, 081x). */
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

function normalizePhone(raw: string): string {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234') && clean.length >= 13) {
    clean = '0' + clean.slice(3);
  }
  return clean.slice(0, 11);
}

function formatPhoneDisplay(raw: string): string {
  const c = normalizePhone(raw);
  if (c.length === 11) {
    return `${c.slice(0, 4)} ${c.slice(4, 7)} ${c.slice(7)}`;
  }
  return c;
}

function money(n: number): string {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function moneyFull(n: number): string {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Official brand SVG logos with accurate geometry and typography */
function NetworkLogo({ id, size = 32 }: { id: NetworkId; size?: number }) {
  switch (id) {
    case 'mtn':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          aria-label="MTN"
          className="air-brand-svg"
        >
          <rect width="100" height="100" rx="20" fill="#FFCC00" />
          <ellipse
            cx="50"
            cy="50"
            rx="42"
            ry="25"
            fill="none"
            stroke="#111827"
            strokeWidth="5.5"
          />
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fill="#111827"
            fontSize="26"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="-1"
          >
            MTN
          </text>
        </svg>
      );
    case 'airtel':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          aria-label="Airtel"
          className="air-brand-svg"
        >
          <rect width="100" height="100" rx="20" fill="#E60000" />
          {/* Official Airtel curved emblem */}
          <path
            d="M50 16 C31 16 17 30 17 48 C17 63 26 75 40 78 L40 84 L45 84 L45 78 C47 78 48 78 50 78 C68 78 83 63 83 46 C83 29 68 16 50 16 Z M50 27 C62 27 72 36 72 47 C72 58 62 67 50 67 C48 67 47 67 45 66.8 L45 54 C45 45 39 39 31 39 L28 39 C31 31 39 27 50 27 Z"
            fill="#FFFFFF"
          />
          <text
            x="50"
            y="94"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            fontWeight="700"
            letterSpacing="0.5"
          >
            airtel
          </text>
        </svg>
      );
    case 'glo':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          aria-label="Glo"
          className="air-brand-svg"
        >
          <rect width="100" height="100" rx="20" fill="#00A651" />
          {/* Glo distinctive circle and typography */}
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeDasharray="210 30"
          />
          <text
            x="50"
            y="59"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="30"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="800"
            letterSpacing="-0.5"
          >
            glo
          </text>
        </svg>
      );
    case '9mobile':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          aria-label="9mobile"
          className="air-brand-svg"
        >
          <rect width="100" height="100" rx="20" fill="#005C3E" />
          {/* 9mobile numeral emblem + signal ripple */}
          <path
            d="M50 20 C36 20 25 31 25 45 C25 58 36 69 50 69 C64 69 75 58 75 45 C75 39 73 34 69 30 L61 38 C63 40 64 42 64 45 C64 53 58 59 50 59 C42 59 36 53 36 45 C36 37 42 31 50 31 C54 31 57 32 60 34 L66 27 C61 22 56 20 50 20 Z"
            fill="#98D800"
          />
          <circle cx="50" cy="45" r="5" fill="#98D800" />
          <path
            d="M50 82 L50 68 C58 68 64 62 64 54"
            fill="none"
            stroke="#98D800"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function AirtimePage({
  onBack,
  session,
}: {
  onBack: () => void;
  session?: AuthSession | null;
}) {
  const walletBalance = session?.balanceNgn ?? 0;
  const [networkId, setNetworkId] = useState<NetworkId | ''>('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  // Resolve logged-in customer's phone from session or local stored last phone
  const accountPhone = useMemo(() => {
    if (session?.contact) {
      const clean = normalizePhone(session.contact);
      if (clean.length === 11) return clean;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('verxor-last-phone');
        if (raw) {
          const parsed = JSON.parse(raw) as { national?: string };
          if (parsed?.national) {
            const clean = normalizePhone(parsed.national);
            if (clean.length === 11) return clean;
          }
        }
      } catch {
        /* noop */
      }
    }
    return '';
  }, [session]);

  // Load last 3 recharged numbers from device storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_RECIPIENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentRecipients(parsed.slice(0, 3));
        }
      }
    } catch {
      /* noop */
    }
  }, []);

  const saveRecentRecipient = useCallback((phoneToSave: string, netId?: NetworkId) => {
    try {
      const clean = normalizePhone(phoneToSave);
      if (clean.length !== 11) return;
      const detected = netId || detectNetwork(clean) || undefined;
      const updated: RecentRecipient[] = [
        { phone: clean, networkId: detected, lastUsed: Date.now() },
        ...recentRecipients.filter((r) => r.phone !== clean),
      ].slice(0, 3);
      setRecentRecipients(updated);
      localStorage.setItem(RECENT_RECIPIENTS_KEY, JSON.stringify(updated));
    } catch {
      /* noop */
    }
  }, [recentRecipients]);

  const amount = useMemo(() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const phoneDigits = normalizePhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);

  const insufficient = amount > 0 && amount > walletBalance;
  const formReady = !!networkId && phoneValid && amount >= 100 && amount <= 50000;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  /** Single entry point: normalize phone digits + auto-select network */
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

  /** Use My Number click: open rich recipient sheet if recent numbers exist, or apply directly */
  const handleUseMyNumber = () => {
    if (recentRecipients.length > 0) {
      setPickerOpen(true);
      return;
    }
    if (accountPhone) {
      applyPhone(accountPhone);
      showToast('Account phone number applied');
    } else {
      setPickerOpen(true);
    }
  };

  const handleSelectRecipient = (selectedPhone: string, netId?: NetworkId) => {
    applyPhone(selectedPhone);
    if (netId) {
      setNetworkId(netId);
      setAutoDetected(true);
    }
    setPickerOpen(false);
  };

  const handleQuickAmount = (n: number) => {
    setAmountStr(String(n));
  };

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^\d.,]/g, '');
    setAmountStr(cleaned);
  };

  const handleBuy = async () => {
    if (!formReady || insufficient || submitting || !networkId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/airtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network: networkId,
          phone: phoneDigits,
          amount,
        }),
      });
      const data = await res
        .json()
        .catch(() => ({} as { ok?: boolean; error?: string; order?: { message?: string } }));

      if (!res.ok || !data.ok) {
        showToast(data.error || 'Airtime purchase failed');
        return;
      }

      // Save recipient into recent list on success
      saveRecentRecipient(phoneDigits, networkId);

      setPhone('');
      setAmountStr('');
      setNetworkId('');
      setAutoDetected(false);
      showToast(data.order?.message || 'Airtime purchase successful');
    } catch {
      showToast('Network error — try again');
    } finally {
      setSubmitting(false);
    }
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
  } else if (amount < 100) {
    ctaLabel = 'Minimum is \u20a6100';
  } else if (amount > 50000) {
    ctaLabel = 'Maximum is \u20a650,000';
  } else if (submitting) {
    ctaLabel = 'Processing...';
  }

  return (
    <div className="air-page">
      {/* ── Top Bar ── */}
      <header className="air-topbar">
        <button
          type="button"
          className="air-back"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="air-title-wrap">
          <h1 className="air-title">Buy Airtime</h1>
          <p className="air-subtitle">Instant mobile top-up</p>
        </div>
        <button
          type="button"
          className="air-wallet-btn"
          aria-label="Wallet"
          onClick={handleFund}
        >
          <Wallet size={18} strokeWidth={2.2} />
        </button>
      </header>

      {/* ── Advertisement / Promo Banner Strip ── */}
      <section className="air-promo-banner" aria-label="Promotion">
        <div className="air-promo-content">
          <div className="air-promo-badge">
            <Zap size={11} className="air-promo-zap" />
            <span>FAST TOP-UP</span>
          </div>
          <h2 className="air-promo-title">Airtime Recharge</h2>
          <p className="air-promo-desc">
            Buy airtime instantly for all major networks.
          </p>
        </div>

        <div className="air-promo-art" aria-hidden>
          <svg
            className="air-tower-svg"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="phoneGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#1E1B4B" />
              </linearGradient>
              <linearGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* Glowing background halo */}
            <circle cx="80" cy="50" r="35" fill="url(#glowGrad)" filter="blur(16px)" />

            {/* Isometric Smartphone */}
            <g transform="translate(45, 12) rotate(8)">
              <rect
                x="0"
                y="0"
                width="50"
                height="86"
                rx="10"
                fill="url(#phoneGrad)"
                stroke="#6366F1"
                strokeWidth="1.8"
              />
              <rect x="3" y="3" width="44" height="80" rx="8" fill="#0B1120" opacity="0.9" />
              {/* Speaker / camera pill */}
              <rect x="18" y="6" width="14" height="3" rx="1.5" fill="#475569" />
              {/* Screen signal icon */}
              <circle cx="25" cy="40" r="12" fill="#3B82F6" opacity="0.15" />
              <path
                d="M25 32 L25 48 M21 36 L21 48 M29 40 L29 48"
                stroke="#60A5FA"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </g>

            {/* Cellular Tower & Radiating Signal Waves */}
            <g transform="translate(15, 30)">
              {/* Antenna Mast */}
              <line x1="30" y1="28" x2="30" y2="68" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="30,28 20,68 40,68" stroke="#38BDF8" strokeWidth="1.6" fill="none" opacity="0.85" />
              <line x1="25" y1="48" x2="35" y2="48" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="30" cy="26" r="3.5" fill="#38BDF8" />

              {/* Radiating Waves */}
              <path
                d="M20 22 C26 16 34 16 40 22"
                stroke="#38BDF8"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M14 16 C23 7 37 7 46 16"
                stroke="#818CF8"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.75"
              />
            </g>

            {/* Small floating accents */}
            <circle cx="102" cy="30" r="3" fill="#A855F7" opacity="0.8" />
            <circle cx="106" cy="48" r="4" fill="#38BDF8" opacity="0.9" />
            <circle cx="112" cy="62" r="2.5" fill="#C084FC" opacity="0.7" />
          </svg>

          {/* Carousel dots */}
          <div className="air-promo-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </section>

      {/* ── Select Network ── */}
      <section className="air-section">
        <div className="air-section-head">
          <h2>Select Network</h2>
          <p>
            {autoDetected && networkId
              ? 'Network detected from recipient number.'
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
                  <span className="air-net-badge" aria-hidden>
                    <Check size={11} strokeWidth={3.5} />
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

      {/* ── Recharge Details ── */}
      <section className="air-section air-details">
        <div className="air-section-head">
          <h2>Recharge Details</h2>
          <p>Enter recipient and amount.</p>
        </div>

        {/* Recipient Phone Field */}
        <div className="air-field">
          <div className={phoneDigits && !phoneValid ? 'air-input-wrap is-error' : 'air-input-wrap'}>
            <div className="air-input-lead-icon">
              <Phone size={17} strokeWidth={2.2} />
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-label="Phone number"
            />
            <div className="air-input-actions">
              <button
                type="button"
                className="air-use-mine"
                onClick={handleUseMyNumber}
              >
                Use My Number
              </button>
              {recentRecipients.length > 0 && (
                <button
                  type="button"
                  className="air-recent-btn"
                  title="Recent recipients"
                  aria-label="Recent recipients"
                  onClick={() => setPickerOpen(true)}
                >
                  <Clock size={15} />
                </button>
              )}
            </div>
          </div>
          {phoneDigits && !phoneValid && (
            <p className="air-field-error" role="alert">
              Enter a valid 11-digit Nigerian number
            </p>
          )}
        </div>

        {/* Amount Field */}
        <div className="air-field">
          <div className="air-input-wrap">
            <div className="air-input-lead-icon">
              <Wallet size={17} strokeWidth={2.2} />
            </div>
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
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Quick Amounts (Four-by-Four grid) ── */}
        <div className="air-quick">
          <span className="air-quick-label">Quick Amounts</span>
          <div className="air-quick-grid">
            {/* First Row: 100, 200, 500, 1,000 */}
            {QUICK_AMOUNTS_ROW_1.map((n) => {
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
            {/* Second Row: 2,000, 5,000, 10,000 */}
            {QUICK_AMOUNTS_ROW_2.map((n) => {
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

      {/* ── Summary & Insufficient Balance Notice ── */}
      {amount > 0 && (
        <div className="air-summary">
          <div className="air-summary-row">
            <span>You pay</span>
            <strong>{moneyFull(amount)}</strong>
          </div>
          {insufficient && (
            <div className="air-summary-warn">
              <span>Insufficient balance · Wallet: {moneyFull(walletBalance)}</span>
              <button type="button" className="air-warn-fund-link" onClick={handleFund}>
                Fund now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Primary Action Button ── */}
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
            <Lock size={16} strokeWidth={2.4} /> {ctaLabel}
          </>
        )}
      </button>

      {/* ── Instant Delivery Trust Card ── */}
      <div className="air-trust">
        <span className="air-trust-icon" aria-hidden>
          <Check size={14} strokeWidth={3.5} />
        </span>
        <div className="air-trust-body">
          <strong>Instant Delivery</strong>
          <p>Airtime is delivered immediately after successful payment.</p>
        </div>
      </div>

      {/* ── Recipient Picker Sheet / Modal ── */}
      {pickerOpen && (
        <div className="air-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="air-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Select recipient"
          >
            <div className="air-modal-header">
              <div className="air-modal-title-wrap">
                <h3>Select Recipient</h3>
                <p>Choose your account phone or a recent recharge</p>
              </div>
              <button
                type="button"
                className="air-modal-close"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="air-modal-content">
              {/* Account phone option */}
              {accountPhone ? (
                <div className="air-modal-section">
                  <span className="air-modal-subhead">My Account</span>
                  <button
                    type="button"
                    className="air-recipient-item is-account"
                    onClick={() => handleSelectRecipient(accountPhone)}
                  >
                    <div className="air-rec-icon">
                      <User size={18} />
                    </div>
                    <div className="air-rec-info">
                      <span className="air-rec-title">Account Phone Number</span>
                      <strong className="air-rec-phone">{formatPhoneDisplay(accountPhone)}</strong>
                    </div>
                    <span className="air-rec-tag">Primary</span>
                  </button>
                </div>
              ) : null}

              {/* Recent recipients section */}
              <div className="air-modal-section">
                <span className="air-modal-subhead">Recent Recharges</span>
                {recentRecipients.length > 0 ? (
                  <div className="air-rec-list">
                    {recentRecipients.map((rec) => {
                      const detected = rec.networkId || detectNetwork(rec.phone);
                      return (
                        <button
                          key={rec.phone}
                          type="button"
                          className="air-recipient-item"
                          onClick={() => handleSelectRecipient(rec.phone, detected || undefined)}
                        >
                          <div className="air-rec-icon air-rec-net">
                            {detected ? (
                              <NetworkLogo id={detected} size={28} />
                            ) : (
                              <Phone size={16} />
                            )}
                          </div>
                          <div className="air-rec-info">
                            <strong className="air-rec-phone">{formatPhoneDisplay(rec.phone)}</strong>
                            <span className="air-rec-meta">
                              {detected ? detected.toUpperCase() : 'Nigerian Network'}
                            </span>
                          </div>
                          <span className="air-rec-action">Select</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="air-rec-empty">
                    <Clock size={20} className="air-rec-empty-icon" />
                    <p>No recent airtime recharges yet. Numbers you top up will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="air-toast" role="status">
          <Check size={16} strokeWidth={3} /> {toast}
        </div>
      )}
    </div>
  );
}
