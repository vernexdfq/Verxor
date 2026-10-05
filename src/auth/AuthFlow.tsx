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
import {
  fetchOwnProfile,
  getAuthSession,
  resetPinWithPassword,
  signInWithEmail,
  signInWithPhone,
  signOutAuth,
  signUpWithEmail,
  supabaseAuthEnabled,
  verifyPinRpc,
} from '../../lib/supabase/auth';
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
/** Multi-account registry so phone OR email can find the same user on this device. */
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
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, authenticated: false }),
    );
  } catch {
    /* ignore */
  }
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
      JSON.stringify({
        iso,
        dial,
        national: normalizeNational(national, iso),
      }),
    );
  } catch {
    /* ignore */
  }
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
  } catch {
    /* ignore */
  }
}

function phoneDigits(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function emailsMatch(a?: string, b?: string): boolean {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  return Boolean(x && y && x === y);
}

/** Find registered account by E.164 phone or by email (either works). */
function findAccount(opts: {
  phoneE164?: string;
  email?: string;
}): StoredAccount | null {
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
    if (phone && phoneDigits(stored.contact) === phone) {
      return { ...stored, id: 'legacy' };
    }
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
  return (
    pw.length >= 6 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /\d/.test(pw)
  );
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

export function AuthFlow({
  onAuthenticated,
}: {
  onAuthenticated: (session: AuthSession) => void;
}) {
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
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [bioHint, setBioHint] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const s = loadRemembered();
      setRemembered(s);
      if (s.contact && s.pin) {
        upsertAccount(s);
      }

      try {
        const inbound = sessionStorage.getItem('verxor-inbound-ref');
        if (inbound) setReferral(inbound);
      } catch {
        /* ignore */
      }

      try {
        if (sessionStorage.getItem('verxor-force-signin') === '1') {
          sessionStorage.removeItem('verxor-force-signin');
          if (supabaseAuthEnabled()) {
            await signOutAuth();
          }
          if (!cancelled) {
            setStep('signin');
            if (s.method) setMethod(s.method);
            if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
            if (s.method === 'email') {
              setEmail(s.contact || s.email || '');
            } else if (s.contact) {
              setNational(displayNational(s.phoneCountry || 'NG', s.contact));
            }
          }
          return;
        }
      } catch {
        /* ignore */
      }

      if (supabaseAuthEnabled()) {
        try {
          const session = await getAuthSession();
          if (session?.user && !cancelled) {
            const profile = await fetchOwnProfile();
            const meta = session.user.user_metadata || {};
            const phone =
              profile?.phone ||
              (typeof meta.phone === 'string' ? meta.phone : '') ||
              '';
            const iso =
              profile?.phone_country ||
              (typeof meta.phone_country === 'string' ? meta.phone_country : '') ||
              s.phoneCountry ||
              'NG';
            const name =
              profile?.full_name ||
              (typeof meta.full_name === 'string' ? meta.full_name : '') ||
              s.name ||
              '';
            const em =
              profile?.email ||
              session.user.email ||
              s.email ||
              '';
            const next: AuthSession = {
              ...s,
              authenticated: false,
              method: phone ? 'phone' : 'email',
              contact: phone || em,
              email: em,
              name,
              username: profile?.username || s.username || '',
              phoneCountry: iso,
              dialCode: findCountry(iso).dial,
              homeCurrency:
                profile?.home_currency === 'USD' ? 'USD' : homeCurrencyFor(iso),
              balanceNgn: profile?.balance_ngn ?? s.balanceNgn ?? 0,
              balanceUsd: profile?.balance_usd ?? s.balanceUsd ?? 0,
              pin: '',
              password: '',
            };
            setRemembered(next);
            saveRemembered(next);
            if (phone) {
              setMethod('phone');
              setCountry(findCountry(iso));
              setNational(displayNational(iso, phone));
            } else {
              setMethod('email');
              setEmail(em);
            }
            setStep('pin');
            return;
          }
        } catch (e) {
          console.warn('[verxor] auth boot', e);
        }
      }

      if (s.contact && s.pin && !supabaseAuthEnabled()) {
        if (!cancelled) {
          setStep('pin');
          setMethod(s.method || 'phone');
          if (s.phoneCountry) setCountry(findCountry(s.phoneCountry));
          if (s.method === 'email') {
            setEmail(s.contact || s.email || '');
          } else if (s.contact) {
            setNational(displayNational(s.phoneCountry || 'NG', s.contact));
          }
        }
        return;
      }

      const last = loadLastPhone();
      if (last && !cancelled) {
        setCountry(findCountry(last.iso));
        setNational(displayNational(last.iso, last.national));
        setMethod('phone');
        setStep('signin');
        return;
      }

      if (!cancelled) setStep('signup');
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  function finish(session: AuthSession) {
    const iso = session.phoneCountry || country.iso;
    const full: AuthSession = {
      ...session,
      authenticated: true,
      phoneCountry: iso,
      dialCode: session.dialCode || findCountry(iso).dial,
      homeCurrency: session.homeCurrency || homeCurrencyFor(iso),
      vtuEligible:
        typeof session.vtuEligible === 'boolean'
          ? session.vtuEligible
          : isVtuEligible(iso),
    };
    saveRemembered(full);
    upsertAccount(full);
    if (full.method === 'phone' && full.contact) {
      saveLastPhone(
        iso,
        full.dialCode || findCountry(iso).dial,
        displayNational(iso, full.contact),
      );
    }
    setRemembered(full);
    onAuthenticated(full);
  }

  function contactLabel(): string {
    if (method === 'email') {
      return email.trim() || remembered.contact || remembered.email || '';
    }
    const iso = country.iso || remembered.phoneCountry || 'NG';
    const n = national || displayNational(iso, remembered.contact || '');
    return n || remembered.contact || '';
  }

  async function handleContinueSignIn() {
    setError('');
    if (!signInPassword) {
      setError('Enter your password to continue');
      return;
    }

    if (method === 'phone') {
      const phoneErr = validatePhoneForCountry(country.iso, national);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
      const e164 = toE164(country.iso, country.dial, national);
      saveLastPhone(country.iso, country.dial, national);

      if (supabaseAuthEnabled()) {
        setBusy(true);
        const res = await signInWithPhone(e164, signInPassword);
        setBusy(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        const profile = await fetchOwnProfile();
        const session: AuthSession = {
          ...remembered,
          authenticated: false,
          method: 'phone',
          contact: profile?.phone || e164,
          email: profile?.email || '',
          name: profile?.full_name || remembered.name || '',
          username: profile?.username || '',
          phoneCountry: country.iso,
          dialCode: country.dial,
          homeCurrency: homeCurrencyFor(country.iso),
          balanceNgn: profile?.balance_ngn ?? 0,
          balanceUsd: profile?.balance_usd ?? 0,
          pin: '',
          password: '',
        };
        saveRemembered(session);
        setRemembered(session);
        setPin('');
        setStep('pin');
        return;
      }

      const account = findAccount({ phoneE164: e164 });
      if (!account || !account.pin) {
        setError(
          'No account found for this number. Check the number or create an account.',
        );
        return;
      }
      if (account.password && account.password !== signInPassword) {
        setError('Incorrect password');
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

    if (supabaseAuthEnabled()) {
      setBusy(true);
      const res = await signInWithEmail(em, signInPassword);
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      const profile = await fetchOwnProfile();
      const session: AuthSession = {
        ...remembered,
        authenticated: false,
        method: 'email',
        contact: profile?.phone || em,
        email: em,
        name: profile?.full_name || remembered.name || '',
        username: profile?.username || '',
        phoneCountry: profile?.phone_country || remembered.phoneCountry || 'NG',
        pin: '',
        password: '',
        balanceNgn: profile?.balance_ngn ?? 0,
        balanceUsd: profile?.balance_usd ?? 0,
      };
      saveRemembered(session);
      setRemembered(session);
      setPin('');
      setStep('pin');
      return;
    }

    const account = findAccount({ email: em });
    if (!account || !account.pin) {
      setError(
        'No account found for this email. Check the address or create an account.',
      );
      return;
    }
    if (account.password && account.password !== signInPassword) {
      setError('Incorrect password');
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
      setError(
        'Password must be at least 6 characters with uppercase, lowercase, and a number',
      );
      return;
    }
    if (!/^\d{4}$/.test(signupPin)) {
      setError('Create a 4-digit PIN');
      return;
    }

    const e164 = toE164(country.iso, country.dial, national);
    if (referral.trim()) {
      try {
        sessionStorage.setItem(
          'verxor-inbound-ref',
          referral.trim().toUpperCase(),
        );
      } catch {
        /* ignore */
      }
    }
    saveLastPhone(country.iso, country.dial, national);

    if (supabaseAuthEnabled()) {
      setBusy(true);
      const res = await signUpWithEmail({
        email: em,
        password,
        fullName: name,
        phoneE164: e164,
        phoneCountry: country.iso,
        pin: signupPin,
      });
      setBusy(false);
      if (res.error && !res.session) {
        setError(res.error);
        return;
      }
      if (!res.session) {
        setError(
          'Account created. Check your email to confirm, then sign in.',
        );
        setStep('signin');
        setMethod('email');
        setEmail(em);
        return;
      }
      const session: AuthSession = {
        authenticated: true,
        method: 'phone',
        contact: e164,
        name,
        username: '',
        pin: '',
        password: '',
        phoneCountry: country.iso,
        dialCode: country.dial,
        homeCurrency: homeCurrencyFor(country.iso),
        vtuEligible: isVtuEligible(country.iso),
        balanceNgn: 0,
        balanceUsd: 0,
        email: em,
      };
      finish(session);
      return;
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
  }

  async function verifyPin(candidate: string) {
    if (supabaseAuthEnabled()) {
      const res = await verifyPinRpc(candidate);
      if (res.ok) {
        const profile = await fetchOwnProfile();
        finish({
          ...remembered,
          name: profile?.full_name || remembered.name,
          username: profile?.username || remembered.username,
          email: profile?.email || remembered.email,
          contact: profile?.phone || remembered.contact,
          balanceNgn: profile?.balance_ngn ?? remembered.balanceNgn ?? 0,
          balanceUsd: profile?.balance_usd ?? remembered.balanceUsd ?? 0,
          pin: '',
          password: '',
          authenticated: true,
        });
        return;
      }
      setError(res.error || 'Incorrect PIN');
      setPin('');
      return;
    }

    const stored = loadRemembered();
    const expected = stored.pin || remembered.pin;
    if (expected && candidate === expected) {
      finish({
        ...stored,
        ...remembered,
        pin: expected,
        contact: remembered.contact || stored.contact,
        method: remembered.method || stored.method,
        name: remembered.name || stored.name,
        email: remembered.email || stored.email,
        authenticated: true,
      });
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
      if (next.length === 4) {
        setTimeout(() => {
          void verifyPin(next);
        }, 60);
      }
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

  async function handleForgotReset() {
    setError('');
    const pw = forgotPassword;
    if (!pw) {
      setError('Enter your account password');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('Enter a new 4-digit PIN');
      return;
    }
    if (newPin !== confirmNewPin) {
      setError('PINs do not match');
      return;
    }

    if (supabaseAuthEnabled()) {
      setBusy(true);
      const res = await resetPinWithPassword({
        email: remembered.email || email || undefined,
        phone: remembered.contact?.startsWith('+')
          ? remembered.contact
          : undefined,
        password: pw,
        newPin,
      });
      setBusy(false);
      if (!res.ok) {
        setError(res.error || 'Could not reset PIN');
        return;
      }
      setPin('');
      setNewPin('');
      setConfirmNewPin('');
      setForgotPassword('');
      setShowForgotPass(false);
      setStep('pin');
      return;
    }

    const stored = loadRemembered();
    const account =
      findAccount({
        phoneE164: remembered.contact || stored.contact,
        email: remembered.email || stored.email,
      }) || { ...stored, ...remembered, id: 'legacy' };

    const expectedPw = account.password || stored.password || remembered.password;
    if (!expectedPw || pw !== expectedPw) {
      setError('Incorrect password. Try again or contact support.');
      return;
    }
    const next: AuthSession = {
      ...stored,
      ...remembered,
      ...account,
      pin: newPin,
      password: expectedPw,
      authenticated: false,
    };
    saveRemembered(next);
    upsertAccount(next);
    setRemembered(next);
    setPin('');
    setNewPin('');
    setConfirmNewPin('');
    setForgotPassword('');
    setShowForgotPass(false);
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

  if (step === 'signin') {
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--signin">
          <BrandMark />
          <h1 className="auth-title">Welcome back 👋</h1>
          <p className="auth-sub">Sign in to your Verxor account</p>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={method === 'phone'}
              className={`auth-tab ${method === 'phone' ? 'active' : ''}`}
              onClick={() => {
                setMethod('phone');
                setError('');
              }}
            >
              <Phone size={15} strokeWidth={2.2} />
              Phone Number
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === 'email'}
              className={`auth-tab ${method === 'email' ? 'active' : ''}`}
              onClick={() => {
                setMethod('email');
                setError('');
              }}
            >
              <Mail size={15} strokeWidth={2.2} />
              Email Address
            </button>
          </div>

          {method === 'phone' ? (
            <PhoneField
              id="signin-phone"
              label="Phone Number"
              country={country}
              national={national}
              onNationalChange={setNational}
              onOpenPicker={() => setPickerOpen(true)}
              placeholder="8012345678"
            />
          ) : (
            <div className="auth-field">
              <label htmlFor="signin-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} strokeWidth={2} />
                <input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="signin-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="signin-pass"
                type={showSignInPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowSignInPass((v) => !v)}
                aria-label={showSignInPass ? 'Hide password' : 'Show password'}
              >
                {showSignInPass ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            type="button"
            className="auth-btn"
            disabled={busy}
            onClick={() => {
              void handleContinueSignIn();
            }}
          >
            {busy ? 'Please wait…' : 'Continue'}
          </button>

          <div className="auth-or">
            <span>or</span>
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

        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setNational('');
          }}
        />
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="auth-root">
        <div className="auth-body">
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setStep('signin');
            }}
            aria-label="Back to sign in"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="auth-title">Create your account 🚀</h1>
          <p className="auth-sub">
            Fill in your details below to get started for free
          </p>

          <p className="auth-section">PERSONAL INFO</p>

          <div className="auth-field">
            <label htmlFor="su-name">Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} strokeWidth={2} />
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                placeholder="Destiny Ikedichukwu"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <PhoneField
            id="su-phone"
            label="Phone Number"
            country={country}
            national={national}
            onNationalChange={setNational}
            onOpenPicker={() => setPickerOpen(true)}
            placeholder="8012345678"
          />

          <div className="auth-field">
            <label htmlFor="su-email">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={18} strokeWidth={2} />
              <input
                id="su-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <p className="auth-section">ACCOUNT SECURITY</p>

          <div className="auth-field">
            <label htmlFor="su-pass">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pass"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
            <p className="auth-hint">
              Min 6 chars · must include uppercase, lowercase, and a number
            </p>
          </div>

          <div className="auth-field">
            <label htmlFor="su-pin">4-Digit Transaction PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="su-pin"
                type={showPinField ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={signupPin}
                onChange={(e) =>
                  setSignupPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPinField((v) => !v)}
                aria-label={showPinField ? 'Hide PIN' : 'Show PIN'}
              >
                {showPinField ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
            <p className="auth-hint">
              Used to authorise transactions — keep it secret
            </p>
          </div>

          <p className="auth-section">
            REFERRAL <span className="auth-optional">Optional</span>
          </p>

          <div className="auth-field">
            <label htmlFor="su-ref">Referral Code</label>
            <div className="auth-input-wrap">
              <input
                id="su-ref"
                type="text"
                autoComplete="off"
                placeholder="ENTER REFERRAL CODE"
                value={referral}
                onChange={(e) => setReferral(e.target.value.toUpperCase())}
              />
            </div>
            <p className="auth-hint">
              Have a friend&apos;s referral code? Enter it here.
            </p>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <p className="auth-terms">
            By creating an account, you agree to our{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            .
          </p>

          <button
            type="button"
            className="auth-btn"
            disabled={busy}
            onClick={() => {
              void handleSignup();
            }}
          >
            {busy ? 'Creating…' : 'Create Account'}
          </button>

          <p className="auth-footer-link" style={{ marginTop: 16 }}>
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

        <CountryPickerSheet
          open={pickerOpen}
          selectedIso={country.iso}
          onClose={() => setPickerOpen(false)}
          onSelect={(c) => {
            setCountry(c);
            setNational('');
          }}
        />
      </div>
    );
  }

  if (step === 'pin') {
    const label = contactLabel();
    return (
      <div className="auth-root">
        <div className="auth-body auth-body--pin">
          <BrandMark />
          <h1 className="auth-title auth-title--center">Enter your PIN 🔐</h1>
          <p className="auth-sub auth-sub--center">
            {label ? (
              <>
                Logging in as <strong>{label}</strong>
              </>
            ) : (
              'Logging in to your Verxor account'
            )}
          </p>
          <p className="pin-label">Enter your 4-digit PIN</p>

          <div className="pin-boxes" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`pin-box${pin.length > i ? ' filled' : ''}${pin.length === i ? ' active' : ''}`}
              >
                {pin.length > i ? <span className="pin-dot" /> : null}
              </div>
            ))}
          </div>

          {error ? <p className="auth-error">{error}</p> : null}
          {bioHint ? <p className="auth-bio-hint">{bioHint}</p> : null}

          <div className="pin-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                className="pin-key"
                onClick={() => onPinDigit(d)}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              className="pin-key pin-key--bio"
              onClick={onFingerprintTap}
              aria-label="Biometric"
            >
              <Fingerprint size={22} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="pin-key"
              onClick={() => onPinDigit('0')}
            >
              0
            </button>
            <button
              type="button"
              className="pin-key pin-key--del"
              onClick={onPinDelete}
              aria-label="Delete"
            >
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
              ← Change number
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setNewPin('');
                setConfirmNewPin('');
                setForgotPassword('');
                setShowForgotPass(false);
                setStep('forgot');
              }}
            >
              Forgot PIN?
            </button>
          </div>

          <div className="auth-or">
            <span>or</span>
          </div>

          <p className="auth-footer-link">
            Don&apos;t have an account?{' '}
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
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setError('');
              setForgotPassword('');
              setNewPin('');
              setConfirmNewPin('');
              setStep('pin');
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="auth-title">Reset PIN</h1>
          <p className="auth-sub">
            Confirm your account password, then set a new 4-digit PIN
          </p>

          <div className="auth-field">
            <label htmlFor="forgot-pass">Account password</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="forgot-pass"
                type={showForgotPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowForgotPass((v) => !v)}
                aria-label={showForgotPass ? 'Hide password' : 'Show password'}
              >
                {showForgotPass ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="new-pin">New PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="new-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="4-digit PIN"
                value={newPin}
                onChange={(e) =>
                  setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm-pin">Confirm new PIN</label>
            <div className="auth-input-wrap">
              <Lock size={18} strokeWidth={2} />
              <input
                id="confirm-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Repeat PIN"
                value={confirmNewPin}
                onChange={(e) =>
                  setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
              />
            </div>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            type="button"
            className="auth-btn"
            disabled={busy}
            onClick={() => {
              void handleForgotReset();
            }}
          >
            {busy ? 'Saving…' : 'Save new PIN'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
