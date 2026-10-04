'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';
import { formatHomeBalance } from './lib/wallet-ui';
import type { AuthSession } from './auth/AuthFlow';
import './fund-page.css';

export type FundingBank = {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  feeNote?: string;
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

  const [banks, setBanks] = useState<FundingBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/funding/methods', { cache: 'no-store' }).catch(() => null);
        if (cancelled) return;
        if (res && res.ok) {
          const data = (await res.json()) as { ok?: boolean; banks?: FundingBank[] };
          const list = Array.isArray(data.banks) ? data.banks : [];
          setBanks(list);
          setActiveId(list[0]?.id ?? null);
        } else {
          setBanks([]);
          setActiveId(null);
        }
      } catch {
        if (!cancelled) {
          setBanks([]);
          setActiveId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bank = banks.find((b) => b.id === activeId) ?? banks[0] ?? null;

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fund-page">
      <header className="fund-head">
        <h1>Fund wallet</h1>
        <p>Add money to your balance</p>
      </header>

      <section className="fund-balance" aria-label="Wallet balance">
        <span className="fund-balance-label">WALLET BALANCE</span>
        <strong className="fund-balance-amount">
          {balance.symbol}
          {balance.amount}
        </strong>
        <span className="fund-balance-ok">Your available balance</span>
      </section>

      <section className="fund-transfer" aria-label="Fund via bank transfer">
        <h2 className="fund-section-title">
          <Building2 size={18} /> Fund via Bank Transfer
        </h2>

        {loading ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            <Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite' }} />
            <p style={{ margin: '12px 0 0' }}>Loading funding methods...</p>
          </div>
        ) : banks.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              borderRadius: 14,
              border: '1px dashed #e2e8f0',
              background: '#f8fafc',
              textAlign: 'center',
            }}
          >
            <Building2 size={28} strokeWidth={1.5} color="#94a3b8" />
            <p style={{ margin: '12px 0 4px', fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
              Funding methods coming soon
            </p>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
              Bank accounts will appear here once your payment provider is connected. No static account
              numbers are shown.
            </p>
          </div>
        ) : (
          <>
            {bank?.feeNote ? <div className="fund-fee-note" role="status">{bank.feeNote}</div> : null}
            <div className="fund-tabs" role="tablist" aria-label="Funding banks">
              {banks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={activeId === b.id}
                  className={activeId === b.id ? 'active' : ''}
                  onClick={() => setActiveId(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {bank ? (
              <div className="fund-account-card">
                <div className="fund-row">
                  <div className="fund-row-copy">
                    <span className="fund-row-label">BANK NAME</span>
                    <strong>{bank.bankName}</strong>
                  </div>
                  <button type="button" className="fund-copy" onClick={() => void copy('bank', bank.bankName)}>
                    {copied === 'bank' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="fund-row">
                  <div className="fund-row-copy">
                    <span className="fund-row-label">ACCOUNT NUMBER</span>
                    <strong className="fund-mono">{bank.accountNumber}</strong>
                  </div>
                  <button type="button" className="fund-copy" onClick={() => void copy('number', bank.accountNumber)}>
                    {copied === 'number' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="fund-row">
                  <div className="fund-row-copy">
                    <span className="fund-row-label">ACCOUNT NAME</span>
                    <strong>{bank.accountName}</strong>
                  </div>
                  <button type="button" className="fund-copy" onClick={() => void copy('name', bank.accountName)}>
                    {copied === 'name' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      <div className="fund-secure">
        <ShieldCheck size={18} />
        <p>
          <strong>Secure:</strong> When funding is live, transfers credit your wallet after confirmation from
          the payment provider.
        </p>
      </div>
    </div>
  );
}
