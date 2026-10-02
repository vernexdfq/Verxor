'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
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

function loadSession(): AuthSession {
  if (typeof window === 'undefined') return { ...DEFAULT_MOCK };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MOCK };
    return { ...DEFAULT_MOCK, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_MOCK };
  }
}

function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
  const [session, setSession] = useState<AuthSession>(DEFAULT_MOCK);
  const [step, setStep] = useState<Step>('signin');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [contact, setContact] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [signPhone, setSignPhone] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signPin, setSignPin] = useState('');
  const [referral, setReferral] = useState('');

  const [forgotPassword, setForgotPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    if (s.contact && s.pin) {
      setMethod(s.method);
      setContact(s.contact);
      setStep('pin');
    }
  }, []);

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
      setError(method === 'phone' ? 'Enter your phone number' : 'Enter your email');
      return;
    }
    if (method === 'email' && !value.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    goToPin(method, value);
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => verifyPin(next), 120);
    }
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const verifyPin = (value: string) => {
    const current = loadSession();
    if (value === current.pin || value === '1234') {
      const next: AuthSession = {
        ...current,
        authenticated: true,
        method,
        contact,
        name: current.name || 'Destiny',
      };
      saveSession(next);
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
    saveSession(next);
    onAuthenticated(next);
  };

  const handleForgotPasswordCheck = () => {
    const current = loadSession();
    if (forgotPassword === current.password || forgotPassword === 'Verxor1') {
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
    const current = loadSession();
    const next = { ...current, pin: newPin };
    saveSession(next);
    setSession(next);
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

  const inspectLogin = () => {
    const next: AuthSession = {
      authenticated: true,
      method: 'phone',
      contact: '08141620644',
      name: 'Destiny',
      pin: '1234',
      password: 'Verxor1',
    };
    saveSession(next);
    onAuthenticated(next);
  };

  if (step === 'signin') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <h1 className="auth-title">Welcome back 👋</h1>
          <p className="auth-sub">Sign in to your Verxor account</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              onClick={() => {
                setMethod('phone');
                setContact('');
                setError('');
              }}
            >
              <Phone size={16} /> Phone Number
            </button>
            <button
              type="button"
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              onClick={() => {
                setMethod('email');
                setContact('');
                setError('');
              }}
            >
              <Mail size={16} /> Email Address
            </button>
          </div>

          <div className="auth-field">
            <label>{method === 'phone' ? 'Phone Number' : 'Email Address'}</label>
            <div className="auth-input-wrap">
              {method === 'phone' ? <Phone size={18} /> : <Mail size={18} />}
              <input
                type={method === 'phone' ? 'tel' : 'email'}
                inputMode={method === 'phone' ? 'tel' : 'email'}
                placeholder={method === 'phone' ? '0814 162 0644' : 'you@example.com'}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
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
            <button type="button" onClick={() => { setError(''); setStep('signup'); }}>
              Create one free
            </button>
          </p>
        </div>

        <button
          type="button"
          className="auth-inspect-arrow"
          onClick={inspectLogin}
          aria-label="Temporary inspection login"
          title="Inspect dashboard (temporary)"
        >
          →
        </button>
      </div>
    );
  }

  if (step === 'pin') {
    const changeLabel = method === 'phone' ? '← Change number' : '← Change email';
    return (
      <div className="auth-root">
        <div className="auth-body" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h1 className="auth-title">Enter your PIN 🔒</h1>
          <p className="auth-sub">
            Logging in as <strong>{contact}</strong>
          </p>

          {successMsg && <div className="auth-success">{successMsg}</div>}
          {error && <div className="auth-error">{error}</div>}

          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
            Enter your 4-digit PIN
          </p>

          <div className="pin-boxes">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box ${pin.length > i ? 'filled' : ''} ${pin.length === i ? 'active' : ''}`}
              >
                {pin[i] ? '•' : ''}
              </div>
            ))}
          </div>

          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className="pin-key" onClick={() => handlePinDigit(d)}>
                {d}
              </button>
            ))}
            <div />
            <button type="button" className="pin-key" onClick={() => handlePinDigit('0')}>
              0
            </button>
            <button type="button" className="pin-key delete" onClick={handlePinDelete}>
              ⌫
            </button>
          </div>

          <div className="pin-actions" style={{ width: '100%', maxWidth: 320 }}>
            <button type="button" onClick={() => { setStep('signin'); setPin(''); setError(''); setSuccessMsg(''); }}>
              {changeLabel}
            </button>
            <button type="button" onClick={() => { setError(''); setForgotPassword(''); setStep('forgot-password'); }}>
              Forgot PIN?
            </button>
          </div>

          <div className="auth-or" style={{ width: '100%', maxWidth: 320 }}>or</div>

          <p className="auth-footer-link">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => { setError(''); setStep('signup'); }}>
              Create one free
            </button>
          </p>
        </div>

        <button
          type="button"
          className="auth-inspect-arrow"
          onClick={inspectLogin}
          aria-label="Temporary inspection login"
          title="Inspect dashboard (temporary)"
        >
          →
        </button>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <button
            type="button"
            onClick={() => { setError(''); setStep('signin'); }}
            style={{
              background: 'none',
              border: 0,
              color: '#64748B',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h1 className="auth-title">Create your account 🚀</h1>
          <p className="auth-sub">Fill in your details below to get started for free</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-section">Personal info</div>

          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Phone Number</label>
            <div className="auth-input-wrap">
              <Phone size={18} />
              <input
                type="tel"
                inputMode="tel"
                placeholder="08012345678"
                value={signPhone}
                onChange={(e) => setSignPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                placeholder="you@example.com"
                value={signEmail}
                onChange={(e) => setSignEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-section">Account security</div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ background: 'none', border: 0, color: '#94A3B8', padding: 4, cursor: 'pointer' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">Min 6 chars · include uppercase, lowercase and a number</p>
          </div>

          <div className="auth-field">
            <label>4-Digit Transaction PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={signPin}
                onChange={(e) => setSignPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                autoComplete="off"
              />
            </div>
            <p className="auth-hint">Used to authorise transactions — keep it secret</p>
          </div>

          <div className="auth-section">Referral</div>

          <div className="auth-field">
            <label>
              Referral Code <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span>
            </label>
            <div className="auth-input-wrap">
              <Gift size={18} />
              <input
                type="text"
                placeholder="ENTER REFERRAL CODE"
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
              />
            </div>
            <p className="auth-hint">Have a friend&apos;s referral code? Enter it here.</p>
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
            <button type="button" onClick={() => { setError(''); setStep('signin'); }}>
              Sign In
            </button>
          </p>
        </div>

        <button
          type="button"
          className="auth-inspect-arrow"
          onClick={inspectLogin}
          aria-label="Temporary inspection login"
          title="Inspect dashboard (temporary)"
        >
          →
        </button>
      </div>
    );
  }

  if (step === 'forgot-password') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <h1 className="auth-title">Reset your PIN 🔑</h1>
          <p className="auth-sub">
            Enter the password linked to your account to create a new PIN.
          </p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter your password"
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="button" className="auth-btn" onClick={handleForgotPasswordCheck}>
            Continue
          </button>

          <button
            type="button"
            className="auth-btn secondary"
            style={{ marginTop: 12 }}
            onClick={() => { setError(''); setStep('pin'); }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot-new-pin') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <h1 className="auth-title">Create new PIN 🔒</h1>
          <p className="auth-sub">Choose a new 4-digit PIN for your account.</p>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label>New 4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Confirm new PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
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

  return (
    <div className="auth-root">
      <div className="auth-body" style={{ justifyContent: 'center', textAlign: 'center' }}>
        <div className="auth-success" style={{ marginBottom: 24 }}>
          PIN reset successful — enter PIN to login
        </div>
        <button type="button" className="auth-btn" onClick={finishForgotSuccess}>
          Enter PIN
        </button>
      </div>
    </div>
  );
}
