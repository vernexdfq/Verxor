'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Loader2,
  LogOut,
  Timer,
  Wallet,
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
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const generate = async () => {
    setGenError('');
    const n = Math.round(Number(amount));
    if (!Number.isFinite(n) || n < 1) {
      setGenError('Enter the amount you want to fund.');
      return;
    }
    setGenerating(true);
    try {
      const tokens = loadSessionTokens();
      const profile = loadSessionProfile();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;
      const res = await fetch('/api/v1/partner/fund/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amountNgn: n,
          userId: profile?.userId || '',
          email: session.email || profile?.email || '',
          phone: session.contact || profile?.contact || '',
          name: session.name || profile?.name || 'Partner',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setGenError(data.message || data.error || 'Could not generate account.');
        return;
      }
      const a = data.account;
      setLiveAccount({
        bankName: a.bankName || 'OPay',
        accountNumber: String(a.accountNumber || ''),
        accountName: String(a.accountName || ''),
        amountNgn: Number(a.amountNgn) || n,
        expireAt: a.expireAt || null,
      });
    } catch {
      setGenError('Network error. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fund-root" style={{ minHeight: '100dvh', background: '#F8FAFC' }}>
      <div className="fund-body" style={{ maxWidth: 430, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 600 }}>Partner wallet</p>
            <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Fund Wallet</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 0,
              background: 'transparent',
              color: '#64748B',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} /> Log out
          </button>
        </div>

        <div
          style={{
            background: '#0F172A',
            borderRadius: 14,
            padding: '18px 16px',
            color: '#fff',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.8, fontSize: 13 }}>
            <Wallet size={16} /> Available balance
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 800 }}>
            ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>Wholesale · reseller wallet only</p>
        </div>

        {!liveAccount ? (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
              AMOUNT (₦)
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 14,
                border: '1.5px solid #E2E8F0',
                padding: '0 14px',
                fontSize: 16,
                fontWeight: 600,
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            {genError ? (
              <p style={{ color: '#DC2626', fontSize: 13, fontWeight: 600, margin: '0 0 10px' }}>{genError}</p>
            ) : null}
            <button
              type="button"
              disabled={generating}
              onClick={generate}
              style={{
                width: '100%',
                height: 52,
                border: 0,
                borderRadius: 14,
                background: '#2563EB',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                cursor: generating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={18} /> Generating…
                </>
              ) : (
                'Generate OPay Account'
              )}
            </button>
          </>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1.5px solid #E2E8F0',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Building2 size={18} color="#2563EB" />
              <strong style={{ fontSize: 15 }}>Transfer details</strong>
            </div>
            {[
              { k: 'bank', label: 'BANK NAME', value: liveAccount.bankName },
              { k: 'number', label: 'ACCOUNT NUMBER', value: liveAccount.accountNumber },
              { k: 'name', label: 'ACCOUNT NAME', value: liveAccount.accountName },
            ].map((row) => (
              <div
                key={row.k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{row.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{row.value}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(row.k, row.value)}
                  style={{
                    border: 0,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {copied === row.k ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied === row.k ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13 }}>
              <Timer size={14} />
              {msLeft != null ? (
                <span>
                  Expires in <strong>{formatCountdown(msLeft)}</strong>
                </span>
              ) : (
                <span>Transfer exact amount ₦{liveAccount.amountNgn.toLocaleString('en-NG')}</span>
              )}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.45 }}>
              Transfer <strong>₦{liveAccount.amountNgn.toLocaleString('en-NG')}</strong> to this account.
              Your partner wallet credits automatically. ₦0 fee on this deposit.
            </p>
            <button
              type="button"
              onClick={() => {
                setLiveAccount(null);
                setAmount('');
                void refreshBalance();
              }}
              style={{
                marginTop: 14,
                width: '100%',
                height: 44,
                border: '1.5px solid #E2E8F0',
                borderRadius: 12,
                background: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Generate new amount
            </button>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
            HOW TO FUND YOUR PARTNER WALLET
          </h3>
          <ol style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
            <li>Enter the amount and generate an OPay account.</li>
            <li>Transfer the exact amount from your bank or OPay app.</li>
            <li>Partner balance updates automatically after payment is confirmed.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
