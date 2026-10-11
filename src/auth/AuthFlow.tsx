'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Fingerprint, Mail, Phone } from 'lucide-react';
import {
  DEFAULT_COUNTRY,
  displayNational,
  findCountry,
  homeCurrencyFor,
  isVtuEligible,
  normalizeNational,
  toE164,
  validatePhoneForCountry,
  type Country,
} from './countries';
import { CountryPickerSheet, PhoneField } from './phone-field';
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from '../../lib/supabase/client';
import './auth.css';

function backendConfigured() {
  return isSupabaseBrowserConfigured();
}

export type AuthMethod = 'phone' | 'email';

export type AuthSession = {
  authenticated: boolean;
  method: AuthMethod;
  contact: string;
  name: string;
  username?: string;
  pin: string;
  password: string;
  phoneCountry?: string;
  dialCode?: string;
  homeCurrency?: 'NGN' | 'USD';
  vtuEligible?: boolean;
  balanceNgn?: number;
  balanceUsd?: number;
  email?: string;
};

const STORAGE_KEY = 'verxor-auth-session';
const LAST_PHONE_KEY = 'verxor-last-phone';

const DEFAULT_MOCK: AuthSession = {
  authenticated: false,
  method: 'phone',
  contact: '',
  name: '',
  username: '',
  pin: '',
  password: '',
  phoneCountry: 'NG',
  dialCode: '234',
  homeCurrency: 'NGN',
  vtuEligible: true,
  balanceNgn: 0,
  balanceUsd: 0,
  email: '',
};

type LastPhone = { iso: string; dial: string; national: string };
type Step = 'signin' | 'signup' | 'pin' | 'forgot';

function loadRemembered(): AuthSession {
  if (typeof window === 'undefined') return { ...DEFAULT_MOCK };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MOCK };
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const iso = parsed.phoneCountry || 'NG';
    return {
      ...DEFAULT_MOCK,
      ...parsed,
      authenticated: false,
      phoneCountry: iso,
      dialCode: parsed.dialCode || findCountry(iso).dial,
      homeCurrency: parsed.homeCurrency || homeCurrencyFor(iso),
      vtuEligible:
        typeof parsed.vtuEligible === 'boolean' ? parsed.vtuEligible : isVtuEligible(iso),
      balanceNgn: typeof parsed.balanceNgn === 'number' ? parsed.balanceNgn : 0,
      balanceUsd: typeof parsed.balanceUsd === 'number' ? parsed.balanceUsd : 0,
    };
  } catch {
    return { ...DEFAULT_MOCK };
  }
}

function saveRemembered(session: AuthSession) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, authenticated: false }));
  } catch {}
}

function loadLastPhone(): LastPhone | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_PHONE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastPhone;
    if (p?.iso && p?.national) return p;
  } catch {}
  return null;
}

function saveLastPhone(iso: string, dial: string, national: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      LAST_PHONE_KEY,
      JSON.stringify({ iso, dial, national: normalizeNational(national, iso) }),
    );
  } catch {}
}

function strongPassword(pw: string): boolean {
  return pw.length >= 6 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}

