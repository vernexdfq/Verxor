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
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { formatHomeBalance } from './lib/wallet-ui';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, loadSessionProfile, saveSessionTokens, saveSessionProfile } from './auth/session-unlock';
import './fund-page.css';

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

type LiveAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountNgn: number;
  expireAt: string | null;
};

type FundPageProps = {
  session?: AuthSession | null;
};

/** Flat fee deducted from every successful deposit (covers gateway %) */
const FUNDING_FEE_NGN = 20;

async function resolveAuthContext(session?: AuthSession | null) {
  const profile = loadSessionProfile();
  let accessToken = loadSessionTokens()?.access_token || '';
  let userId = profile?.userId || '';
  let email = session?.email || profile?.email || '';
  let phone = session?.contact || profile?.contact || '';
  let name = session?.name || profile?.name || '';

  try {
    const { getSupabaseBrowser } = await import('../lib/supabase/client');
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb.auth.getSession();
      const s = data.session;
      if (s?.access_token) {
        accessToken = s.access_token;
        saveSessionTokens({
          access_token: s.access_token,
          refresh_token: s.refresh_token || undefined,
        });
      }
      if (s?.user?.id) {
        userId = s.user.id;
        if (s.user.email) email = s.user.email;
        saveSessionProfile({
          name: name || 'User',
          contact: phone || '',
          email,
          method: (profile?.method || session?.method || 'phone') as 'phone' | 'email',
          phoneCountry: profile?.phoneCountry || session?.phoneCountry || 'NG',
          dialCode: profile?.dialCode || session?.dialCode || '234',
          homeCurrency: profile?.homeCurrency || session?.homeCurrency || 'NGN',
          vtuEligible: profile?.vtuEligible ?? session?.vtuEligible ?? true,
          balanceNgn: session?.balanceNgn ?? profile?.balanceNgn ?? 0,
          balanceUsd: session?.balanceUsd ?? profile?.balanceUsd ?? 0,
          userId,
        });
      }
    }
  } catch {
    /* ignore */
  }

  return { accessToken, userId, email, phone, name };
}

function parseExpireMs(expireAt: string | null): number | null {
  if (!expireAt) return null;
  // XixaPay: "2026-10-15 17:14:13" (treat as local/WAT wall clock)
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

export function FundPage({ session }: FundPageProps) {
  const homeCurrency = session?.homeCurrency === 'USD' ? 'USD' : 'NGN';
  const balance = formatHomeBalance(
    session?.balanceNgn ?? 0,
    session?.balanceUsd ?? 0,
    homeCurrency,
  );

  const [providers, setProviders] = useState<FundingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>('opay');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [amount, setAmount] = useState('1000');
  const [liveAccount, setLiveAccount] = useState<LiveAccount | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expireMs = liveAccount ? parseExpireMs(liveAccount.expireAt) : null;
  const msLeft = expireMs != null ? expireMs - now : null;
  const isExpired = msLeft != null && msLeft <= 0;

  // Clear expired account so user must generate a new one
  useEffect(() => {
    if (isExpired && liveAccount) {
      setLiveAccount(null);
    }
  }, [isExpired, liveAccount]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await resolveAuthContext(session);
      const qs = ctx.userId ? `?userId=${encodeURIComponent(ctx.userId)}` : '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;
      const res = await fetch(`/api/v1/funding/methods${qs}`, {
        cache: 'no-store',
        headers,
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
          return list.find((p) => p.id === 'opay')?.id ?? list[0]?.id ?? null;
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
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = providers.find((p) => p.id === activeId) ?? providers[0] ?? null;
  const showAccount = Boolean(liveAccount && !isExpired);

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
    // User should transfer amt + fee so net credit = amt after fee, OR transfer amt and net = amt - fee
    // Product rule: transfer exact amount shown; fee deducted from deposit → net = amount - 20
    setGenerating(true);
    setGenError('');
    try {
      const ctx = await resolveAuthContext(session);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;

      const res = await fetch('/api/v1/funding/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          providerId: active.id,
          amountNgn: amt,
          userId: ctx.userId || undefined,
          email: ctx.email || undefined,
          phone: ctx.phone || undefined,
          contact: ctx.phone || undefined,
          name: ctx.name || undefined,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          account?: LiveAccount;
        };
        if (data.account?.accountNumber) {
          setLiveAccount({
            bankName: data.account.bankName,
            accountNumber: data.account.accountNumber,
            accountName: data.account.accountName,
            amountNgn: data.account.amountNgn || amt,
            expireAt: data.account.expireAt || null,
          });
        }
      } else {
        let msg = 'Could not generate account. Please try again.';
        if (res) {
          try {
            const body = (await res.json()) as { message?: string };
            if (body?.message) msg = body.message;
          } catch {
            if (res.status >= 500) msg = 'Payment provider error. Try again in a moment.';
          }
        }
        setGenError(msg);
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

        <div className="fund-fee">
          <AlertTriangle size={18} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
          <p>
            A fee of <strong>₦{FUNDING_FEE_NGN}</strong> will be deducted from your deposit.
          </p>
        </div>

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

            {showAccount && liveAccount ? (
              <div className="fund-account-card">
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Wallet size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">TRANSFER EXACTLY</span>
                    <strong>₦{Number(liveAccount.amountNgn).toLocaleString()}</strong>
                  </div>
                </div>
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
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('bank', liveAccount.bankName)}
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
                    <strong className="fund-mono">{liveAccount.accountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('number', liveAccount.accountNumber)}
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
                    <strong>{liveAccount.accountName}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('name', liveAccount.accountName)}
                  >
                    {copied === 'name' ? 'Copied' : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <button
                    type="button"
                    className="fund-generate fund-generate--ready"
                    style={{ maxWidth: '100%' }}
                    onClick={() => {
                      setLiveAccount(null);
                      setGenError('');
                    }}
                  >
                    Generate new amount
                  </button>
                </div>
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
                  Enter the amount to fund, generate a one-time account, and transfer the exact
                  amount before it expires. ₦{FUNDING_FEE_NGN} fee is deducted; the rest credits your
                  wallet automatically.
                </p>

                <label
                  className="fund-amount-label"
                  style={{ display: 'block', width: '100%', marginBottom: 10, textAlign: 'left' }}
                >
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
            <p>Enter the amount and generate a one-time OPay account.</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>Transfer the exact amount before the countdown expires.</p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>
              ₦{FUNDING_FEE_NGN} fee is deducted; the rest credits your wallet automatically.
            </p>
          </li>
        </ol>
      </section>

      <div className="fund-secure">
        <Shield size={18} strokeWidth={2.2} />
        <p>
          <strong>Instant & Secure:</strong> One-time accounts expire after use or timeout. Your
          balance updates within seconds of a successful transfer.
        </p>
      </div>
    </div>
  );
}
