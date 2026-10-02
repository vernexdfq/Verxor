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
import './auth.css';

export type AuthMethod = 'phone' | 'email';

export type AuthSession = {
  authenticated: boolean;
  method: AuthMethod;
  contact: string;
  name: string;
  pin: string;
  password: string;
};

const STORAGE_KEY = 'verxor-auth-session';

const DEFAULT_MOCK: AuthSession = {
  authenticated: false,
  method: 'phone',
  contact: '08141620644',
  name: 'Destiny',
  pin: '1234',
  password: 'Verxor1',
};

function loadRemembered(): AuthSession {
  if (typeof window === 'undefined') return { ...DEFAULT_MOCK };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MOCK };
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    return {
      ...DEFAULT_MOCK,
      ...parsed,
      authenticated: false,
    };
  } catch {
    return { ...DEFAULT_MOCK };
  }
}

function saveRemembered(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, authenticated: false }),
  );
}

/** Display phones as 08xx… not +234 concatenated */
function formatContactDisplay(raw: string, method: AuthMethod): string {
  if (method === 'email') return raw;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    digits = '0' + digits.slice(3);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)}${digits.slice(4, 7)}${digits.slice(7)}`;
  }
  return raw;
}

function BrandMark() {
  return (
    <div className="auth-brand" aria-label="Verxor">
      <div className="auth-brand-mark">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 6.5h6.2L12 11l1.8-4.5H20L14.2 17.5h-4.4L4 6.5z"
            fill="#FFFFFF"
          />
          <circle cx="18.5" cy="6.5" r="2.2" fill="#2563EB" />
        </svg>
      </div>
      <span className="auth-brand-name">Verxor</span>
    </div>
  );
}

type Step =
  | 'signin'
  | 'pin'
  | 'signup'
  | 'forgot-password'
  | 'forgot-new-pin'
  | 'forgot-success';

export function AuthFlow({
  onAuthenticated,
}: {
  onAuthenticated: (session: AuthSession) => void;
}) {
  const [remembered, setRemembered] = useState<AuthSession>(DEFAULT_MOCK);
  const [step, setStep] = useState<Step>('signin');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [contact, setContact] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [fullName, setFullName] = useState('');
  const [signPhone, setSignPhone] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signPin, setSignPin] = useState('');
  const [referral, setReferral] = useState('');

  const [forgotPassword, setForgotPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    if (s.contact) {
      setMethod(s.method || 'phone');
      setContact(s.contact);
      setStep('pin');
    } else {
      setStep('signin');
    }
    setHydrated(true);
  }, []);

  /** Temporary bypass until Supabase is live */
  const handleSkipLogin = () => {
    const current = loadRemembered();
    const next: AuthSession = {
      ...current,
      authenticated: true,
      method: method || current.method,
      contact: contact || current.contact,
      name: current.name || 'User',
    };
    saveRemembered({ ...next, authenticated: false });
    onAuthenticated(next);
  };

  const goToPin = (nextMethod: AuthMethod, nextContact: string) => {
    setMethod(nextMethod);
    setContact(nextContact);
    setPin('');
    setError('');
    setSuccessMsg('');
    setStep('pin');
  };

  const handleContinue = () => {
    const value = contact.trim();
    if (!value) {
      setError(
        method === 'phone' ? 'Enter your phone number' : 'Enter your email',
      );
      return;
    }
    if (method === 'email' && !value.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    const next = {
      ...remembered,
      method,
      contact: value,
      authenticated: false,
    };
    saveRemembered(next);
    setRemembered(next);
    goToPin(method, value);
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => verifyPin(next), 140);
    }
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const verifyPin = (value: string) => {
    const current = loadRemembered();
    if (value === current.pin || value === '1234') {
      const next: AuthSession = {
        ...current,
        authenticated: true,
        method,
        contact,
        name: current.name || 'User',
      };
      saveRemembered({ ...next, authenticated: false });
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
    if (!signPhone.trim()) {
      setError('Enter your phone number');
      return;
    }
    if (!signEmail.trim() || !signEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/^\d{4}$/.test(signPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    const next: AuthSession = {
      authenticated: true,
      method: 'phone',
      contact: signPhone.trim(),
      name: fullName.trim(),
      pin: signPin,
      password,
    };
    saveRemembered({ ...next, authenticated: false });
    onAuthenticated(next);
  };

  const handleForgotPasswordCheck = () => {
    const current = loadRemembered();
    if (
      forgotPassword === current.password ||
      forgotPassword === 'Verxor1'
    ) {
      setError('');
      setNewPin('');
      setConfirmNewPin('');
      setStep('forgot-new-pin');
    } else {
      setError('Incorrect password');
    }
  };

  const handleSetNewPin = () => {
    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('PINs do not match');
      return;
    }
    const current = loadRemembered();
    const next = { ...current, pin: newPin, authenticated: false };
    saveRemembered(next);
    setRemembered(next);
    setSuccessMsg('PIN reset successful — enter PIN to login');
    setPin('');
    setError('');
    setStep('forgot-success');
  };

  const finishForgotSuccess = () => {
    setSuccessMsg('PIN reset successful — enter PIN to login');
    setPin('');
    setStep('pin');
  };

  if (!hydrated) {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <div className="auth-spinner" />
        </div>
      </div>
    );
  }

  const SkipButton = (
    <button
      type="button"
      className="auth-skip"
      onClick={handleSkipLogin}
      aria-label="Skip login (temporary)"
      title="Skip login until Supabase is connected"
    >
      <ArrowRight size={18} strokeWidth={2.4} />
    </button>
  );

  /* ——— SIGN IN ——— */
  if (step === 'signin') {
    return (
      <div className="auth-root">
        {SkipButton}
        <div className="auth-body auth-body--signin">
          <BrandMark />

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your account</p>

          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={method === 'phone'}
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              onClick={() => {
                setMethod('phone');
                setContact('');
                setError('');
              }}
            >
              <Phone size={15} strokeWidth={2.25} />
              Phone Number
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === 'email'}
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              onClick={() => {
                setMethod('email');
                setContact('');
                setError('');
              }}
            >
              <Mail size={15} strokeWidth={2.25} />
              Email Address
            </button>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-contact">
              {method === 'phone' ? 'Phone Number' : 'Email Address'}
            </label>
            <div className="auth-input-wrap">
              {method === 'phone' ? (
                <Phone size={18} strokeWidth={2} />
              ) : (
                <Mail size={18} strokeWidth={2} />
              )}
              <input
                id="auth-contact"
                type={method === 'phone' ? 'tel' : 'email'}
                inputMode={method === 'phone' ? 'tel' : 'email'}
                placeholder={
                  method === 'phone' ? '08141620644' : 'you@example.com'
                }
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  if (error) setError('');
                }}
                autoComplete={method === 'phone' ? 'tel' : 'email'}
              />
            </div>
          </div>

          <button type="button" className="auth-btn" onClick={handleContinue}>
            Continue
          </button>

          <div className="auth-or">or</div>

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
      </div>
    );
  }

  /* ——— PIN ENTRY ——— */
  if (step === 'pin') {
    const changeLabel =
      method === 'phone' ? '← Change number' : '← Change email';
    const rawContact = contact || remembered.contact;
    const displayContact = formatContactDisplay(rawContact, method);

    return (
      <div className="auth-root">
        {SkipButton}
        <div className="auth-body auth-body--pin">
          <h1 className="auth-title auth-title--center">Enter your PIN</h1>
          <p className="auth-sub auth-sub--center">
            Logging in as <strong>{displayContact}</strong>
          </p>

          {successMsg ? <div className="auth-success">{successMsg}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}

          <p className="pin-label">Enter your 4-digit PIN</p>

          <div className="pin-boxes" aria-label="PIN digits">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box ${
                  pin.length > i ? 'filled' : ''
                } ${pin.length === i ? 'active' : ''}`}
              >
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>

          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                className="pin-key"
                onClick={() => handlePinDigit(d)}
              >
                {d}
              </button>
            ))}
            <div aria-hidden />
            <button
              type="button"
              className="pin-key"
              onClick={() => handlePinDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className="pin-key delete"
              onClick={handlePinDelete}
              aria-label="Delete"
            >
              ⌫
            </button>
          </div>

          <div className="pin-actions">
            <button
              type="button"
              onClick={() => {
                setStep('signin');
                setPin('');
                setError('');
                setSuccessMsg('');
              }}
            >
              {changeLabel}
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

          <div className="auth-or" style={{ maxWidth: 300 }}>
            or
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
      </div>
    );
  }

  /* ——— SIGN UP ——— */
  if (step === 'signup') {
    return (
      <div className="auth-root">
        {SkipButton}
        <div className="auth-body">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setStep('signin');
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>

          <BrandMark />

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Fill in your details to get started for free</p>

          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-section">Personal info</div>

          <div className="auth-field">
            <label htmlFor="su-name">Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} strokeWidth={2} />
              <input
                id="su-name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-phone">Phone Number</label>
            <div className="auth-input-wrap">
              <Phone size={18} strokeWidth={2} />
              <input
                id="su-phone"
                type="tel"
                inputMode="tel"
                placeholder="08012345678"
                value={signPhone}
                onChange={(e) => {
                  setSignPhone(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-email">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} strokeWidth={2} />
              <input
                id="su-email"
                type="email"
                placeholder="you@example.com"
                value={signEmail}
                onChange={(e) => {
                  setSignEmail(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-section">Account security</div>

          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pass"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">
              Min 6 chars · uppercase, lowercase and a number
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pin">4-Digit Transaction PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={signPin}
                onChange={(e) => {
                  setSignPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                autoComplete="off"
              />
            </div>
            <p className="auth-hint">
              Used to authorise transactions — keep it secret
            </p>
          </div>

          <div className="auth-section">Referral</div>

          <div className="auth-field">
            <label htmlFor="su-ref">
              Referral Code <span className="auth-optional">(Optional)</span>
            </label>
            <div className="auth-input-wrap">
              <Gift size={18} strokeWidth={2} />
              <input
                id="su-ref"
                type="text"
                placeholder="ENTER REFERRAL CODE"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
              />
            </div>
            <p className="auth-hint">
              Have a friend&apos;s referral code? Enter it here.
            </p>
          </div>

          <p className="auth-terms">
            By creating an account, you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>

          <button type="button" className="auth-btn" onClick={handleSignUp}>
            Create Account
          </button>

          <p className="auth-footer-link" style={{ marginTop: 18 }}>
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
      </div>
    );
  }

  /* ——— FORGOT: password ——— */
  if (step === 'forgot-password') {
    return (
      <div className="auth-root">
        {SkipButton}
        <div className="auth-body">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setStep('pin');
            }}
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>

          <h1 className="auth-title">Reset your PIN</h1>
          <p className="auth-sub">
            Enter the password linked to your account to create a new PIN.
          </p>

          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-field">
            <label htmlFor="fp-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="fp-pass"
                type={showForgotPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={forgotPassword}
                onChange={(e) => {
                  setForgotPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowForgotPass((v) => !v)}
                aria-label={showForgotPass ? 'Hide password' : 'Show password'}
              >
                {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="auth-btn"
            onClick={handleForgotPasswordCheck}
          >
            Continue
          </button>

          <p className="auth-footer-link" style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('pin');
              }}
            >
              ← Back to login
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ——— FORGOT: new PIN ——— */
  if (step === 'forgot-new-pin') {
    return (
      <div className="auth-root">
        {SkipButton}
        <div className="auth-body">
          <h1 className="auth-title">Create new PIN</h1>
          <p className="auth-sub">Choose a new 4-digit PIN for your account.</p>

          {error ? <div className="auth-error">{error}</div> : null}

          <div className="auth-field">
            <label htmlFor="np1">New 4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="np1"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="np2">Confirm new PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="np2"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmNewPin}
                onChange={(e) => {
                  setConfirmNewPin(
                    e.target.value.replace(/\D/g, '').slice(0, 4),
                  );
                  if (error) setError('');
                }}
              />
            </div>
          </div>

          <button type="button" className="auth-btn" onClick={handleSetNewPin}>
            Save new PIN
          </button>
        </div>
      </div>
    );
  }

  /* ——— FORGOT success ——— */
  return (
    <div className="auth-root">
      {SkipButton}
      <div className="auth-body auth-body--center">
        <div className="auth-success-icon" aria-hidden>
          ✓
        </div>
        <h1 className="auth-title auth-title--center">PIN reset successful</h1>
        <p className="auth-sub auth-sub--center">
          Enter your new PIN to sign in.
        </p>
        <button type="button" className="auth-btn" onClick={finishForgotSuccess}>
          Enter PIN
        </button>
      </div>
    </div>
  );
}
