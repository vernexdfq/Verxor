'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Fingerprint, Lock, Mail, Phone, User } from 'lucide-react';
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
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from '../../lib/supabase/client';
import { authenticateWithBiometric } from '../lib/webauthn';
import './auth.css';

function backendConfigured() {
  return isSupabaseBrowserConfigured();
}

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
    localStorage.setItem(
      LAST_PHONE_KEY,
      JSON.stringify({ iso, dial, national: normalizeNational(national, iso) }),
    );
  } catch {}
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
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
        else if (s.contact) setNational(displayNational(s.phoneCountry || 'NG', s.contact));
        return;
      }
    } catch {}
    // Preserve the current public/auth screen across a browser refresh.
    // This stores only the screen name, never the PIN or password.
    try {
      const savedStep = sessionStorage.getItem('verxor-auth-step');
      if (savedStep === 'signin' || savedStep === 'signup' || savedStep === 'pin' || savedStep === 'forgot') {
        if (savedStep === 'pin' && !(s.contact && s.pin)) {
          // Without remembered login details, fall back to the normal sign-in flow.
        } else {
          setStep(savedStep);
          setMethod(s.method || 'phone');
          if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
          if (s.method === 'email') setEmail(s.contact || s.email || '');
          else if (s.contact) setNational(displayNational(s.phoneCountry || 'NG', s.contact));
          return;
        }
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

  useEffect(() => {
    if (step === 'boot') return;
    try {
      sessionStorage.setItem('verxor-auth-step', step);
    } catch {}
  }, [step]);

  function finish(session: AuthSession) {
    const iso = session.phoneCountry || country.iso;
    const full: AuthSession = {
      ...session,
      authenticated: true,
      phoneCountry: iso,
      dialCode: session.dialCode || findCountry(iso).dial,
      homeCurrency: session.homeCurrency || homeCurrencyFor(iso),
      vtuEligible:
        typeof session.vtuEligible === 'boolean' ? session.vtuEligible : isVtuEligible(iso),
    };
    saveRemembered(full);
    upsertAccount(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(iso, full.dialCode || findCountry(iso).dial, displayNational(iso, full.contact));
    }
    setRemembered(full);
    onAuthenticated(full);
  }

  async function handleContinueSignIn() {
    setError('');
    setBusy(true);
    try {
      if (method === 'phone') {
        const phoneErr = validatePhoneForCountry(country.iso, national);
        if (phoneErr) {
          setError(phoneErr);
          return;
        }
        const e164 = toE164(country.iso, country.dial, national);
        saveLastPhone(country.iso, country.dial, national);

        if (backendConfigured()) {
          try {
            const res = await fetch('/api/auth/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: e164 }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && (body as { found?: boolean }).found) {
              const b = body as {
                fullName?: string;
                email?: string;
                phone?: string;
                phoneCountry?: string;
                hasPin?: boolean;
              };
              if (!b.hasPin) {
                setError('PIN is not set for this account.');
                return;
              }
              const session: AuthSession = {
                ...DEFAULT_MOCK,
                method: 'phone',
                contact: b.phone || e164,
                name: b.fullName || '',
                email: b.email || '',
                phoneCountry: b.phoneCountry || country.iso,
                dialCode: country.dial,
                pin: '',
                password: '',
                authenticated: false,
              };
              saveRemembered(session);
              setRemembered(session);
              setPin('');
              setStep('pin');
              return;
            }
            if (res.ok && !(body as { found?: boolean }).found) {
              setError('No account found for this number. Check the number or create an account.');
              return;
            }
          } catch {
            /* fall through local */
          }
        }

        const account = findAccount({ phoneE164: e164 });
        if (!account || !account.pin) {
          setError('No account found for this number. Check the number or create an account.');
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

      if (backendConfigured()) {
        try {
          const res = await fetch('/api/auth/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: em }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok && (body as { found?: boolean }).found) {
            const b = body as {
              fullName?: string;
              email?: string;
              phone?: string;
              phoneCountry?: string;
            };
            const session: AuthSession = {
              ...DEFAULT_MOCK,
              method: 'email',
              contact: b.phone || em,
              name: b.fullName || '',
              email: b.email || em,
              phoneCountry: b.phoneCountry || 'NG',
              pin: '',
              password: '',
              authenticated: false,
            };
            saveRemembered(session);
            setRemembered(session);
            setPin('');
            setStep('pin');
            return;
          }
          if (res.ok && !(body as { found?: boolean }).found) {
            setError('No account found for this email. Check the address or create an account.');
            return;
          }
        } catch {
          /* fall through */
        }
      }

      const account = findAccount({ email: em });
      if (!account || !account.pin) {
        setError('No account found for this email. Check the address or create an account.');
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
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
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
      setError('Password must be at least 6 characters with uppercase, lowercase, and a number');
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) {
      setError('Create a 4-digit PIN');
      return;
    }
    const e164 = toE164(country.iso, country.dial, national);
    saveLastPhone(country.iso, country.dial, national);
    setBusy(true);
    try {
      if (backendConfigured()) {
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: name,
              email: em,
              password,
              pin: signupPin,
              phone: e164,
              phoneCountry: country.iso,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (res.ok) {
            const b = body as {
              access_token?: string;
              refresh_token?: string;
              email?: string;
              phone?: string;
              fullName?: string;
              phoneCountry?: string;
            };
            if (b.access_token && b.refresh_token) {
              const sb = getSupabaseBrowser();
              if (sb) await sb.auth.setSession({ access_token: b.access_token, refresh_token: b.refresh_token });
            }
            finish({
              authenticated: true,
              method: 'phone',
              contact: b.phone || e164,
              name: b.fullName || name,
              username: '',
              pin: '',
              password: '',
              phoneCountry: b.phoneCountry || country.iso,
              dialCode: country.dial,
              homeCurrency: homeCurrencyFor(country.iso),
              vtuEligible: isVtuEligible(country.iso),
              balanceNgn: 0,
              balanceUsd: 0,
              email: b.email || em,
            });
            return;
          }
          if (res.status !== 503) {
            setError((body as { error?: string }).error || 'Could not create account');
            return;
          }
        } catch {
          /* fall through local */
        }
      }

      const session: AuthSession = {
        authenticated: false,
        method: 'phone',
        contact: e164,
        name,
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
      upsertAccount(session);
      finish(session);
    } finally {
      setBusy(false);
    }
  }

  async function verifyPin(candidate: string) {
    const stored = loadRemembered();
    const expected = stored.pin || remembered.pin;

    if (backendConfigured() && (!expected || expected.length !== 4)) {
      setBusy(true);
      try {
        const isEmail = (remembered.method || method) === 'email';
        const payload: Record<string, string> = { pin: candidate };
        if (isEmail) payload.email = remembered.email || remembered.contact || email;
        else payload.phone = remembered.contact || toE164(country.iso, country.dial, national);

        const res = await fetch('/api/auth/pin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          const b = body as {
            access_token?: string;
            refresh_token?: string;
            email?: string;
            phone?: string;
            fullName?: string;
            phoneCountry?: string;
            balanceNgn?: number;
            balanceUsd?: number;
          };
          if (b.access_token && b.refresh_token) {
            const sb = getSupabaseBrowser();
            if (sb) await sb.auth.setSession({ access_token: b.access_token, refresh_token: b.refresh_token });
          }
          finish({
            ...DEFAULT_MOCK,
            ...remembered,
            authenticated: true,
            method: isEmail ? 'email' : 'phone',
            contact: b.phone || remembered.contact,
            name: b.fullName || remembered.name,
            email: b.email || remembered.email,
            phoneCountry: b.phoneCountry || remembered.phoneCountry || country.iso,
            pin: '',
            password: '',
            balanceNgn: b.balanceNgn ?? 0,
            balanceUsd: b.balanceUsd ?? 0,
          });
          return;
        }
        setError((body as { error?: string }).error || 'Incorrect PIN');
        setPin('');
        return;
      } catch {
        setError('Network error. Try again.');
        setPin('');
        return;
      } finally {
        setBusy(false);
      }
    }

    if (expected && candidate === expected) {
      finish({ ...remembered, pin: expected, authenticated: true });
      return;
    }
    setError('Incorrect PIN');
    setPin('');
  }

  async function handleBiometricLogin() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await authenticateWithBiometric();
      const b = result as {
        access_token?: string; refresh_token?: string; email?: string; phone?: string;
        fullName?: string; phoneCountry?: string; balanceNgn?: number; balanceUsd?: number;
      };
      if (!b.access_token || !b.refresh_token) throw new Error('Biometric login did not return a valid session.');
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error('Auth service is unavailable. Use your PIN.');
      const { error: sessionError } = await sb.auth.setSession({ access_token: b.access_token, refresh_token: b.refresh_token });
      if (sessionError) throw sessionError;
      finish({
        ...DEFAULT_MOCK,
        authenticated: true,
        method: remembered.method || method,
        contact: b.phone || remembered.contact,
        name: b.fullName || remembered.name || 'User',
        email: b.email || remembered.email,
        phoneCountry: b.phoneCountry || remembered.phoneCountry || country.iso,
        pin: '',
        password: '',
        balanceNgn: b.balanceNgn ?? 0,
        balanceUsd: b.balanceUsd ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric login failed. Use your PIN.');
    } finally {
      setBusy(false);
    }
  }

  function onPinDigit(d: string) {
    if (busy) return;
    setError('');
    setPin((prev) => {
      const next = (prev + d).slice(0, 4);
      if (next.length === 4) {
        queueMicrotask(() => verifyPin(next));
      }
      return next;
    });
  }

  function onPinDelete() {
    if (busy) return;
    setError('');
    setPin((p) => p.slice(0, -1));
  }

  async function handleForgotReset() {
    setError('');
    if (!forgotPassword) {
      setError('Enter your account password');
      return;
    }
    if (!/^\d{4}$/.test(newPin) || newPin !== confirmNewPin) {
      setError('PINs must match and be 4 digits');
      return;
    }
    setBusy(true);
    try {
      if (backendConfigured()) {
        const isEmail = (remembered.method || method) === 'email';
        const payload: Record<string, string> = {
          password: forgotPassword,
          newPin,
        };
        if (isEmail) payload.email = remembered.email || remembered.contact || email;
        else payload.phone = remembered.contact || toE164(country.iso, country.dial, national);

        const res = await fetch('/api/auth/reset-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setError('');
          setStep('pin');
          setPin('');
          setNewPin('');
          setConfirmNewPin('');
          setForgotPassword('');
          return;
        }
        setError((body as { error?: string }).error || 'Could not reset PIN');
        return;
      }
      const acc = findAccount({
        phoneE164: remembered.contact,
        email: remembered.email,
      });
      if (!acc || acc.password !== forgotPassword) {
        setError('Incorrect password');
        return;
      }
      const updated = { ...acc, pin: newPin };
      upsertAccount(updated);
      saveRemembered(updated);
      setRemembered(updated);
      setStep('pin');
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'boot') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--center">
          <BrandMark />
        </div>
      </div>
    );
  }

  if (step === 'pin') {
    const isEmailLogin = (remembered.method || method) === 'email';
    const loginLabel = isEmailLogin
      ? remembered.email || remembered.contact || email
      : displayNational(
          remembered.phoneCountry || country.iso,
          remembered.contact || toE164(country.iso, country.dial, national),
        );
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--pin">
          <BrandMark />
          <h1 className="auth-title auth-title--center">
            Enter your PIN <span className="pin-emoji">🔒</span>
          </h1>
          <p className="auth-sub auth-sub--center">
            Logging in as <strong>{loginLabel}</strong>
          </p>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="pin-boxes">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box${pin.length > i ? ' filled' : ''}${pin.length === i ? ' active' : ''}`}
              >
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>
          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className="pin-key" onClick={() => onPinDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className="pin-key pin-key--bio" aria-label="Biometric login" onClick={() => void handleBiometricLogin()} disabled={busy}>
              <Fingerprint size={22} />
            </button>
            <button type="button" className="pin-key" onClick={() => onPinDigit('0')}>
              0
            </button>
            <button type="button" className="pin-key pin-key--del" onClick={onPinDelete} aria-label="Delete">
              ⌫
            </button>
          </div>
          <div className="pin-actions">
            <button
              type="button"
              onClick={() => {
                setError('');
                setPin('');
                setStep('signin');
              }}
            >
              Change {isEmailLogin ? 'email' : 'number'}
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
          <div className="auth-or">or</div>
          <p className="auth-footer-link">
            Don't have an account?{' '}
            <button type="button" onClick={() => setStep('signup')}>
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
          <BrandMark />
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">Confirm your password, then choose a new 4-digit PIN.</p>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showForgotPass ? 'text' : 'password'}
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                placeholder="Account password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowForgotPass((v) => !v)}>
                {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <label>New PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 digits"
              />
            </div>
          </div>
          <div className="auth-field">
            <label>Confirm PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                inputMode="numeric"
                maxLength={4}
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 digits"
              />
            </div>
          </div>
          <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotReset}>
            {busy ? 'Saving…' : 'Save new PIN'}
          </button>
          <button type="button" className="auth-footer-link" onClick={() => setStep('pin')}>
            Back to PIN
          </button>
        </div>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Create your account 🚀</h1>
          <p className="auth-sub">Fill in your details below to get started for free</p>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First and last name"
                autoComplete="name"
              />
            </div>
          </div>
          <PhoneField
            id="signup-phone"
            label="Phone Number"
            country={country}
            national={national}
            onOpenPicker={() => setPickerOpen(true)}
            onNationalChange={setNational}
            placeholder="08012345678"
          />
          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">Min 6 chars · must include uppercase, lowercase, and a number</p>
          </div>
          <div className="auth-field">
            <label>4-Digit Transaction PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                type={showPinField ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={signupPin}
                onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4-digit PIN"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPinField((v) => !v)}>
                {showPinField ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="auth-hint">Used to authorise transactions — keep it secret</p>
          </div>
          <button type="button" className="auth-btn" disabled={busy} onClick={handleSignup}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <p className="auth-footer-link">
            Already have an account?{' '}
            <button type="button" onClick={() => setStep('signin')}>
              Sign in
            </button>
          </p>
        </div>
        {pickerOpen ? (
          <CountryPickerSheet
            open={pickerOpen}
            selectedIso={country.iso}
            onClose={() => setPickerOpen(false)}
            onSelect={(c) => {
              setCountry(c);
              setNational('');
            }}
          />
        ) : null}
      </div>
    );
  }

  // signin
  return (
    <div className="auth-root">
      <div className="auth-body auth-body--signin">
        <BrandMark />
        <h1 className="auth-title">Welcome back 👋</h1>
        <p className="auth-sub">Sign in to your Verxor account</p>
        <div className="auth-tabs">
          <button
            type="button"
            className={method === 'phone' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMethod('phone');
              setError('');
            }}
          >
            <Phone size={16} /> Phone Number
          </button>
          <button
            type="button"
            className={method === 'email' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => {
              setMethod('email');
              setError('');
            }}
          >
            <Mail size={16} /> Email Address
          </button>
        </div>
        {method === 'phone' ? (
          <PhoneField
            id="signin-phone"
            label="Phone Number"
            country={country}
            national={national}
            onOpenPicker={() => setPickerOpen(true)}
            onNationalChange={setNational}
            placeholder="08012345678"
          />
        ) : (
          <div className="auth-field">
            <label htmlFor="signin-email">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} strokeWidth={2} />
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>
        )}
        {error ? <p className="auth-error">{error}</p> : null}
        <button type="button" className="auth-btn" disabled={busy} onClick={handleContinueSignIn}>
          {busy ? 'Checking…' : 'Continue'}
        </button>
        <div className="auth-or">or</div>
        <p className="auth-footer-link">
          Don't have an account?{' '}
          <button type="button" onClick={() => setStep('signup')}>
            Create one free
          </button>
        </p>
      </div>
      {pickerOpen ? (
        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setNational('');
          }}
        />
      ) : null}
    </div>
  );
}
