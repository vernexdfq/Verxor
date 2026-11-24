'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Link2,
  Loader2,
  RefreshCw,
  Share2,
  Users,
  Wallet,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens } from './auth/session-unlock';
import './referral-page.css';

type ReferralData = {
  ok?: boolean;
  code?: string;
  link?: string | null;
  totals?: { invited: number; rewarded: number; pending: number; earnedNgn: number };
  entries?: Array<{
    name: string;
    status: 'rewarded' | 'pending';
    firstDepositNgn: number | null;
    rewardNgn: number | null;
    rewardedAt: string | null;
    invitedAt: string;
  }>;
  note?: string;
  error?: string;
};

function naira(n: number | null | undefined): string {
  const v = Number(n || 0);
  return `₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReferralPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session: AuthSession;
}) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = loadSessionTokens()?.access_token || '';
      const res = await fetch('/api/me/referral', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const body = (await res.json()) as ReferralData;
      if (res.ok && body.ok) {
        setData(body);
      } else {
        setError(body.error || 'Could not load your referral data.');
      }
    } catch {
      setError('Network error. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const code = data?.code || '';
  const link = data?.link || '';
  const totals = data?.totals || { invited: 0, rewarded: 0, pending: 0, earnedNgn: 0 };
  const entries = data?.entries || [];

  const copy = async (what: 'code' | 'link') => {
    const text = what === 'code' ? code : link;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setToast(what === 'code' ? 'Referral code copied' : 'Invite link copied');
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setToast('Could not copy — long-press to copy manually');
    }
  };

  const share = async () => {
    const text = `Join me on Verxor — buy virtual numbers, OTPs and digital services. Use my referral code ${code} and we both win: ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Verxor', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast('Invite message copied — paste it anywhere');
    } catch {
      /* user dismissed share sheet */
    }
  };

  const whatsapp = () => {
    const text = encodeURIComponent(
      `Join me on Verxor — virtual numbers, OTPs and digital services. Use my referral code ${code}: ${link}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div className="refp">
      <header className="refp-top">
        <button type="button" className="refp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="refp-top-mid">
          <h1>Refer &amp; Earn</h1>
          <p>10% of each invitee's first deposit</p>
        </div>
        <span className="refp-top-spacer" />
      </header>

      <div className="refp-scroll">
        {loading ? (
          <div className="refp-loading">
            <Loader2 size={22} className="refp-spin" />
            <span>Loading your referral data…</span>
          </div>
        ) : error ? (
          <div className="refp-error-card">
            <strong>Could not load referral data</strong>
            <p>{error}</p>
            <button type="button" className="refp-retry" onClick={load}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Earnings hero */}
            <section className="refp-hero">
              <span className="refp-hero-label">
                <Wallet size={14} /> TOTAL REFERRAL EARNINGS
              </span>
              <strong>{naira(totals.earnedNgn)}</strong>
              <em>Credited straight to your wallet, instantly</em>
            </section>

            {/* Stats */}
            <div className="refp-stats">
              <div className="refp-stat">
                <span><Users size={13} /> INVITED</span>
                <strong>{totals.invited}</strong>
              </div>
              <div className="refp-stat">
                <span><Check size={13} /> REWARDED</span>
                <strong>{totals.rewarded}</strong>
              </div>
              <div className="refp-stat">
                <span><Gift size={13} /> PENDING</span>
                <strong>{totals.pending}</strong>
              </div>
            </div>

            {/* Code + link */}
            <section className="refp-card">
              <h2>YOUR INVITE</h2>

              <div className="refp-row">
                <div className="refp-row-copy">
                  <small>Referral code</small>
                  <strong>{code || 'Generating…'}</strong>
                </div>
                <button
                  type="button"
                  className="refp-copy-btn"
                  onClick={() => copy('code')}
                  aria-label="Copy referral code"
                  disabled={!code}
                >
                  {copied === 'code' ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>

              <div className="refp-row">
                <div className="refp-row-copy">
                  <small>Invite link</small>
                  <strong className="refp-link-text">{link || 'Generating…'}</strong>
                </div>
                <button
                  type="button"
                  className="refp-copy-btn"
                  onClick={() => copy('link')}
                  aria-label="Copy invite link"
                  disabled={!link}
                >
                  {copied === 'link' ? <Check size={15} /> : <Link2 size={15} />}
                </button>
              </div>

              <p className="refp-note">
                Rewards are credited instantly when your invited user makes their first
                successful deposit — 10% of that deposit, once per user.
              </p>

              <div className="refp-actions">
                <button type="button" className="refp-share" onClick={share}>
                  <Share2 size={15} /> Share link
                </button>
                <button type="button" className="refp-wa" onClick={whatsapp}>
                  <Gift size={15} /> WhatsApp
                </button>
              </div>
            </section>

            {/* History */}
            <section className="refp-card">
              <h2>REFERRAL HISTORY</h2>
              {entries.length === 0 ? (
                <div className="refp-empty">
                  <Gift size={22} />
                  <strong>No referrals yet</strong>
                  <p>Share your code or link. New sign-ups with your code appear here.</p>
                </div>
              ) : (
                <div className="refp-list">
                  {entries.map((e, i) => (
                    <div className="refp-entry" key={`${e.invitedAt}-${i}`}>
                      <div className="refp-entry-icon">{e.name.charAt(0).toUpperCase()}</div>
                      <div className="refp-entry-copy">
                        <strong>{e.name}</strong>
                        <small>
                          {e.status === 'rewarded'
                            ? `First deposit ${naira(e.firstDepositNgn)} · paid ${naira(e.rewardNgn)}`
                            : 'Joined — waiting for first deposit'}
                        </small>
                      </div>
                      <span className={`refp-badge ${e.status}`}>
                        {e.status === 'rewarded' ? `+${naira(e.rewardNgn)}` : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {toast && (
        <div className="refp-toast" role="status">
          <Check size={14} strokeWidth={2.5} /> {toast}
        </div>
      )}
    </div>
  );
}
