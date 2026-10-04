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
import { CountryPickerSheet, PhoneField } from './phone-field';
import type { AuthSession } from './auth-core';
export type { AuthSession };
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
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setStep('welcome');
        return;
      }
    } catch {
      /* ignore */
    }

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
    const session: AuthSession = {
      authenticated: true,
      method: pendingMethod,
      contact: pendingContact,
      name: pendingName || (pendingMethod === 'phone' ? pendingContact : pendingContact.split('@')[0]),
      password: '',
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
      let session: AuthSession | null = null;
      try {
        const raw = localStorage.getItem('verxor-auth');
        if (raw) session = JSON.parse(raw) as AuthSession;
      } catch {
        /* ignore */
      }
      if (!session || !session.authenticated) {
        session = {
          authenticated: true,
          method: pendingMethod,
          contact: pendingContact || 'biometric-user',
          name: pendingName || 'User',
          password: '',
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
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!/^[0-9]{4}$/.test(signPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    const iso = country.iso;
    const display = displayNational(iso, national);
    const e164 = toE164(iso, country.dial, national);
    const contactValue = iso === 'NG' ? display : `+${e164}`;
    const next: AuthSession = {
      authenticated: true,
      method: 'phone',
      contact: contactValue,
      name: fullName.trim(),
      email: signEmail.trim(),
      password: password,
      pin: signPin,
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
    if (!/^[0-9]{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
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
        <button type="button" className="pin-key" aria-hidden="true" style={{ visibility: 'hidden' }} tabIndex={-1} />
      )}
      <button type="button" className="pin-key" onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className="pin-key delete" onClick={onBack} aria-label="Backspace">
        ⌫
      </button>
    </div>
  );

  if (step === 'welcome') {
    return (
      <div className="auth-root">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <img src="/brand/verxor-logo.svg" alt="" width={36} height={36} />
          </div>
          <span className="auth-brand-name">Verxor</span>
        </div>
        <div className="auth-body auth-body--center">
          <h1 className="auth-title auth-title--center">Welcome to Verxor</h1>
          <p className="auth-sub auth-sub--center">Fast, secure VTU and payments</p>
          <button type="button" className="auth-btn" onClick={() => handleWelcomeContinue('phone')}>
            <Phone size={18} /> Continue with Phone
          </button>
          <button type="button" className="auth-btn" onClick={() => handleWelcomeContinue('email')} style={{ marginTop: 10, background: 'transparent', color: 'var(--vx-text, #0f172a)', border: '1px solid var(--vx-border, #e2e8f0)' }}>
            <Mail size={18} /> Continue with Email
          </button>
          <div className="auth-footer-link">
            <button type="button" onClick={() => go('signup')}>Create an account</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'signin-phone') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body auth-body--signin">
          <h1 className="auth-title">Enter your phone</h1>
          <p className="auth-sub">We will use this to sign you in</p>
          <PhoneField id="auth-phone" label="Phone Number" country={country} national={national} onOpenPicker={() => setPickerOpen(true)} onNationalChange={(v) => { setNational(v); if (error) setError(''); }} placeholder={country.iso === 'NG' ? '8012345678' : 'Phone number'} />
          <CountryPickerSheet open={pickerOpen} selectedIso={country.iso} onClose={() => setPickerOpen(false)} onSelect={(c) => { setCountry(c); setPickerOpen(false); }} />
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handlePhoneContinue}>
            Continue
          </button>
          <div className="auth-footer-link">
            <button type="button" onClick={() => go('forgot')}>Forgot PIN?</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'signin-email') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body auth-body--signin">
          <h1 className="auth-title">Enter your email</h1>
          <p className="auth-sub">We will use this to sign you in</p>
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input id="auth-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handleEmailContinue}>
            Continue
          </button>
          <div className="auth-footer-link">
            <button type="button" onClick={() => go('forgot')}>Forgot PIN?</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pin') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go(pendingMethod === 'phone' ? 'signin-phone' : 'signin-email')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body auth-body--pin">
          <h1 className="auth-title auth-title--center">Enter your PIN</h1>
          <p className="auth-sub auth-sub--center">{pendingContact || 'Secure access'}</p>
          <p className="pin-label">Enter your 4-digit PIN</p>
          <PinBoxes value={pin} />
          {error && <p className="auth-error">{error}</p>}
          <PinKeypad onDigit={handlePinDigit} onBack={handlePinBackspace} showBio />
          {loading && <p className="auth-spinner">Verifying...</p>}
        </div>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join Verxor in under a minute</p>

          <div className="auth-field">
            <label htmlFor="su-name">Full name</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input id="su-name" type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </div>
          </div>

          <PhoneField id="su-phone" label="Phone Number" country={country} national={national} onOpenPicker={() => setPickerOpen(true)} onNationalChange={(v) => { setNational(v); if (error) setError(''); }} placeholder={country.iso === 'NG' ? '8012345678' : 'Phone number'} />
          <CountryPickerSheet open={pickerOpen} selectedIso={country.iso} onClose={() => setPickerOpen(false)} onSelect={(c) => { setCountry(c); setPickerOpen(false); }} />

          <div className="auth-field">
            <label htmlFor="su-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input id="su-email" type="email" placeholder="Email" value={signEmail} onChange={(e) => setSignEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input id="su-pass" type={showPassword ? 'text' : 'password'} placeholder="Password (min 6)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pin">4-digit PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input id="su-pin" type="password" inputMode="numeric" maxLength={4} placeholder="4-digit PIN" value={signPin} onChange={(e) => setSignPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} autoComplete="off" />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="su-ref">Referral code <span className="auth-optional">(optional)</span></label>
            <div className="auth-input-wrap">
              <input id="su-ref" type="text" placeholder="Referral code" value={referral} onChange={(e) => setReferral(e.target.value)} />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handleSignUp}>
            Create account
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('welcome')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">Enter the phone or email linked to your account</p>
          <div className="auth-field">
            <label htmlFor="fp-contact">Phone or email</label>
            <div className="auth-input-wrap">
              <input id="fp-contact" type="text" placeholder="Phone or email" value={pendingContact} onChange={(e) => setPendingContact(e.target.value)} />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handleForgotContinue}>
            Send OTP
          </button>
        </div>
      </div>
    );
  }

  if (step === 'forgot-otp') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('forgot')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Enter OTP</h1>
          <p className="auth-sub">We sent a code to {pendingContact}</p>
          <div className="auth-field">
            <label htmlFor="fp-otp">OTP code</label>
            <div className="auth-input-wrap">
              <input id="fp-otp" type="text" inputMode="numeric" maxLength={6} placeholder="OTP code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handleOtpContinue}>
            Verify
          </button>
        </div>
      </div>
    );
  }

  if (step === 'new-pin') {
    return (
      <div className="auth-root">
        <button type="button" className="auth-back" onClick={() => go('forgot-otp')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="auth-body">
          <h1 className="auth-title">Set new PIN</h1>
          <p className="auth-sub">Choose a new 4-digit PIN</p>
          <div className="auth-field">
            <label htmlFor="np-pin">New PIN</label>
            <div className="auth-input-wrap">
              <input id="np-pin" type="password" inputMode="numeric" maxLength={4} placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="np-confirm">Confirm PIN</label>
            <div className="auth-input-wrap">
              <input id="np-confirm" type="password" inputMode="numeric" maxLength={4} placeholder="Confirm PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} />
            </div>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="button" className="auth-btn" onClick={handleNewPin}>
            Save PIN
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <div className="auth-success">
            <CheckCircle2 size={56} className="success-icon" />
            <h1 className="auth-title auth-title--center">PIN updated</h1>
            <p className="auth-sub auth-sub--center">You can now sign in with your new PIN</p>
            <button type="button" className="auth-btn" onClick={() => go('welcome')}>
              Continue to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
