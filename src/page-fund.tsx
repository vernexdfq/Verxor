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
import './fund-page.css';

/** Provider option from /api/v1/funding/methods (banks may or may not have a generated VA yet). */
export type FundingProvider = {
  id: string;
  label: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  feeNote?: string;
  /** true when user already has a virtual account for this provider */
  hasAccount?: boolean;
};

type FundPageProps = {
  session?: AuthSession | null;
};

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/funding/methods', { cache: 'no-store' }).catch(() => null);
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
    active && active.hasAccount && active.accountNumber && active.bankName,
  );

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
      const res = await fetch('/api/v1/funding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: active.id }),
      }).catch(() => null);

      if (res && res.ok) {
        await load();
      } else {
        const body = res ? await res.json().catch(() => null) : null;
        setGenError(
          (body && typeof body.message === 'string' && body.message) ||
            'Virtual accounts are not available yet. Connect a payment provider to enable this.',
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
            {active?.feeNote ? (
              <div className="fund-fee" role="status">
                <span aria-hidden>⚠</span>
                <p>{active.feeNote}</p>
              </div>
            ) : null}

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
            ) : null}

            {hasAccount && active ? (
              <div className="fund-account-card">
                <div className="fund-row">
                  <div className="fund-row-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="fund-row-copy">
                    <span className="fund-row-label">BANK NAME</span>
                    <strong>{active.bankName}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('bank', active.bankName || '')}
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
                    <strong className="fund-mono">{active.accountNumber}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('number', active.accountNumber || '')}
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
                    <strong>{active.accountName}</strong>
                  </div>
                  <button
                    type="button"
                    className="fund-copy"
                    onClick={() => void copy('name', active.accountName || '')}
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
                  {active ? `No ${active.label} Account` : 'No virtual account yet'}
                </strong>
                <p>
                  {active
                    ? `Generate a dedicated ${active.label} virtual account to fund your wallet instantly via bank transfer.`
                    : 'Connect a payment provider to generate a dedicated virtual account. Bank details will appear here — no static numbers are shown.'}
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
            <p>Select a bank and generate your virtual account (one-time).</p>
          </li>
          <li>
            <span className="fund-step-num">2</span>
            <p>Copy the account number and open your banking app.</p>
          </li>
          <li>
            <span className="fund-step-num">3</span>
            <p>Transfer any amount to the account details shown above.</p>
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
          <strong>Instant &amp; Secure:</strong> Transfers are processed automatically. Your balance
          updates within seconds of a successful transfer.
        </p>
      </div>
    </div>
  );
}
