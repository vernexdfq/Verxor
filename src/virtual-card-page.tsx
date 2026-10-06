'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Globe2,
  Lock,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import './product-pages.css';

type CardPlan = {
  id: string;
  name: string;
  currency: string;
  fee: number;
  limit: string;
  features: string[];
  badge?: string;
};

const PLANS: CardPlan[] = [
  {
    id: 'usd-virtual',
    name: 'USD Virtual Card',
    currency: 'USD',
    fee: 3500,
    limit: 'Up to $2,000 / month',
    features: ['Instant issue', 'Visa network', 'Online payments', 'Apple / Google Pay ready'],
    badge: 'Best value',
  },
  {
    id: 'usd-premium',
    name: 'USD Premium Card',
    currency: 'USD',
    fee: 8500,
    limit: 'Up to $10,000 / month',
    features: ['Higher limits', '3D Secure', 'Priority support', 'Reusable top-ups'],
    badge: 'Premium',
  },
  {
    id: 'ngn-virtual',
    name: 'NGN Virtual Card',
    currency: 'NGN',
    fee: 1500,
    limit: 'Up to \u20a6500,000 / month',
    features: ['Local billing', 'Instant issue', 'Subscription friendly', 'Low fees'],
  },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

export function VirtualCardPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>('usd-virtual');
  const active = PLANS.find((p) => p.id === selected) ?? null;

  return (
    <div className="accounts-page" style={{ paddingBottom: 32 }}>
      <header className="accounts-topbar">
        <button type="button" className="accounts-back-link" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
          <span>Services</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>Virtual Card</div>
        <div style={{ width: 72 }} />
      </header>

      <section style={{ padding: '12px 16px 8px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 16,
            padding: '20px 16px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                background: 'rgba(255,255,255,0.12)',
                padding: '4px 8px',
                borderRadius: 20,
                marginBottom: 10,
              }}
            >
              <Sparkles size={12} /> Instant digital cards
            </span>
            <strong style={{ display: 'block', fontSize: 18, marginBottom: 4 }}>Get a Virtual Dollar Card</strong>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85, lineHeight: 1.45 }}>
              Pay for international subscriptions, ads, and online services securely.
            </p>
          </div>
          <CreditCard
            size={88}
            style={{ position: 'absolute', right: -8, bottom: -12, opacity: 0.12 }}
            aria-hidden
          />
        </div>
      </section>

      <section style={{ padding: '8px 16px 12px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: 0.4 }}>
          CHOOSE A CARD
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS.map((plan) => {
            const on = selected === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelected(plan.id)}
                style={{
                  textAlign: 'left',
                  border: on ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: on ? '#eff6ff' : '#fff',
                  borderRadius: 14,
                  padding: '14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>{plan.name}</strong>
                      {plan.badge && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#2563eb',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}
                        >
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {plan.currency} · {plan.limit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Issue fee</div>
                    <strong style={{ fontSize: 15 }}>{money(plan.fee)}</strong>
                  </div>
                </div>
                {on && (
                  <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={13} color="#2563eb" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ padding: '0 16px 8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: <Lock size={16} />, label: 'PCI compliant' },
            { icon: <Shield size={16} />, label: '3D Secure' },
            { icon: <Globe2 size={16} />, label: 'Global accept' },
            { icon: <Wallet size={16} />, label: 'Fund from wallet' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#475569',
                fontWeight: 600,
              }}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <div style={{ padding: '8px 16px 24px' }}>
        <button
          type="button"
          disabled={!active}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: 'none',
            background: active ? '#2563eb' : '#cbd5e1',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: active ? 'pointer' : 'not-allowed',
          }}
        >
          {active ? `Issue ${active.name} · ${money(active.fee)}` : 'Select a card'}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Card details appear in your wallet immediately after successful payment.
        </p>
      </div>
    </div>
  );
}
