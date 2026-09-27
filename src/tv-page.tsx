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

type ProviderId = 'dstv' | 'gotv' | 'startimes';

type TvPackage = {
  id: string;
  name: string;
  price: number;
  validity: string;
};

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'dstv', label: 'DSTV' },
  { id: 'gotv', label: 'GOtv' },
  { id: 'startimes', label: 'StarTimes' },
];

const PACKAGES: Record<ProviderId, TvPackage[]> = {
  gotv: [
    { id: 'gotv-supa-plus', name: 'Supa Plus', price: 20160, validity: 'Valid for 30 days' },
    { id: 'gotv-supa', name: 'Supa', price: 13680, validity: 'Valid for 30 days' },
    { id: 'gotv-max', name: 'Max', price: 10200, validity: 'Valid for 30 days' },
    { id: 'gotv-jolli', name: 'Jolli', price: 6960, validity: 'Valid for 30 days' },
    { id: 'gotv-jinja', name: 'Jinja', price: 4680, validity: 'Valid for 30 days' },
    { id: 'gotv-smallie', name: 'Smallie', price: 2280, validity: 'Valid for 30 days' },
  ],
  dstv: [
    { id: 'dstv-premium-extra', name: 'Premium + Extra View', price: 60600, validity: 'Valid for 30 days' },
    { id: 'dstv-french', name: 'French Touch Add-on', price: 8400, validity: 'Valid for 30 days' },
    { id: 'dstv-premium', name: 'Premium', price: 53400, validity: 'Valid for 30 days' },
    { id: 'dstv-compact-plus', name: 'Compact Plus', price: 36000, validity: 'Valid for 30 days' },
    { id: 'dstv-compact', name: 'Compact', price: 22800, validity: 'Valid for 30 days' },
    { id: 'dstv-confam', name: 'Confam', price: 13200, validity: 'Valid for 30 days' },
    { id: 'dstv-yanga', name: 'Yanga', price: 7200, validity: 'Valid for 30 days' },
    { id: 'dstv-padi', name: 'Padi', price: 5280, validity: 'Valid for 30 days' },
  ],
  startimes: [
    { id: 'st-nova-ant', name: 'Nova (Antenna)', price: 2520, validity: 'Valid for 30 days' },
    { id: 'st-classic-dish', name: 'Classic (Dish)', price: 8880, validity: 'Valid for 30 days' },
    { id: 'st-super-ant', name: 'Super (Antenna)', price: 11400, validity: 'Valid for 30 days' },
    { id: 'st-super-dish', name: 'Super (Dish)', price: 11760, validity: 'Valid for 30 days' },
    { id: 'st-basic-ant', name: 'Basic (Antenna)', price: 4800, validity: 'Valid for 30 days' },
    { id: 'st-classic-ant', name: 'Classic (Antenna)', price: 7200, validity: 'Valid for 30 days' },
    { id: 'st-basic-dish', name: 'Basic (Dish)', price: 6120, validity: 'Valid for 30 days' },
    { id: 'st-nova-dish', name: 'Nova (Dish)', price: 2520, validity: 'Valid for 30 days' },
  ],
};

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function ProviderLogo({ id, compact = false }: { id: ProviderId; compact?: boolean }) {
  if (id === 'gotv') {
    return (
      <span className={`tv-brand-logo gotv ${compact ? 'compact' : ''}`} aria-hidden>
        <span className="tv-brand-gotv">
          <span className="g">GO</span>
          <span className="t">tv</span>
        </span>
      </span>
    );
  }
  if (id === 'dstv') {
    return (
      <span className={`tv-brand-logo dstv ${compact ? 'compact' : ''}`} aria-hidden>
        <span className="tv-brand-dstv">DStv</span>
      </span>
    );
  }
  return (
    <span className={`tv-brand-logo startimes ${compact ? 'compact' : ''}`} aria-hidden>
      <span className="tv-brand-st">StarTimes</span>
    </span>
  );
}

function HeroTvArt() {
  return (
    <svg className="tv-hero-art" width="120" height="100" viewBox="0 0 120 100" fill="none" aria-hidden>
      <defs>
        <linearGradient id="tvGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="tvScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>
      <ellipse cx="78" cy="88" rx="32" ry="6" fill="#1E1B4B" opacity="0.35" />
      <rect x="28" y="18" width="72" height="52" rx="8" fill="url(#tvGlow)" opacity="0.25" />
      <rect x="34" y="22" width="64" height="46" rx="6" fill="url(#tvScreen)" stroke="#A5B4FC" strokeWidth="1.5" />
      <rect x="40" y="28" width="52" height="34" rx="3" fill="#1E1B4B" opacity="0.55" />
      <circle cx="66" cy="45" r="12" fill="#4F46E5" opacity="0.85" />
      <path d="M63 39.5v11l10-5.5-10-5.5z" fill="#fff" />
      <rect x="58" y="68" width="16" height="4" rx="1" fill="#6366F1" opacity="0.7" />
      <rect x="52" y="72" width="28" height="3" rx="1" fill="#4338CA" opacity="0.5" />
    </svg>
  );
}

