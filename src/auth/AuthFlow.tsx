'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  DEFAULT_COUNTRY,
  displayNational,
  findCountry,
  flagEmoji,
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

function formatContactDisplay(session: AuthSession, method: AuthMethod): string {
  if (method === 'email') return session.contact;
  const iso = session.phoneCountry || 'NG';
  const national = displayNational(iso, session.contact);
  const c = findCountry(iso);
  return `${flagEmoji(iso)} +${c.dial} ${national}`;
}

function BrandMark() {
  return (
    <div className="auth-brand" aria-label="Verxor">
      <div className="auth-brand-mark">
        <img src="/brand/verxor-logo.svg" alt="" width="36" height="36" />
      </div>
      <span className="auth-brand-name">Verxor</span>
    </div>
  );
}

type Step = 'signin' | 'pin' | 'signup' | 'forgot-password' | 'forgot-new-pin' | 'forgot-success';

export function AuthFlow({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [remembered, setRemembered] = useState<AuthSession>(DEFAULT_MOCK);
  const [step, setStep] = useState<Step>('signin');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [contact, setContact] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signPin, setSignPin] = useState('');
  const [referral, setReferral] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    setMethod(s.method || 'phone');
    setContact(s.contact || '');
    if (s.method === 'phone' && s.phoneCountry) {
      setCountry(findCountry(s.phoneCountry));
      const last = loadLastPhone();
      if (last && last.iso === s.phoneCountry) setNational(last.national);
      else if (s.contact) setNational(displayNational(s.phoneCountry, s.contact));
    }
    setHydrated(true);
  }, []);

  const goToPin = () => {
    setError('');
    if (method === 'phone') {
      const n = normalizeNational(national, country.iso);
      if (!n || n.length < 6) {
        setError('Enter a valid phone number');
        return;
      }
      saveLastPhone(country.iso, country.dial, n);
      const display = displayNational(country.iso, n);
      const contactValue = country.iso === 'NG' ? display : `+${toE164(country.iso, country.dial, n)}`;
      setContact(contactValue);
      setRemembered((r) => ({
        ...r,
        method: 'phone',
        contact: contactValue,
        phoneCountry: country.iso,
        dialCode: country.dial,
        homeCurrency: homeCurrencyFor(country.iso),
        vtuEligible: isVtuEligible(country.iso),
      }));
    } else {
      if (!contact.trim() || !contact.includes('@')) {
        setError('Enter a valid email');
        return;
      }
      setRemembered((r) => ({ ...r, method: 'email', contact: contact.trim() }));
    }
    setPin('');
    setStep('pin');
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) setTimeout(() => verifyPin(next), 140);
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const verifyPin = (value: string) => {
    const current = loadRemembered();
    if (value === current.pin) {
      const next: AuthSession = {
        ...current,
        authenticated: true,
        method,
        contact,
        name: current.name || 'User',
        phoneCountry: current.phoneCountry || country.iso,
        dialCode: current.dialCode || country.dial,
        homeCurrency: current.homeCurrency || homeCurrencyFor(current.phoneCountry || country.iso),
        vtuEligible:
          typeof current.vtuEligible === 'boolean'
            ? current.vtuEligible
            : isVtuEligible(current.phoneCountry || country.iso),
        balanceNgn: current.balanceNgn ?? 0,
        balanceUsd: current.balanceUsd ?? 0,
        email: current.email || (method === 'email' ? contact : ''),
      };
      saveRemembered({ ...next, authenticated: false });
      if (method === 'phone') {
        saveLastPhone(next.phoneCountry || country.iso, next.dialCode || country.dial, national || next.contact);
      }
      onAuthenticated(next);
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  };

  const handleSignUp = () => {
    if (!fullName.trim()) {
      setError('Enter your full name');
      return;
    }
    const n = normalizeNational(national, country.iso);
    if (!n || n.length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    if (!signEmail.trim() || !signEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^\d{4}$/.test(signPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    const display = displayNational(country.iso, n);
    const contactValue = country.iso === 'NG' ? display : `+${toE164(country.iso, country.dial, n)}`;
    saveLastPhone(country.iso, country.dial, n);
    const session: AuthSession = {
      authenticated: true,
      method: 'phone',
      contact: contactValue,
      name: fullName.trim(),
      pin: signPin,
      password,
      email: signEmail.trim(),
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      balanceNgn: 0,
      balanceUsd: 0,
    };
    saveRemembered(session);
    onAuthenticated(session);
  };

  const finishForgotSuccess = () => {
    setPin('');
    setStep('signin');
  };

  if (!hydrated) {
    return <div className="auth-root" />;
  }

  if (step === 'signin') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--signin">
          <BrandMark />
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Welcome back to Verxor</p>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              aria-selected={method === 'phone'}
              onClick={() => {
                setMethod('phone');
                setError('');
              }}
            >
              Phone
            </button>
            <button
              type="button"
              role="tab"
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              aria-selected={method === 'email'}
              onClick={() => {
                setMethod('email');
                setError('');
              }}
            >
              Email
            </button>
          </div>
          {method === 'phone' ? (
            <PhoneField
              id="auth-phone"
              label="Phone Number"
              country={country}
              national={national}
              onOpenPicker={() => setPickerOpen(true)}
              onNationalChange={(v) => {
                setNational(v);
                if (error) setError('');
              }}
              placeholder={country.iso === 'NG' ? '8012345678' : 'Phone number'}
            />
          ) : (
            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={18} />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="email"
                />
              </div>
            </div>
          )}
          <CountryPickerSheet
            open={pickerOpen}
            selectedIso={country.iso}
            onClose={() => setPickerOpen(false)}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
          />
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={goToPin}>
            Continue
          </button>
          <div className="auth-footer-link">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('signup');
              }}
            >
              Create an account
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setForgotPassword('');
                setShowForgotPass(false);
                setStep('forgot-password');
              }}
            >
              Forgot PIN?
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="auth-root">
        <button
          type="button"
          className="auth-back"
          onClick={() => {
            setPin('');
            setError('');
            setStep('signin');
          }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body auth-body--pin">
          <h1 className="auth-title auth-title--center">Enter your PIN</h1>
          <p className="auth-sub auth-sub--center">
            {method === 'phone'
              ? national
                ? displayNational(country.iso, national)
                : contact
              : contact}
          </p>
          <p className="pin-label">Enter your 4-digit PIN</p>
          <div className="pin-boxes" aria-label="PIN digits">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box ${pin.length > i ? 'filled' : ''} ${pin.length === i ? 'active' : ''}`}
              >
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className="pin-key" onClick={() => handlePinDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className="pin-key" aria-hidden="true" style={{ visibility: 'hidden' }} tabIndex={-1} />
            <button type="button" className="pin-key" onClick={() => handlePinDigit('0')}>
              0
            </button>
            <button type="button" className="pin-key delete" onClick={handlePinDelete} aria-label="Delete">
              Del
            </button>
          </div>
          <div className="pin-actions">
            <button
              type="button"
              onClick={() => {
                setError('');
                setForgotPassword('');
                setShowForgotPass(false);
                setStep('forgot-password');
              }}
            >
              Forgot PIN?
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <button
          type="button"
          className="auth-back"
          onClick={() => {
            setError('');
            setStep('signin');
          }}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join Verxor in under a minute</p>
          <div className="auth-field">
            <label htmlFor="su-name">Full name</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input
                id="su-name"
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>
          <PhoneField
            id="su-phone"
            label="Phone Number"
            country={country}
            national={national}
            onOpenPicker={() => setPickerOpen(true)}
            onNationalChange={(v) => {
              setNational(v);
              if (error) setError('');
            }}
            placeholder={country.iso === 'NG' ? '8012345678' : 'Phone number'}
          />
          <CountryPickerSheet
            open={pickerOpen}
            selectedIso={country.iso}
            onClose={() => setPickerOpen(false)}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
          />
          <div className="auth-field">
            <label htmlFor="su-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="su-email"
                type="email"
                placeholder="Email"
                value={signEmail}
                onChange={(e) => setSignEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                id="su-pass"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="su-pin">4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                id="su-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={signPin}
                onChange={(e) => {
                  setSignPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="su-ref">
              Referral code <span className="auth-optional">(optional)</span>
            </label>
            <div className="auth-input-wrap">
              <Gift size={18} />
              <input
                id="su-ref"
                type="text"
                placeholder="Referral code"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={handleSignUp}>
            Create account
          </button>
          <div className="auth-footer-link">
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('signin');
              }}
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'forgot-password') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => setStep('signin')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Forgot PIN</h1>
          <p className="auth-sub">Enter your account password to reset your PIN</p>
          <div className="auth-field">
            <label htmlFor="fp-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                id="fp-pass"
                type={showForgotPass ? 'text' : 'password'}
                placeholder="Account password"
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowForgotPass((v) => !v)}
                aria-label="Toggle password"
              >
                {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              if (!forgotPassword || forgotPassword.length < 6) {
                setError('Enter your password');
                return;
              }
              setError('');
              setNewPin('');
              setConfirmNewPin('');
              setStep('forgot-new-pin');
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot-new-pin') {
    return (
      <div className="auth-root">
        <button
          type="button"
          className="auth-back"
          onClick={() => setStep('forgot-password')}
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Set new PIN</h1>
          <p className="auth-sub">Choose a new 4-digit PIN</p>
          <div className="auth-field">
            <label htmlFor="np-pin">New PIN</label>
            <div className="auth-input-wrap">
              <input
                id="np-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="np-confirm">Confirm PIN</label>
            <div className="auth-input-wrap">
              <input
                id="np-confirm"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmNewPin}
                onChange={(e) => {
                  setConfirmNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                autoComplete="off"
              />
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              if (!/^\d{4}$/.test(newPin)) {
                setError('PIN must be exactly 4 digits');
                return;
              }
              if (newPin !== confirmNewPin) {
                setError('PINs do not match');
                return;
              }
              const session = { ...remembered, pin: newPin };
              saveRemembered(session);
              setRemembered(session);
              setSuccessMsg('PIN reset successful — enter PIN to login');
              setStep('forgot-success');
            }}
          >
            Save new PIN
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot-success') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <div className="auth-success">
            <h1 className="auth-title auth-title--center">PIN updated</h1>
            <p className="auth-sub auth-sub--center">
              {successMsg || 'Your PIN has been reset successfully.'}
            </p>
            <button type="button" className="auth-btn" onClick={finishForgotSuccess}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
