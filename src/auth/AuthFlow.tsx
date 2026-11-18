'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Fingerprint, Lock, Mail, Pencil, Phone, User } from 'lucide-react';
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
import {
  getRememberPreference,
  saveSessionProfile,
  saveSessionTokens,
  setRememberPreference,
} from './session-unlock';
import { authenticateWithBiometric, isBiometricEnabledLocally } from '../lib/webauthn';
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
  userId?: string;
  accessToken?: string;
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
type Step = 'boot' | 'signin' | 'signup' | 'forgot';
type ForgotStage = 'email' | 'code';
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
    // Never persist the password or PIN here — only display identity.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, authenticated: false, pin: '', password: '' }),
    );
  } catch {}
}

function loadLastPhone(): LastPhone | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_PHONE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastPhone;
    if (p?.iso && p.national) return p;
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

function maskEmail(addr: string): string {
  const em = (addr || '').trim().toLowerCase();
  if (!em.includes('@')) return em;
  const [name, domain] = em.split('@');
  if (!name) return em;
  const head = name.slice(0, 3);
  return `${head}${'•'.repeat(4)}@${domain}`;
}

function BrandMark() {
  return (
    <div className="auth-brand">
      <div className="auth-brand-mark">
        <img src="/brand/verxor-logo.svg" alt="" width={44} height={44} />
      </div>
      <span className="auth-brand-name">Verxor</span>
    </div>
  );
}

