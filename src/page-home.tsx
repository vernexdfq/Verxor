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
  PhoneCall,
  PhoneForwarded,
  Plus,
  Rocket,
  Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '7,570.00', symbol: '₦' };

const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: typeof Phone;
  tone: string;
  service?: ServiceView;
}[] = [
  { id: 'virtual-numbers', title: 'Virtual Number', icon: Phone, tone: 'qa-blue', service: 'virtual-numbers' },
  { id: 'boost', title: 'Boost Account', icon: Rocket, tone: 'qa-purple', service: 'boost' },
  { id: 'accounts', title: 'Buy Logs', icon: FileText, tone: 'qa-amber', service: 'accounts' },
  { id: 'rental', title: 'Rent Number', icon: PhoneCall, tone: 'qa-teal', service: 'rental' },
  { id: 'data', title: 'Data', icon: Wifi, tone: 'qa-royal', service: 'data' },
  { id: 'airtime', title: 'Airtime', icon: PhoneForwarded, tone: 'qa-green', service: 'airtime' },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'qa-pink', service: 'gift-card' },
  { id: 'vcard', title: 'Virtual Card', icon: CreditCard, tone: 'qa-slate', service: 'virtual-card' },
];

/** 8 promo slides — each opens its service */
const PROMO_SLIDES: {
  id: string;
  badge: string;
  headline: string;
  subtext: string;
  cta: string;
  service?: ServiceView;
  accent: string;
}[] = [
  {
    id: 'virtual-number',
    badge: 'INSTANT NUMBERS',
    headline: 'Get a number in seconds',
    subtext: 'OTP for WhatsApp, Telegram & more.',
    cta: 'Get Number',
    service: 'virtual-numbers',
    accent: 'promo-accent-blue',
  },
  {
    id: 'boost-account',
    badge: 'SOCIAL GROWTH',
    headline: 'Boost your social reach',
    subtext: 'Followers, likes & views — tracked.',
    cta: 'Boost Now',
    service: 'boost',
    accent: 'promo-accent-purple',
  },
  {
    id: 'buy-logs',
    badge: 'MARKETPLACE',
    headline: 'Browse digital logs',
    subtext: 'Verified accounts with instant delivery.',
    cta: 'Explore Logs',
    service: 'accounts',
    accent: 'promo-accent-amber',
  },
  {
    id: 'rent-number',
    badge: 'NUMBER RENTAL',
    headline: 'Rent dedicated lines',
    subtext: 'Long-term SMS & call numbers.',
    cta: 'Rent Line',
    service: 'rental',
    accent: 'promo-accent-teal',
  },
  {
    id: 'data',
    badge: 'CHEAPEST DATA',
    headline: 'SME/CG from ₦210/GB',
    subtext: 'Fast data top-ups, all networks.',
    cta: 'Buy Data',
    service: 'data',
    accent: 'promo-accent-sky',
  },
  {
    id: 'airtime',
    badge: 'AIRTIME',
    headline: 'Top up in one tap',
    subtext: 'Instant airtime for major networks.',
    cta: 'Top Up',
    service: 'airtime',
    accent: 'promo-accent-green',
  },
  {
    id: 'gift-card',
    badge: 'GIFT CARDS',
    headline: 'Trade gift cards easily',
    subtext: 'Buy from users or redeem brands.',
    cta: 'Open Cards',
    service: 'gift-card',
    accent: 'promo-accent-pink',
  },
  {
    id: 'virtual-card',
    badge: 'VIRTUAL CARDS',
    headline: 'Pay anywhere online',
    subtext: 'Dollar & local cards for checkout.',
    cta: 'Get Card',
    service: 'virtual-card',
    accent: 'promo-accent-indigo',
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
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length);
    }, 4500);
    return () => clearInterval(t);
  }, [paused]);

  const promo = PROMO_SLIDES[promoIndex];

  const openPromo = () => {
    if (promo.service) openService(promo.service);
  };

  return (
    <div className="vx-home">
      {/* Wallet */}
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

      {/* Quick actions — fixed equal tiles */}
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

      {/* Bold promo carousel — full slide is tappable */}
      <section
        className="vx-promo"
        aria-label="Promotions"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <button type="button" className={`vx-promo-card ${promo.accent}`} onClick={openPromo}>
          <div className="vx-promo-copy">
            <span className="vx-promo-badge">{promo.badge}</span>
            <strong className="vx-promo-headline">{promo.headline}</strong>
            <p className="vx-promo-sub">{promo.subtext}</p>
            <span className="vx-promo-cta">
              {promo.cta} <ArrowRight size={14} strokeWidth={2.5} />
            </span>
          </div>
          <div className="vx-promo-glow" aria-hidden />
        </button>
        <div className="vx-promo-dots" role="tablist" aria-label="Promo slides">
          {PROMO_SLIDES.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === promoIndex}
              aria-label={p.badge}
              className={i === promoIndex ? 'dot active' : 'dot'}
              onClick={(e) => {
                e.stopPropagation();
                setPromoIndex(i);
              }}
            />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="vx-activity" aria-label="Recent activity">
        <div className="vx-activity-head">
          <p className="vx-section-label" style={{ margin: 0 }}>
            RECENT ACTIVITY
          </p>
          <button type="button" className="vx-view-all" onClick={() => go('history')}>
            View all →
          </button>
        </div>
        <div className="vx-activity-empty">
          <div className="vx-activity-icon">
            <Clock3 size={18} />
          </div>
          <div>
            <strong>No recent activity</strong>
            <p>Wallet and order activity will show here.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
