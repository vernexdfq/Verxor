'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  DEFAULT_COUNTRY,
  displayNational,
  findCountry,
  homeCurrencyFor,
  isVtuEligible,
  normalizeNational,
  toE164,
  type Country,
} from './countries';
import { CountryPickerSheet, PhoneField } from './phone-field';
import { isBiometricEnabledLocally } from '../lib/webauthn';
import './auth.css';

export type AuthMethod = 'phone' | 'email';

export type AuthSession = {
  authenticated: boolean;
  method: AuthMethod;
  contact: string;
  name: string;
  /** Unique public handle (lowercase). Optional until user sets it. */
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

type Step = 'boot' | 'signin' | 'signup' | 'pin' | 'forgot';

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
        typeof parsed.vtuEligible === 'boolean'
          ? parsed.vtuEligible
          : isVtuEligible(iso),
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, authenticated: false }),
    );
  } catch {
    /* ignore */
  }
}

function loadLastPhone(): LastPhone | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_PHONE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastPhone;
    if (p?.iso && p?.national) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function saveLastPhone(iso: string, dial: string, national: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      LAST_PHONE_KEY,
      JSON.stringify({
        iso,
        dial,
        national: normalizeNational(national, iso),
      }),
    );
  } catch {
    /* ignore */
  }
}

function strongPassword(pw: string): boolean {
  return (
    pw.length >= 6 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /\d/.test(pw)
  );
}

function BrandMark() {
  return (
    <div className="auth-brand">
      <div className="auth-brand-mark">
        <img src="/brand/verxor-logo.svg" alt="" width={40} height={40} />
      </div>
      <span className="auth-brand-name">Verxor</span>
    </div>
  );
}