export function AuthFlow({
  onAuthenticated,
  initialStep,
  redirectTo,
}: {
  onAuthenticated: (session: AuthSession) => void;
  initialStep?: 'signin' | 'signup';
  redirectTo?: string;
}) {
  const router = useRouter();
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
  const [remember, setRemember] = useState(true);
  const [welcomeMode, setWelcomeMode] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Forgot-password state
  const [forgotStage, setForgotStage] = useState<ForgotStage>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const rememberedContact = remembered.email || remembered.contact;
  const hasRemembered = Boolean(rememberedContact);

  useEffect(() => {
    const s = loadRemembered();
    setRemembered(s);
    if (s.contact || s.email) upsertAccount(s);
    setRemember(getRememberPreference());
    setBiometricReady(isBiometricEnabledLocally());
    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
      }
    } catch {}

    if (s.email || s.contact) {
      setStep('signin');
      setWelcomeMode(true);
      setMethod(s.method || 'phone');
      if (s.email) setEmail(s.email);
      return;
    }
    const last = loadLastPhone();
    if (last) {
      setCountry(findCountry(last.iso));
      setNational(displayNational(last.iso, last.national));
      setMethod('phone');
    }
    setStep(initialStep === 'signup' ? 'signup' : 'signin');
    setWelcomeMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'boot') return;
    try {
      sessionStorage.setItem('verxor-auth-step', step);
    } catch {}
  }, [step]);

  function goStep(next: Step) {
    setError('');
    setNotice('');
    setStep(next);
    if (typeof window !== 'undefined' && redirectTo) {
      const path = next === 'signup' ? '/signup' : '/signin';
      if (window.location.pathname !== path) {
        window.history.replaceState(null, '', path);
      }
    }
  }

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
      userId: session.userId,
      accessToken: session.accessToken,
    };
    if (full.userId) {
      saveSessionProfile({
        name: full.name || 'User',
        contact: full.contact || '',
        email: full.email || '',
        method: full.method || 'phone',
        phoneCountry: full.phoneCountry || 'NG',
        dialCode: full.dialCode || '234',
        homeCurrency: full.homeCurrency || 'NGN',
        vtuEligible: full.vtuEligible ?? true,
        balanceNgn: full.balanceNgn ?? 0,
        balanceUsd: full.balanceUsd ?? 0,
        userId: full.userId,
      });
    }
    saveRemembered(full);
    upsertAccount(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(iso, full.dialCode || findCountry(iso).dial, displayNational(iso, full.contact));
    }
    setRemembered(full);
    onAuthenticated(full);
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }

  async function applyBackendTokens(tokens: { access_token?: string; refresh_token?: string }) {
    saveSessionTokens(tokens);
    const sb = getSupabaseBrowser();
    if (sb && tokens.access_token && tokens.refresh_token) {
      await sb.auth
        .setSession({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
        .catch(() => {});
    }
  }

  async function handleSignIn() {
    setError('');
    setNotice('');
    if (!password) {
      setError('Enter your password');
      return;
    }
    setRememberPreference(remember);
    setBusy(true);
    try {
      let phoneE164 = '';
      let em = '';
      if (method === 'phone') {
        const phoneErr = validatePhoneForCountry(country.iso, national);
        if (phoneErr) {
          setError(phoneErr);
          return;
        }
        phoneE164 = toE164(country.iso, country.dial, national);
      } else {
        em = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          setError('Enter a valid email address');
          return;
        }
      }

      if (backendConfigured()) {
        const res = await fetch('/api/auth/password-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            method === 'phone' ? { phone: phoneE164, password } : { email: em, password },
          ),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          const b = body as {
            access_token?: string;
            refresh_token?: string;
            userId?: string;
            email?: string;
            phone?: string;
            fullName?: string;
            phoneCountry?: string;
          };
          await applyBackendTokens(b);
          finish({
            ...DEFAULT_MOCK,
            authenticated: true,
            method,
            contact: b.phone || (method === 'phone' ? phoneE164 : ''),
            name: b.fullName || remembered.name || '',
            email: b.email || em || '',
            phoneCountry: b.phoneCountry || country.iso,
            dialCode: country.dial,
            pin: '',
            password: '',
            userId: b.userId,
            accessToken: b.access_token,
          });
          return;
        }
        if (res.status === 401) {
          setError('Incorrect password. Try again or tap "Forgot password?".');
          return;
        }
        if (res.status === 404) {
          setError((body as { error?: string }).error || 'No account found. Create one free below.');
          return;
        }
        if (res.status !== 503) {
          setError((body as { error?: string }).error || 'Could not sign in');
          return;
        }
        // 503: backend not configured — fall through to local demo accounts.
      }

      const account = findAccount({ phoneE164, email: em });
      if (!account) {
        setError('No account found. Create one free below.');
        return;
      }
      if (!account.password || account.password !== password) {
        setError('Incorrect password. Try again or tap "Forgot password?".');
        return;
      }
      finish({ ...account, authenticated: true, method, password: '' });
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    setError('');
    setNotice('');
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
    setRememberPreference(remember);
    setBusy(true);
    try {
      if (backendConfigured()) {
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
            userId?: string;
          };
          if (b.access_token && b.refresh_token) {
            await applyBackendTokens(b);
          }
          finish({
            ...DEFAULT_MOCK,
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
            userId: b.userId,
            accessToken: b.access_token,
          });
          return;
        }
        if (res.status !== 503) {
          setError((body as { error?: string }).error || 'Could not create account');
          return;
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

  async function handleBiometricLogin() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const b = (await authenticateWithBiometric()) as {
        access_token?: string;
        refresh_token?: string;
        email?: string;
        phone?: string;
        fullName?: string;
        phoneCountry?: string;
        balanceNgn?: number;
        balanceUsd?: number;
        userId?: string;
      };
      if (!b.access_token || !b.refresh_token) throw new Error('Biometric unlock did not return a session. Sign in with your password.');
      setRememberPreference(true);
      await applyBackendTokens(b);
      finish({
        ...DEFAULT_MOCK,
        authenticated: true,
        method: remembered.method || method,
        contact: b.phone || remembered.contact,
        name: b.fullName || remembered.name || 'User',
        email: b.email || remembered.email || '',
        phoneCountry: b.phoneCountry || remembered.phoneCountry || country.iso,
        pin: '',
        password: '',
        balanceNgn: b.balanceNgn ?? 0,
        balanceUsd: b.balanceUsd ?? 0,
        userId: b.userId,
        accessToken: b.access_token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric unlock failed. Use your password.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotSend() {
    setError('');
    setNotice('');
    const em = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter the email address on your account');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setForgotStage('code');
        setNotice(`We sent a 6-digit code to ${maskEmail(em)}. It expires in 10 minutes.`);
        return;
      }
      setError((body as { error?: string }).error || 'Could not send the code');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotConfirm() {
    setError('');
    setNotice('');
    if (otpCode.replace(/\D/g, '').length !== 6) {
      setError('Enter the 6-digit code from the email');
      return;
    }
    if (!strongPassword(newPassword)) {
      setError('Password must be at least 6 characters with uppercase, lowercase, and a number');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code: otpCode.replace(/\D/g, ''),
          newPassword,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setPassword('');
        setOtpCode('');
        setNewPassword('');
        setForgotEmail('');
        setForgotStage('email');
        goStep('signin');
        setNotice('Password updated. Sign in with your new password.');
        return;
      }
      setError((body as { error?: string }).error || 'Could not reset the password');
    } catch {
      setError('Network error. Try again.');
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

  if (step === 'forgot') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-sub">
            {forgotStage === 'email'
              ? 'Enter the email address on your account and we will send you a 6-digit code.'
              : 'Enter the code from the email and choose a new password.'}
          </p>
          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}
          {forgotStage === 'email' ? (
            <>
              <div className="auth-field">
                <label>Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={18} strokeWidth={2} />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotSend}>
                {busy ? 'Sending…' : 'Send code'}
                {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
              </button>
            </>
          ) : (
            <>
              <div className="auth-field">
                <label>6-digit code</label>
                <div className="auth-input-wrap">
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="auth-otp-input"
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>New password</label>
                <div className="auth-input-wrap">
                  <Lock size={18} strokeWidth={2} />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowNewPass((v) => !v)}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="auth-hint">Min 6 chars · uppercase, lowercase, and a number</p>
              </div>
              <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotConfirm}>
                {busy ? 'Saving…' : 'Set new password'}
              </button>
              <button type="button" className="auth-text-btn" onClick={() => setForgotStage('email')}>
                Use a different email
              </button>
            </>
          )}
          <div className="auth-or">or</div>
          <p className="auth-footer-link">
            Remembered it?{' '}
            <button type="button" onClick={() => goStep('signin')}>
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">Fill in your details below to get started for free</p>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} strokeWidth={2} />
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
              <Mail size={18} strokeWidth={2} />
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
              <Lock size={18} strokeWidth={2} />
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
              <Lock size={18} strokeWidth={2} />
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
          <label className="auth-remember">
            <span>Keep me signed in for 30 days</span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <i className="auth-switch" aria-hidden="true" />
          </label>
          <button type="button" className="auth-btn" disabled={busy} onClick={handleSignup}>
            {busy ? 'Creating…' : 'Create account'}
            {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
          </button>
          <div className="auth-or">or</div>
          <p className="auth-footer-link">
            Already have an account?{' '}
            <button type="button" onClick={() => goStep('signin')}>
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

  // ---- signin ----
  const welcomeName = (remembered.name || '').trim().split(/\s+/)[0] || 'there';
  const welcomeInitial = ((remembered.name || 'V').trim()[0] || 'V').toUpperCase();

  return (
    <div className="auth-root">
      <div className="auth-body auth-body--signin">
        <BrandMark />
        {welcomeMode && hasRemembered ? (
          <>
            <h1 className="auth-title auth-title--center">Welcome back 👋</h1>
            <div className="auth-welcome">
              <div className="auth-avatar" aria-hidden="true">
                {welcomeInitial}
              </div>
              <div className="auth-welcome-id">
                <span className="auth-welcome-name">{welcomeName}</span>
                <span className="auth-welcome-contact">
                  {remembered.email ? maskEmail(remembered.email) : remembered.contact}
                </span>
              </div>
              <button
                type="button"
                className="auth-welcome-edit"
                aria-label="Use a different account"
                title="Use a different account"
                onClick={() => {
                  setWelcomeMode(false);
                  setError('');
                  setNotice('');
                }}
              >
                <Pencil size={16} strokeWidth={2.2} />
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title">Sign in</h1>
            <p className="auth-sub">Welcome back — enter your details to continue</p>
            <div className="auth-tabs">
              <button
                type="button"
                className={method === 'phone' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMethod('phone');
                  setError('');
                  setNotice('');
                }}
              >
                <Phone size={15} strokeWidth={2.2} /> Phone Number
              </button>
              <button
                type="button"
                className={method === 'email' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMethod('email');
                  setError('');
                  setNotice('');
                }}
              >
                <Mail size={15} strokeWidth={2.2} /> Email
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
                <label>Email Address</label>
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
          </>
        )}
        <div className="auth-field">
          <div className="auth-label-row">
            <label>Password</label>
            <button type="button" className="auth-forgot" onClick={() => goStep('forgot')}>
              Forgot?
            </button>
          </div>
          <div className="auth-input-wrap">
            <Lock size={18} strokeWidth={2} />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete={welcomeMode ? 'current-password' : 'current-password'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void handleSignIn();
              }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        {notice ? <p className="auth-notice">{notice}</p> : null}
        <label className="auth-remember">
          <span>Remember me for 30 days</span>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <i className="auth-switch" aria-hidden="true" />
        </label>
        <div className="auth-submit-row">
          <button type="button" className="auth-btn" disabled={busy} onClick={handleSignIn}>
            {busy ? 'Signing in…' : 'Sign In'}
            {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
          </button>
          {biometricReady ? (
            <button
              type="button"
              className="auth-bio-btn"
              aria-label="Unlock with fingerprint or Face ID"
              title="Unlock with fingerprint or Face ID"
              disabled={busy}
              onClick={() => void handleBiometricLogin()}
            >
              <Fingerprint size={24} strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <div className="auth-or">or</div>
        <p className="auth-footer-link">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => goStep('signup')}>
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
