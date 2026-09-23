'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Info, Rocket } from 'lucide-react';
import { PrimaryButton } from './components/ui';

const CATEGORIES = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'x', label: 'X (Twitter)' },
] as const;

const SERVICES: Record<string, { id: string; label: string; rate: number; min: number; max: number }[]> = {
  instagram: [
    { id: 'ig-followers', label: 'Followers', rate: 2.5, min: 100, max: 50000 },
    { id: 'ig-likes', label: 'Likes', rate: 0.8, min: 50, max: 100000 },
    { id: 'ig-views', label: 'Views', rate: 0.3, min: 100, max: 500000 },
  ],
  tiktok: [
    { id: 'tt-followers', label: 'Followers', rate: 3.2, min: 100, max: 50000 },
    { id: 'tt-likes', label: 'Likes', rate: 1.1, min: 50, max: 100000 },
    { id: 'tt-views', label: 'Views', rate: 0.25, min: 500, max: 1000000 },
  ],
  youtube: [
    { id: 'yt-subs', label: 'Subscribers', rate: 12, min: 50, max: 10000 },
    { id: 'yt-views', label: 'Views', rate: 1.5, min: 100, max: 100000 },
  ],
  facebook: [
    { id: 'fb-likes', label: 'Page likes', rate: 4, min: 50, max: 20000 },
    { id: 'fb-followers', label: 'Followers', rate: 4.5, min: 50, max: 20000 },
  ],
  x: [
    { id: 'x-followers', label: 'Followers', rate: 5, min: 50, max: 20000 },
    { id: 'x-likes', label: 'Likes', rate: 1.2, min: 50, max: 50000 },
  ],
};

export function BoostPage({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [link, setLink] = useState('');
  const [qty, setQty] = useState('');

  const options = category ? SERVICES[category] || [] : [];
  const selected = options.find((o) => o.id === serviceId);

  const total = useMemo(() => {
    const n = Number(qty);
    if (!selected || !Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * selected.rate * 100) / 100;
  }, [selected, qty]);

  return (
    <div className="service-flow">
      <header className="service-flow-top">
        <button type="button" className="service-back" onClick={onBack} aria-label="Back to home">
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <h1 className="service-flow-title">Boost Account</h1>
        <span className="service-flow-balance" aria-label="Wallet balance">
          ₦0.00
        </span>
      </header>

      <div className="service-hero">
        <span className="service-hero-icon" aria-hidden="true">
          <Rocket size={22} />
        </span>
        <div>
          <strong>Boost Your Account</strong>
          <p>Get followers, likes, views and more with clear delivery tracking.</p>
        </div>
      </div>

      <div className="service-wallet-bar">
        <span>Wallet balance</span>
        <strong>₦0.00</strong>
      </div>

      <div className="service-tip">
        <Info size={16} />
        <p>
          <strong>Quick tip:</strong> Select a category, choose a service, then enter your link and quantity.
        </p>
      </div>

      <label className="service-field">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setServiceId('');
          }}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="service-field">
        <span>Service</span>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          disabled={!category}
        >
          <option value="">Select a service</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} — ₦{o.rate}/unit
            </option>
          ))}
        </select>
      </label>

      <label className="service-field">
        <span>Link</span>
        <input
          type="url"
          placeholder="https://www.instagram.com/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <small>Paste your post or profile link</small>
      </label>

      <label className="service-field">
        <span>Quantity</span>
        <input
          type="number"
          inputMode="numeric"
          min={selected?.min || 1}
          max={selected?.max || undefined}
          placeholder={selected ? `${selected.min} – ${selected.max}` : 'Enter quantity'}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
      </label>

      {selected && total > 0 && (
        <div className="service-total">
          <span>Estimated total</span>
          <strong>₦{total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
        </div>
      )}

      <PrimaryButton
        type="button"
        disabled={!selected || !link.trim() || total <= 0}
        onClick={() => {
          /* Order wiring later */
        }}
      >
        Place order
      </PrimaryButton>
    </div>
  );
}
