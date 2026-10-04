'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Fingerprint,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
} from 'lucide-react';
import { COUNTRIES, type Country, displayNational, toE164 } from './countries';
import { PhoneField } from './phone-field';
import type { AuthSession } from './auth-core';
import { isBiometricEnabledLocally, verifyPlatformBiometric } from '../lib/webauthn';
import './auth.css';

interface AuthFlowProps {
  onAuthenticated: (session: AuthSession) => void;
}

type Step =
  | 'welcome'
  | 'signin-phone'
  | 'signin-email'
  | 'signup'
  | 'pin'
  | 'forgot'
  | 'forgot-otp'
  | 'new-pin'
  | 'success';

export function AuthFlow({ onAuthenticated }: AuthFlowProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [national, setNational] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [signEmail, setSignEmail] = useState('');
  const [signPin, setSignPin] = useState('');
  const [referral, setReferral] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [pendingContact, setPendingContact] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingMethod, setPendingMethod] = useState<'phone' | 'email'>('phone');

  useEffect(() => {
    // Force sign-in after logout
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('welcome');
        return;
      }
    } catch {
      /* ignore */
    }

    // Restore session if present
    try {
      const raw = localStorage.getItem('verxor-auth');
      if (raw) {
        const s = JSON.parse(raw) as AuthSession;
        if (s?.authenticated) {
          onAuthenticated(s);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    setBioAvailable(isBiometricEnabledLocally());
  }, [onAuthenticated]);

  const go = (s: Step) => {
    setError('');
    setStep(s);
  };

  const handleWelcomeContinue = (method: 'phone' | 'email') => {
    setPendingMethod(method);
    if (method === 'phone') go('signin-phone');
    else go('signin-email');
  };

  const handlePhoneContinue = () => {
    if (!national.trim() || national.trim().length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    const iso = country.iso;
    const display = displayNational(iso, national);
    const e164 = toE164(iso, country.dial, national);
    const contactValue = iso === 'NG' ? display : `+${e164}`;
    setPendingContact(contactValue);
    setPendingName('');
    go('pin');
  };

  const handleEmailContinue = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setPendingContact(email.trim());
    setPendingName('');
    go('pin');
  };

  const handlePinDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      // Auto-submit after short delay so UI updates
      setTimeout(() => submitPin(next), 80);
    }
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const submitPin = (value?: string) => {
    const p = value ?? pin;
    if (p.length !== 4) {
      setError('Enter your 4-digit PIN');
      return;
    }
    setLoading(true);
    setError('');
    // Session-based auth: accept any 4-digit PIN for now (server verify later)
    const session: AuthSession = {
      authenticated: true,
      method: pendingMethod,
      contact: pendingContact,
      name: pendingName || (pendingMethod === 'phone' ? pendingContact : pendingContact.split('@')[0]),
      pin: p,
    };
    try {
      localStorage.setItem('verxor-auth', JSON.stringify(session));
    } catch {
      /* ignore */
    }
    setLoading(false);
    onAuthenticated(session);
  };

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const ok = await verifyPlatformBiometric();
      if (!ok) {
        setError('Biometric authentication failed or cancelled');
        setLoading(false);
        return;
      }
      // Reconstruct session from stored auth if possible
      let session: AuthSession | null = null;
      try {
        const raw = localStorage.getItem('verxor-auth');
        if (raw) session = JSON.parse(raw) as AuthSession;
      } catch {
        /* ignore */
      }
      if (!session || !session.authenticated) {
        // Fallback: use pending contact if available
        session = {
          authenticated: true,
          method: pendingMethod,
          contact: pendingContact || 'biometric-user',
          name: pendingName || 'User',
          pin: '****',
        };
      }
      session.authenticated = true;
      try {
        localStorage.setItem('verxor-auth', JSON.stringify(session));
      } catch {
        /* ignore */
      }
      onAuthenticated(session);
    } catch (e) {
      setError('Biometric login unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    if (!fullName.trim()) {
      setError('Enter your full name');
      return;
    }
    if (!national.trim() || national.trim().length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    if (!signEmail.trim() || !signEmail.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');\n      return;
    }
    if (!/^\d{4}$/.test(signPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    const iso = country.iso;
    const display = displayNational(iso, national);
    const e164 = toE164(iso, country.dial, national);
    const contactValue = iso === 'NG' ? display : `+${e164}`;
    let refCode = referral.trim().toUpperCase();
    if (!refCode && typeof window !== 'undefined') {
      try {
        refCode = (localStorage.getItem('verxor-inbound-ref') || '').toUpperCase();
      } catch {
        /* ignore */
      }
    }
    const next: AuthSession = {
      authenticated: true,
      method: 'phone',
      contact: contactValue,
      name: fullName.trim(),
      email: signEmail.trim(),
      pin: signPin,
      referral: refCode || undefined,
    };
    try {
      localStorage.setItem('verxor-auth', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    onAuthenticated(next);
  };

  const handleForgotContinue = () => {
    if (!pendingContact) {
      setError('Enter phone or email first');
      return;
    }
    go('forgot-otp');
  };

  const handleOtpContinue = () => {
    if (otp.length < 4) {
      setError('Enter the OTP sent to you');
      return;
    }
    go('new-pin');
  };

  const handleNewPin = () => {
    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    // Update stored pin if session exists
    try {
      const raw = localStorage.getItem('verxor-auth');
      if (raw) {
        const s = JSON.parse(raw) as AuthSession;
        s.pin = newPin;
        localStorage.setItem('verxor-auth', JSON.stringify(s));
      }
    } catch {
      /* ignore */
    }
    go('success');
  };

  // ─── Render helpers ───────────────────────────────────────────────

  const PinBoxes = ({ value }: { value: string }) => (
    <div className="pin-boxes">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`pin-box ${value.length > i ? 'filled' : ''}`} />
      ))}
    </div>
  );

  const PinKeypad = ({
    onDigit,
    onBack,
    showBio,
  }: {
    onDigit: (d: string) => void;
    onBack: () => void;
    showBio?: boolean;
  }) => (
    <div className="pin-keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className="pin-key" onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      {showBio && bioAvailable ? (
        <button type="button" className="pin-key pin-key-bio" onClick={handleBiometricLogin} aria-label="Use fingerprint">
          <Fingerprint size={28} strokeWidth={1.75} />
        </button>
      ) : (
        <div className="pin-key pin-key-empty" />
      )}
      <button type="button" className="pin-key" onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className="pin-key pin-key-back" onClick={onBack} aria-label="Backspace">
        ⌫
      </button>
    </div>
  );

  // ─── Steps ────────────────────────────────────────────────────────

  if (step === 'welcome') {
    return (
      <div className="auth-screen">
        <div className="auth-hero">
          <div className="auth-logo">V</div>
          <h1>Welcome to Verxor</h1>
          <p>Fast, secure VTU & payments</p>
        </div>
        <div className="auth-actions">
          <button type="button" className="btn-primary" onClick={() => handleWelcomeContinue('phone')}>
            <Phone size={18} /> Continue with Phone
          </button>
          <button type="button" className="btn-secondary" onClick={() => handleWelcomeContinue('email')}>
            <Mail size={18} /> Continue with Email
          </button>
          <button type="button" className="btn-link" onClick={() => go('signup')}>
            Create an account
          </button>
        </div>
      </div>
    );
  }

  if (step === 'signin-phone') {
    return (
      <div className="auth-screen">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Enter your phone</h2>
        <p className="auth-sub">We'll use this to sign you in</p>
        <PhoneField country={country} national={national} onCountryChange={setCountry} onNationalChange={setNational} />
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handlePhoneContinue}>
          Continue
        </button>
        <button type="button" className="btn-link" onClick={() => go('forgot')}>
          Forgot PIN?
        </button>
      </div>
    );
  }

  if (step === 'signin-email') {
    return (
      <div className="auth-screen">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Enter your email</h2>
        <p className="auth-sub">We'll use this to sign you in</p>
        <div className="auth-field">
          <Mail size={18} className="field-icon" />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleEmailContinue}>
          Continue
        </button>
        <button type="button" className="btn-link" onClick={() => go('forgot')}>
          Forgot PIN?
        </button>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="auth-screen pin-screen">
        <button type="button" className="auth-back" onClick={() => go(pendingMethod === 'phone' ? 'signin-phone' : 'signin-email')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Enter your PIN</h2>
        <p className="auth-sub">{pendingContact || 'Secure access'}</p>
        <PinBoxes value={pin} />
        {error && <p className="auth-error">{error}</p>}
        <PinKeypad onDigit={handlePinDigit} onBack={handlePinBackspace} showBio />
        {loading && <p className="auth-loading">Verifying…</p>}
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-screen auth-scroll">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Create account</h2>
        <p className="auth-sub">Join Verxor in under a minute</p>

        <div className="auth-field">
          <User size={18} className="field-icon" />
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <PhoneField country={country} national={national} onCountryChange={setCountry} onNationalChange={setNational} />

        <div className="auth-field">
          <Mail size={18} className="field-icon" />
          <input
            type="email"
            placeholder="Email"
            value={signEmail}
            onChange={(e) => setSignEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <Lock size={18} className="field-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button type="button" className="field-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="auth-field">
          <Lock size={18} className="field-icon" />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="4-digit PIN"
            value={signPin}
            onChange={(e) => setSignPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoComplete="off"
          />
        </div>

        <div className="auth-field">
          <input
            type="text"
            placeholder="Referral code (optional)"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleSignUp}>
          Create account
        </button>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="auth-screen">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Reset PIN</h2>
        <p className="auth-sub">Enter the phone or email linked to your account</p>
        <div className="auth-field">
          <input
            type="text"
            placeholder="Phone or email"
            value={pendingContact}
            onChange={(e) => setPendingContact(e.target.value)}
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleForgotContinue}>
          Send OTP
        </button>
      </div>
    );
  }

  if (step === 'forgot-otp') {
    return (
      <div className="auth-screen">
        <button type="button" className="auth-back" onClick={() => go('forgot')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Enter OTP</h2>
        <p className="auth-sub">We sent a code to {pendingContact}</p>
        <div className="auth-field">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleOtpContinue}>
          Verify
        </button>
      </div>
    );
  }

  if (step === 'new-pin') {
    return (
      <div className="auth-screen">
        <button type="button" className="auth-back" onClick={() => go('forgot-otp')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h2>Set new PIN</h2>
        <p className="auth-sub">Choose a new 4-digit PIN</p>
        <div className="auth-field">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="New PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
        <div className="auth-field">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="Confirm PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleNewPin}>
          Save PIN
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="auth-screen">
        <div className="auth-success">
          <CheckCircle2 size={56} className="success-icon" />
          <h2>PIN updated</h2>
          <p>You can now sign in with your new PIN</p>
          <button type="button" className="btn-primary" onClick={() => go('welcome')}>
            Continue to login
          </button>
        </div>
      </div>
    );
  }

  return null;
}