export function AuthFlow({
  onAuthenticated,
}: {
  onAuthenticated: (session: AuthSession) => void;
}) {
  const [remembered, setRemembered] = useState<AuthSession>(DEFAULT_MOCK);
  const [step, setStep] = useState<Step>('boot');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPinField, setShowPinField] = useState(false);
  const [signupPin, setSignupPin] = useState('');
  const [referral, setReferral] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [bioHint, setBioHint] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);

    try {
      const inbound = sessionStorage.getItem('verxor-inbound-ref');
      if (inbound) setReferral(inbound);
    } catch {
      /* ignore */
    }

    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('signin');
        if (s.method) setMethod(s.method);
        if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
        if (s.method === 'email') {
          setEmail(s.contact || s.email || '');
        } else if (s.contact) {
          setNational(displayNational(s.phoneCountry || 'NG', s.contact));
        }
        return;
      }
    } catch {
      /* ignore */
    }

    if (s.contact && s.pin) {
      setStep('pin');
      setMethod(s.method || 'phone');
      if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
      if (s.method === 'email') {
        setEmail(s.contact || s.email || '');
      } else if (s.contact) {
        setNational(displayNational(s.phoneCountry || 'NG', s.contact));
      }
      return;
    }

    const last = loadLastPhone();
    if (last) {
      setCountry(findCountry(last.iso));
      setNational(displayNational(last.iso, last.national));
      setMethod('phone');
      setStep('signin');
      return;
    }

    setStep('signup');
  }, []);

  function finish(session: AuthSession) {
    const iso = session.phoneCountry || country.iso;
    const full: AuthSession = {
      ...session,
      authenticated: true,
      phoneCountry: iso,
      dialCode: session.dialCode || findCountry(iso).dial,
      homeCurrency: session.homeCurrency || homeCurrencyFor(iso),
      vtuEligible:
        typeof session.vtuEligible === 'boolean'
          ? session.vtuEligible
          : isVtuEligible(iso),
    };
    saveRemembered(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(
        iso,
        full.dialCode || findCountry(iso).dial,
        displayNational(iso, full.contact),
      );
    }
    setRemembered(full);
    onAuthenticated(full);
  }

  function contactLabel(): string {
    if (method === 'email') {
      return email.trim() || remembered.contact || remembered.email || '';
    }
    const n =
      national || displayNational(country.iso, remembered.contact || '');
    if (!n) return remembered.contact || '';
    return n.startsWith('0') || country.iso !== 'NG' ? n : `0${n}`;
  }

  function handleContinueSignIn() {
    setError('');
    if (method === 'phone') {
      const digits = normalizeNational(national, country.iso);
      if (digits.length < 7) {
        setError('Enter a valid phone number');
        return;
      }
      const e164 = toE164(country.iso, country.dial, national);
      saveLastPhone(country.iso, country.dial, national);

      const stored = loadRemembered();
      if (stored.contact && stored.pin) {
        const storedNorm =
          stored.method === 'phone'
            ? stored.contact.replace(/\D/g, '')
            : stored.contact.toLowerCase();
        const inputNorm = e164.replace(/\D/g, '');
        if (storedNorm === inputNorm || stored.contact === e164) {
          setRemembered(stored);
          setPin('');
          setStep('pin');
          return;
        }
      }
      setRemembered({
        ...DEFAULT_MOCK,
        method: 'phone',
        contact: e164,
        phoneCountry: country.iso,
        dialCode: country.dial,
        homeCurrency: homeCurrencyFor(country.iso),
        vtuEligible: isVtuEligible(country.iso),
        pin: stored.pin || '',
        name: stored.name || '',
        password: stored.password || '',
        email: stored.email || '',
      });
      setPin('');
      setStep('pin');
      return;
    }

    const em = email.trim().toLowerCase();
    if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    const stored = loadRemembered();
    if (stored.contact && stored.pin) {
      const match =
        stored.method === 'email' &&
        (stored.contact.toLowerCase() === em ||
          (stored.email || '').toLowerCase() === em);
      if (match) {
        setRemembered(stored);
        setPin('');
        setStep('pin');
        return;
      }
    }
    setRemembered({
      ...DEFAULT_MOCK,
      method: 'email',
      contact: em,
      email: em,
      pin: stored.pin || '',
      name: stored.name || '',
      password: stored.password || '',
    });
    setPin('');
    setStep('pin');
  }

  function handleSignup() {
    setError('');
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) {
      setError('Enter your first name');
      return;
    }
    if (!ln) {
      setError('Enter your last name');
      return;
    }
    const digits = normalizeNational(national, country.iso);
    if (digits.length < 7) {
      setError('Enter a valid phone number');
      return;
    }
    const em = email.trim().toLowerCase();
    if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    if (!strongPassword(password)) {
      setError(
        'Password must be at least 6 characters with uppercase, lowercase, and a number',
      );
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) {
      setError('Create a 4-digit PIN');
      return;
    }

    const e164 = toE164(country.iso, country.dial, national);
    const fullName = `${fn} ${ln}`.replace(/\s+/g, ' ').trim();
    const session: AuthSession = {
      authenticated: false,
      method: 'phone',
      contact: e164,
      name: fullName,
      username: '',
      pin: signupPin,
      password,
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      balanceNgn: 0,
      balanceUsd: 0,
      email: em,
    };
    if (referral.trim()) {
      try {
        sessionStorage.setItem(
          'verxor-inbound-ref',
          referral.trim().toUpperCase(),
        );
      } catch {
        /* ignore */
      }
    }
    saveLastPhone(country.iso, country.dial, national);
    finish(session);
  }

  function verifyPin(candidate: string) {
    const stored = loadRemembered();
    const expected = stored.pin || remembered.pin;
    if (expected && candidate === expected) {
      finish({
        ...stored,
        ...remembered,
        pin: expected,
        contact: remembered.contact || stored.contact,
        method: remembered.method || stored.method,
        name: remembered.name || stored.name,
        email: remembered.email || stored.email,
        authenticated: true,
      });
      return;
    }
    if (!expected && candidate.length === 4) {
      setError('No account found for this contact. Create an account first.');
      setPin('');
      return;
    }
    setError('Incorrect PIN');
    setPin('');
  }

  function onPinDigit(d: string) {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      if (next.length === 4) {
        setTimeout(() => verifyPin(next), 60);
      }
      return next;
    });
    if (error) setError('');
    if (bioHint) setBioHint('');
  }

  function onPinDelete() {
    setPin((p) => p.slice(0, -1));
    if (error) setError('');
  }

  function onFingerprintTap() {
    if (isBiometricEnabledLocally()) {
      setBioHint('Biometric login is ready. Enter your PIN for this session.');
      return;
    }
    setBioHint('Enable biometric in Settings after you sign in.');
  }

  function handleForgotReset() {
    setError('');
    if (!/^\d{4}$/.test(newPin)) {
      setError('Enter a new 4-digit PIN');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('PINs do not match');
      return;
    }
    const stored = loadRemembered();
    const next = { ...stored, ...remembered, pin: newPin };
    saveRemembered(next);
    setRemembered(next);
    setPin('');
    setNewPin('');
    setConfirmNewPin('');
    setStep('pin');
  }

  if (step === 'boot') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <BrandMark />
          <p className="auth-sub">Loading…</p>
        </div>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--signin">
          <BrandMark />
          <h1 className="auth-title">Welcome back 👋</h1>
          <p className="auth-sub">Sign in to your Verxor account</p>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={method === 'phone'}
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              onClick={() => {
                setMethod('phone');
                setError('');
              }}
            >
              <Phone size={15} strokeWidth={2.2} />
              Phone Number
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === 'email'}
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              onClick={() => {
                setMethod('email');
                setError('');
              }}
            >
              <Mail size={15} strokeWidth={2.2} />
              Email Address
            </button>
          </div>

          {method === 'phone' ? (
            <PhoneField
              id="signin-phone"
              label="Phone Number"
              country={country}
              national={national}
              onNationalChange={setNational}
              onOpenPicker={() => setPickerOpen(true)}
              placeholder="8012345678"
            />
          ) : (
            <div className="auth-field">
              <label htmlFor="signin-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} strokeWidth={2} />
                <input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            type="button"
            className="auth-btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              handleContinueSignIn();
              setBusy(false);
            }}
          >
            Continue
          </button>

          <div className="auth-or">
            <span>or</span>
          </div>

          <p className="auth-footer-link">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('signup');
              }}
            >
              Create one free
            </button>
          </p>
        </div>

        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setNational('');
          }}
        />
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setStep('signin');
            }}
            aria-label="Back to sign in"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="auth-title">Create your account 🚀</h1>
          <p className="auth-sub">
            Fill in your details below to get started for free
          </p>

          <p className="auth-section">PERSONAL INFO</p>

          <div className="auth-field">
            <label htmlFor="su-first">First Name</label>
            <div className="auth-input-wrap">
              <User size={18} strokeWidth={2} />
              <input
                id="su-first"
                type="text"
                autoComplete="given-name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-last">Last Name</label>
            <div className="auth-input-wrap">
              <User size={18} strokeWidth={2} />
              <input
                id="su-last"
                type="text"
                autoComplete="family-name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <PhoneField
            id="su-phone"
            label="Phone Number"
            country={country}
            national={national}
            onNationalChange={setNational}
            onOpenPicker={() => setPickerOpen(true)}
            placeholder="8012345678"
          />

          <div className="auth-field">
            <label htmlFor="su-email">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} strokeWidth={2} />
              <input
                id="su-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <p className="auth-section">ACCOUNT SECURITY</p>

          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pass"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">
              Min 6 chars · must include uppercase, lowercase, and a number
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pin">4-Digit Transaction PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pin"
                type={showPinField ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                placeholder="Enter 4-digit PIN"
                value={signupPin}
                onChange={(e) =>
                  setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPinField((v) => !v)}
                aria-label={showPinField ? 'Hide PIN' : 'Show PIN'}
              >
                {showPinField ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">
              Used to authorise transactions — keep it secret
            </p>
          </div>

          <p className="auth-section">
            REFERRAL <span className="auth-optional">Optional</span>
          </p>

          <div className="auth-field">
            <label htmlFor="su-ref">Referral Code</label>
            <div className="auth-input-wrap">
              <input
                id="su-ref"
                type="text"
                autoComplete="off"
                placeholder="ENTER REFERRAL CODE"
                value={referral}
                onChange={(e) => setReferral(e.target.value.toUpperCase())}
              />
            </div>
            <p className="auth-hint">
              Have a friend&apos;s referral code? Enter it here.
            </p>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <p className="auth-terms">
            By creating an account, you agree to our{' '}
            <a href="/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </p>

          <button type="button" className="auth-btn" onClick={handleSignup}>
            Create Account
          </button>

          <p className="auth-footer-link">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('signin');
              }}
            >
              Sign In
            </button>
          </p>
        </div>

        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setNational('');
          }}
        />
      </div>
    );
  }

  if (step === 'pin') {
    const label = contactLabel();
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--pin">
          <h1 className="auth-title auth-title--center">
            Enter your PIN{' '}
            <span aria-hidden className="pin-emoji">
              🔐
            </span>
          </h1>
          <p className="auth-sub auth-sub--center">
            Logging in as <strong>{label || '…'}</strong>
          </p>
          <p className="pin-label">Enter your 4-digit PIN</p>

          <div className="pin-boxes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box ${pin.length > i ? 'filled' : ''} ${
                  pin.length === i ? 'active' : ''
                }`}
              >
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>

          {error ? <p className="auth-error">{error}</p> : null}
          {bioHint ? <p className="auth-bio-hint">{bioHint}</p> : null}

          <div className="pin-keypad">
            {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  className="pin-key"
                  onClick={() => onPinDigit(key)}
                >
                  {key}
                </button>
              ),
            )}
            <button
              type="button"
              className="pin-key pin-key--bio"
              onClick={onFingerprintTap}
              aria-label="Login with fingerprint or Face ID"
            >
              <Fingerprint size={26} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className="pin-key"
              onClick={() => onPinDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className="pin-key pin-key--del"
              onClick={onPinDelete}
              aria-label="Delete"
            >
              ⌫
            </button>
          </div>

          <div className="pin-actions">
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError('');
                setBioHint('');
                setStep('signin');
              }}
            >
              ← Change {method === 'email' ? 'email' : 'number'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNewPin('');
                setConfirmNewPin('');
                setStep('forgot');
              }}
            >
              Forgot PIN?
            </button>
          </div>

          <div className="auth-or">
            <span>or</span>
          </div>

          <p className="auth-footer-link">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setPin('');
                setStep('signup');
              }}
            >
              Create one free
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <button
            type="button"
            className="auth-back"
            onClick={() => setStep('pin')}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">
            Set a new 4-digit PIN for{' '}
            <strong>{contactLabel() || 'your account'}</strong>
          </p>

          <div className="auth-field">
            <label htmlFor="fp-new">New PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="fp-new"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit PIN"
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="fp-confirm">Confirm PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="fp-confirm"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Repeat PIN"
                value={confirmNewPin}
                onChange={(e) =>
                  setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
            </div>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="button" className="auth-btn" onClick={handleForgotReset}>
            Save new PIN
          </button>
        </div>
      </div>
    );
  }

  return null;
}
