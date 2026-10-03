'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Share2,
  Users,
  Wallet,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './referral-page.css';

const CODE_KEY = 'verxor-referral-code';
const HISTORY_KEY = 'verxor-referral-history';

type RefStatus = 'pending' | 'successful' | 'flagged';

type ReferralRow = {
  id: string;
  username: string;
  email: string;
  joinedAt: string;
  status: RefStatus;
  note?: string;
};

/** Stable, human-readable referral code from identity (persisted once). */
function buildReferralCode(name: string, contact: string): string {
  const base =
    (name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'USER';
  let h = 2166136261;
  const seed = `${contact}|${name}`.toLowerCase();
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const suffix = (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `${base}${suffix}`.slice(0, 12);
}

function loadOrCreateCode(name: string, contact: string): string {
  if (typeof window === 'undefined') return buildReferralCode(name, contact);
  try {
    const existing = localStorage.getItem(CODE_KEY);
    if (existing && /^[A-Z0-9]{6,14}$/.test(existing)) return existing;
    const next = buildReferralCode(name, contact);
    localStorage.setItem(CODE_KEY, next);
    return next;
  } catch {
    return buildReferralCode(name, contact);
  }
}

function loadHistory(): ReferralRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReferralRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReferralPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session: AuthSession;
}) {
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<ReferralRow[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [origin, setOrigin] = useState('https://verxor.com');

  useEffect(() => {
    setCode(loadOrCreateCode(session.name || 'User', session.contact || ''));
    setHistory(loadHistory());
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, [session.name, session.contact]);

  const link = useMemo(() => {
    if (!code) return '';
    return `${origin}/?ref=${encodeURIComponent(code)}`;
  }, [origin, code]);

  const stats = useMemo(() => {
    const total = history.length;
    const successful = history.filter((r) => r.status === 'successful').length;
    const pending = history.filter((r) => r.status === 'pending').length;
    const flagged = history.filter((r) => r.status === 'flagged').length;
    const earnings = 0;
    return { total, successful, pending, flagged, earnings };
  }, [history]);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flash(`${label} copied`);
      } catch {
        flash('Could not copy');
      }
      document.body.removeChild(ta);
    }
  };

  const shareNative = async () => {
    const text = `Join Verxor with my referral code ${code} and get started. ${link}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Join Verxor', text, url: link });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy(link, 'Link');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Verxor with my code *${code}* — earn & trade smarter.\n${link}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="ref-page">
      <header className="ref-top">
        <button type="button" className="ref-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="ref-top-mid">
          <h1>Referral Program</h1>
          <p>Earn 10% of each referral's first deposit, instantly</p>
        </div>
      </header>

      <div className="ref-scroll">
        <div className="ref-stats">
          <div className="ref-stat">
            <small>Total referrals</small>
            <strong>{stats.total}</strong>
          </div>
          <div className="ref-stat">
            <small>Successful</small>
            <strong className="ok">{stats.successful}</strong>
          </div>
          <div className="ref-stat">
            <small>Pending</small>
            <strong className="warn">{stats.pending}</strong>
          </div>
          <div className="ref-stat">
            <small>Flagged</small>
            <strong className="bad">{stats.flagged}</strong>
          </div>
        </div>

        <div className="ref-earnings">
          <span className="ref-earnings-ico" aria-hidden>
            <Wallet size={18} strokeWidth={2.2} />
          </span>
          <div>
            <small>Total referral earnings</small>
            <strong>{formatNaira(stats.earnings)}</strong>
          </div>
        </div>

        <section className="ref-section">
          <h2>Your referral details</h2>

          <div className="ref-detail">
            <div className="ref-detail-label">Code</div>
            <div className="ref-detail-row">
              <code className="ref-code">{code || '…'}</code>
              <button
                type="button"
                className="ref-copy"
                onClick={() => copy(code, 'Code')}
                aria-label="Copy code"
                disabled={!code}
              >
                <Copy size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="ref-detail">
            <div className="ref-detail-label">Link</div>
            <div className="ref-detail-row">
              <span className="ref-link" title={link}>
                {link
                  ? link.replace(/^https?:\/\//, '').length > 36
                    ? `${link.replace(/^https?:\/\//, '').slice(0, 34)}…`
                    : link.replace(/^https?:\/\//, '')
                  : '…'}
              </span>
              <button
                type="button"
                className="ref-copy"
                onClick={() => copy(link, 'Link')}
                aria-label="Copy link"
                disabled={!link}
              >
                <Copy size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <p className="ref-note">
            Rewards are credited instantly when your referred user makes their first successful
            deposit — 10% of that deposit, once per user.
          </p>

          <div className="ref-share-row">
            <button type="button" className="ref-share primary" onClick={shareNative}>
              <Share2 size={16} strokeWidth={2.2} />
              Share link
            </button>
            <button type="button" className="ref-share wa" onClick={shareWhatsApp}>
              WhatsApp
            </button>
          </div>
        </section>

        <section className="ref-section">
          <div className="ref-section-head">
            <h2>Referral history</h2>
            <Users size={16} className="ref-section-ico" aria-hidden />
          </div>

          {history.length === 0 ? (
            <div className="ref-empty">
              <Gift size={22} strokeWidth={1.8} />
              <strong>No referrals yet</strong>
              <p>Share your code or link. New sign-ups with your code appear here.</p>
            </div>
          ) : (
            <ul className="ref-history">
              {history.map((row) => (
                <li key={row.id}>
                  <div className="ref-hist-main">
                    <strong>{row.username}</strong>
                    <small>{row.email}</small>
                    <span className="ref-hist-date">Joined {row.joinedAt}</span>
                  </div>
                  <div className="ref-hist-side">
                    <span className={`ref-badge ${row.status}`}>
                      {row.status === 'successful'
                        ? 'Successful'
                        : row.status === 'flagged'
                          ? 'Flagged'
                          : 'Pending'}
                    </span>
                    {row.note ? <small>{row.note}</small> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {toast && (
        <div className="ref-toast" role="status">
          <Check size={14} strokeWidth={2.5} /> {toast}
        </div>
      )}
    </div>
  );
}
