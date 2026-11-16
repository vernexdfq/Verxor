'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Bitcoin,
} from 'lucide-react';
import { formatHomeBalance } from './lib/wallet-ui';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens, loadSessionProfile, saveSessionTokens, saveSessionProfile } from './auth/session-unlock';
import './fund-page.css';

export type FundingProvider = {
  id: string;
  label: string;
  kind: 'static' | 'dynamic';
  feeLabel: string;
};

type LiveAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountNgn: number | null;
  amountToSend: number | null;
  feeNgn: number | null;
  feeNote: string | null;
  accountType: 'static' | 'dynamic';
  expireAt: string | null;
  providerId: string;
};

type FundPageProps = {
  session?: AuthSession | null;
};

const BANK_PROVIDERS: FundingProvider[] = [
  { id: '9psb', label: '9PSB', kind: 'static', feeLabel: 'Charge: ₦50' },
  { id: 'opay', label: 'OPay', kind: 'dynamic', feeLabel: '1% fee (exact on generate)' },
  { id: 'palmpay', label: 'PalmPay', kind: 'dynamic', feeLabel: '1% fee (exact on generate)' },
];

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

  const [method, setMethod] = useState<'bank' | 'crypto'>('bank');
  const [activeId, setActiveId] = useState<string>('opay');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [amount, setAmount] = useState('');
  const [liveAccount, setLiveAccount] = useState<LiveAccount | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const active = useMemo(
    () => BANK_PROVIDERS.find((p) => p.id === activeId) ?? BANK_PROVIDERS[1],
    [activeId],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setLiveAccount(null);
    setGenError('');
    setAmount('');
  }, [activeId, method]);

  const expireMs = liveAccount ? parseExpireMs(liveAccount.expireAt) : null;
  const msLeft = expireMs != null ? expireMs - now : null;
  const isExpired = msLeft != null && msLeft <= 0;

  useEffect(() => {
    if (isExpired && liveAccount?.accountType === 'dynamic') {
      setLiveAccount(null);
    }
  }, [isExpired, liveAccount]);

  const showAccount = Boolean(liveAccount && !(liveAccount.accountType === 'dynamic' && isExpired));

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

    const needsAmount = active.kind === 'dynamic';
    const amt = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (needsAmount && (!Number.isFinite(amt) || amt < 1)) {
      setGenError('Enter the amount you want credited to your wallet');
      return;
    }

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
          amountNgn: needsAmount ? amt : undefined,
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
            amountNgn: data.account.amountNgn ?? (needsAmount ? amt : null),
            amountToSend: data.account.amountToSend ?? null,
            feeNgn: data.account.feeNgn ?? null,
            feeNote: data.account.feeNote ?? null,
            accountType: data.account.accountType || active.kind,
            expireAt: data.account.expireAt || null,
            providerId: data.account.providerId || active.id,
          });
        } else {
          setGenError('Could not generate account. Please try again.');
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

      <div className="fund-method-tabs" role="tablist" aria-label="Funding method">
        <button
          type="button"
          role="tab"
          aria-selected={method === 'bank'}
          className={method === 'bank' ? 'active' : ''}
          onClick={() => setMethod('bank')}
        >
          <Landmark size={16} /> Bank transfer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === 'crypto'}
          className={method === 'crypto' ? 'active' : ''}
          onClick={() => setMethod('crypto')}
        >
          <Bitcoin size={16} /> Crypto
        </button>
      </div>

      {method === 'crypto' ? (
        <section className="fund-empty-va" aria-label="Crypto funding">
          <div className="fund-empty-icon">
            <Bitcoin size={28} strokeWidth={1.8} />
          </div>
          <strong>Fund with crypto</strong>
          <p>
            USDT, USDC and more via NowPayments. Crypto checkout is next — bank transfer is ready
            now.
          </p>
          <button type="button" className="fund-generate fund-generate--soon" disabled>
            Coming next
          </button>
        </section>
      ) : (
        <section className="fund-transfer" aria-label="Fund via bank transfer">
          <h2 className="fund-section-title">
            <Landmark size={18} strokeWidth={2.2} /> Fund via Bank Transfer
          </h2>

          <div className="fund-tabs" role="tablist" aria-label="Funding banks">
            {BANK_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activeId === p.id}
                className={activeId === p.id ? 'active' : ''}
                onClick={() => setActiveId(p.id)}
              >
                <span className="fund-tab-dot" aria-hidden />
                {p.label}
              </button>
            ))}
          </div>

          <div className="fund-fee" role="note">
            <p>
              <strong>{active.label}:</strong> {active.feeLabel}. The fee is paid by you to the
              provider — not absorbed by Verxor.
            </p>
          </div>

          {showAccount && liveAccount ? (
            <div className="fund-account-card">
              {liveAccount.accountType === 'dynamic' && msLeft != null && msLeft > 0 ? (
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

              {liveAccount.amountToSend != null ? (
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Wallet size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">AMOUNT TO SEND</span>
                    <strong className="fund-mono">
                      ₦{Number(liveAccount.amountToSend).toLocaleString()}
                    </strong>
                    {liveAccount.feeNote ? (
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                        {liveAccount.feeNote}
                        {liveAccount.amountNgn != null
                          ? ` · Wallet credit ₦${Number(liveAccount.amountNgn).toLocaleString()}`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() =>
                      void copy('amount', String(Math.round(Number(liveAccount.amountToSend))))
                    }
                  >
                    {copied === 'amount' ? 'Copied' : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
              ) : liveAccount.feeNgn != null ? (
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Wallet size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">FEE</span>
                    <strong>₦{Number(liveAccount.feeNgn).toLocaleString()} flat per deposit</strong>
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

              <div
                style={{
                  padding: '10px 14px 4px',
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 1.45,
                }}
              >
                {liveAccount.accountType === 'static' ? (
                  <>
                    Transfer any amount to this account. A{' '}
                    <strong>₦{Number(liveAccount.feeNgn || 50).toLocaleString()}</strong> fee is
                    deducted; the rest credits your wallet automatically.
                  </>
                ) : (
                  <>
                    Transfer{' '}
                    <strong>
                      ₦
                      {Number(
                        liveAccount.amountToSend ?? liveAccount.amountNgn ?? 0,
                      ).toLocaleString()}
                    </strong>{' '}
                    exactly. Your wallet is credited after the bank confirms.
                  </>
                )}
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
                  {liveAccount.accountType === 'static' ? 'Done' : 'Generate new amount'}
                </button>
              </div>
            </div>
          ) : (
            <div className="fund-empty-va">
              <div className="fund-empty-icon">
                <Wallet size={28} strokeWidth={1.8} />
              </div>
              <strong>
                {active.kind === 'static'
                  ? `Get ${active.label} account`
                  : `Generate ${active.label} account`}
              </strong>
              <p>
                {active.kind === 'static'
                  ? `Permanent ${active.label} account. Transfer anytime; ₦50 fee per deposit.`
                  : `Enter the amount you want in your wallet. We show the exact amount to send (fee included).`}
              </p>

              {active.kind === 'dynamic' ? (
                <label
                  className="fund-amount-label"
                  style={{ display: 'block', width: '100%', marginBottom: 10, textAlign: 'left' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                    WALLET AMOUNT (₦)
                  </span>
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
              ) : null}

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
                    <Plus size={18} strokeWidth={2.5} />{' '}
                    {active.kind === 'static'
                      ? `Generate ${active.label} Account`
                      : `Generate ${active.label} Account`}
                  </>
                )}
              </button>
              {genError ? <p className="fund-gen-error">{genError}</p> : null}
            </div>
          )}
        </section>
      )}

      <section className="fund-steps" aria-label="How to fund">
        <h3 className="fund-steps-title">HOW TO FUND YOUR WALLET</h3>
        <ol>
          <li>
            <span className="fund-step-num">1</span>
            <p>Choose Bank transfer or Crypto, then pick a bank.</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>
              For OPay/PalmPay enter wallet amount and transfer the <strong>Amount to send</strong>.
              For 9PSB transfer any amount (₦50 fee).
            </p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>Wallet credits automatically after the bank confirms.</p>
          </li>
        </ol>
      </section>

      <div className="fund-secure">
        <Shield size={18} strokeWidth={2.2} />
        <p>
          <strong>Instant & Secure:</strong> Provider fees are shown up front. Credits apply after
          confirmation.
        </p>
      </div>
    </div>
  );
}
