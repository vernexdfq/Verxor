'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Wallet,
  Zap,
} from 'lucide-react';
import './data-page.css';

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';
type PlanType = 'SME' | 'SME2' | 'GIFTING' | 'SHARE' | 'CORPORATE' | 'COUPON';

type Network = {
  id: NetworkId;
  label: string;
  color: string;
  bg: string;
};

type DataPlan = {
  id: string;
  size: string;
  validity: string;
  price: number;
  badge?: string;
};

const NETWORKS: Network[] = [
  { id: 'mtn', label: 'MTN', color: '#1A1A1A', bg: '#FFCC00' },
  { id: 'airtel', label: 'Airtel', color: '#FFFFFF', bg: '#E60000' },
  { id: 'glo', label: 'Glo', color: '#FFFFFF', bg: '#00A651' },
  { id: '9mobile', label: '9mobile', color: '#FFFFFF', bg: '#006F3C' },
];

const NETWORK_PLAN_TYPES: Record<NetworkId, PlanType[]> = {
  mtn: ['SME', 'SME2', 'GIFTING', 'SHARE', 'CORPORATE', 'COUPON'],
  airtel: ['SME', 'GIFTING', 'SHARE', 'CORPORATE', 'COUPON'],
  glo: ['SME', 'GIFTING', 'CORPORATE'],
  '9mobile': ['SME', 'GIFTING', 'CORPORATE'],
};

const DATA_CATALOG: Record<NetworkId, Partial<Record<PlanType, DataPlan[]>>> = {
  mtn: {
    SME: [
      { id: 'mtn-sme-1', size: '1GB', validity: '30 Days', price: 280, badge: 'Best Value' },
      { id: 'mtn-sme-2', size: '2GB', validity: '30 Days', price: 560, badge: 'Best Value' },
      { id: 'mtn-sme-5', size: '5GB', validity: '30 Days', price: 1400 },
      { id: 'mtn-sme-10', size: '10GB', validity: '30 Days', price: 2800 },
      { id: 'mtn-sme-15', size: '15GB', validity: '30 Days', price: 4200 },
      { id: 'mtn-sme-20', size: '20GB', validity: '30 Days', price: 5500 },
    ],
    SME2: [
      { id: 'mtn-sme2-1', size: '1.5GB', validity: '30 Days', price: 350 },
      { id: 'mtn-sme2-3', size: '3GB', validity: '30 Days', price: 700 },
    ],
    GIFTING: [
      { id: 'mtn-gift-1', size: '1GB', validity: '7 Days', price: 350 },
      { id: 'mtn-gift-3', size: '3.5GB', validity: '30 Days', price: 1200 },
      { id: 'mtn-gift-5', size: '5GB', validity: '30 Days', price: 1800 },
    ],
    SHARE: [{ id: 'mtn-share-2', size: '2GB', validity: '30 Days', price: 600 }],
    CORPORATE: [{ id: 'mtn-corp-10', size: '10GB', validity: '30 Days', price: 3000 }],
    COUPON: [{ id: 'mtn-coupon-1', size: '1GB', validity: '1 Day', price: 150 }],
  },
  airtel: {
    SME: [
      { id: 'air-sme-1', size: '1.5GB', validity: '30 Days', price: 300 },
      { id: 'air-sme-3', size: '3GB', validity: '30 Days', price: 600 },
      { id: 'air-sme-5', size: '5GB', validity: '30 Days', price: 1000 },
    ],
    GIFTING: [
      { id: 'air-gift-2', size: '2GB', validity: '30 Days', price: 750 },
      { id: 'air-gift-5', size: '5GB', validity: '30 Days', price: 1800 },
    ],
    SHARE: [{ id: 'air-share-1', size: '1GB', validity: '7 Days', price: 350 }],
    CORPORATE: [{ id: 'air-corp-10', size: '10GB', validity: '30 Days', price: 3200 }],
    COUPON: [{ id: 'air-coupon-1', size: '1GB', validity: '1 Day', price: 200 }],
  },
  glo: {
    SME: [
      { id: 'glo-sme-2', size: '2GB', validity: '30 Days', price: 500 },
      { id: 'glo-sme-5', size: '5GB', validity: '30 Days', price: 1200 },
    ],
    GIFTING: [{ id: 'glo-gift-3', size: '3.2GB', validity: '30 Days', price: 1000 }],
    CORPORATE: [{ id: 'glo-corp-10', size: '10GB', validity: '30 Days', price: 2800 }],
  },
  '9mobile': {
    SME: [
      { id: '9m-sme-1', size: '1.5GB', validity: '30 Days', price: 320 },
      { id: '9m-sme-3', size: '3GB', validity: '30 Days', price: 650 },
    ],
    GIFTING: [{ id: '9m-gift-2', size: '2GB', validity: '30 Days', price: 800 }],
    CORPORATE: [{ id: '9m-corp-5', size: '5GB', validity: '30 Days', price: 1500 }],
  },
};