export function TvPage({ onBack }: { onBack: () => void }) {
  const [provider, setProvider] = useState<ProviderId>('gotv');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [smartcard, setSmartcard] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ name: string; plan: string } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>('gotv-supa-plus');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const packages = PACKAGES[provider];
  const selected = useMemo(
    () => packages.find((p) => p.id === selectedPkg) ?? null,
    [packages, selectedPkg],
  );

  const providerLabel = PROVIDERS.find((p) => p.id === provider)?.label ?? provider;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const handleSelectProvider = (id: ProviderId) => {
    setProvider(id);
    setSheetOpen(false);
    setVerified(null);
    setSelectedPkg(PACKAGES[id][0]?.id ?? null);
  };

  const handleVerify = async () => {
    const digits = smartcard.replace(/\D/g, '');
    if (digits.length < 10) {
      showToast('Enter a valid smartcard / IUC number');
      return;
    }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 900));
    setVerified({
      name: 'NATHANIEL SANCHEZ',
      plan: `${providerLabel} \u00b7 Active`,
    });
    setVerifying(false);
    showToast('Smartcard verified');
  };

  const canPay = !!verified && !!selected && !paying;

  const handlePay = async () => {
    if (!canPay || !selected) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1100));
    setPaying(false);
    showToast(`Paid ${money(selected.price)} for ${selected.name}`);
  };

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
          <h2>Cable Subscription</h2>
          <p>Verify smartcard and activate your package instantly.</p>
        </div>
        <HeroTvArt />
      </section>

      <section className="tv-card">
        <div className="tv-card-head">
          <div className="tv-card-icon">
            <Tv size={16} strokeWidth={2.2} />
          </div>
          <div>
            <h3>TV Provider</h3>
            <p>Choose your cable provider</p>
          </div>
        </div>
        <button
          type="button"
          className="tv-provider-trigger"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="listbox"
          aria-expanded={sheetOpen}
        >
          <span className="tv-provider-left">
            <span className="tv-provider-mark">
              <Tv size={15} />
            </span>
            <span>
              <strong>{providerLabel}</strong>
              <small>Cable service provider</small>
            </span>
          </span>
          <ChevronDown size={18} className="tv-chevron" />
        </button>
      </section>

      <section className="tv-card">
        <div className="tv-card-head">
          <div className="tv-card-icon shield">
            <Check size={15} strokeWidth={2.5} />
          </div>
          <div>
            <h3>Smartcard Verification</h3>
            <p>Verify customer before payment</p>
          </div>
        </div>
        <div className="tv-input-wrap">
          <CreditCard size={16} className="tv-input-icon" aria-hidden />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Smartcard / IUC Number"
            value={smartcard}
            onChange={(e) => {
              setSmartcard(e.target.value.replace(/[^\d]/g, '').slice(0, 15));
              setVerified(null);
            }}
            aria-label="Smartcard or IUC number"
          />
          {smartcard ? (
            <button
              type="button"
              className="tv-clear"
              aria-label="Clear"
              onClick={() => {
                setSmartcard('');
                setVerified(null);
              }}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="tv-verify-btn"
          disabled={verifying || smartcard.replace(/\D/g, '').length < 10}
          onClick={handleVerify}
        >
          {verifying ? 'Verifying\u2026' : 'Verify Smartcard'}
        </button>
        {verified && (
          <div className="tv-verified" role="status">
            <span className="tv-verified-check">
              <Check size={14} strokeWidth={3} />
            </span>
            <div>
              <strong>{verified.name}</strong>
              <p>{verified.plan}</p>
            </div>
          </div>
        )}
      </section>

      <section className="tv-packages-section">
        <div className="tv-packages-head">
          <h3>Select Package</h3>
          <ProviderLogo id={provider} />
        </div>
        <div className="tv-package-grid">
          {packages.map((pkg) => {
            const active = selectedPkg === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                className={active ? 'tv-pkg active' : 'tv-pkg'}
                onClick={() => setSelectedPkg(pkg.id)}
                aria-pressed={active}
              >
                <span className={active ? 'tv-radio on' : 'tv-radio'} aria-hidden>
                  {active ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                <ProviderLogo id={provider} compact />
                <strong className="tv-pkg-name">{pkg.name}</strong>
                <span className="tv-pkg-price">{money(pkg.price)}</span>
                <span className="tv-pkg-valid">{pkg.validity}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tv-bottom-spacer" />

      <div className="tv-bottom-bar">
        <button
          type="button"
          className="tv-pay-btn"
          disabled={!canPay}
          onClick={handlePay}
        >
          <CreditCard size={18} strokeWidth={2.2} />
          {paying
            ? 'Processing\u2026'
            : selected
              ? `Pay ${money(selected.price)}`
              : 'Pay TV Subscription'}
        </button>
      </div>

      {sheetOpen && (
        <div className="tv-sheet-overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="tv-sheet"
            role="listbox"
            aria-label="Choose TV provider"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tv-sheet-handle" />
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? 'tv-sheet-item active' : 'tv-sheet-item'}
                  onClick={() => handleSelectProvider(p.id)}
                >
                  <span className="tv-sheet-icon">
                    <Tv size={16} />
                  </span>
                  <span>{p.label}</span>
                  {active && (
                    <span className="tv-sheet-check">
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className="tv-toast" role="status">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export default TvPage;
