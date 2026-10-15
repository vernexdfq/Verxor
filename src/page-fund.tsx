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

type FundPageProps = {
  session?: AuthSession | null;
};

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
  const [liveAccount, setLiveAccount] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null>(null);

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
          const opay = list.find((p) => p.id === 'opay');
          return opay?.id ?? list[0]?.id ?? null;
        });
        // Prefill existing VA if methods already returned one
        const withAcct = list.find((p) => p.hasAccount && p.accountNumber);
        if (withAcct && withAcct.accountNumber) {
          setLiveAccount({
            bankName: withAcct.bankName || withAcct.label,
            accountNumber: withAcct.accountNumber,
            accountName: withAcct.accountName || session?.name || 'Verxor User',
          });
        }
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
    setGenerating(true);
    setGenError('');
    try {
      const ctx = await resolveAuthContext(session);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;

      // XixaPay dynamic requires an amount field; we do not lock the user to it.
      // Webhook credits whatever amount is actually paid, minus ₦20 fee.
      const res = await fetch('/api/v1/funding/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          providerId: active.id,
          amountNgn: 1000,
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
          account?: {
            bankName: string;
            accountNumber: string;
            accountName: string;
          };
        };
        if (data.account) {
          setLiveAccount({
            bankName: data.account.bankName,
            accountNumber: data.account.accountNumber,
            accountName: data.account.accountName,
          });
        }
        await load();
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

        {/* Fee notice — same pattern as reference fintech UIs */}
        <div
          className="fund-fee-banner"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#B45309',
            fontSize: 14,
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          <AlertTriangle size={18} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            A fee of <strong>₦{FUNDING_FEE_NGN}</strong> will be deducted from your deposit.
          </span>
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
                  Generate your funding account, then transfer any amount from your bank app. Your
                  wallet is credited automatically (₦{FUNDING_FEE_NGN} fee applies).
                </p>

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
            <p>Generate your OPay funding account and copy the details.</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>Transfer any amount from your banking app to that account.</p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>A fee of ₦{FUNDING_FEE_NGN} is deducted; the rest credits your wallet automatically.</p>
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
