'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CreditCard,
  Lock,
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
      { id: 'gotv-jinja', name: 'Jinja', price: 3900, validityDays: 30 },
      { id: 'gotv-smallie', name: 'Smallie', price: 2900, validityDays: 30 },
    ],
  },
  {
    id: 'dstv',
    label: 'DStv',
    packages: [
      { id: 'dstv-premium', name: 'Premium', price: 37000, validityDays: 30 },
      { id: 'dstv-compact-plus', name: 'Compact Plus', price: 25000, validityDays: 30 },
      { id: 'dstv-compact', name: 'Compact', price: 15700, validityDays: 30 },
      { id: 'dstv-confam', name: 'Confam', price: 9300, validityDays: 30 },
      { id: 'dstv-yanga', name: 'Yanga', price: 5100, validityDays: 30 },
      { id: 'dstv-padi', name: 'Padi', price: 2950, validityDays: 30 },
    ],
  },
  {
    id: 'startimes',
    label: 'StarTimes',
    packages: [
      { id: 'st-nova-ant', name: 'Nova (Antenna)', price: 2520, validityDays: 30 },
      { id: 'st-classic-dish', name: 'Classic (Dish)', price: 8880, validityDays: 30 },
      { id: 'st-super-ant', name: 'Super (Antenna)', price: 11400, validityDays: 30 },
      { id: 'st-super-dish', name: 'Super (Dish)', price: 11760, validityDays: 30 },
      { id: 'st-basic-ant', name: 'Basic (Antenna)', price: 4800, validityDays: 30 },
      { id: 'st-classic-ant', name: 'Classic (Antenna)', price: 7200, validityDays: 30 },
      { id: 'st-basic-dish', name: 'Basic (Dish)', price: 6120, validityDays: 30 },
      { id: 'st-nova-dish', name: 'Nova (Dish)', price: 2520, validityDays: 30 },
    ],
  },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

/** Brand logo marks — styled to read as official marks, not generic icons */
function BrandLogo({
  provider,
  size = 22,
}: {
  provider: ProviderId;
  size?: number;
}) {
  if (provider === 'gotv') {
    return (
      <span className="tv-logo tv-logo-gotv" style={{ fontSize: size * 0.55 }} aria-hidden>
        <span className="go">GO</span>
        <span className="tv">tv</span>
      </span>
    );
  }
  if (provider === 'dstv') {
    return (
      <span className="tv-logo tv-logo-dstv" style={{ fontSize: size * 0.52 }} aria-hidden>
        <svg width={size} height={size * 0.55} viewBox="0 0 64 28" fill="none">
          <text
            x="0"
            y="22"
            fill="#0369A1"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="800"
            fontStyle="italic"
            fontSize="22"
            letterSpacing="-0.6"
          >
            DStv
          </text>
        </svg>
      </span>
    );
  }
  return (
    <span className="tv-logo tv-logo-st" style={{ fontSize: size * 0.48 }} aria-hidden>
      <span className="st-star">★</span>
      <span className="st-text">StarTimes</span>
    </span>
  );
}

function ProviderIcon({ provider }: { provider: ProviderId }) {
  const colors: Record<ProviderId, string> = {
    gotv: '#e11d48',
    dstv: '#0369a1',
    startimes: '#ea580c',
  };
  return (
    <span
      className="tv-provider-ico"
      style={{ background: `${colors[provider]}14`, color: colors[provider] }}
    >
      <Tv size={15} strokeWidth={2.2} />
    </span>
  );
}

