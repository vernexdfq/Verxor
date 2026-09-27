'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CreditCard,
  Monitor,
  Tv,
  X,
} from 'lucide-react';
import './tv-page.css';

type ProviderId = 'gotv' | 'dstv' | 'startimes';

type TvPackage = {
  id: string;
  name: string;
  price: number;
  validityDays: number;
};

type Provider = {
  id: ProviderId;
  label: string;
  packages: TvPackage[];
};

const PROVIDERS: Provider[] = [
  {
    id: 'gotv',
    label: 'GOtv',
    packages: [
      { id: 'gotv-supa-plus', name: 'Supa Plus', price: 20160, validityDays: 30 },
      { id: 'gotv-supa', name: 'Supa', price: 13680, validityDays: 30 },
      { id: 'gotv-max', name: 'Max', price: 10200, validityDays: 30 },
      { id: 'gotv-jolli', name: 'Jolli', price: 6960, validityDays: 30 },
      { id: 'gotv-jinja', name: 'Jinja', price: 4560, validityDays: 30 },
      { id: 'gotv-smallie', name: 'Smallie', price: 2100, validityDays: 30 },
    ],
  },
  {
    id: 'dstv',
    label: 'DSTV',
    packages: [
      { id: 'dstv-premium', name: 'Premium', price: 37000, validityDays: 30 },
      { id: 'dstv-compact-plus', name: 'Compact Plus', price: 25000, validityDays: 30 },
      { id: 'dstv-compact', name: 'Compact', price: 15700, validityDays: 30 },
      { id: 'dstv-confam', name: 'Confam', price: 9300, validityDays: 30 },
      { id: 'dstv-yanga', name: 'Yanga', price: 5100, validityDays: 30 },
      { id: 'dstv-padi', name: 'Padi', price: 3700, validityDays: 30 },
    ],
  },
  {
    id: 'startimes',
    label: 'StarTimes',
    packages: [
      { id: 'st-super', name: 'Super', price: 7000, validityDays: 30 },
      { id: 'st-classic', name: 'Classic', price: 4200, validityDays: 30 },
      { id: 'st-basic', name: 'Basic', price: 2900, validityDays: 30 },
      { id: 'st-nova', name: 'Nova', price: 1700, validityDays: 30 },
      { id: 'st-smart', name: 'Smart', price: 3800, validityDays: 30 },
      { id: 'st-unique', name: 'Unique', price: 5100, validityDays: 30 },
    ],
  },
];

