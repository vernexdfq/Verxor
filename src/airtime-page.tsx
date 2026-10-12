'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Phone,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import './airtime-page.css';

const NETWORKS = [
  { id: 'mtn', label: 'MTN', color: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', color: '#ED1C24' },
  { id: 'glo', label: 'Glo', color: '#00A651' },
  { id: '9mobile', label: '9mobile', color: '#006F3C' },
];

const QUICK = [100, 200, 500, 1000, 2000, 5000];

function moneyFull(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AirtimePage({ onBack, balanceNgn = 0 }: { onBack: () => void; balanceNgn?: number }) {
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('08012345678');
  const [amountStr, setAmountStr] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const amount = (() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const insufficient = amount > 0 && amount > balanceNgn;
  const canPay = !!network && amount >= 50 && !insufficient;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <div className="air-page">
      <header className="air-header">
        <button type="button" className="air-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Buy Airtime</h1>
          <p>Instant mobile top-up</p>
        </div>
        <button type="button" className="air-wallet-btn" aria-label="Wallet">
          <Wallet size={18} />
        </button>
      </header>

      <section className="air-balance-card">
        <div>
          <span>Wallet Balance</span>
          <strong className="air-balance-amount">{moneyFull(balanceNgn)}</strong>
          <button type="button" className="air-quick-topup">
            <Zap size={14} /> Quick Topup
          </button>
        </div>
        <div className="air-balance-art">
          <Wallet size={28} />
        </div>
      </section>

      <section>
        <h3>Select Network</h3>
        <p className="air-hint">Auto-detect works when you type number.</p>
        <div className="air-networks">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              className={network === n.id ? 'on' : ''}
              onClick={() => setNetwork(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Recharge Details</h3>
        <div className="air-input">
          <Phone size={16} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="button">Use My Number</button>
        </div>
        <div className="air-input">
          <span className="air-naira">\u20a6</span>
          <input
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
          />
        </div>
        <div className="air-quick">
          {QUICK.map((n) => (
            <button key={n} type="button" onClick={() => setAmountStr(String(n))}>
              \u20a6{n.toLocaleString()}
            </button>
          ))}
        </div>
      </section>

      {insufficient && (
        <p className="air-warn">
          Insufficient balance · Wallet {moneyFull(balanceNgn)}
        </p>
      )}

      <button
        type="button"
        className={canPay ? 'air-cta' : 'air-cta locked'}
        disabled={!canPay}
        onClick={() => showToast('Airtime sent')}
      >
        {canPay ? (
          <>
            <Zap size={17} /> Buy Airtime
          </>
        ) : (
          <>
            <Lock size={16} /> Select a network
          </>
        )}
      </button>

      {toast && (
        <div className="air-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

export default AirtimePage;
