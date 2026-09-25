'use client';

import { useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Hash,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import './fund-page.css';

const wallet = { amount: '0.27', symbol: '₦' };

/** Placeholder virtual accounts — replace with API/DB when Payvessel/Monnify is live */
const BANKS = [
  {
    id: 'paga',
    label: 'Paga',
    bankName: 'Paga',
    accountNumber: '1535390381',
    accountName: 'Denny Kay',
  },
  {
    id: 'palmpay',
    label: 'Palmpay',
    bankName: 'PalmPay',
    accountNumber: '9012345678',
    accountName: 'Denny Kay',
  },
] as const;

const STEPS = [
  'Select a bank and generate your virtual account (one-time).',
  'Copy the account number and open your banking app.',
  'Transfer any amount to the account details shown above.',
  'Your wallet is credited automatically within seconds.',
];

export function FundPage() {
  const [bankId, setBankId] = useState<(typeof BANKS)[number]['id']>('paga');
  const [copied, setCopied] = useState<string | null>(null);

  const bank = BANKS.find((b) => b.id === bankId) ?? BANKS[0];

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="fund-page">
      <section className="fund-balance" aria-label="Wallet balance">
        <span className="fund-balance-label">WALLET BALANCE</span>
        <strong className="fund-balance-amount">
          {wallet.symbol}
          {wallet.amount}
        </strong>
        <span className="fund-balance-ok">
          <Check size={14} strokeWidth={2.5} /> Available for transactions
        </span>
      </section>

      <section className="fund-section">
        <h2 className="fund-section-title">
          <Building2 size={18} strokeWidth={2} />
          Fund via Bank Transfer
        </h2>

        <div className="fund-fee" role="note">
          <span aria-hidden>⚠️</span>
          <p>A fee of ₦50 will be deducted from your deposit.</p>
        </div>

        <div className="fund-tabs" role="tablist" aria-label="Bank providers">
          {BANKS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={bankId === b.id}
              className={bankId === b.id ? 'fund-tab active' : 'fund-tab'}
              onClick={() => setBankId(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="fund-account-card">
          <div className="fund-row">
            <span className="fund-row-icon">
              <Building2 size={18} />
            </span>
            <div className="fund-row-copy">
              <span className="fund-row-label">BANK NAME</span>
              <strong>{bank.bankName}</strong>
            </div>
            <button type="button" className="fund-copy" onClick={() => copy('bank', bank.bankName)}>
              <Copy size={14} />
              {copied === 'bank' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="fund-row">
            <span className="fund-row-icon">
              <Hash size={18} />
            </span>
            <div className="fund-row-copy">
              <span className="fund-row-label">ACCOUNT NUMBER</span>
              <strong className="fund-mono">{bank.accountNumber}</strong>
            </div>
            <button
              type="button"
              className="fund-copy"
              onClick={() => copy('number', bank.accountNumber)}
            >
              <Copy size={14} />
              {copied === 'number' ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="fund-row">
            <span className="fund-row-icon">
              <UserRound size={18} />
            </span>
            <div className="fund-row-copy">
              <span className="fund-row-label">ACCOUNT NAME</span>
              <strong>{bank.accountName}</strong>
            </div>
            <button
              type="button"
              className="fund-copy"
              onClick={() => copy('name', bank.accountName)}
            >
              <Copy size={14} />
              {copied === 'name' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      <section className="fund-steps" aria-label="How to fund">
        <h3 className="fund-steps-title">HOW TO FUND YOUR WALLET</h3>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step}>
              <span className="fund-step-num">{i + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="fund-secure">
        <ShieldCheck size={18} />
        <p>
          <strong>Instant & Secure:</strong> Transfers are processed automatically. Your balance updates
          within seconds of a successful transfer.
        </p>
      </div>
    </div>
  );
}
