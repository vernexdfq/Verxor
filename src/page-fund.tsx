'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Copy,
  Landmark,
  Loader2,
  Plus,
  Shield,
  Wallet,
} from 'lucide-react';
import { formatHomeBalance } from './lib/wallet-ui';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';
import './fund-page.css';

/** Provider option from /api/v1/funding/methods */
export type FundingProvider = {
  id: string;
  label: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  feeNote?: string;
  hasAccount?: boolean;
  amountNgn?: number;
};

type FundPageProps = {
  session?: AuthSession | null;
};

function authHeaders(): HeadersInit {
  const tokens = loadSessionTokens();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tokens?.access_token) h.Authorization = `Bearer ${tokens.access_token}`;
  return h;
}

export function FundPage({ session }: FundPageProps) {
  const homeCurrency = session?.homeCurrency === 'USD' ? 'USD' : 'NGN';
  const balance = formatHomeBalance(
    session?.balanceNgn ?? 0,
    session?.balanceUsd ?? 0,
    homeCurrency,
  );

  const [providers, setProviders] = useState<FundingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [amount, setAmount] = useState('1000');
  const [liveAccount, setLiveAccount] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    amountNgn: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = loadSessionProfile();
      const qs = profile?.userId ? `?userId=${encodeURIComponent(profile.userId)}` : '';
      const res = await fetch(`/api/v1/funding/methods${qs}`, {
        cache: 'no-store',
        headers: authHeaders(),
      }).catch(() => null);
      if (res && res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          banks?: FundingProvider[];
          providers?: FundingProvider[];
        };
        const list = Array.isArray(data.providers)
          ? data.providers
          : Array.isArray(data.banks)
            ? data.banks
            : [];
        setProviders(list);
        setActiveId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } else {
        setProviders([]);
        setActiveId(null);
      }
    } catch {
      setProviders([]);
      setActiveId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = providers.find((p) => p.id === activeId) ?? providers[0] ?? null;
  const hasAccount = Boolean(
    liveAccount ||
      (active && active.hasAccount && active.accountNumber && active.bankName),
  );

  const displayAccount = liveAccount
    ? liveAccount
    : active && active.hasAccount
      ? {
          bankName: active.bankName || active.label,
          accountNumber: active.accountNumber || '',
          accountName: active.accountName || session?.name || 'Verxor User',
          amountNgn: active.amountNgn || 0,
        }
      : null;

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
    if (!active || generating) return;
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amt) || amt < 100) {
      setGenError('Enter an amount of at least ₦100');
      return;
    }
    setGenerating(true);
    setGenError('');
    try {
      const profile = loadSessionProfile();
      const res = await fetch('/api/v1/funding/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          providerId: active.id,
          amountNgn: amt,
          userId: profile?.userId,
          email: session?.email || profile?.email,
          phone: session?.contact || profile?.contact,
          name: session?.name || profile?.name,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          account?: {
            bankName: string;
            accountNumber: string;
            accountName: string;
            amountNgn: number;
          };
        };
        if (data.account) {
          setLiveAccount(data.account);
        }
        await load();
      } else {
        const body = res ? await res.json().catch(() => null) : null;
        setGenError(
          (body && typeof body.message === 'string' && body.message) ||
            'Could not generate account. Please try again.',
        );
      }
    } catch {
      setGenError('Could not generate account. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fund-page">
      <header className="fund-head">
        <h1>Fund Wallet</h1>
        <p>Add money to your balance</p>
      </header>

      <section className="fund-balance" aria-label="Wallet balance">
        <span className="fund-balance-label">WALLET BALANCE</span>
        <strong className="fund-balance-amount">
          {balance.symbol}
          {balance.amount}
        </strong>
        <span className="fund-balance-ok">
          <CheckCircle2 size={14} strokeWidth={2.5} /> Available for transactions
        </span>
      </section>

      <section className="fund-transfer" aria-label="Fund via bank transfer">
        <h2 className="fund-section-title">
          <Landmark size={18} strokeWidth={2.2} /> Fund via Bank Transfer
        </h2>

        {loading ? (
          <div className="fund-loading">
            <Loader2 size={22} className="fund-spin" />
            <p>Loading funding methods...</p>
          </div>
        ) : (
          <>
            {providers.length > 0 ? (
              <div className="fund-tabs" role="tablist" aria-label="Funding banks">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={activeId === p.id}
                    className={activeId === p.id ? 'active' : ''}
                    onClick={() => {
                      setActiveId(p.id);
                      setGenError('');
                      setLiveAccount(null);
                    }}
                  >
                    <span className="fund-tab-dot" aria-hidden />
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="fund-gen-error" style={{ marginBottom: 12 }}>
                Payment banks are loading or not configured yet.
              </p>
            )}

            {hasAccount && displayAccount ? (
              <div className="fund-account-card">
                {displayAccount.amountNgn > 0 && (
                  <div className="fund-row">
                    <div className="fund-row-icon">
                      <Wallet size={18} />
                    </div>
                    <div className="fund-row-copy">
                      <span className="fund-row-label">TRANSFER EXACTLY</span>
                      <strong>₦{Number(displayAccount.amountNgn).toLocaleString()}</strong>
                    </div>
                  </div>
                )}
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">BANK NAME</span>
                    <strong>{displayAccount.bankName}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('bank', displayAccount.bankName)}
                  >
                    {copied === 'bank' ? 'Copied' : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Wallet size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">ACCOUNT NUMBER</span>
                    <strong className="fund-mono">{displayAccount.accountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('number', displayAccount.accountNumber)}
                  >
                    {copied === 'number' ? 'Copied' : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">ACCOUNT NAME</span>
                    <strong>{displayAccount.accountName}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('name', displayAccount.accountName)}
                  >
                    {copied === 'name' ? 'Copied' : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <button
                  type="button"
                  className="fund-generate fund-generate--ready"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    setLiveAccount(null);
                    setGenError('');
                  }}
                >
                  Generate new amount
                </button>
              </div>
            ) : (
              <div className="fund-empty-va">
                <div className="fund-empty-icon">
                  {active ? <Wallet size={28} strokeWidth={1.8} /> : <Landmark size={28} strokeWidth={1.8} />}
                </div>
                <strong>
                  {active ? `Generate ${active.label} account` : 'No virtual account yet'}
                </strong>
                <p>
                  Enter how much you want to fund, then generate a one-time account. Transfer the
                  exact amount — your wallet credits automatically.
                </p>

                <label className="fund-amount-label" style={{ display: 'block', width: '100%', marginBottom: 10, textAlign: 'left' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>AMOUNT (₦)</span>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
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
                  className={`fund-generate ${active ? 'fund-generate--ready' : 'fund-generate--soon'}`}
                  disabled={!active || generating}
                  onClick={() => void generate()}
                >
                  {generating ? (
                    <>
                      <Loader2 size={18} className="fund-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={2.5} />
                      {active ? `Generate ${active.label} Account` : 'Generate Account'}
                    </>
                  )}
                </button>
                {genError ? <p className="fund-gen-error">{genError}</p> : null}
              </div>
            )}
          </>
        )}
      </section>

      <section className="fund-steps" aria-label="How to fund">
        <h3 className="fund-steps-title">HOW TO FUND YOUR WALLET</h3>
        <ol>
          <li>
            <span className="fund-step-num">1</span>
            <p>Select a bank and enter the amount you want to fund.</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>Generate your one-time virtual account and copy the details.</p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>Transfer the exact amount from your banking app.</p>
          </li>
          <li>
            <span className="fund-step-num">4</span>
            <p>Your wallet is credited automatically within seconds.</p>
          </li>
        </ol>
      </section>

      <div className="fund-secure">
        <Shield size={18} strokeWidth={2.2} />
        <p>
          <strong>Instant & Secure:</strong> Transfers are processed automatically. Your balance
          updates within seconds of a successful transfer.
        </p>
      </div>
    </div>
  );
}
