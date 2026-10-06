'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Search,
  ShieldCheck,
  Wallet,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './product-pages.css';

/**
 * Buy Accounts & Logs — Verxor marketplace
 * Catalog is structured for multi-provider APIs (AccsZone / AccsMarket / etc.).
 * Grid = short tags. Modal = 100% raw provider description + format + how-to.
 */

export type AccountProduct = {
  id: string;
  platform: string;
  subtype: string;
  title: string;
  shortTitle: string;
  description: string;
  bullets: string[];
  format: string;
  age: string;
  country: string;
  price: number;
  stock: number;
  sold?: number;
  instant: boolean;
  cookies: boolean;
  emailIncluded: boolean;
  twoFa: boolean;
  tags: string[];
  badge?: 'INSTANT' | 'SOFTREG' | 'AGED' | 'PVA';
};

const PLATFORMS = [
  'All',
  'Facebook',
  'Instagram',
  'Twitter',
  'TikTok',
  'Discord',
  'Telegram',
  'Gmail',
  'Other',
];

function money(n: number) {
  return '\u20A6' + n.toLocaleString('en-NG');
}

const CATALOG: AccountProduct[] = [
  {
    id: 'fb-aged-1',
    platform: 'Facebook',
    subtype: 'Aged',
    title: 'Facebook Aged Account',
    shortTitle: 'FB Aged',
    description: 'Aged Facebook accounts with activity history. Suitable for marketing and page management.',
    bullets: ['Aged 6+ months', 'Email included', '2FA optional', 'Cookies available'],
    format: 'email:pass | cookies | 2FA',
    age: '6+ months',
    country: 'Mixed',
    price: 2500,
    stock: 48,
    sold: 120,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: true,
    tags: ['Aged', 'Cookies', 'Email'],
    badge: 'AGED',
  },
  {
    id: 'ig-soft-1',
    platform: 'Instagram',
    subtype: 'Softreg',
    title: 'Instagram Softreg',
    shortTitle: 'IG Softreg',
    description: 'Fresh Instagram softreg accounts ready for warmup and growth.',
    bullets: ['Soft registered', 'Email included', 'Instant delivery'],
    format: 'user:pass | email:pass',
    age: 'New',
    country: 'Mixed',
    price: 800,
    stock: 200,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Softreg', 'Email'],
    badge: 'SOFTREG',
  },
  {
    id: 'tw-pva-1',
    platform: 'Twitter',
    subtype: 'PVA',
    title: 'Twitter PVA',
    shortTitle: 'TW PVA',
    description: 'Phone-verified Twitter/X accounts.',
    bullets: ['Phone verified', 'Email included'],
    format: 'user:pass | email',
    age: '1-3 months',
    country: 'US',
    price: 1500,
    stock: 35,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['PVA', 'Email'],
    badge: 'PVA',
  },
  {
    id: 'tt-aged-1',
    platform: 'TikTok',
    subtype: 'Aged',
    title: 'TikTok Aged',
    shortTitle: 'TT Aged',
    description: 'Aged TikTok accounts with followers option.',
    bullets: ['Aged', 'Ready for content'],
    format: 'user:pass',
    age: '3+ months',
    country: 'Mixed',
    price: 3200,
    stock: 22,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Cookies'],
    badge: 'AGED',
  },
  {
    id: 'dc-nitro-1',
    platform: 'Discord',
    subtype: 'Aged',
    title: 'Discord Aged',
    shortTitle: 'DC Aged',
    description: 'Aged Discord accounts for community and bots.',
    bullets: ['Aged', 'Email included'],
    format: 'email:pass | token',
    age: '6+ months',
    country: 'Mixed',
    price: 1800,
    stock: 40,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
    badge: 'AGED',
  },
  {
    id: 'tg-premium-1',
    platform: 'Telegram',
    subtype: 'Premium',
    title: 'Telegram Premium',
    shortTitle: 'TG Premium',
    description: 'Telegram accounts with Premium status.',
    bullets: ['Premium active', 'Session export'],
    format: 'session / tdata',
    age: 'Varies',
    country: 'Mixed',
    price: 4500,
    stock: 15,
    instant: true,
    cookies: false,
    emailIncluded: false,
    twoFa: true,
    tags: ['Premium'],
    badge: 'INSTANT',
  },
  {
    id: 'gm-aged-1',
    platform: 'Gmail',
    subtype: 'Aged',
    title: 'Gmail Aged',
    shortTitle: 'Gmail Aged',
    description: 'Aged Gmail accounts for verification and recovery.',
    bullets: ['Aged 1+ year', 'Recovery email'],
    format: 'email:pass',
    age: '1+ year',
    country: 'US',
    price: 1200,
    stock: 90,
    instant: true,
    cookies: false,
    emailIncluded: true,
    twoFa: false,
    tags: ['Aged', 'Email'],
    badge: 'AGED',
  },
  {
    id: 'ig-aged-1',
    platform: 'Instagram',
    subtype: 'Aged',
    title: 'Instagram Aged',
    shortTitle: 'IG Aged',
    description: 'Aged Instagram accounts with posts history.',
    bullets: ['Aged', 'Posts history', 'Email included'],
    format: 'user:pass | email',
    age: '6+ months',
    country: 'Mixed',
    price: 2800,
    stock: 30,
    instant: true,
    cookies: true,
    emailIncluded: true,
    twoFa: true,
    tags: ['Aged', 'Cookies'],
    badge: 'AGED',
  },
];

