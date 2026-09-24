'use client';

import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  History,
  Phone,
  Plus,
  Rocket,
  Smartphone,
  Wifi,
} from 'lucide-react';
import { useState } from 'react';
import { Card, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '7,570.00', symbol: '₦' };

/** Order matches design reference: row1 verification/growth, row2 telecom/finance */
const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: typeof Smartphone;
  tone: string;
  service?: ServiceView;
}[] = [
  { id: 'virtual-numbers', title: 'Virtual Number', icon: Phone, tone: 'qa-blue', service: 'virtual-numbers' },
  { id: 'boost', title: 'Boost Account', icon: Rocket, tone: 'qa-purple', service: 'boost' },
  { id: 'accounts', title: 'Buy Logs', icon: FileText, tone: 'qa-amber', service: 'accounts' },
  { id: 'rental', title: 'Rent Number', icon: Smartphone, tone: 'qa-teal', service: 'rental' },
  { id: 'data', title: 'Data', icon: Wifi, tone: 'qa-royal' },
  { id: 'airtime', title: 'Airtime', icon: Phone, tone: 'qa-green' },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'qa-pink' },
  { id: 'vcard', title: 'Virtual Card', icon: CreditCard, tone: 'qa-slate' },
];

const PROMOS = [
  {
    id: 'data',
    eyebrow: 'CHEAPEST DATA RATES',
    title: 'SME/CG at ₦210/GB',
    cta: 'Buy Data Now',
    service: undefined as ServiceView | undefined,
    page: undefined as Page | undefined,
  },
  {
    id: 'numbers',
    eyebrow: 'INSTANT NUMBERS',
    title: 'USA & UK lines ready now',
    cta: 'Get Number',
    service: 'virtual-numbers' as ServiceView,
  },
  {
    id: 'boost',
    eyebrow: 'SOCIAL GROWTH',
    title: 'Boost Instagram & TikTok',
    cta: 'Boost Page',
    service: 'boost' as ServiceView,
  },
];

export function HomePage({
  go,
  openService,
}: {
  go: (page: Page) => void;
  openService: (view: ServiceView) => void;
}) {
  const [showBalance, setShowBalance] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);

  // Auto-rotate promos every 4s
  useState(() => {
    if (typeof window === 'undefined') return;
  });

  // Simple interval via effect-like pattern without extra import issues — use client effect
  if (typeof window !== 'undefined') {
    // interval set in useEffect below
  }

  return (
    <HomeInner
      go={go}
      openService={openService}
      showBalance={showBalance}
      setShowBalance={setShowBalance}
      promoIndex={promoIndex}
      setPromoIndex={setPromoIndex}
    />
  );
}

function HomeInner({
  go,
  openService,
  showBalance,
  setShowBalance,
  promoIndex,
  setPromoIndex,
}: {
  go: (page: Page) => void;
  openService: (view: ServiceView) => void;
  showBalance: boolean;
  setShowBalance: (fn: (v: boolean) => boolean) => void;
  promoIndex: number;
  setPromoIndex: (fn: (v: number) => number) => void;
}) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { useEffect } = require('react') as typeof import('react');
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIndex((i) => (i + 1) % PROMOS.length);
    }, 4000);
    return () => clearInterval(t);
  }, [setPromoIndex]);

  const promo = PROMOS[promoIndex];

  return (
    <>
      {/* Wallet hero — #0F172A */}
      <section className="vx-wallet" aria-label="Available balance">
        <div className="vx-wallet-top">
          <span className="vx-wallet-label">AVAILABLE BALANCE</span>
          <span className="vx-wallet-active">
            <i /> Active
          </span>
        </div>
        <div className="vx-wallet-amount">
          <strong>
            {showBalance ? (
              <>
                {wallet.symbol}
                {wallet.amount}
              </>
            ) : (
              `${wallet.symbol}••••••`
            )}
          </strong>
          <button
            type="button"
            className="vx-wallet-eye"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            onClick={() => setShowBalance((v) => !v)}
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="vx-wallet-actions">
          <button type="button" className="vx-btn-fund" onClick={() => go('fund')}>
            <Plus size={18} strokeWidth={2.5} /> Fund Wallet
          </button>
          <button type="button" className="vx-btn-history" onClick={() => go('history')}>
            <History size={16} /> History
          </button>
        </div>
      </section>

      {/* Quick actions 4×2 */}
      <section className="vx-quick" aria-label="Quick actions">
        <p className="vx-section-label">QUICK ACTIONS</p>
        <div className="vx-quick-grid">
          {QUICK_ACTIONS.map(({ id, title, icon: Icon, tone, service }) => (
            <button
              key={id}
              type="button"
              className="vx-quick-tile"
              aria-label={title}
              onClick={() => {
                if (service) openService(service);
              }}
            >
              <span className={`vx-quick-icon ${tone}`}>
                <Icon size={20} strokeWidth={1.9} />
              </span>
              <strong>{title}</strong>
            </button>
          ))}
        </div>
      </section>

      {/* Promo carousel */}
      <section className="vx-promo" aria-label="Promotions">
        <div className="vx-promo-card">
          <div className="vx-promo-copy">
            <span className="vx-promo-eyebrow">⚡ {promo.eyebrow}</span>
            <strong>{promo.title}</strong>
          </div>
          <button
            type="button"
            className="vx-promo-cta"
            onClick={() => {
              if (promo.service) openService(promo.service);
            }}
          >
            {promo.cta} <ArrowRight size={14} />
          </button>
        </div>
        <div className="vx-promo-dots" role="tablist" aria-label="Promo slides">
          {PROMOS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === promoIndex}
              className={i === promoIndex ? 'dot active' : 'dot'}
              onClick={() => setPromoIndex(() => i)}
            />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <SectionHeader
        eyebrow="ACTIVITY"
        title="Recent activity"
        action={
          <button className="text-button vx-view-all" type="button" onClick={() => go('history')}>
            View all <ArrowRight size={14} />
          </button>
        }
      />
      <Card className="vx-activity-empty">
        <div className="vx-activity-icon">
          <Clock3 size={18} />
        </div>
        <div>
          <strong>No recent activity</strong>
          <p>Your wallet activity and orders will appear here.</p>
        </div>
      </Card>
    </>
  );
}
