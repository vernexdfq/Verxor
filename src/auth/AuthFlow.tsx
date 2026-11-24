'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Fingerprint } from 'lucide-react';
import {
  DEFAULT_COUNTRY,
  displayNational,
  findCountry,
  flagEmoji,
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
type ForgotStage = 'email' | 'code' | 'password';
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
  return `${name.slice(0, 3)}${'•'.repeat(4)}@${domain}`;
}

function BrandMark() {
  return (
    <div className="auth-brand">
      <img className="auth-brand-logo" src="/brand/verxor-logo.svg" alt="" />
      <span className="auth-brand-name">Verxor</span>
    </div>
  );
}

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-hidden="true">
      <img
        className="auth-visual-image"
        src="/images/verxor-auth-visual.jpg"
        alt=""
      />
      <div className="auth-visual-shade" />
      <div className="auth-visual-copy">
        <span className="auth-visual-kicker">VERXOR · ONE SECURE WORKSPACE</span>
        <p>Everything you need.<br />Connected in one place.</p>
        <span className="auth-visual-caption">Digital services, made simple.</span>
      </div>
    </aside>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.64h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.95 3.44-8.56z" />
      <path fill="#34A853" d="M12 24c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.44-4.75H1.72v2.98A11.99 11.99 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.56 14.66a7.2 7.2 0 0 1 0-4.6V7.08H1.72a12 12 0 0 0 0 10.56l3.84-2.98z" />
      <path fill="#EA4335" d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.71 1.19 15.1 0 12 0 7.3 0 3.25 2.69 1.72 7.08l3.84 2.98C6.46 7.34 9 4.75 12 4.75z" />
    </svg>
  );
}