export function TvPage({ onBack }: { onBack: () => void }) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('gotv');
  const [providerOpen, setProviderOpen] = useState(false);
  const [smartcard, setSmartcard] = useState('');
  const [verified, setVerified] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('gotv-supa-plus');
  const [paying, setPaying] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
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
    setVerifyError(null);
    const first = PROVIDERS.find((p) => p.id === id)?.packages[0];
    setSelectedPkgId(first?.id ?? '');
  };

  const onVerify = async () => {
    if (!cardOk || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    await new Promise((r) => setTimeout(r, 900));
    setVerifying(false);
    // Mock: numbers ending in 0 fail (demo), otherwise succeed
    if (digits.endsWith('0')) {
      setVerified(false);
      setCustomerName('');
      setVerifyError('Verification failed');
      toastMsg('Verification failed');
      return;
    }
    setVerified(true);
    setCustomerName('Adebayo Okafor');
    toastMsg('Smartcard verified');
  };

  const openPay = () => {
    if (!verified || !selectedPkg || paying) return;
    setPin('');
    setPinOpen(true);
  };

  const submitPinDigit = (d: string) => {
    if (pin.length >= 4 || paying) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      void completePay(next);
    }
  };

  const completePay = async (_enteredPin: string) => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1100));
    setPaying(false);
    setPinOpen(false);
    setPin('');
    toastMsg(`${provider.label} ${selectedPkg.name} activated`);
    setSmartcard('');
    setVerified(false);
    setCustomerName('');
  };

  const canPay = verified && !!selectedPkg && !paying;

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
          <svg viewBox="0 0 96 72" width="88" height="66" fill="none">
            <defs>
              <linearGradient id="tvscr" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A5B4FC" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <ellipse cx="70" cy="38" rx="28" ry="26" fill="rgba(165,180,252,0.25)" />
            <rect
              x="22"
              y="10"
              width="56"
              height="40"
              rx="7"
              fill="url(#tvscr)"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1"
            />
            <rect x="28" y="15" width="44" height="30" rx="3" fill="#1E1B4B" opacity="0.9" />
            <circle
              cx="50"
              cy="30"
              r="9"
              fill="rgba(255,255,255,0.15)"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.1"
            />
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
              <ProviderIcon provider={selectedProvider} />
              <BrandLogo provider={selectedProvider} size={26} />
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
                    <ProviderIcon provider={p.id} />
                    <BrandLogo provider={p.id} size={24} />
                    <span className="tv-select-name">{p.label}</span>
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
              setVerifyError(null);
            }}
            aria-label="Smartcard number"
            maxLength={14}
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
                setVerifyError(null);
              }}
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
        {verified && customerName && (
          <div className="tv-ok">
            <span>
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <b>{customerName}</b>
              <small>
                Smartcard {digits} · Active
              </small>
            </div>
          </div>
        )}
        {verifyError && !verified && (
          <div className="tv-err-banner" role="alert">
            {verifyError}
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
          <BrandLogo provider={selectedProvider} size={28} />
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
                <span className="tv-pkg-ico" aria-hidden>
                  <Monitor size={14} strokeWidth={2.1} />
                </span>
                <strong>{pkg.name}</strong>
                <div className="tv-pkg-meta">
                  <BrandLogo provider={selectedProvider} size={18} />
                  <em>{money(pkg.price)}</em>
                </div>
                <small>Valid for {pkg.validityDays} days</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="tv-foot">
        <button
          type="button"
          className={canPay ? 'tv-pay' : 'tv-pay locked'}
          disabled={!canPay}
          onClick={openPay}
        >
          {canPay ? (
            <>
              <CreditCard size={17} strokeWidth={2.2} />
              Pay {money(selectedPkg.price)} · {selectedPkg.name}
            </>
          ) : (
            <>
              <Lock size={16} strokeWidth={2.2} />
              Pay TV Subscription
            </>
          )}
        </button>
      </div>

      {pinOpen && (
        <div className="tv-pin-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="tv-pin-backdrop"
            aria-label="Close PIN"
            onClick={() => {
              if (!paying) {
                setPinOpen(false);
                setPin('');
              }
            }}
          />
          <div className="tv-pin-sheet">
            <div className="tv-pin-handle" />
            <h2>Enter Transaction PIN</h2>
            <p>
              Confirm {provider.label} {selectedPkg.name} · {money(selectedPkg.price)}
            </p>
            <div className="tv-pin-dots" aria-label="PIN digits">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={pin.length > i ? 'filled' : ''} />
              ))}
            </div>
            <div className="tv-pin-pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => {
                if (k === '') return <span key="sp" className="tv-pin-empty" />;
                if (k === '⌫') {
                  return (
                    <button
                      key="bk"
                      type="button"
                      className="tv-pin-key"
                      disabled={paying}
                      onClick={() => setPin((p) => p.slice(0, -1))}
                      aria-label="Backspace"
                    >
                      ⌫
                    </button>
                  );
                }
                return (
                  <button
                    key={k}
                    type="button"
                    className="tv-pin-key"
                    disabled={paying}
                    onClick={() => submitPinDigit(k)}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            {paying && <p className="tv-pin-busy">Processing…</p>}
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
