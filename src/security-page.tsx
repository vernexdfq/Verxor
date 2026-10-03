'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import './security-page.css';

type Props = {
  onBack: () => void;
};

type Mode = 'hub' | 'password' | 'pin';

export function SecurityPage({ onBack }: Props) {
  const [mode, setMode] = useState<Mode>('hub');
  const [biometric, setBiometric] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // PIN form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function toggleBiometric() {
    const next = !biometric;
    setBiometric(next);
    flash(next ? 'Biometrics enabled successfully!' : 'Biometrics disabled');
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Fill in all password fields.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setPwBusy(true);
    window.setTimeout(() => {
      setPwBusy(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setMode('hub');
      flash('Password updated successfully');
    }, 700);
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmPin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }
    if (newPin === currentPin) {
      setPinError('New PIN must be different from current PIN.');
      return;
    }
    setPinBusy(true);
    window.setTimeout(() => {
      setPinBusy(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setMode('hub');
      flash('Transaction PIN updated');
    }, 700);
  }

  if (mode === 'password') {
    return (
      <div className="sec-page">
        <header className="sec-header">
          <button type="button" className="sec-back" onClick={() => setMode('hub')} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <div className="sec-header-text">
            <h1>Change Password</h1>
            <p>Update your login credentials</p>
          </div>
        </header>

        <form className="sec-form" onSubmit={submitPassword}>
          <label className="sec-label">Current password</label>
          <div className="sec-input-wrap">
            <LockKeyhole size={16} className="sec-input-icon" />
            <input
              type={showCurrent ? 'text' : 'password'}
              className="sec-input"
              placeholder="Current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" className="sec-eye" onClick={() => setShowCurrent((v) => !v)} aria-label="Toggle visibility">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="sec-label">New password</label>
          <div className="sec-input-wrap">
            <LockKeyhole size={16} className="sec-input-icon" />
            <input
              type={showNew ? 'text' : 'password'}
              className="sec-input"
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
            <button type="button" className="sec-eye" onClick={() => setShowNew((v) => !v)} aria-label="Toggle visibility">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="sec-label">Confirm new password</label>
          <div className="sec-input-wrap">
            <LockKeyhole size={16} className="sec-input-icon" />
            <input
              type={showConfirm ? 'text' : 'password'}
              className="sec-input"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
            <button type="button" className="sec-eye" onClick={() => setShowConfirm((v) => !v)} aria-label="Toggle visibility">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className={`sec-hint ${newPw.length >= 6 ? 'ok' : ''}`}>
            <span className="sec-hint-dot" />
            At least 6 characters
          </div>

          {pwError ? <p className="sec-error">{pwError}</p> : null}

          <button type="submit" className="sec-cta" disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'pin') {
    return (
      <div className="sec-page">
        <header className="sec-header">
          <button type="button" className="sec-back" onClick={() => setMode('hub')} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2.2} />
          </button>
          <div className="sec-header-text">
            <h1>Transaction PIN</h1>
            <p>Used for VTU and sensitive actions</p>
          </div>
        </header>

        <form className="sec-form" onSubmit={submitPin}>
          <label className="sec-label">Current PIN</label>
          <div className="sec-input-wrap">
            <KeyRound size={16} className="sec-input-icon" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="sec-input"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="off"
            />
          </div>

          <label className="sec-label">New PIN</label>
          <div className="sec-input-wrap">
            <KeyRound size={16} className="sec-input-icon" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="sec-input"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="off"
            />
          </div>

          <label className="sec-label">Confirm new PIN</label>
          <div className="sec-input-wrap">
            <KeyRound size={16} className="sec-input-icon" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="sec-input"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoComplete="off"
            />
          </div>

          <div className={`sec-hint ${newPin.length === 4 ? 'ok' : ''}`}>
            <span className="sec-hint-dot" />
            Exactly 4 digits
          </div>

          {pinError ? <p className="sec-error">{pinError}</p> : null}

          <button type="submit" className="sec-cta" disabled={pinBusy}>
            {pinBusy ? 'Updating…' : 'Update PIN'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="sec-page">
      <header className="sec-header">
        <button type="button" className="sec-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="sec-header-text">
          <h1>Security</h1>
          <p>Secure your account and transactions</p>
        </div>
      </header>

      {toast ? (
        <div className="sec-toast" role="status">
          <ShieldCheck size={16} />
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="sec-scroll">
        <section className="sec-section">
          <h2 className="sec-section-title">Authentication</h2>
          <div className="sec-list">
            <button type="button" className="sec-row" onClick={() => setMode('password')}>
              <span className="sec-icon tone-key">
                <KeyRound size={18} strokeWidth={2} />
              </span>
              <span className="sec-copy">
                <strong>Login Password</strong>
                <small>Last changed: managed in account</small>
              </span>
              <ChevronRight size={18} className="sec-chevron" />
            </button>

            <div className="sec-row sec-row-static">
              <span className={`sec-icon ${biometric ? 'tone-bio-on' : 'tone-bio'}`}>
                <Fingerprint size={18} strokeWidth={2} />
              </span>
              <span className="sec-copy">
                <strong>Biometric Login</strong>
                <small>{biometric ? 'Face ID / Touch ID is enabled' : 'Enable quick login with Face ID or fingerprint'}</small>
              </span>
              <button
                type="button"
                className={`sec-toggle ${biometric ? 'on' : ''}`}
                onClick={toggleBiometric}
                aria-pressed={biometric}
                aria-label="Toggle biometric login"
              >
                <span className="sec-toggle-knob" />
              </button>
            </div>

            <div className="sec-row sec-row-static dim">
              <span className="sec-icon tone-2fa">
                <Smartphone size={18} strokeWidth={2} />
              </span>
              <span className="sec-copy">
                <strong>
                  Two-Factor Authentication <span className="sec-soon">SOON</span>
                </strong>
                <small>Coming soon</small>
              </span>
            </div>
          </div>
        </section>

        <section className="sec-section">
          <h2 className="sec-section-title">Transactions</h2>
          <div className="sec-list">
            <button type="button" className="sec-row" onClick={() => setMode('pin')}>
              <span className="sec-icon tone-pin">
                <LockKeyhole size={18} strokeWidth={2} />
              </span>
              <span className="sec-copy">
                <strong>Transaction PIN</strong>
                <small>4-digit PIN for VTU and payouts</small>
              </span>
              <ChevronRight size={18} className="sec-chevron" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