const WALLET_BALANCE = 7570;

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Brand wordmark for package cards and section header */
function BrandLogo({ provider, size = 'md' }: { provider: ProviderId; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'tv-brand-lg' : size === 'sm' ? 'tv-brand-sm' : 'tv-brand-md';
  if (provider === 'gotv') {
    return (
      <span className={`tv-brand tv-brand-gotv ${cls}`} aria-hidden>
        <span className="tv-brand-go">GO</span>
        <span className="tv-brand-tv">tv</span>
      </span>
    );
  }
  if (provider === 'dstv') {
    return (
      <span className={`tv-brand tv-brand-dstv ${cls}`} aria-hidden>
        DStv
      </span>
    );
  }
  return (
    <span className={`tv-brand tv-brand-startimes ${cls}`} aria-hidden>
      StarTimes
    </span>
  );
}

export function TvPage({ onBack }: { onBack: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('gotv');
  const [providerOpen, setProviderOpen] = useState(false);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>('gotv-supa-plus');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const provider = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0],
    [selectedProvider],
  );

  const packages = provider.packages;
  const selectedPkg = packages.find((p) => p.id === selectedPackageId) ?? null;

  const smartcardClean = smartcardNumber.replace(/\D/g, '').slice(0, 14);
  const smartcardValid = smartcardClean.length >= 10;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const handleProviderSelect = (id: ProviderId) => {
    setSelectedProvider(id);
    setProviderOpen(false);
    setIsVerified(false);
    setCustomerName('');
    const first = PROVIDERS.find((p) => p.id === id)?.packages[0];
    setSelectedPackageId(first?.id ?? null);
  };

  const handleVerify = async () => {
    if (!smartcardValid || verifying) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 900));
    setVerifying(false);
    setIsVerified(true);
    setCustomerName('Adebayo Okafor');
    showToast('Smartcard verified');
  };

  const handlePay = async () => {
    if (!selectedPkg || !isVerified || submitting) return;
    if (selectedPkg.price > WALLET_BALANCE) {
      showToast('Insufficient wallet balance');
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1100));
    setSubmitting(false);
    showToast(`${provider.label} ${selectedPkg.name} activated`);
    setSmartcardNumber('');
    setIsVerified(false);
    setCustomerName('');
  };

  const canPay = isVerified && !!selectedPkg && !submitting;

  return (
    <div className="tv-page">
      <header className="tv-topbar">
        <button type="button" className="tv-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="tv-title-wrap">
          <h1>TV Subscription</h1>
          <p>DSTV, GOtv and StarTimes</p>
        </div>
        <button type="button" className="tv-icon-btn tv-icon-accent" aria-label="TV">
          <Monitor size={18} strokeWidth={2.1} />
        </button>
      </header>

      <section className="tv-hero" aria-label="Cable Subscription">
        <div className="tv-hero-copy">
          <span className="tv-hero-badge">PAY TV</span>
          <strong>Cable Subscription</strong>
          <p>Verify smartcard and activate your package instantly.</p>
        </div>
        <div className="tv-hero-art" aria-hidden>
          <svg width="110" height="88" viewBox="0 0 110 88" fill="none">
            <defs>
              <linearGradient id="tvGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.4" />
              </linearGradient>
              <radialGradient id="tvOrb" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#312E81" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="78" cy="48" rx="40" ry="36" fill="url(#tvOrb)" />
            <rect x="28" y="14" width="64" height="46" rx="8" fill="url(#tvGlow)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
            <rect x="34" y="20" width="52" height="34" rx="4" fill="#1E1B4B" opacity="0.85" />
            <circle cx="60" cy="37" r="11" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
            <path d="M57 32.5v9l8-4.5-8-4.5z" fill="#fff" />
            <path d="M48 60h24l4 8H44l4-8z" fill="rgba(165,180,252,0.45)" />
            <rect x="52" y="68" width="16" height="3" rx="1.5" fill="rgba(199,210,254,0.5)" />
          </svg>
        </div>
      </section>

      <section className="tv-card">
        <div className="tv-card-head">
          <h2>TV Provider</h2>
          <p>Choose your cable provider</p>
        </div>
        <div className="tv-dropdown-wrap">
          <button
            type="button"
            className="tv-dropdown"
            onClick={() => setProviderOpen((v) => !v)}
            aria-expanded={providerOpen}
            aria-haspopup="listbox"
          >
            <span className="tv-dropdown-left">
              <span className="tv-dropdown-icon">
                <Tv size={16} strokeWidth={2.1} />
              </span>
              <span className="tv-dropdown-label">{provider.label}</span>
            </span>
            <ChevronDown size={18} className={providerOpen ? 'tv-chevron open' : 'tv-chevron'} />
          </button>
          {providerOpen && (
            <ul className="tv-dropdown-menu" role="listbox">
              {PROVIDERS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedProvider === p.id}
                    className={selectedProvider === p.id ? 'active' : ''}
                    onClick={() => handleProviderSelect(p.id)}
                  >
                    <BrandLogo provider={p.id} size="sm" />
                    <span>{p.label}</span>
                    {selectedProvider === p.id && <Check size={16} strokeWidth={2.5} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="tv-card">
        <div className="tv-card-head">
          <h2>Smartcard Verification</h2>
          <p>Verify customer before payment</p>
        </div>
        <div className="tv-field">
          <div className={smartcardClean && !smartcardValid ? 'tv-input-wrap is-error' : 'tv-input-wrap'}>
            <CreditCard size={16} className="tv-input-icon" aria-hidden />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Smartcard / IUC Number"
              value={smartcardNumber}
              onChange={(e) => {
                setSmartcardNumber(e.target.value.replace(/[^\d\s]/g, ''));
                setIsVerified(false);
                setCustomerName('');
              }}
              aria-label="Smartcard or IUC number"
            />
            {smartcardNumber ? (
              <button
                type="button"
                className="tv-clear"
                aria-label="Clear"
                onClick={() => {
                  setSmartcardNumber('');
                  setIsVerified(false);
                  setCustomerName('');
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>
        {isVerified && customerName && (
          <div className="tv-verified" role="status">
            <span className="tv-verified-check">
              <Check size={14} strokeWidth={3} />
            </span>
            <div>
              <strong>{customerName}</strong>
              <p>Smartcard {smartcardClean} · Active</p>
            </div>
          </div>
        )}
        <button
          type="button"
          className="tv-verify-btn"
          disabled={!smartcardValid || verifying}
          onClick={handleVerify}
        >
          {verifying ? 'Verifying…' : isVerified ? 'Re-verify Smartcard' : 'Verify Smartcard'}
        </button>
      </section>

      <section className="tv-packages-section">
        <div className="tv-packages-head">
          <h2>Select Package</h2>
          <BrandLogo provider={selectedProvider} size="lg" />
        </div>
        <div className="tv-package-grid">
          {packages.map((pkg) => {
            const selected = selectedPackageId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                className={selected ? 'tv-pkg selected' : 'tv-pkg'}
                onClick={() => setSelectedPackageId(pkg.id)}
                aria-pressed={selected}
              >
                <span className={selected ? 'tv-pkg-radio selected' : 'tv-pkg-radio'} aria-hidden>
                  {selected && <Check size={11} strokeWidth={3} />}
                </span>
                <BrandLogo provider={selectedProvider} size="sm" />
                <strong className="tv-pkg-name">{pkg.name}</strong>
                <span className="tv-pkg-price">{money(pkg.price)}</span>
                <span className="tv-pkg-validity">Valid for {pkg.validityDays} days</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tv-sticky">
        <button
          type="button"
          className="tv-pay-btn"
          disabled={!canPay}
          onClick={handlePay}
        >
          <CreditCard size={18} strokeWidth={2.2} />
          {submitting
            ? 'Processing…'
            : selectedPkg
              ? `Pay TV Subscription · ${money(selectedPkg.price)}`
              : 'Pay TV Subscription'}
        </button>
      </div>

      {toast && (
        <div className="tv-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

export default TvPage;
