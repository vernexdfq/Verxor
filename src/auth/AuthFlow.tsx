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
      vtuEligible: typeof parsed.vtuEligible === 'boolean' ? parsed.vtuEligible : isVtuEligible(iso),
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
    localStorage.setItem(LAST_PHONE_KEY, JSON.stringify({ iso, dial, national: normalizeNational(national, iso) }));
  } catch {}
}

type StoredAccount = AuthSession & { id: string };

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
  } catch {}
}

function phoneDigits(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function emailsMatch(a?: string, b?: string): boolean {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  return Boolean(x && y && x === y);
}

function findAccount(opts: { phoneE164?: string; email?: string }): StoredAccount | null {
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
    if (phone && phoneDigits(stored.contact) === phone) return { ...stored, id: 'legacy' };
    if (em && (emailsMatch(stored.email, em) || (stored.method === 'email' && emailsMatch(stored.contact, em)))) {
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
  const row: StoredAccount = { ...session, id, authenticated: false, email: em || session.email || '' };
  if (idx >= 0) list[idx] = row;
  else list.push(row);
  persistAccounts(list);
  return row;
}

function strongPassword(pw: string): boolean {
  return pw.length >= 6 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
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
  const [step, setStep] = useState<Step>('boot');
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPinField, setShowPinField] = useState(false);
  const [signupPin, setSignupPin] = useState('');
  const [referral, setReferral] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [bioHint, setBioHint] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    if (s.contact && s.pin) upsertAccount(s);
    try {
      const inbound = sessionStorage.getItem('verxor-inbound-ref');
      if (inbound) setReferral(inbound);
    } catch {}
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
    } catch {}
    if (s.contact && s.pin) {
      setStep('pin');
      setMethod(s.method || 'phone');
      if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
      if (s.method === 'email') setEmail(s.contact || s.email || '');
      else if (s.contact) setNational(displayNational(s.phoneCountry || 'NG', s.contact));
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
      vtuEligible: typeof session.vtuEligible === 'boolean' ? session.vtuEligible : isVtuEligible(iso),
    };
    saveRemembered(full);
    upsertAccount(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(iso, full.dialCode || findCountry(iso).dial, displayNational(iso, full.contact));
    }
    setRemembered(full);
    onAuthenticated(full);
  }

  function handleContinueSignIn() {
    setError('');
    if (method === 'phone') {
      const phoneErr = validatePhoneForCountry(country.iso, national);
      if (phoneErr) { setError(phoneErr); return; }
      const e164 = toE164(country.iso, country.dial, national);
      saveLastPhone(country.iso, country.dial, national);
      const account = findAccount({ phoneE164: e164 });
      if (!account || !account.pin) {
        setError('No account found for this number. Check the number or create an account.');
        return;
      }
      const session: AuthSession = { ...account, method: 'phone', contact: account.contact || e164, authenticated: false };
      saveRemembered(session);
      setRemembered(session);
      setPin('');
      setStep('pin');
      return;
    }
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('Enter a valid email address'); return; }
    const account = findAccount({ email: em });
    if (!account || !account.pin) {
      setError('No account found for this email. Check the address or create an account.');
      return;
    }
    const session: AuthSession = { ...account, method: 'email', contact: account.contact, email: account.email || em, authenticated: false };
    saveRemembered(session);
    setRemembered(session);
    setPin('');
    setStep('pin');
  }

  function handleSignup() {
    setError('');
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (!name || name.split(' ').length < 2) { setError('Enter your full name (first and last)'); return; }
    const phoneErr = validatePhoneForCountry(country.iso, national);
    if (phoneErr) { setError(phoneErr); return; }
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('Enter a valid email address'); return; }
    if (!strongPassword(password)) {
      setError('Password must be at least 6 characters with uppercase, lowercase, and a number');
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) { setError('Create a 4-digit PIN'); return; }
    const e164 = toE164(country.iso, country.dial, national);
    const session: AuthSession = {
      authenticated: false, method: 'phone', contact: e164, name, username: '', pin: signupPin, password,
      phoneCountry: country.iso, dialCode: country.dial, homeCurrency: homeCurrencyFor(country.iso),
      vtuEligible: isVtuEligible(country.iso), balanceNgn: 0, balanceUsd: 0, email: em,
    };
    if (referral.trim()) {
      try { sessionStorage.setItem('verxor-inbound-ref', referral.trim().toUpperCase()); } catch {}
    }
    saveLastPhone(country.iso, country.dial, national);
    upsertAccount(session);
    finish(session);
  }

  function verifyPin(candidate: string) {
    const stored = loadRemembered();
    const expected = stored.pin || remembered.pin;
    if (expected && candidate === expected) {
      finish({ ...stored, ...remembered, pin: expected, contact: remembered.contact || stored.contact, method: remembered.method || stored.method, name: remembered.name || stored.name, email: remembered.email || stored.email, authenticated: true });
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
      if (next.length === 4) setTimeout(() => verifyPin(next), 60);
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
    if (!forgotPassword) { setError('Enter your account password'); return; }
    const stored = loadRemembered();
    const account = findAccount({ phoneE164: remembered.contact || stored.contact, email: remembered.email || stored.email }) || { ...stored, ...remembered, id: 'legacy' };
    const expectedPw = account.password || stored.password || remembered.password;
    if (!expectedPw || forgotPassword !== expectedPw) {
      setError('Incorrect password. Try again or contact support.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) { setError('Enter a new 4-digit PIN'); return; }
    if (newPin !== confirmNewPin) { setError('PINs do not match'); return; }
    const next: AuthSession = { ...stored, ...remembered, ...account, pin: newPin, password: expectedPw, authenticated: false };
    saveRemembered(next);
    upsertAccount(next);
    setRemembered(next);
    setPin(''); setNewPin(''); setConfirmNewPin(''); setForgotPassword(''); setShowForgotPass(false);
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

  if (step === 'pin') {
    const isEmailLogin = (remembered.method || method) === 'email';
    const loginAs = (() => {
      if (isEmailLogin) {
        return remembered.email || remembered.contact || email || 'your email';
      }
      const iso = remembered.phoneCountry || country.iso;
      const raw = remembered.contact || '';
      if (raw && iso) {
        try {
          const pretty = displayNational(iso, raw);
          if (pretty) return pretty;
        } catch {}
      }
      if (national) return national;
      return raw || 'your number';
    })();
    const changeLabel = isEmailLogin ? 'Change email' : 'Change number';

    return (
      <div className="auth-root">
        <div className="auth-body auth-body--pin">
          <BrandMark />
          <h1 className="auth-title auth-title--center">Enter your PIN 🔐</h1>
          <p className="auth-sub auth-sub--center">
            Logging in as <strong>{loginAs}</strong>
          </p>
          <div className="pin-boxes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`pin-box ${pin.length > i ? 'filled' : ''}`}>
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          {bioHint ? <p className="auth-bio-hint">{bioHint}</p> : null}
          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'].map((k) => {
              if (k === 'bio') {
                return (
                  <button key={k} type="button" className="pin-key pin-key--bio" onClick={onFingerprintTap} aria-label="Biometric">
                    <Fingerprint size={22} />
                  </button>
                );
              }
              if (k === 'del') {
                return (
                  <button key={k} type="button" className="pin-key pin-key--del" onClick={onPinDelete} aria-label="Delete">
                    ⌫
                  </button>
                );
              }
              return (
                <button key={k} type="button" className="pin-key" onClick={() => onPinDigit(k)}>
                  {k}
                </button>
              );
            })}
          </div>
          <div className="pin-actions">
            <button
              type="button"
              onClick={() => {
                setError('');
                setPin('');
                setMethod(isEmailLogin ? 'email' : 'phone');
                setStep('signin');
              }}
            >
              {changeLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('forgot');
              }}
            >
              Forgot PIN?
            </button>
          </div>
          <div className="auth-or pin-or">or</div>
          <p className="auth-footer-link pin-create">
            Don't have an account?{' '}
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
          <button type="button" className="auth-back" onClick={() => { setError(''); setStep('pin'); }} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">Confirm your password, then choose a new 4-digit PIN.</p>
          <div className="auth-field">
            <label htmlFor="forgot-pw">Account password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input id="forgot-pw" type={showForgotPass ? 'text' : 'password'} value={forgotPassword} onChange={(e) => setForgotPassword(e.target.value)} placeholder="Your password" />
              <button type="button" className="auth-eye" onClick={() => setShowForgotPass((v) => !v)} aria-label="Toggle password">
                {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="new-pin">New PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input id="new-pin" type="password" inputMode="numeric" maxLength={4} placeholder="4-digit PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-pin">Confirm new PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input id="confirm-pin" type="password" inputMode="numeric" maxLength={4} placeholder="Repeat PIN" value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={handleForgotReset}>Save new PIN</button>
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
            <button type="button" role="tab" aria-selected={method === 'phone'} className={`auth-tab ${method === 'phone' ? 'active' : ''}`} onClick={() => { setMethod('phone'); setError(''); }}>
              <Phone size={15} strokeWidth={2.2} /> Phone Number
            </button>
            <button type="button" role="tab" aria-selected={method === 'email'} className={`auth-tab ${method === 'email' ? 'active' : ''}`} onClick={() => { setMethod('email'); setError(''); }}>
              <Mail size={15} strokeWidth={2.2} /> Email Address
            </button>
          </div>
          {method === 'phone' ? (
            <PhoneField id="signin-phone" label="Phone Number" country={country} national={national} onNationalChange={setNational} onOpenPicker={() => setPickerOpen(true)} placeholder="8012345678" />
          ) : (
            <div className="auth-field">
              <label htmlFor="signin-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} strokeWidth={2} />
                <input id="signin-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </div>
          )}
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="button" className="auth-btn" onClick={handleContinueSignIn} disabled={busy}>Continue</button>
          <p className="auth-footer-link">
            Don't have an account?{' '}
            <button type="button" onClick={() => { setError(''); setStep('signup'); }}>Create account</button>
          </p>
        </div>
        <CountryPickerSheet open={pickerOpen} selectedIso={country.iso} onClose={() => setPickerOpen(false)} onSelect={(c) => { setCountry(c); setNational(''); }} />
      </div>
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-body">
        <button type="button" className="auth-back" onClick={() => { setError(''); setStep('signin'); }} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="auth-title">Create your account 🚀</h1>
        <p className="auth-sub">Join Verxor in under a minute</p>
        <div className="auth-field">
          <label htmlFor="full-name">Full name</label>
          <div className="auth-input-wrap">
            <User size={18} strokeWidth={2} />
            <input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="First Last" autoComplete="name" />
          </div>
        </div>
        <PhoneField id="signup-phone" label="Phone Number" country={country} national={national} onNationalChange={setNational} onOpenPicker={() => setPickerOpen(true)} placeholder="8012345678" />
        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={18} strokeWidth={2} />
            <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="signup-pw">Password</label>
          <div className="auth-input-wrap">
            <Lock size={18} strokeWidth={2} />
            <input id="signup-pw" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 chars, upper + lower + number" autoComplete="new-password" />
            <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="signup-pin">Create 4-digit PIN</label>
          <div className="auth-input-wrap">
            <Lock size={18} strokeWidth={2} />
            <input id="signup-pin" type={showPinField ? 'text' : 'password'} inputMode="numeric" maxLength={4} value={signupPin} onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" autoComplete="off" />
            <button type="button" className="auth-eye" onClick={() => setShowPinField((v) => !v)} aria-label="Toggle PIN visibility">
              {showPinField ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="referral">Referral code <span className="auth-optional">optional</span></label>
          <div className="auth-input-wrap">
            <input id="referral" value={referral} onChange={(e) => setReferral(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="button" className="auth-btn" onClick={handleSignup} disabled={busy}>Create account</button>
        <p className="auth-footer-link">
          Already have an account?{' '}
          <button type="button" onClick={() => { setError(''); setStep('signin'); }}>Sign in</button>
        </p>
      </div>
      <CountryPickerSheet open={pickerOpen} selectedIso={country.iso} onClose={() => setPickerOpen(false)} onSelect={(c) => { setCountry(c); setNational(''); }} />
    </div>
  );
}