export function AccountsPage({ onBack }: { onBack: () => void }) {
  const [platform, setPlatform] = useState('All');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AccountProduct | null>(null);
  const [qty, setQty] = useState(1);

  const filtered = useMemo(() => {
    return CATALOG.filter((p) => {
      if (platform !== 'All' && p.platform !== platform) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          p.title.toLowerCase().includes(s) ||
          p.platform.toLowerCase().includes(s) ||
          p.tags.some((t) => t.toLowerCase().includes(s))
        );
      }
      return true;
    });
  }, [platform, q]);

  const total = selected ? selected.price * qty : 0;

  useEffect(() => {
    setQty(1);
  }, [selected?.id]);

  return (
    <div className="accounts-page">
      <div className="acc-topbar">
        <button type="button" className="acc-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="acc-topbar-text">
          <h1>Accounts & Logs</h1>
          <p>Buy verified social accounts & logs</p>
        </div>
        <div className="acc-wallet-pill">
          <Wallet size={14} />
          <span>{money(0)}</span>
        </div>
      </div>

      <div className="acc-search-row">
        <div className="acc-search">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search platform or type..."
          />
        </div>
      </div>

      <div className="acc-chips">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            className={platform === p ? 'acc-chip active' : 'acc-chip'}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="accounts-grid">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            className="acc-card"
            onClick={() => setSelected(p)}
          >
            {p.badge && <span className="acc-badge">{p.badge}</span>}
            <div className="acc-card-title">{p.shortTitle}</div>
            <div className="acc-card-meta">
              {p.country} · {p.age}
            </div>
            <div className="acc-card-tags">
              {p.tags.slice(0, 3).map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="acc-card-footer">
              <strong>{money(p.price)}</strong>
              <span>{p.stock} left</span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="form-card">
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>No products match your filters.</p>
        </Card>
      )}

      {selected && (
        <div className="acc-detail-overlay" onClick={() => setSelected(null)}>
          <div className="acc-detail-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="acc-detail-close" onClick={() => setSelected(null)}>
              <X size={18} />
            </button>
            <div className="detail-header">
              <Package size={22} />
              <div>
                <h2>{selected.title}</h2>
                <p>
                  {selected.country} · {selected.age}
                </p>
              </div>
            </div>
            <p className="detail-lead">{selected.description}</p>
            <ul className="detail-bullets">
              {selected.bullets.map((b) => (
                <li key={b}>
                  <Check size={14} /> {b}
                </li>
              ))}
            </ul>
            <p className="detail-format">
              <strong>Format:</strong> {selected.format}
            </p>
            <div className="detail-qty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0' }}>
              <span>Quantity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Decrease">
                  <Minus size={14} />
                </button>
                <strong>{qty}</strong>
                <button type="button" onClick={() => setQty((n) => Math.min(selected.stock, n + 1))} aria-label="Increase">
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span>
                {money(selected.price)} × {qty}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <PrimaryButton type="button">Buy now · {money(total)}</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyOrderState({ kind }: { kind: 'accounts' | 'rentals' }) {
  return (
    <Card className="form-card">
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
        Your {kind === 'accounts' ? 'account orders' : 'active rentals'} will appear here after you place an order.
      </p>
    </Card>
  );
}