const WALLET_BALANCE = 0;

function money(n: number) {
  return '\u20A6' + n.toLocaleString('en-NG');
}

function moneyFull(n: number) {
  return (
    '\u20A6' +
    n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function detectNetwork(phone: string): NetworkId | null {
  const d = phone.replace(/\D/g, '');
  const local = d.startsWith('234') ? '0' + d.slice(3) : d.startsWith('0') ? d : '0' + d;
  const prefix = local.slice(0, 4);
  if (['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'].some((p) => prefix.startsWith(p.slice(0, 4)) || local.startsWith(p)))
    return 'mtn';
  if (['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'].some((p) => local.startsWith(p)))
    return 'airtel';
  if (['0805', '0807', '0705', '0815', '0811', '0905', '0915'].some((p) => local.startsWith(p)))
    return 'glo';
  if (['0809', '0817', '0818', '0908', '0909'].some((p) => local.startsWith(p)))
    return '9mobile';
  return null;
}

export function DataPage({ onBack }: { onBack: () => void }) {
  const [networkId, setNetworkId] = useState<NetworkId | null>(null);
  const [planType, setPlanType] = useState<PlanType>('SME');
  const [planId, setPlanId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  const planTypes = networkId ? NETWORK_PLAN_TYPES[networkId] : [];
  const plans = networkId ? DATA_CATALOG[networkId]?.[planType] ?? [] : [];
  const selected = plans.find((p) => p.id === planId) ?? null;
  const price = selected?.price ?? 0;
  const insufficient = price > 0 && price > WALLET_BALANCE;

  useEffect(() => {
    const detected = detectNetwork(phone);
    if (detected && detected !== networkId) {
      setNetworkId(detected);
      setPlanType(NETWORK_PLAN_TYPES[detected][0]);
      setPlanId(null);
    }
  }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSelectNetwork = useCallback((id: NetworkId) => {
    setNetworkId(id);
    setPlanType(NETWORK_PLAN_TYPES[id][0]);
    setPlanId(null);
  }, []);

  return (
    <div className="data-page">
      <header className="data-topbar">
        <button type="button" className="data-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="data-topbar-copy">
          <strong>Data</strong>
          <small>Cheap mobile data bundles</small>
        </div>
        <div className="data-balance">
          <Wallet size={14} />
          <strong className="data-balance-amount">{moneyFull(WALLET_BALANCE)}</strong>
        </div>
      </header>

      <section className="data-section">
        <div className="data-section-head">
          <strong>Select network</strong>
          <small>
            {networkId
              ? `Detected ${NETWORKS.find((n) => n.id === networkId)?.label} from your number`
              : 'Choose MTN, Airtel, Glo or 9mobile'}
          </small>
        </div>
        <div className="data-network-grid">
          {NETWORKS.map((net) => {
            const active = networkId === net.id;
            return (
              <button
                key={net.id}
                type="button"
                className={active ? 'data-net active' : 'data-net'}
                style={{ background: active ? net.bg : undefined, color: active ? net.color : undefined }}
                onClick={() => onSelectNetwork(net.id)}
              >
                <span className="data-net-badge" style={{ background: net.bg, color: net.color }}>
                  {net.label.slice(0, 3).toUpperCase()}
                </span>
                <strong>{net.label}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="data-section">
        <div className="data-section-head">
          <strong>Phone number</strong>
          <small>Enter the number to receive data</small>
        </div>
        <label className="data-input-wrap">
          <Phone size={16} />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
      </section>

      {networkId && (
        <>
          <section className="data-section">
            <div className="data-section-head">
              <strong>Plan type</strong>
              <small>SME, Gifting, Corporate and more</small>
            </div>
            <div className="data-tabs">
              {planTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={planType === t ? 'data-tab active' : 'data-tab'}
                  onClick={() => {
                    setPlanType(t);
                    setPlanId(null);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section className="data-section">
            <div className="data-section-head">
              <strong>Select plan</strong>
              <small>{plans.length} plans available</small>
            </div>
            <div className="data-plan-list">
              {plans.map((p) => {
                const active = planId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={active ? 'data-plan active' : 'data-plan'}
                    onClick={() => setPlanId(p.id)}
                  >
                    <div className="data-plan-left">
                      <strong>{p.size}</strong>
                      <small>{p.validity}</small>
                      {p.badge ? <span className="data-plan-badge">{p.badge}</span> : null}
                    </div>
                    <strong className="data-plan-price">{money(p.price)}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div className="data-footer">
        {insufficient && (
          <p className="data-warn">
            Insufficient balance · Wallet {moneyFull(WALLET_BALANCE)}
          </p>
        )}
        <button
          type="button"
          className="data-pay"
          disabled={!selected || !phone.trim() || insufficient}
        >
          <Zap size={16} />
          {selected ? `Pay ${money(price)}` : networkId ? 'Select a plan' : 'Select a network'}
        </button>
      </div>
    </div>
  );
}
