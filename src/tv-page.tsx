'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
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
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './tv-page.css';

type ProviderId = 'gotv' | 'dstv' | 'startimes';

type TvPackage = {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  ckPackageId?: string;
};

type Provider = {
  id: ProviderId;
  label: string;
  packages: TvPackage[];
};

/** ClubKonnect face prices — same as lib/cable-catalog */
const FALLBACK: Provider[] = [
  {
    id: 'gotv',
    label: 'GOtv',
    packages: [
      { id: 'gotv-supa-plus', name: 'Supa Plus', price: 16800, validityDays: 30 },
      { id: 'gotv-supa', name: 'Supa', price: 11400, validityDays: 30 },
      { id: 'gotv-max', name: 'Max', price: 8500, validityDays: 30 },
      { id: 'gotv-jolli', name: 'Jolli', price: 5800, validityDays: 30 },
      { id: 'gotv-jinja', name: 'Jinja', price: 3900, validityDays: 30 },
      { id: 'gotv-smallie', name: 'Smallie', price: 1900, validityDays: 30 },
      { id: 'gotv-smallie-3months', name: 'Smallie (3 months)', price: 5100, validityDays: 90 },
      { id: 'gotv-smallie-1year', name: 'Smallie (1 year)', price: 15000, validityDays: 365 },
    ],
  },
  {
    id: 'dstv',
    label: 'DStv',
    packages: [
      { id: 'dstv-padi', name: 'Padi', price: 4400, validityDays: 30 },
      { id: 'dstv-yanga', name: 'Yanga', price: 6000, validityDays: 30 },
      { id: 'dstv-confam', name: 'Confam', price: 11000, validityDays: 30 },
      { id: 'dstv79', name: 'Compact', price: 19000, validityDays: 30 },
      { id: 'dstv7', name: 'Compact Plus', price: 30000, validityDays: 30 },
      { id: 'dstv3', name: 'Premium', price: 44500, validityDays: 30 },
      { id: 'dstv-padi-showmax', name: 'Padi + Showmax', price: 8900, validityDays: 30 },
      { id: 'dstv-yanga-showmax', name: 'Yanga + Showmax', price: 8250, validityDays: 30 },
      { id: 'dstv-confam-showmax', name: 'Confam + Showmax', price: 13250, validityDays: 30 },
      { id: 'dstv-compact-showmax', name: 'Compact + Showmax', price: 21250, validityDays: 30 },
      { id: 'padi-extra', name: 'Padi + ExtraView', price: 10400, validityDays: 30 },
      { id: 'yanga-extra', name: 'Yanga + ExtraView', price: 12000, validityDays: 30 },
      { id: 'confam-extra', name: 'Confam + ExtraView', price: 17000, validityDays: 30 },
      { id: 'dstv30', name: 'Compact + Extra View', price: 25000, validityDays: 30 },
      { id: 'dstv45', name: 'Compact Plus + Extra View', price: 36000, validityDays: 30 },
      { id: 'dstv3', name: 'Premium', price: 44500, validityDays: 30 },
    ],
  },
  {
    id: 'startimes',
    label: 'StarTimes',
    packages: [
      { id: 'nova', name: 'Nova (Dish)', price: 2100, validityDays: 30 },
      { id: 'uni-2', name: 'Nova (Antenna)', price: 2100, validityDays: 30 },
      { id: 'basic', name: 'Basic (Antenna)', price: 4000, validityDays: 30 },
      { id: 'smart', name: 'Basic (Dish)', price: 5100, validityDays: 30 },
      { id: 'classic', name: 'Classic (Antenna)', price: 6000, validityDays: 30 },
      { id: 'special-monthly', name: 'Classic (Dish)', price: 7400, validityDays: 30 },
      { id: 'super', name: 'Super (Dish)', price: 9800, validityDays: 30 },
      { id: 'super-antenna-monthly', name: 'Super (Antenna)', price: 9500, validityDays: 30 },
      { id: 'nova-weekly', name: 'Nova (Antenna) 1 Week', price: 700, validityDays: 7 },
      { id: 'basic-weekly', name: 'Basic (Antenna) 1 Week', price: 1400, validityDays: 7 },
      { id: 'smart-weekly', name: 'Basic (Dish) 1 Week', price: 1700, validityDays: 7 },
      { id: 'classic-weekly', name: 'Classic (Antenna) 1 Week', price: 2000, validityDays: 7 },
      { id: 'super-weekly', name: 'Super (Dish) 1 Week', price: 3300, validityDays: 7 },
    ],
  },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function BrandLogo({ provider, size = 22 }: { provider: ProviderId; size?: number }) {
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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return '0' + digits.slice(3);
  return digits;
}

export function TvPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session?: AuthSession | null;
}) {
  const [providers, setProviders] = useState<Provider[]>(FALLBACK);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/tv');
        const data = await res.json().catch(() => null);
        if (cancelled || !data?.ok || !data.packages) return;
        const next: Provider[] = (['gotv', 'dstv', 'startimes'] as ProviderId[]).map((id) => {
          const list = (data.packages[id] || []) as TvPackage[];
          const label = id === 'gotv' ? 'GOtv' : id === 'dstv' ? 'DStv' : 'StarTimes';
          return {
            id,
            label,
            packages:
              list.length > 0
                ? list.map((p) => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price) || 0,
                    validityDays: Number(p.validityDays) || 30,
                    ckPackageId: p.ckPackageId || p.id,
                  }))
                : FALLBACK.find((f) => f.id === id)?.packages || [],
          };
        });
        setProviders(next);
      } catch {
        /* keep FALLBACK */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = useMemo(
    () => providers.find((p) => p.id === selectedProvider) ?? providers[0],
    [providers, selectedProvider],
  );
  const packages = provider?.packages || [];
  const selectedPkg = packages.find((p) => p.id === selectedPkgId) ?? packages[0];

  const digits = smartcard.replace(/\D/g, '');
  const cardOk = digits.length >= 10;

  const toastMsg = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const pickProvider = (id: ProviderId) => {
    setSelectedProvider(id);
    setProviderOpen(false);
    setVerified(false);
    setCustomerName('');
    setVerifyError(null);
    const first = providers.find((p) => p.id === id)?.packages[0];
    setSelectedPkgId(first?.id ?? '');
  };

  async function getAuthHeaders(): Promise<{ headers: Record<string, string>; userId: string }> {
    let accessToken = loadSessionTokens()?.access_token || '';
    let userId = loadSessionProfile()?.userId || '';
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        const { data: sess } = await sb.auth.getSession();
        if (sess.session?.access_token) accessToken = sess.session.access_token;
        if (sess.session?.user?.id) userId = sess.session.user.id;
      }
    } catch {
      /* optional */
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return { headers, userId };
  }

  const onVerify = async () => {
    if (!cardOk || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const { headers } = await getAuthHeaders();
      const res = await fetch('/api/v1/tv', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify',
          provider: selectedProvider,
          smartCardNo: digits,
        }),
      });
      const data = await res.json().catch(() => ({} as { ok?: boolean; error?: string; customerName?: string }));
      if (!res.ok || !data.ok) {
        setVerified(false);
        setCustomerName('');
        setVerifyError(data.error || 'Smartcard not found. Check the number and try again.');
        toastMsg('Verification failed');
        return;
      }
      setVerified(true);
      setCustomerName(String(data.customerName || 'Verified customer'));
      toastMsg('Smartcard verified');
    } catch {
      setVerified(false);
      setCustomerName('');
      setVerifyError('Network error — try again');
      toastMsg('Network error');
    } finally {
      setVerifying(false);
    }
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
    if (!selectedPkg) return;
    setPaying(true);
    try {
      const { headers, userId } = await getAuthHeaders();
      let phone = session?.contact || loadSessionProfile()?.contact || '';
      phone = normalizePhone(phone);
      if (phone.length !== 11) {
        toastMsg('Add a phone number to your profile to complete payment');
        setPaying(false);
        setPinOpen(false);
        setPin('');
        return;
      }

      const res = await fetch('/api/v1/tv', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'pay',
          provider: selectedProvider,
          packageId: selectedPkg.id,
          smartCardNo: digits,
          phone,
          userId: userId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({} as { ok?: boolean; error?: string; order?: { message?: string } }));

      if (!res.ok || !data.ok) {
        if (res.status === 401) toastMsg('Sign in required to pay TV subscription');
        else if (res.status === 402) toastMsg(data.error || 'Insufficient balance — fund your wallet');
        else toastMsg(data.error || 'TV subscription failed');
        return;
      }

      toastMsg(data.order?.message || `${provider.label} ${selectedPkg.name} activated`);
      try {
        window.dispatchEvent(new Event('verxor:balance-refresh'));
      } catch {
        /* ignore */
      }
      setSmartcard('');
      setVerified(false);
      setCustomerName('');
    } catch {
      toastMsg('Network error — try again');
    } finally {
      setPaying(false);
      setPinOpen(false);
      setPin('');
    }
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
              {providers.map((p) => (
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
          {canPay && selectedPkg ? (
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

      {pinOpen && selectedPkg && (
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
