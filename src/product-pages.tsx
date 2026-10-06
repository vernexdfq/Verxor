'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

const WALLET_BALANCE = 0;

function money(value: number) {
  return '\u20A6' + value.toLocaleString('en-NG');
}

const SAMPLE = [
  { id: '1', platform: 'Facebook', title: 'FB Aged 2020+', price: 2500, stock: 12, badge: 'AGED' as const },
  { id: '2', platform: 'Instagram', title: 'IG Softreg', price: 1800, stock: 40, badge: 'SOFTREG' as const },
  { id: '3', platform: 'TikTok', title: 'TikTok PVA', price: 3200, stock: 8, badge: 'PVA' as const },
  { id: '4', platform: 'Gmail', title: 'Gmail Aged', price: 900, stock: 100, badge: 'INSTANT' as const },
];

export type AccountProduct = {
  id: string;
  platform: string;
  title: string;
  price: number;
  stock: number;
  badge?: 'INSTANT' | 'SOFTREG' | 'AGED' | 'PVA';
};

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SAMPLE;
    return SAMPLE.filter(
      (x) => x.platform.toLowerCase().includes(s) || x.title.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <div className="accounts-page" style={{ padding: '12px 16px 32px', maxWidth: 480, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            border: 'none',
            background: '#f1f5f9',
            borderRadius: 12,
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Accounts & Logs</h1>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Verified marketplace stock</p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 999,
            background: '#0f172a',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Wallet size={14} />
          {money(WALLET_BALANCE)}
        </div>
      </header>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
          }}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search platform or product"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 12px 12px 36px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.map((item) => (
          <Card key={item.id} className="form-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Package size={16} color="#2563eb" />
                  <strong style={{ fontSize: 14 }}>{item.title}</strong>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                  {item.platform} · Stock {item.stock}
                  {item.badge ? ` · ${item.badge}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 14 }}>{money(item.price)}</strong>
                <div style={{ marginTop: 8 }}>
                  <PrimaryButton type="button" style={{ minHeight: 36, padding: '0 12px', fontSize: 12 }}>
                    Buy <ArrowRight size={14} />
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          gap: 10,
        }}
      >
        <ShieldCheck size={18} color="#16a34a" />
        <div>
          <strong style={{ fontSize: 13 }}>Buyer protection</strong>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
            Instant delivery where marked. Replacement window on verified aged logs.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return (
    <Card className="form-card">
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        Your {kind === 'accounts' ? 'account orders' : 'active rentals'} will appear here after you
        place an order.
      </p>
    </Card>
  );
}
