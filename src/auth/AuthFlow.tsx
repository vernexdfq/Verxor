'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, authenticated: false }));
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
      JSON.stringify({ iso, dial, national: normalizeNational(national, iso) }),
    );
  } catch {
    /* ignore */
  }
}

function BrandMark() {
  return (
    <div className="auth-brand" aria-hidden>
      <img src="/brand/verxor-logo.svg" alt="" width={40} height={40} />
      <span>Verxor</span>
    </div>
  );
}

export function AuthFlow({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [step, setStep] = useState<'welcome' | 'signin' | 'signup' | 'pin'>('welcome');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const s = loadRemembered();
    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('signin');
        if (s.contact) {
          setMethod(s.method || 'phone');
          setContact(s.contact);
          if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
        }
        return;
      }
    } catch {
      /* ignore */
    }
    if (s.contact && s.pin) {
      setStep('pin');
      setMethod(s.method || 'phone');
      setContact(s.contact);
      setName(s.name || '');
      if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
    }
  }, []);

  const finish = (session: AuthSession) => {
    saveRemembered(session);
    onAuthenticated({ ...session, authenticated: true });
  };

  const submitPin = () => {
    setError(null);
    const stored = loadRemembered();
    if (!stored.pin || pin !== stored.pin) {
      setError('Incorrect PIN');
      return;
    }
    finish({ ...stored, authenticated: true });
  };

  const submitSignIn = () => {
    setError(null);
    const stored = loadRemembered();
    const contactNorm =
      method === 'phone'
        ? toE164(country.iso, country.dial, contact)
        : contact.trim().toLowerCase();
    if (!contactNorm) {
      setError('Enter your phone or email');
      return;
    }
    if (!password || password.length < 4) {
      setError('Enter your password');
      return;
    }
    if (stored.password && password !== stored.password) {
      setError('Wrong password');
      return;
    }
    if (stored.pin) {
      setStep('pin');
      setContact(contactNorm);
      return;
    }
    finish({
      ...stored,
      method,
      contact: contactNorm,
      password,
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      authenticated: true,
    });
  };

  const submitSignUp = () => {
    setError(null);
    const nm = name.trim();
    if (nm.length < 2) {
      setError('Enter your full name');
      return;
    }
    const contactNorm =
      method === 'phone'
        ? toE164(country.iso, country.dial, contact)
        : contact.trim().toLowerCase();
    if (!contactNorm) {
      setError(method === 'phone' ? 'Enter a valid phone' : 'Enter a valid email');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password too short - use 6 or more characters');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Create a 4-digit PIN');
      return;
    }
    if (method === 'phone') {
      saveLastPhone(country.iso, country.dial, contact);
    }
    finish({
      ...DEFAULT_MOCK,
      method,
      contact: contactNorm,
      name: nm,
      pin,
      password,
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      email: method === 'email' ? contactNorm : '',
      authenticated: true,
    });
  };

  if (step === 'welcome') {
    return (
      <div className="auth-page">
        <BrandMark />
        <h1>Welcome to Verxor</h1>
        <p className="auth-sub">Digital services, wallet and virtual numbers</p>
        <button type="button" className="auth-primary" onClick={() => setStep('signin')}>
          Sign in
        </button>
        <button type="button" className="auth-secondary" onClick={() => setStep('signup')}>
          Create account
        </button>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="auth-page">
        <BrandMark />
        <h1>Enter PIN</h1>
        <p className="auth-sub">Welcome back{name ? `, ${name.split(' ')[0]}` : ''}</p>
        <div className="auth-field">
          <Lock size={16} />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="PIN"
            autoFocus
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="auth-primary" onClick={submitPin}>
          Continue
        </button>
        <button
          type="button"
          className="auth-link"
          onClick={() => {
            setStep('signin');
            setPin('');
            setError(null);
          }}
        >
          Use password instead
        </button>
      </div>
    );
  }

  if (step === 'signin') {
    return (
      <div className="auth-page">
        <button type="button" className="auth-back" onClick={() => setStep('welcome')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <BrandMark />
        <h1>Sign in</h1>
        <div className="auth-tabs">
          <button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => setMethod('phone')}>
            Phone
          </button>
          <button type="button" className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}>
            Email
          </button>
        </div>
        {method === 'phone' ? (
          <PhoneField
            country={country}
            national={displayNational(country.iso, contact) || contact}
            onChangeNational={setContact}
            onOpenPicker={() => setPickerOpen(true)}
          />
        ) : (
          <div className="auth-field">
            <Mail size={16} />
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>
        )}
        <div className="auth-field">
          <Lock size={16} />
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="auth-primary" onClick={submitSignIn}>
          Sign in
        </button>
        {pickerOpen && (
          <CountryPickerSheet
            selected={country.iso}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-page">
        <button type="button" className="auth-back" onClick={() => setStep('welcome')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <BrandMark />
        <h1>Create account</h1>
        <div className="auth-field">
          <User size={16} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
          />
        </div>
        <div className="auth-tabs">
          <button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => setMethod('phone')}>
            Phone
          </button>
          <button type="button" className={method === 'email' ? 'active' : ''} onClick={() => setMethod('email')}>
            Email
          </button>
        </div>
        {method === 'phone' ? (
          <PhoneField
            country={country}
            national={contact}
            onChangeNational={setContact}
            onOpenPicker={() => setPickerOpen(true)}
          />
        ) : (
          <div className="auth-field">
            <Mail size={16} />
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>
        )}
        <div className="auth-field">
          <Lock size={16} />
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            autoComplete="new-password"
          />
          <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="auth-field">
          <Lock size={16} />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4-digit PIN"
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="auth-primary" onClick={submitSignUp}>
          Create account
        </button>
        {pickerOpen && (
          <CountryPickerSheet
            selected={country.iso}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
