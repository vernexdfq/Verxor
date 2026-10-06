'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  MapPin,
  ShieldCheck,
  Wifi,
  Zap,
} from 'lucide-react';
import './product-pages.css';

type ProxyTier = {
  id: string;
  name: string;
  type: 'Residential' | 'Datacenter' | 'Mobile';
  locations: string;
  priceFrom: number;
  features: string[];
  badge?: string;
};

const TIERS: ProxyTier[] = [
  {
    id: 'res-basic',
    name: 'Residential Basic',
    type: 'Residential',
    locations: 'US · UK · NG · EU',
    priceFrom: 2500,
    features: ['Rotating IPs', 'HTTP & SOCKS5', '99.5% uptime', 'Shared bandwidth'],
    badge: 'Popular',
  },
  {
    id: 'res-pro',
    name: 'Residential Pro',
    type: 'Residential',
    locations: 'Global · 40+ countries',
    priceFrom: 6500,
    features: ['Sticky sessions', 'Unlimited threads', 'City-level targeting', 'Priority support'],
  },
  {
    id: 'dc-fast',
    name: 'Datacenter Fast',
    type: 'Datacenter',
    locations: 'US · EU · Asia',
    priceFrom: 1800,
    features: ['Low latency', 'High bandwidth', 'HTTP & SOCKS5', 'Instant delivery'],
  },
  {
    id: 'mobile',
    name: 'Mobile 4G/5G',
    type: 'Mobile',
    locations: 'US · UK · NG',
    priceFrom: 9200,
    features: ['Real carrier IPs', 'Rotating or sticky', 'SMS-friendly', 'Best for social'],
    badge: 'Premium',
  },
];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

export function ProxiesPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = useMemo(() => TIERS.find((t) => t.id === selected) ?? null, [selected]);

  return (
    <div className="accounts-page" style={{ paddingBottom: 32 }}>
      <header className="accounts-topbar">
        <button type="button" className="accounts-back-link" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
          <span>Services</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>Proxies</div>
        <div style={{ width: 72 }} />
      </header>

      <section style={{ padding: '12px 16px 8px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            borderRadius: 16,
            padding: '18px 16px',
            color: '#fff',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: 16 }}>Secure IP Proxies</strong>
            <span style={{ opacity: 0.9, fontSize: 13 }}>
              Residential, datacenter & mobile IPs for automation and account safety.
            </span>
          </div>
        </div>
      </section>

      <section style={{ padding: '8px 16px 16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: 0.4 }}>
          AVAILABLE PLANS
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TIERS.map((tier) => {
            const on = selected === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelected(tier.id)}
                style={{
                  textAlign: 'left',
                  border: on ? '2px solid #0f766e' : '1px solid #e2e8f0',
                  background: on ? '#f0fdfa' : '#fff',
                  borderRadius: 14,
                  padding: '14px 14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>{tier.name}</strong>
                      {tier.badge && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: '#0f766e',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: 6,
                          }}
                        >
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Wifi size={12} /> {tier.type}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {tier.locations}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>From</div>
                    <strong style={{ fontSize: 15, color: '#0f172a' }}>{money(tier.priceFrom)}</strong>
                  </div>
                </div>
                {on && (
                  <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
                    {tier.features.map((f) => (
                      <li key={f} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={13} color="#0f766e" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div style={{ padding: '0 16px 24px' }}>
        <button
          type="button"
          disabled={!active}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 12,
            border: 'none',
            background: active ? '#0f766e' : '#cbd5e1',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: active ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Zap size={16} />
          {active ? `Continue · ${active.name}` : 'Select a plan'}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Credentials delivered instantly after payment. Use matching region for best results.
        </p>
      </div>
    </div>
  );
}
