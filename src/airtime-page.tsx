'use client';

import { useMemo, useState, useCallback } from 'react';
import { ArrowLeft, Check, Phone, Wallet, Zap } from 'lucide-react';
import './airtime-page.css';

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

const NETWORKS: { id: NetworkId; label: string; bg: string; color: string }[] = [
  { id: 'mtn', label: 'MTN', bg: '#FFCC00', color: '#1A1A1A' },
  { id: 'airtel', label: 'Airtel', bg: '#E60000', color: '#FFFFFF' },
  { id: 'glo', label: 'Glo', bg: '#00A651', color: '#FFFFFF' },
  { id: '9mobile', label: '9mobile', bg: '#006F3C', color: '#FFFFFF' },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const MY_NUMBER = '08141620644';
const WALLET_BALANCE = 0;

const PREFIXES: Record<NetworkId, string[]> = {
  mtn: ['0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916', '0703', '0706'],
  airtel: ['0802', '0808', '0812', '0701', '0708', '0901', '0902', '0904', '0907', '0911', '0912'],
  glo: ['0805', '0807', '0811', '0815', '0905', '0915', '0705'],
  '9mobile': ['0809', '0817', '0818', '0908', '0909'],
};

function normalizePhone(raw: string) {
  let clean = raw.replace(/\D/g, '');
  if (clean.startsWith('234') && clean.length >= 13) clean = '0' + clean.slice(3);
  return clean.slice(0, 11);
}

function detectNetwork(raw: string): NetworkId | null {
  const clean = normalizePhone(raw);
  if (clean.length < 4) return null;
  const prefix = clean.slice(0, 4);
  for (const id of Object.keys(PREFIXES) as NetworkId[]) {
    if (PREFIXES[id].includes(prefix)) return id;
  }
  return null;
}

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function NetworkLogo({ id, size = 28 }: { id: NetworkId; size?: number }) {
  const net = NETWORKS.find((n) => n.id === id)!;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: net.bg,
        color: net.color,
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: size * 0.32,
        fontWeight: 800,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      aria-hidden
    >
      {id === '9mobile' ? '9' : net.label.slice(0, 3).toUpperCase()}
    </span>
  );
}

export function AirtimePage({ onBack }: { onBack: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId | ''>('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const amount = useMemo(() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const phoneDigits = normalizePhone(phone);
  const phoneValid = /^0[7-9]\d{9}$/.test(phoneDigits);
  const insufficient = amount > 0 && amount > WALLET_BALANCE;
  const formReady = !!networkId && phoneValid && amount >= 50 && amount <= 50000;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const applyPhone = useCallback((raw: string) => {
    const cleaned = normalizePhone(raw);
    setPhone(cleaned);
    if (cleaned.length < 4) {
      setAutoDetected(false);
      return;
    }
    const detected = detectNetwork(cleaned);
    if (detected) {
      setNetworkId(detected);
      setAutoDetected(true);
    } else {
      setAutoDetected(false);
    }
  }, []);

  const handleBuy = async () => {
    if (!formReady || insufficient || submitting) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setPhone('');
    setAmountStr('');
    setNetworkId('');
    setAutoDetected(false);
    showToast('Airtime purchase successful');
  };

  let ctaLabel = 'Buy Airtime';
  if (insufficient && formReady) ctaLabel = 'Fund Wallet';
  else if (!networkId) ctaLabel = 'Select a network';
  else if (!phoneDigits) ctaLabel = 'Enter phone number';
  else if (!phoneValid) ctaLabel = 'Enter a valid number';
  else if (amount <= 0) ctaLabel = 'Enter amount';
  else if (amount < 50) ctaLabel = 'Minimum is \u20a650';
  else if (amount > 50000) ctaLabel = 'Maximum is \u20a650,000';
  else if (submitting) ctaLabel = 'Processing...';

  return (
    <div className="air-page">
      <header className="air-topbar">
        <button type="button" className="air-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="air-topbar-copy">
          <strong>Airtime</strong>
          <small>Top up Nigerian networks</small>
        </div>
        <div className="air-balance" aria-label="Wallet balance">
          <Wallet size={14} />
          <span>{money(WALLET_BALANCE)}</span>
        </div>
      </header>

      <section className="air-section">
        <p className="air-label">Select network</p>
        <div className="air-networks">
          {NETWORKS.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`air-net ${networkId === n.id ? 'on' : ''}`}
              onClick={() => {
                setNetworkId(n.id);
                setAutoDetected(false);
              }}
            >
              <NetworkLogo id={n.id} />
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        {autoDetected && networkId && (
          <p className="air-hint">Auto-detected {NETWORKS.find((n) => n.id === networkId)?.label}</p>
        )}
      </section>

      <section className="air-section">
        <p className="air-label">Phone number</p>
        <div className="air-phone-row">
          <Phone size={16} className="air-phone-ico" />
          <input
            className="air-input"
            inputMode="numeric"
            placeholder="0801 234 5678"
            value={phone}
            onChange={(e) => applyPhone(e.target.value)}
            maxLength={14}
          />
        </div>
        <button type="button" className="air-use-mine" onClick={() => applyPhone(MY_NUMBER)}>
          Use my number
        </button>
      </section>

      <section className="air-section">
        <p className="air-label">Amount</p>
        <div className="air-amount-wrap">
          <span className="air-naira">\u20a6</span>
          <input
            className="air-input air-amount"
            inputMode="numeric"
            placeholder="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.,]/g, ''))}
          />
        </div>
        <div className="air-quick">
          {QUICK_AMOUNTS.map((n) => (
            <button key={n} type="button" className="air-chip" onClick={() => setAmountStr(String(n))}>
              {money(n)}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className={`air-cta${insufficient && formReady ? ' air-cta-fund' : ''}`}
        disabled={submitting || (!formReady && !(insufficient && formReady))}
        onClick={() => {
          if (insufficient && formReady) showToast('Opening Fund Wallet...');
          else void handleBuy();
        }}
      >
        <Zap size={16} /> {ctaLabel}
      </button>

      <div className="air-trust">
        <span className="air-trust-icon" aria-hidden>
          <Check size={14} strokeWidth={3} />
        </span>
        <div>
          <strong>Instant Delivery</strong>
          <p>Airtime is delivered immediately after successful payment.</p>
        </div>
      </div>

      {toast && (
        <div className="air-toast" role="status">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
