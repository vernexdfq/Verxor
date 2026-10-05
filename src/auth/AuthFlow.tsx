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
  if (method === 'email') return session.contact || session.email || '';
  const iso = session.phoneCountry || 'NG';
  const national = displayNational(iso, session.contact);
  if (national) return national.startsWith('0') ? national : `0${national}`;
  return session.contact;
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

export function AuthFlow({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [remembered, setRemembered] = useState<AuthSession>(DEFAULT_MOCK);
  const [step, setStep] = useState<
    | 'boot'
    | 'welcome'
    | 'signin'
    | 'signup'
    | 'pin'
    | 'forgot'
    | 'forgot-new-pin'
    | 'forgot-success'
  >('boot');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('signin');
        if (s.method) setMethod(s.method);
        if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
        if (s.method === 'email') setEmail(s.contact || s.email || '');
        else if (s.contact) setNational(displayNational(s.phoneCountry || 'NG', s.contact));
        return;
      }
    } catch {
      /* ignore */
    }
    if (s.contact && s.pin) {
      setStep('pin');
      setMethod(s.method || 'phone');
      setName(s.name || '');
      if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
    } else {
      setStep('welcome');
    }
  }, []);

  const finish = (session: AuthSession) => {
    saveRemembered(session);
    onAuthenticated({ ...session, authenticated: true });
  };

  const handleNationalChange = (v: string) => {
    setNational(v);
    if (error) setError('');
  };

  const goToPin = () => {
    setError('');
    const stored = loadRemembered();
    if (method === 'phone') {
      const n = national.trim();
      if (!n) {
        setError('Enter your phone number');
        return;
      }
      const display = displayNational(country.iso, n);
      const contactValue =
        country.iso === 'NG' ? display : `+${toE164(country.iso, country.dial, n)}`;
      if (stored.password && password) {
        if (password !== stored.password) {
          setError('Wrong password');
          return;
        }
      } else if (!password || password.length < 4) {
        setError('Enter your password');
        return;
      }
      if (stored.pin) {
        setRemembered({
          ...stored,
          method: 'phone',
          contact: contactValue || stored.contact,
          phoneCountry: country.iso,
          dialCode: country.dial,
        });
        setPin('');
        setStep('pin');
        return;
      }
      const next: AuthSession = {
        ...stored,
        method: 'phone',
        contact: contactValue,
        password: password || stored.password,
        phoneCountry: country.iso,
        dialCode: country.dial,
        homeCurrency: homeCurrencyFor(country.iso),
        vtuEligible: isVtuEligible(country.iso),
        authenticated: true,
      };
      finish(next);
      return;
    }
    const em = email.trim().toLowerCase();
    if (!em) {
      setError('Enter your email');
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
      setRemembered({ ...stored, method: 'email', contact: em, email: em });
      setPin('');
      setStep('pin');
      return;
    }
    finish({
      ...stored,
      method: 'email',
      contact: em,
      email: em,
      password,
      authenticated: true,
    });
  };

  const submitPin = () => {
    setError('');
    const stored = loadRemembered();
    if (!stored.pin || pin !== stored.pin) {
      setError('Incorrect PIN');
      return;
    }
    finish({ ...stored, ...remembered, authenticated: true });
  };

  const handleSignUp = () => {
    setError('');
    const nm = name.trim();
    if (nm.length < 2) {
      setError('Enter your full name');
      return;
    }
    let contactValue = '';
    if (method === 'phone') {
      const n = national.trim();
      if (!n) {
        setError('Enter a valid phone');
        return;
      }
      const display = displayNational(country.iso, n);
      contactValue =
        country.iso === 'NG' ? display : `+${toE164(country.iso, country.dial, n)}`;
      saveLastPhone(country.iso, country.dial, n);
    } else {
      contactValue = email.trim().toLowerCase();
      if (!contactValue.includes('@')) {
        setError('Enter a valid email');
        return;
      }
    }
    if (!password || password.length < 6) {
      setError('Password too short - use 6 or more characters');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Create a 4-digit PIN');
      return;
    }
    const session: AuthSession = {
      ...DEFAULT_MOCK,
      method,
      contact: contactValue,
      name: nm,
      pin,
      password,
      phoneCountry: country.iso,
      dialCode: country.dial,
      homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso),
      email: method === 'email' ? contactValue : '',
      authenticated: true,
    };
    finish(session);
  };

  const finishForgotSuccess = () => {
    setPin('');
    setNewPin('');
    setConfirmNewPin('');
    setSuccessMsg('');
    setStep('pin');
  };

  if (step === 'boot') {
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
              id="signin-phone"
              label="Phone number"
              country={country}
              national={national}
              onOpenPicker={() => setPickerOpen(true)}
              onNationalChange={handleNationalChange}
              placeholder="8012345678"
            />
          ) : (
            <div className="auth-field">
              <label htmlFor="signin-email">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
          )}
          <div className="auth-field">
            <label htmlFor="signin-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="signin-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={goToPin}>
            Continue
          </button>
          <button
            type="button"
            className="auth-footer-link"
            onClick={() => {
              setError('');
              setStep('forgot');
            }}
          >
            Forgot PIN?
          </button>
          <p className="auth-hint">
            New here?{' '}
            <button
              type="button"
              className="auth-footer-link"
              onClick={() => {
                setError('');
                setStep('signup');
              }}
            >
              Create account
            </button>
          </p>
          <CountryPickerSheet
            open={pickerOpen}
            selectedIso={country.iso}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      </div>
    );
  }

  if (step === 'pin') {
    const first = (remembered.name || name || '').trim().split(/\s+/)[0];
    return (
      <div className="auth-root">
        <button
          type="button"
          className="auth-skip"
          onClick={() => {
            setPin('');
            setError('');
            setStep('signin');
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="auth-body auth-body--pin">
          <BrandMark />
          <h1 className="auth-title auth-title--center">Enter PIN</h1>
          <p className="auth-sub auth-sub--center">
            Welcome back{first ? `, ${first}` : ''}
          </p>
          <div className="pin-boxes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`pin-box ${pin.length > i ? 'filled' : ''}`}>
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
              if (key === '') return <span key="sp" />;
              if (key === 'del') {
                return (
                  <button
                    key="del"
                    type="button"
                    className="pin-key"
                    onClick={() => {
                      setPin((p) => p.slice(0, -1));
                      if (error) setError('');
                    }}
                    aria-label="Delete"
                  >
                    ←
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  className="pin-key"
                  onClick={() => {
                    setPin((p) => {
                      const next = (p + key).slice(0, 4);
                      if (next.length === 4) {
                        setTimeout(() => {
                          const stored = loadRemembered();
                          if (stored.pin && next === stored.pin) {
                            finish({ ...stored, ...remembered, authenticated: true });
                          } else {
                            setError('Incorrect PIN');
                            setPin('');
                          }
                        }, 80);
                      }
                      return next;
                    });
                    if (error) setError('');
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
          <div className="pin-actions">
            <button
              type="button"
              className="auth-footer-link"
              onClick={() => {
                setPin('');
                setError('');
                setStep('signin');
              }}
            >
              Use password instead
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
          className="auth-skip"
          onClick={() => setStep('welcome')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join Verxor in under a minute</p>
          <div className="auth-field">
            <label htmlFor="su-name">Full name</label>
            <div className="auth-input-wrap">
              <User size={16} />
              <input
                id="su-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              aria-selected={method === 'phone'}
              onClick={() => setMethod('phone')}
            >
              Phone
            </button>
            <button
              type="button"
              role="tab"
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              aria-selected={method === 'email'}
              onClick={() => setMethod('email')}
            >
              Email
            </button>
          </div>
          {method === 'phone' ? (
            <PhoneField
              id="signup-phone"
              label="Phone number"
              country={country}
              national={national}
              onOpenPicker={() => setPickerOpen(true)}
              onNationalChange={handleNationalChange}
              placeholder="8012345678"
            />
          ) : (
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
          )}
          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="su-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="su-pin">4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="su-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                autoComplete="off"
              />
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={handleSignUp}>
            Create account
          </button>
          <p className="auth-hint">
            Already have an account?{' '}
            <button type="button" className="auth-footer-link" onClick={() => setStep('signin')}>
              Sign in
            </button>
          </p>
          <CountryPickerSheet
            open={pickerOpen}
            selectedIso={country.iso}
            onSelect={(c) => {
              setCountry(c);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <BrandMark />
          <h1 className="auth-title auth-title--center">Welcome to Verxor</h1>
          <p className="auth-sub auth-sub--center">
            Digital services, wallet and virtual numbers
          </p>
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              setError('');
              setStep('signin');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className="auth-footer-link"
            style={{ marginTop: 16 }}
            onClick={() => {
              setError('');
              setStep('signup');
            }}
          >
            Create account
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-skip" onClick={() => setStep('signin')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">Confirm your password to set a new PIN</p>
          <div className="auth-field">
            <label htmlFor="fp-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} />
              <input
                id="fp-pass"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Account password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Toggle password"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button
            type="button"
            className="auth-btn"
            onClick={() => {
              const stored = loadRemembered();
              if (!password) {
                setError('Enter your password');
                return;
              }
              if (stored.password && password !== stored.password) {
                setError('Wrong password');
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
          className="auth-skip"
          onClick={() => setStep('forgot')}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">New PIN</h1>
          <p className="auth-sub">Choose a 4-digit PIN you will remember</p>
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
