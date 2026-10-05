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
} from 'lucide-react';
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
import { isBiometricEnabledLocally } from '../lib/webauthn';
import './auth.css';

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
const ACCOUNTS_KEY = 'verxor-accounts';

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

type Step = 'boot' | 'signin' | 'signup' | 'pin' | 'forgot';
type LastPhone = { iso: string; dial: string; national: string };
type StoredAccount = AuthSession & { id: string };

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

function loadAccounts(): StoredAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persistAccounts(list: StoredAccount[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function phoneDigits(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function emailsMatch(a?: string, b?: string): boolean {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  return Boolean(x && y && x === y);
}

function findAccount(opts: {
  phoneE164?: string;
  email?: string;
}): StoredAccount | null {
  const list = loadAccounts();
  const phone = phoneDigits(opts.phoneE164 || '');
  const em = (opts.email || '').trim().toLowerCase();
  for (const acc of list) {
    if (phone && phoneDigits(acc.contact) === phone) return acc;
    if (em && emailsMatch(acc.email, em)) return acc;
    if (em && acc.method === 'email' && emailsMatch(acc.contact, em)) return acc;
  }
  const stored = loadRemembered();
  if (stored.contact && stored.pin) {
    if (phone && phoneDigits(stored.contact) === phone) {
      return { ...stored, id: 'legacy' };
    }
    if (
      em &&
      (emailsMatch(stored.email, em) ||
        (stored.method === 'email' && emailsMatch(stored.contact, em)))
    ) {
      return { ...stored, id: 'legacy' };
    }
  }
  return null;
}

function upsertAccount(session: AuthSession): StoredAccount {
  const list = loadAccounts();
  const phone = phoneDigits(session.contact);
  const em = (session.email || '').trim().toLowerCase();
  const idx = list.findIndex((a) => {
    if (phone && phoneDigits(a.contact) === phone) return true;
    if (em && emailsMatch(a.email, em)) return true;
    return false;
  });
  const id = idx >= 0 ? list[idx].id : `acc_${Date.now().toString(36)}`;
  const row: StoredAccount = {
    ...session,
    id,
    authenticated: false,
    email: em || session.email || '',
  };
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  persistAccounts(list);
  return row;
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
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [signupPin, setSignupPin] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [bioHint, setBioHint] = useState('');

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    if (s.contact && s.pin) upsertAccount(s);

    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('signin');
        if (s.method) setMethod(s.method);
        if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
        if (s.method === 'email') setEmail(s.contact || s.email || '');
        else if (s.contact) {
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
      if (s.method === 'email') setEmail(s.contact || s.email || '');
      else if (s.contact) {
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

    setStep('signin');
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
      balanceNgn: session.balanceNgn ?? 0,
      balanceUsd: session.balanceUsd ?? 0,
    };
    saveRemembered(full);
    upsertAccount(full);
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
    const iso = country.iso || remembered.phoneCountry || 'NG';
    const n = national || displayNational(iso, remembered.contact || '');
    return n || remembered.contact || '';
  }

  function handleContinueSignIn() {
    setError('');
    // Primex-style: phone or email only — no password on daily login
    if (method === 'phone') {
      const phoneErr = validatePhoneForCountry(country.iso, national);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
      const e164 = toE164(country.iso, country.dial, national);
      saveLastPhone(country.iso, country.dial, national);
      const account = findAccount({ phoneE164: e164 });
      if (!account || !account.pin) {
        setError(
          'No account found for this number on this device. Create an account or use the device where you registered.',
        );
        return;
      }
      const session: AuthSession = {
        ...account,
        method: 'phone',
        contact: account.contact || e164,
        authenticated: false,
      };
      saveRemembered(session);
      setRemembered(session);
      setPin('');
      setStep('pin');
      return;
    }

    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    const account = findAccount({ email: em });
    if (!account || !account.pin) {
      setError(
        'No account found for this email on this device. Create an account or use the device where you registered.',
      );
      return;
    }
    const session: AuthSession = {
      ...account,
      method: 'email',
      contact: account.contact,
      email: account.email || em,
      authenticated: false,
    };
    saveRemembered(session);
    setRemembered(session);
    setPin('');
    setStep('pin');
  }

  function handleSignup() {
    setError('');
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (!name || name.split(' ').length < 2) {
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
    saveLastPhone(country.iso, country.dial, national);

    const session: AuthSession = {
      authenticated: false,
      method: 'phone',
      contact: e164,
      name,
      email: em,
      pin: signupPin,
      password,
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      balanceNgn: 0,
      balanceUsd: 0,
    };
    saveRemembered(session);
    upsertAccount(session);
    setRemembered(session);
    setPin('');
    setStep('pin');
  }

  function onPinDigit(d: string) {
    setError('');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      if (next.length === 4) {
        queueMicrotask(() => verifyPin(next));
      }
      return next;
    });
  }

  function onPinDelete() {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }

  function verifyPin(entered: string) {
    const digits = (entered || '').replace(/\D/g, '').slice(0, 4);
    let expected = (remembered.pin || loadRemembered().pin || '').replace(/\D/g, '');
    // Also look up PIN from the multi-account store (same phone/email)
    if (!expected || expected.length !== 4) {
      const byPhone = findAccount({ phoneE164: remembered.contact });
      const byEmail = findAccount({ email: remembered.email || remembered.contact });
      expected = ((byPhone || byEmail)?.pin || '').replace(/\D/g, '');
    }
    if (!expected || expected.length !== 4) {
      setError('No PIN on file. Create an account or reset PIN.');
      setPin('');
      return;
    }
    if (digits !== expected) {
      setError('Incorrect PIN');
      setPin('');
      return;
    }
    const base = remembered.contact
      ? remembered
      : findAccount({ phoneE164: remembered.contact }) ||
        findAccount({ email: remembered.email }) ||
        remembered;
    finish({ ...base, ...remembered, pin: expected, authenticated: true });
  }

  function onFingerprintTap() {
    if (!isBiometricEnabledLocally()) {
      setBioHint('Set up biometric login from Security settings after you sign in.');
      return;
    }
    setBioHint('Biometric login is ready. Enter your PIN for this session.');
  }

  function handleForgotReset() {
    setError('');
    const expectedPass = remembered.password || loadRemembered().password;
    if (!forgotPassword || forgotPassword !== expectedPass) {
      setError('Incorrect password');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('Enter a new 4-digit PIN');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('PINs do not match');
      return;
    }
    const next: AuthSession = {
      ...remembered,
      pin: newPin,
      authenticated: false,
    };
    saveRemembered(next);
    upsertAccount(next);
    setRemembered(next);
    setPin('');
    setNewPin('');
    setConfirmNewPin('');
    setForgotPassword('');
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
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Enter your phone or email, then your PIN</p>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={method === 'phone' ? 'active' : ''}
              onClick={() => {
                setMethod('phone');
                setError('');
              }}
            >
              <Phone size={14} /> Phone
            </button>
            <button
              type="button"
              className={method === 'email' ? 'active' : ''}
              onClick={() => {
                setMethod('email');
                setError('');
              }}
            >
              <Mail size={14} /> Email
            </button>
          </div>

          {method === 'phone' ? (
            <div className="auth-field">
              <label>Phone number</label>
              <PhoneField
                country={country}
                national={national}
                onNationalChange={setNational}
                onOpenPicker={() => setPickerOpen(true)}
              />
            </div>
          ) : (
            <div className="auth-field">
              <label htmlFor="si-email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  id="si-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="button" className="auth-primary" onClick={handleContinueSignIn}>
            Continue
          </button>

          <p className="auth-footer-link">
            Don't have an account?{' '}
            <button type="button" onClick={() => { setError(''); setStep('signup'); }}>
              Create one free
            </button>
          </p>
        </div>
        <CountryPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          selected={country}
          onSelect={(c) => {
            setCountry(c);
            setPickerOpen(false);
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
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Fill in your details to get started</p>

          <div className="auth-field">
            <label htmlFor="su-name">Full name</label>
            <input
              id="su-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label>Phone number</label>
            <PhoneField
              country={country}
              national={national}
              onNationalChange={setNational}
              onOpenPicker={() => setPickerOpen(true)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="su-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={16} />
              <input
                id="su-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="su-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="auth-hint">Min 6 chars · uppercase, lowercase, and a number</p>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pin">4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="su-pin"
                inputMode="numeric"
                maxLength={4}
                value={signupPin}
                onChange={(e) =>
                  setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="••••"
                autoComplete="off"
              />
            </div>
            <p className="auth-hint">Used to unlock the app — keep it secret</p>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="button" className="auth-primary" onClick={handleSignup}>
            Create account
          </button>

          <p className="auth-footer-link">
            Already have an account?{' '}
            <button type="button" onClick={() => { setError(''); setStep('signin'); }}>
              Sign in
            </button>
          </p>
        </div>
        <CountryPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          selected={country}
          onSelect={(c) => {
            setCountry(c);
            setPickerOpen(false);
          }}
        />
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--pin">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setPin('');
              setStep('signin');
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <BrandMark />
          <h1 className="auth-title">Enter your PIN</h1>
          <p className="auth-sub">
            Logging in as <strong>{contactLabel()}</strong>
          </p>

          <p className="pin-label">Enter your 4-digit PIN</p>

          <div className="pin-boxes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box${pin.length > i ? ' filled' : ''}${pin.length === i ? ' active' : ''}`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>

          {error ? <p className="auth-error">{error}</p> : null}
          {bioHint ? <p className="auth-hint">{bioHint}</p> : null}

          <div className="pin-pad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className="pin-key" onClick={() => onPinDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className="pin-key pin-key--ghost" onClick={onFingerprintTap} aria-label="Biometric">
              <Fingerprint size={22} />
            </button>
            <button type="button" className="pin-key" onClick={() => onPinDigit('0')}>
              0
            </button>
            <button type="button" className="pin-key pin-key--ghost" onClick={onPinDelete} aria-label="Delete">
              ⌫
            </button>
          </div>

          <div className="pin-footer">
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => {
                setError('');
                setPin('');
                setStep('signin');
              }}
            >
              ← Change number
            </button>
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => {
                setError('');
                setForgotPassword('');
                setNewPin('');
                setConfirmNewPin('');
                setStep('forgot');
              }}
            >
              Forgot PIN?
            </button>
          </div>
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
            onClick={() => {
              setError('');
              setStep('pin');
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">Confirm your password, then set a new PIN</p>

          <div className="auth-field">
            <label htmlFor="fp-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="fp-pass"
                type="password"
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                placeholder="Account password"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="fp-pin">New PIN</label>
            <input
              id="fp-pin"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="fp-confirm">Confirm PIN</label>
            <input
              id="fp-confirm"
              inputMode="numeric"
              maxLength={4}
              value={confirmNewPin}
              onChange={(e) =>
                setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
            />
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="button" className="auth-primary" onClick={handleForgotReset}>
            Save new PIN
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default AuthFlow;