export function AuthFlow({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [remembered, setRemembered] = useState<AuthSession>(() => loadRemembered());
  const [step, setStep] = useState<Step>('signin');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [country, setCountry] = useState<Country>(() => {
    const last = loadLastPhone();
    return last ? findCountry(last.iso) : DEFAULT_COUNTRY;
  });
  const [national, setNational] = useState(() => loadLastPhone()?.national || '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [signupPin, setSignupPin] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (pin.length === 4 && step === 'pin' && !busy) {
      void submitPin(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, step]);

  function finish(session: AuthSession) {
    const iso = session.phoneCountry || country.iso;
    const full: AuthSession = {
      ...session,
      authenticated: true,
      phoneCountry: iso,
      dialCode: session.dialCode || findCountry(iso).dial,
      homeCurrency: session.homeCurrency || homeCurrencyFor(iso),
      vtuEligible:
        typeof session.vtuEligible === 'boolean' ? session.vtuEligible : isVtuEligible(iso),
    };
    saveRemembered(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(iso, full.dialCode || findCountry(iso).dial, displayNational(iso, full.contact));
    }
    setRemembered(full);
    onAuthenticated(full);
  }

  async function handleContinueSignIn() {
    setError('');
    setBusy(true);
    try {
      if (method === 'phone') {
        const phoneErr = validatePhoneForCountry(country.iso, national);
        if (phoneErr) {
          setError(phoneErr);
          return;
        }
        const e164 = toE164(country.iso, country.dial, national);
        if (backendConfigured()) {
          try {
            const res = await fetch('/api/auth/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: e164 }),
            });
            const b = (await res.json()) as {
              found?: boolean;
              email?: string;
              phone?: string;
              fullName?: string;
              phoneCountry?: string;
            };
            if (res.ok && b.found) {
              const session: AuthSession = {
                ...DEFAULT_MOCK,
                method: 'phone',
                contact: b.phone || e164,
                name: b.fullName || '',
                email: b.email || '',
                phoneCountry: b.phoneCountry || country.iso,
                dialCode: country.dial,
                pin: '',
                password: '',
                authenticated: false,
              };
              saveRemembered(session);
              setRemembered(session);
              setPin('');
              setStep('pin');
              return;
            }
            if (res.ok && !b.found) {
              setError('No account found. Create one free.');
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setError('Could not reach the server. Try again.');
      } else {
        const em = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          setError('Enter a valid email address');
          return;
        }
        if (backendConfigured()) {
          try {
            const res = await fetch('/api/auth/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: em }),
            });
            const b = (await res.json()) as {
              found?: boolean;
              email?: string;
              phone?: string;
              fullName?: string;
              phoneCountry?: string;
            };
            if (res.ok && b.found) {
              const session: AuthSession = {
                ...DEFAULT_MOCK,
                method: 'email',
                contact: b.phone || em,
                name: b.fullName || '',
                email: b.email || em,
                phoneCountry: b.phoneCountry || 'NG',
                pin: '',
                password: '',
                authenticated: false,
              };
              saveRemembered(session);
              setRemembered(session);
              setPin('');
              setStep('pin');
              return;
            }
            if (res.ok && !b.found) {
              setError('No account found. Create one free.');
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setError('Could not reach the server. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(candidate: string) {
    setError('');
    setBusy(true);
    try {
      if (!backendConfigured()) {
        setError('Could not verify PIN. Try again.');
        setPin('');
        return;
      }
      const isEmail = remembered.method === 'email' || Boolean(remembered.email);
      const body = isEmail
        ? { email: remembered.email || remembered.contact, pin: candidate }
        : { phone: remembered.contact, pin: candidate };
      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const b = (await res.json()) as {
        ok?: boolean;
        error?: string;
        access_token?: string;
        refresh_token?: string;
        email?: string;
        phone?: string;
        fullName?: string;
        phoneCountry?: string;
        balanceNgn?: number;
        balanceUsd?: number;
      };
      if (res.ok && b.ok) {
        // Unlock UI immediately; set Supabase session in background
        if (b.access_token && b.refresh_token) {
          try {
            const { saveSessionTokens } = await import('./session-unlock');
            saveSessionTokens({ access_token: b.access_token, refresh_token: b.refresh_token });
          } catch {
            /* ignore */
          }
          void (async () => {
            try {
              const sb = getSupabaseBrowser();
              if (sb) {
                await sb.auth.setSession({
                  access_token: b.access_token!,
                  refresh_token: b.refresh_token!,
                });
              }
            } catch {
              /* ignore */
            }
          })();
        }
        finish({
          ...DEFAULT_MOCK,
          ...remembered,
          authenticated: true,
          method: isEmail ? 'email' : 'phone',
          contact: b.phone || remembered.contact,
          name: b.fullName || remembered.name,
          email: b.email || remembered.email,
          phoneCountry: b.phoneCountry || remembered.phoneCountry || country.iso,
          pin: '',
          password: '',
          balanceNgn: b.balanceNgn ?? 0,
          balanceUsd: b.balanceUsd ?? 0,
        });
        return;
      }
      setError(b.error || 'Incorrect PIN');
      setPin('');
    } catch {
      setError('Could not verify PIN. Try again.');
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAccount() {
    setError('');
    const fullName = name.trim().replace(/\s+/g, ' ');
    if (fullName.split(' ').length < 2) {
      setError('Enter your full name (first and last)');
      return;
    }
    const phoneErr = validatePhoneForCountry(country.iso, national);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    if (!strongPassword(password)) {
      setError('Password must be at least 6 characters with uppercase, lowercase, and a number');
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) {
      setError('Create a 4-digit PIN');
      return;
    }
    setBusy(true);
    try {
      const e164 = toE164(country.iso, country.dial, national);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: em,
          password,
          pin: signupPin,
          phone: e164,
          phoneCountry: country.iso,
        }),
      });
      const b = (await res.json()) as {
        ok?: boolean;
        error?: string;
        access_token?: string;
        refresh_token?: string;
        email?: string;
        phone?: string;
        fullName?: string;
        phoneCountry?: string;
      };
      if (!res.ok || !b.ok) {
        setError(b.error || 'Could not create account');
        return;
      }
      if (b.access_token && b.refresh_token) {
        try {
          const { saveSessionTokens } = await import('./session-unlock');
          saveSessionTokens({ access_token: b.access_token, refresh_token: b.refresh_token });
        } catch {
          /* ignore */
        }
        void (async () => {
          try {
            const sb = getSupabaseBrowser();
            if (sb) {
              await sb.auth.setSession({
                access_token: b.access_token!,
                refresh_token: b.refresh_token!,
              });
            }
          } catch {
            /* ignore */
          }
        })();
      }
      finish({
        authenticated: true,
        method: 'phone',
        contact: b.phone || e164,
        name: b.fullName || fullName,
        username: '',
        pin: '',
        password: '',
        phoneCountry: b.phoneCountry || country.iso,
        dialCode: country.dial,
        homeCurrency: homeCurrencyFor(country.iso),
        vtuEligible: isVtuEligible(country.iso),
        balanceNgn: 0,
        balanceUsd: 0,
        email: b.email || em,
      });
    } catch {
      setError('Registration failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function onPinDigit(d: string) {
    if (busy) return;
    setError('');
    setPin((prev) => (prev.length >= 4 ? prev : prev + d));
  }

  function onPinBackspace() {
    if (busy) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }

  const displayContact =
    remembered.method === 'email' || remembered.email
      ? remembered.email || remembered.contact
      : displayNational(remembered.phoneCountry || country.iso, remembered.contact) ||
        remembered.contact;

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden />
          <strong>Verxor</strong>
        </div>

        {step === 'signin' && (
          <>
            <h1>Welcome back 👋</h1>
            <p className="auth-sub">Sign in to your Verxor account</p>
            <div className="auth-tabs">
              <button
                type="button"
                className={method === 'phone' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setMethod('phone')}
              >
                <Phone size={14} /> Phone Number
              </button>
              <button
                type="button"
                className={method === 'email' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => setMethod('email')}
              >
                <Mail size={14} /> Email Address
              </button>
            </div>
            {method === 'phone' ? (
              <PhoneField
                id="auth-phone"
                label="PHONE NUMBER"
                country={country}
                national={national}
                onNationalChange={setNational}
                onOpenPicker={() => setPickerOpen(true)}
                placeholder="8012345678"
              />
            ) : (
              <div className="auth-field">
                <label>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
            )}
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="auth-primary" disabled={busy} onClick={() => void handleContinueSignIn()}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
            <p className="auth-footer">
              Don't have an account?{' '}
              <button type="button" className="auth-link" onClick={() => { setError(''); setStep('signup'); }}>
                Create one free
              </button>
            </p>
          </>
        )}

        {step === 'signup' && (
          <>
            <h1>Create your account</h1>
            <p className="auth-sub">All details link to your PIN for login on any device</p>
            <div className="auth-field">
              <label>FULL NAME</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" autoComplete="name" />
            </div>
            <PhoneField
              id="auth-phone-signup"
              label="PHONE NUMBER"
              country={country}
              national={national}
              onNationalChange={setNational}
              onOpenPicker={() => setPickerOpen(true)}
              placeholder="8012345678"
            />
            <div className="auth-field">
              <label>EMAIL</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </div>
            <div className="auth-field">
              <label>PASSWORD</label>
              <div className="auth-pw-row">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars, A-z, 0-9"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label>4-DIGIT PIN</label>
              <input
                inputMode="numeric"
                maxLength={4}
                value={signupPin}
                onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                autoComplete="off"
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="auth-primary" disabled={busy} onClick={() => void handleCreateAccount()}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
            <p className="auth-footer">
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => { setError(''); setStep('signin'); }}>
                Sign in
              </button>
            </p>
          </>
        )}

        {step === 'pin' && (
          <>
            <h1>Enter your PIN 🔐</h1>
            <p className="auth-sub">
              Logging in as <strong>{displayContact}</strong>
            </p>
            <div className="auth-pin-dots" aria-label="PIN entry">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={pin.length > i ? 'filled' : pin.length === i ? 'active' : ''}>
                  {pin.length > i ? '•' : ''}
                </span>
              ))}
            </div>
            {error && <p className="auth-error">{error}</p>}
            <div className="auth-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} type="button" onClick={() => onPinDigit(d)} disabled={busy}>
                  {d}
                </button>
              ))}
              <button type="button" className="auth-key-bio" disabled aria-label="Biometric">
                <Fingerprint size={20} />
              </button>
              <button type="button" onClick={() => onPinDigit('0')} disabled={busy}>
                0
              </button>
              <button type="button" className="auth-key-del" onClick={onPinBackspace} disabled={busy} aria-label="Delete">
                ⌫
              </button>
            </div>
            <div className="auth-pin-actions">
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setPin('');
                  setError('');
                  setStep('signin');
                }}
              >
                {remembered.method === 'email' || remembered.email ? 'Change email' : 'Change number'}
              </button>
              <button type="button" className="auth-link" onClick={() => setStep('forgot')}>
                Forgot PIN?
              </button>
            </div>
            <p className="auth-footer">
              Don't have an account?{' '}
              <button type="button" className="auth-link" onClick={() => { setError(''); setStep('signup'); }}>
                Create one free
              </button>
            </p>
          </>
        )}

        {step === 'forgot' && (
          <>
            <h1>Forgot PIN?</h1>
            <p className="auth-sub">Contact support or create a new account if you cannot recover access.</p>
            <button type="button" className="auth-primary" onClick={() => setStep('signin')}>
              Back to sign in
            </button>
          </>
        )}
      </div>

      {pickerOpen && (
        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