/** The single identifier accepts email or phone; email wins when it has an @. */
function isEmailIdentifier(v: string): boolean {
  return v.includes('@');
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
  const [identifier, setIdentifier] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [nationalPhone, setNationalPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPinField, setShowPinField] = useState(false);
  const [signupPin, setSignupPin] = useState('');
  const [remember, setRemember] = useState(true);
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const identifierIsEmail = isEmailIdentifier(identifier);

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

    // Prefill the identifier from the last login — no card, just the value.
    if (s.email) {
      setIdentifier(s.email);
    } else if (s.method === 'email' && s.contact && s.contact.includes('@')) {
      setIdentifier(s.contact);
    } else if (s.contact) {
      setIdentifier(displayNational(s.phoneCountry || 'NG', s.contact));
      if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
    } else {
      const last = loadLastPhone();
      if (last) {
        setCountry(findCountry(last.iso));
        setIdentifier(displayNational(last.iso, last.national));
      }
    }
    setStep(initialStep === 'signup' ? 'signup' : 'signin');
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
    const id = identifier.trim();
    if (!id) {
      setError('Enter your email or phone number');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    setRememberPreference(remember);
    setBusy(true);
    try {
      let phoneE164 = '';
      let em = '';

      if (identifierIsEmail) {
        em = id.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
          setError('Enter a valid email address');
          return;
        }
      } else {
        const phoneErr = validatePhoneForCountry(country.iso, id);
        if (phoneErr) {
          setError(phoneErr);
          return;
        }
        phoneE164 = toE164(country.iso, country.dial, id);
      }

      if (backendConfigured()) {
        const res = await fetch('/api/auth/password-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            em ? { email: em, password } : { phone: phoneE164, password },
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
            method: em ? 'email' : 'phone',
            contact: b.phone || (phoneE164 || em),
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
      finish({ ...account, authenticated: true, method: em ? 'email' : 'phone', password: '' });
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
      setError('Enter your full name');
      return;
    }
    const em = identifier.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Enter a valid email address');
      return;
    }
    const phoneErr = validatePhoneForCountry(country.iso, nationalPhone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (!strongPassword(password)) {
      setError('Password must have an uppercase letter, a lowercase letter, and a number');
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) {
      setError('Enter a 4-digit PIN');
      return;
    }
    const e164 = toE164(country.iso, country.dial, nationalPhone);
    saveLastPhone(country.iso, country.dial, nationalPhone);
    setRememberPreference(true);
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
        method: remembered.method || 'phone',
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
    const em = forgotEmail.trim();
    if (!em) {
      setError('Enter the email address or phone number on your account');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; maskedEmail?: string };
      if (res.ok) {
        setForgotStage('code');
        setOtpCode('');
        setNotice(`We sent a 6-digit code to ${body.maskedEmail || (em.includes('@') ? maskEmail(em) : 'your email')}. It expires in 15 minutes.`);
        return;
      }
      setError(body.error || 'Could not send the code');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotVerifyCode() {
    setError('');
    setNotice('');
    const cleanCode = otpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Enter the 6-digit verification code from the email');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: cleanCode,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (res.ok && body.ok) {
        setForgotStage('password');
        setNotice('Code verified! Enter your new password and confirm it below.');
        return;
      }
      setError(body.error || 'Invalid or expired code. Please try again.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotConfirm() {
    setError('');
    setNotice('');
    if (!newPassword) {
      setError('Enter your new password');
      return;
    }
    if (!confirmPassword) {
      setError('Confirm your new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (!strongPassword(newPassword)) {
      setError('Password must have an uppercase letter, a lowercase letter, and a number (minimum 6 characters)');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: otpCode.replace(/\D/g, ''),
          newPassword,
          confirmPassword,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setPassword('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotEmail('');
        setForgotStage('email');
        goStep('signin');
        setNotice('Password updated successfully! Sign in with your new password.');
        return;
      }
      setError(body.error || 'Could not reset the password');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleLogin() {
    setError('');
    setNotice('Google sign-in is coming soon. Use your email or phone number for now.');
  }

  if (step === 'boot') {
    return (
      <div className="auth-root">
        <AuthVisual />
        <div className="auth-body auth-body--center">
          <BrandMark />
        </div>
      </div>
    );
  }

  if (step === 'forgot') {
    return (
      <div className="auth-root">
        <AuthVisual />
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">
            {forgotStage === 'email'
              ? 'Reset password'
              : forgotStage === 'code'
                ? 'Enter verification code'
                : 'Set new password'}
          </h1>
          {error ? <p className="auth-error">{error}</p> : null}
          {notice ? <p className="auth-notice">{notice}</p> : null}
          {forgotStage === 'email' ? (
            <>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <input
                    type="text"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Email address or phone number"
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotSend}>
                {busy ? 'Sending…' : 'Send code'}
                {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
              </button>
            </>
          ) : forgotStage === 'code' ? (
            <>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="auth-otp-input"
                    autoFocus
                  />
                </div>
              </div>
              <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotVerifyCode}>
                {busy ? 'Verifying…' : 'Verify code'}
                {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  className="auth-text-btn"
                  disabled={busy}
                  onClick={handleForgotSend}
                  style={{ fontSize: 13, color: '#1877F2', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Resend code
                </button>
                <button
                  type="button"
                  className="auth-text-btn"
                  onClick={() => {
                    setForgotStage('email');
                    setError('');
                    setNotice('');
                  }}
                  style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Change email
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (6+ chars, Aa1)"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowNewPass((v) => !v)}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <div className="auth-input-wrap">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowConfirmPass((v) => !v)}>
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="button" className="auth-btn" disabled={busy} onClick={handleForgotConfirm}>
                {busy ? 'Saving…' : 'Save new password'}
              </button>
              <button
                type="button"
                className="auth-text-btn"
                onClick={() => {
                  setForgotStage('email');
                  setError('');
                  setNotice('');
                }}
                style={{ marginTop: 10 }}
              >
                Start over
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
        <AuthVisual />
        <div className="auth-body">
          <BrandMark />
          <h1 className="auth-title">Create your account</h1>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="auth-field">
            <div className="auth-input-wrap">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="auth-field">
            <div className="auth-input-wrap">
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
              />
            </div>
          </div>
          <PhoneField
            id="signup-phone"
            label="Phone number"
            country={country}
            national={nationalPhone}
            onOpenPicker={() => setPickerOpen(true)}
            onNationalChange={setNationalPhone}
            placeholder="Phone number"
          />
          <div className="auth-field">
            <div className="auth-input-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="auth-field">
            <div className="auth-input-wrap">
              <input
                type={showPinField ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={signupPin}
                onChange={(e) => setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit PIN"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPinField((v) => !v)}>
                {showPinField ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="button" className="auth-btn" disabled={busy} onClick={handleSignup}>
            {busy ? 'Creating…' : 'Create account'}
            {!busy ? <ArrowRight size={18} strokeWidth={2.2} /> : null}
          </button>
          <div className="auth-or">or</div>
          <button type="button" className="auth-google-btn" onClick={handleGoogleLogin}>
            <GoogleG />
            Continue with Google
          </button>
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
              setNationalPhone('');
            }}
          />
        ) : null}
      </div>
    );
  }

  // ---- signin: one identifier field (email or phone), then password ----
  return (
    <div className="auth-root">
      <AuthVisual />
      <div className="auth-body auth-body--signin">
        <BrandMark />
        <h1 className="auth-title">Sign in</h1>
        {error ? <p className="auth-error">{error}</p> : null}
        {notice ? <p className="auth-notice">{notice}</p> : null}
        <div className="auth-field">
          <div className="auth-input-wrap auth-input-wrap--phone">
            {identifierIsEmail ? null : (
              <button
                type="button"
                className="cc-trigger"
                onClick={() => setPickerOpen(true)}
                aria-label={`Country ${country.name}, +${country.dial}`}
              >
                <span className="cc-trigger-flag">{flagEmoji(country.iso)}</span>
              </button>
            )}
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email or phone number"
              autoComplete="username"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void handleSignIn();
              }}
            />
          </div>
        </div>
        <div className="auth-field">
          <div className="auth-input-wrap">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy) void handleSignIn();
              }}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPass((v) => !v)}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="button" className="auth-forgot" onClick={() => goStep('forgot')}>
            Forgot password?
          </button>
        </div>
        <label className="auth-remember">
          <span>Remember me</span>
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
        <button type="button" className="auth-google-btn" onClick={handleGoogleLogin}>
          <GoogleG />
          Continue with Google
        </button>
        <p className="auth-footer-link">
          Don&apos;t have an account?{' '}
          <button type="button" onClick={() => goStep('signup')}>
            Sign up
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
            if (!identifier.includes('@')) setIdentifier('');
          }}
        />
      ) : null}
    </div>
  );
}
