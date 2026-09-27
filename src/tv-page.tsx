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
    ],
  },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function BrandMark({ provider }: { provider: ProviderId }) {
  if (provider === 'gotv') {
    return (
      <span className="tv-gotv-mark" aria-hidden>
        <span className="go">GO</span>
        <span className="tv">tv</span>
      </span>
    );
  }
  if (provider === 'dstv') {
    return <span className="tv-dstv-mark" aria-hidden>DStv</span>;
  }
  return <span className="tv-st-mark" aria-hidden>StarTimes</span>;
}

export function TvPage({ onBack }: { onBack: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('gotv');
  const [providerOpen, setProviderOpen] = useState(false);
  const [smartcard, setSmartcard] = useState('');
  const [verified, setVerified] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('gotv-supa-plus');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const provider = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0],
    [selectedProvider],
  );
  const packages = provider.packages;
  const selectedPkg = packages.find((p) => p.id === selectedPkgId) ?? packages[0];

  const digits = smartcard.replace(/\D/g, '');
  const cardOk = digits.length >= 10;

  const toastMsg = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const pickProvider = (id: ProviderId) => {
    setSelectedProvider(id);
    setProviderOpen(false);
    setVerified(false);
    setCustomerName('');
    const first = PROVIDERS.find((p) => p.id === id)?.packages[0];
    setSelectedPkgId(first?.id ?? '');
  };

  const onVerify = async () => {
    if (!cardOk || verifying) return;
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 800));
    setVerifying(false);
    setVerified(true);
    setCustomerName('Adebayo Okafor');
    toastMsg('Smartcard verified');
  };

  const onPay = async () => {
    if (!verified || !selectedPkg || paying) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPaying(false);
    toastMsg(`${provider.label} ${selectedPkg.name} activated`);
    setSmartcard('');
    setVerified(false);
    setCustomerName('');
  };

  return (
    <div className="tv-page">
      <header className="tv-header">
        <button type="button" className="tv-round" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="tv-header-mid">
          <h1>TV Subscription</h1>
          <p>DSTV, GOtv and StarTimes</p>
        </div>
        <button type="button" className="tv-round tv-round-accent" aria-label="TV">
          <Monitor size={17} strokeWidth={2.1} />
        </button>
      </header>

      <section className="tv-banner">
        <div className="tv-banner-text">
          <span className="tv-pill">PAY TV</span>
          <h2>Cable Subscription</h2>
          <p>Verify smartcard and activate your package instantly.</p>
        </div>
        <div className="tv-banner-art" aria-hidden>
          <svg viewBox="0 0 96 72" width="96" height="72" fill="none">
            <defs>
              <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A5B4FC" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <ellipse cx="70" cy="38" rx="28" ry="26" fill="rgba(165,180,252,0.25)" />
            <rect x="22" y="10" width="56" height="40" rx="7" fill="url(#scr)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <rect x="28" y="15" width="44" height="30" rx="3" fill="#1E1B4B" opacity="0.9" />
            <circle cx="50" cy="30" r="9" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.1" />
            <path d="M47.5 26.2v7.6L54 30l-6.5-3.8z" fill="#fff" />
            <path d="M38 50h24l3 6H35l3-6z" fill="rgba(199,210,254,0.4)" />
          </svg>
        </div>
      </section>

      <section className="tv-block">
        <div className="tv-block-label">
          <strong>TV Provider</strong>
          <span>Choose your cable provider</span>
        </div>
        <div className="tv-select-wrap">
          <button
            type="button"
            className="tv-select"
            onClick={() => setProviderOpen((v) => !v)}
            aria-expanded={providerOpen}
          >
            <span className="tv-select-left">
              <span className="tv-select-ico"><Tv size={15} strokeWidth={2.2} /></span>
              {provider.label}
            </span>
            <ChevronDown size={17} className={providerOpen ? 'open' : ''} />
          </button>
          {providerOpen && (
            <ul className="tv-select-menu" role="listbox">
              {PROVIDERS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === selectedProvider}
                    className={p.id === selectedProvider ? 'on' : ''}
                    onClick={() => pickProvider(p.id)}
                  >
                    <BrandMark provider={p.id} />
                    <span>{p.label}</span>
                    {p.id === selectedProvider && <Check size={15} strokeWidth={2.5} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="tv-block">
        <div className="tv-block-label">
          <strong>Smartcard Verification</strong>
          <span>Verify customer before payment</span>
        </div>
        <div className={digits && !cardOk ? 'tv-input err' : 'tv-input'}>
          <CreditCard size={15} className="ico" aria-hidden />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Smartcard / IUC Number"
            value={smartcard}
            onChange={(e) => {
              setSmartcard(e.target.value.replace(/[^\d\s]/g, ''));
              setVerified(false);
              setCustomerName('');
            }}
            aria-label="Smartcard number"
          />
          {smartcard ? (
            <button
              type="button"
              className="tv-x"
              aria-label="Clear"
              onClick={() => {
                setSmartcard('');
                setVerified(false);
                setCustomerName('');
              }}
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
        {verified && customerName && (
          <div className="tv-ok">
            <span><Check size={13} strokeWidth={3} /></span>
            <div>
              <b>{customerName}</b>
              <small>Smartcard {digits} · Active</small>
            </div>
          </div>
        )}
        <button
          type="button"
          className="tv-btn-primary"
          disabled={!cardOk || verifying}
          onClick={onVerify}
        >
          {verifying ? 'Verifying…' : 'Verify Smartcard'}
        </button>
      </section>

      <section className="tv-pkg-sec">
        <div className="tv-pkg-head">
          <h3>Select Package</h3>
          <BrandMark provider={selectedProvider} />
        </div>
        <div className="tv-pkg-grid">
          {packages.map((pkg) => {
            const on = selectedPkgId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                className={on ? 'tv-pkg on' : 'tv-pkg'}
                onClick={() => setSelectedPkgId(pkg.id)}
                aria-pressed={on}
              >
                <span className={on ? 'radio on' : 'radio'} aria-hidden>
                  {on && <Check size={10} strokeWidth={3.2} />}
                </span>
                <BrandMark provider={selectedProvider} />
                <strong>{pkg.name}</strong>
                <em>{money(pkg.price)}</em>
                <small>Valid for {pkg.validityDays} days</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tv-foot">
        <button
          type="button"
          className="tv-pay"
          disabled={!verified || paying}
          onClick={onPay}
        >
          <CreditCard size={17} strokeWidth={2.2} />
          {paying ? 'Processing…' : 'Pay TV Subscription'}
        </button>
      </div>

      {toast && (
        <div className="tv-toast" role="status">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export default TvPage;
