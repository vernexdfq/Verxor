'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  Phone,
  Rocket,
  Wallet,
  Zap,
} from 'lucide-react';
import './data-page.css';

const NETWORKS = [
  { id: 'mtn', label: 'MTN', color: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', color: '#ED1C24' },
  { id: 'glo', label: 'Glo', color: '#00A651' },
  { id: '9mobile', label: '9mobile', color: '#006F3C' },
];

function moneyFull(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DataPage({ onBack, balanceNgn = 0 }: { onBack: () => void; balanceNgn?: number }) {
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('08012345678');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      setPlans([
        { id: '1', name: '1GB SME', price: 280, days: 30 },
        { id: '2', name: '2GB SME', price: 560, days: 30 },
        { id: '3', name: '5GB SME', price: 1400, days: 30 },
      ]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [network]);

  const price = selected?.price ?? 0;
  const insufficient = price > 0 && price > balanceNgn;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <div className="data-page">
      <header className="data-header">
        <button type="button" className="data-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Buy Data Bundle</h1>
          <p>Fast · Secure · Live prices</p>
        </div>
        <button type="button" className="data-wallet-btn" aria-label="Wallet">
          <Wallet size={18} />
        </button>
      </header>

      <section className="data-balance-card">
        <div>
          <span>Wallet Balance</span>
          <strong className="data-balance-amount">{moneyFull(balanceNgn)}</strong>
          <button type="button" className="data-quick-topup">
            <Zap size={14} /> Quick Topup
          </button>
        </div>
        <div className="data-balance-art">
          <Wallet size={28} />
        </div>
      </section>

      <section>
        <h3>Select Network</h3>
        <div className="data-networks">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              className={network === n.id ? 'on' : ''}
              onClick={() => setNetwork(n.id)}
              style={{ borderColor: network === n.id ? n.color : undefined }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Recipient Number</h3>
        <div className="data-input">
          <Phone size={16} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="button">Use My Number</button>
        </div>
      </section>

      <section>
        <h3>Data Bundles</h3>
        {loading ? (
          <p>Loading plans...</p>
        ) : (
          <div className="data-plans">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                className={selected?.id === p.id ? 'on' : ''}
                onClick={() => setSelected(p)}
              >
                <strong>{p.name}</strong>
                <span>{moneyFull(p.price)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {insufficient && (
        <p className="data-warn">
          Insufficient balance · Wallet {moneyFull(balanceNgn)}
        </p>
      )}

      <button
        type="button"
        className="data-cta"
        disabled={!selected || insufficient}
        onClick={() => showToast('Order placed')}
      >
        {insufficient ? 'Fund Wallet' : selected ? `Buy ${selected.name}` : 'Select a plan'}
      </button>

      {toast && (
        <div className="data-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

export default DataPage;
