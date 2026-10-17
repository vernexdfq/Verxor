'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Landmark,
  Loader2,
  Plus,
  Shield,
  Wallet,
  Timer,
  LogOut,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';
import './fund-page.css';

type LiveAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountNgn: number;
  expireAt: string | null;
};

function parseExpireMs(expireAt: string | null): number | null {
  if (!expireAt) return null;
  const normalized = expireAt.includes('T') ? expireAt : expireAt.replace(' ', 'T');
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return 'Expired';
  const totalSec = Math.floor(msLeft / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PartnerFundPage({
  session,
  onLogout,
}: {
  session: AuthSession;
  onLogout: () => void;
}) {
  const [balance, setBalance] = useState(Number(session.balanceNgn) || 0);
  const [amount, setAmount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [liveAccount, setLiveAccount] = useState<LiveAccount | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshBalance = async () => {
    try {
      const tokens = loadSessionTokens();
      const profile = loadSessionProfile();
      const headers: Record<string, string> = {};
      if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;
      const qs = profile?.userId ? `?userId=${profile.userId}` : '';
      const res = await fetch(`/api/v1/partner/balance${qs}`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setBalance(Number(data.balanceNgn) || 0);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshBalance();
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshBalance();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const expireMs = liveAccount ? parseExpireMs(liveAccount.expireAt) : null;
  const msLeft = expireMs != null ? expireMs - now : null;
  const isExpired = msLeft != null && msLeft <= 0;

  useEffect(() => {
    if (isExpired && liveAccount) setLiveAccount(null);
  }, [isExpired, liveAccount]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  const generate = async () => {
    if (generating) return;
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt < 1) {
      setGenError('Enter the amount you want to fund');
      return;
    }
    setGenerating(true);
    setGenError('');
    try {
      const tokens = loadSessionTokens();
      const profile = loadSessionProfile();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;

      const res = await fetch('/api/v1/partner/fund/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amountNgn: amt,
          userId: profile?.userId,
          email: session.email || profile?.email,
          phone: session.contact || profile?.contact,
          name: session.name || profile?.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.account?.accountNumber) {
        setLiveAccount({
          bankName: data.account.bankName,
          accountNumber: data.account.accountNumber,
          accountName: data.account.accountName,
          amountNgn: data.account.amountNgn || amt,
          expireAt: data.account.expireAt || null,
        });
      } else {
        setGenError(data.message || 'Could not generate account. Please try again.');
      }
    } catch {
      setGenError('Could not generate account. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  const showAccount = Boolean(liveAccount && !isExpired);

  return (
    <div className="fund-page" style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh' }}>
      <header className="fund-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Partner Fund</h1>
          <p>Wholesale balance for your panel</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            border: '1px solid #E2E8F0',
            background: '#fff',
            borderRadius: 12,
            padding: '8px 10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: '#475569',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} /> Exit
        </button>
      </header>

      <section className="fund-balance" aria-label="Partner balance">
        <span className="fund-balance-label">PARTNER BALANCE</span>
        <strong className="fund-balance-amount">
          ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </strong>
        <span className="fund-balance-ok">
          <CheckCircle2 size={14} strokeWidth={2.5} /> Wholesale wallet only
        </span>
      </section>

      <section className="fund-transfer" aria-label="Fund via bank transfer">
        <h2 className="fund-section-title">
          <Landmark size={18} strokeWidth={2.2} /> Fund via Bank Transfer
        </h2>
        <div className="fund-tabs" role="tablist">
          <button type="button" role="tab" aria-selected className="active">
            <span className="fund-tab-dot" aria-hidden />
            OPay
          </button>
        </div>

        {showAccount && liveAccount ? (
          <div className="fund-account-card">
            {msLeft != null && msLeft > 0 ? (
              <div className="fund-row">
                <div className="fund-row-icon">
                  <Timer size={18} />
                </div>
                <div className="fund-row-copy">
                  <span className="fund-row-label">EXPIRES IN</span>
                  <strong style={{ color: msLeft < 60_000 ? '#dc2626' : '#0f172a' }}>
                    {formatCountdown(msLeft)}
                  </strong>
                </div>
              </div>
            ) : null}
            <div className="fund-row">
              <div className="fund-row-icon">
                <Building2 size={18} />
              </div>
              <div className="fund-row-copy">
                <span className="fund-row-label">BANK NAME</span>
                <strong>{liveAccount.bankName}</strong>
              </div>
              <button type="button" className="fund-copy" onClick={() => void copy('bank', liveAccount.bankName)}>
                {copied === 'bank' ? 'Copied' : (<><Copy size={12} /> Copy</>)}
              </button>
            </div>
            <div className="fund-row">
              <div className="fund-row-icon">
                <Wallet size={18} />
              </div>
              <div className="fund-row-copy">
                <span className="fund-row-label">ACCOUNT NUMBER</span>
                <strong className="fund-mono">{liveAccount.accountNumber}</strong>
              </div>
              <button type="button" className="fund-copy" onClick={() => void copy('number', liveAccount.accountNumber)}>
                {copied === 'number' ? 'Copied' : (<><Copy size={12} /> Copy</>)}
              </button>
            </div>
            <div className="fund-row">
              <div className="fund-row-icon">
                <CheckCircle2 size={18} />
              </div>
              <div className="fund-row-copy">
                <span className="fund-row-label">ACCOUNT NAME</span>
                <strong>{liveAccount.accountName}</strong>
              </div>
              <button type="button" className="fund-copy" onClick={() => void copy('name', liveAccount.accountName)}>
                {copied === 'name' ? 'Copied' : (<><Copy size={12} /> Copy</>)}
              </button>
            </div>
            <div style={{ padding: '10px 14px 4px', fontSize: 13, color: '#475569', lineHeight: 1.45 }}>
              Transfer <strong>₦{Number(liveAccount.amountNgn).toLocaleString()}</strong> to this account.
              Your <strong>partner</strong> balance will be credited automatically.
            </div>
            <div style={{ padding: '12px 14px 14px' }}>
              <button
                type="button"
                className="fund-generate fund-generate--ready"
                style={{ maxWidth: '100%' }}
                onClick={() => {
                  setLiveAccount(null);
                  setGenError('');
                  void refreshBalance();
                }}
              >
                Generate new amount
              </button>
            </div>
          </div>
        ) : (
          <div className="fund-empty-va">
            <div className="fund-empty-icon">
              <Wallet size={28} strokeWidth={1.8} />
            </div>
            <strong>Generate OPay account</strong>
            <p>
              Enter any amount, generate an account, then transfer that amount. Partner balance is
              credited when the bank confirms — separate from your retail wallet.
            </p>
            <label className="fund-amount-label" style={{ display: 'block', width: '100%', marginBottom: 10, textAlign: 'left' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>AMOUNT (₦)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500"
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              />
            </label>
            <button
              type="button"
              className="fund-generate fund-generate--ready"
              disabled={generating}
              onClick={() => void generate()}
            >
              {generating ? (
                <>
                  <Loader2 size={18} className="fund-spin" /> Generating...
                </>
              ) : (
                <>
                  <Plus size={18} strokeWidth={2.5} /> Generate OPay Account
                </>
              )}
            </button>
            {genError ? <p className="fund-gen-error">{genError}</p> : null}
          </div>
        )}
      </section>

      <section className="fund-steps" aria-label="How to fund">
        <h3 className="fund-steps-title">HOW TO FUND PARTNER BALANCE</h3>
        <ol>
          <li>
            <span className="fund-step-num">1</span>
            <p>Enter any amount and generate an account.</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>Transfer that amount to the bank name, account number and account name shown.</p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>Partner balance is credited automatically after confirmation (not retail wallet).</p>
          </li>
        </ol>
      </section>

      <div className="fund-secure">
        <Shield size={18} strokeWidth={2.2} />
        <p>
          <strong>Partner only:</strong> Money funded here stays in your partner wholesale balance
          and does not appear on the retail Fund page.
        </p>
      </div>
    </div>
  );
}
