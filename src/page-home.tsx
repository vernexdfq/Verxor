'use client';

import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Globe,
  History,
  Phone,
  PhoneCall,
  Plus,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '7,570.00', symbol: '₦' };

/** Global services only — Nigerian VTU lives on Services page */
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
  { id: 'esim', title: 'eSIM', icon: Globe, tone: 'qa-royal', service: 'esim' },
  { id: 'proxies', title: 'Proxies', icon: ShieldCheck, tone: 'qa-green', service: 'proxies' },
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
    id: 'esim',
    badge: 'eSIM',
    headline: 'Stay connected abroad',
    subtext: 'Digital SIM profiles for travel.',
    cta: 'Get eSIM',
    service: 'esim',
    accent: 'promo-accent-sky',
  },
  {
    id: 'proxies',
    badge: 'PROXIES',
    headline: 'Secure residential IPs',
    subtext: 'Residential & datacenter proxies.',
    cta: 'Browse Proxies',
    service: 'proxies',
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
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % PROMO_SLIDES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const current = PROMO_SLIDES[slide];

  return (
    <div className="vx-home">
      <header className="vx-home-header">
        <div className="vx-home-user">
          <div className="vx-avatar">V</div>
          <div>
            <p className="vx-greeting">Good morning, DESTINY 🌞</p>
            <p className="vx-sub">Your Verxor Dashboard</p>
          </div>
        </div>
        <button type="button" className="vx-bell" aria-label="Notifications">
          <span className="vx-bell-dot" />
        </button>
      </header>

      <section className="vx-wallet-card">
        <div className="vx-wallet-top">
          <span className="vx-wallet-label">AVAILABLE BALANCE</span>
          <span className="vx-wallet-status">
            <span className="vx-status-dot" /> Active
          </span>
        </div>
        <div className="vx-wallet-row">
          <p className="vx-balance">
            {showBalance ? `${wallet.symbol}${wallet.amount}` : `${wallet.symbol}••••••`}
          </p>
          <button
            type="button"
            className="vx-eye"
            onClick={() => setShowBalance((v) => !v)}
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="vx-wallet-actions">
          <button type="button" className="vx-btn-primary" onClick={() => go('fund')}>
            <Plus size={16} /> Fund Wallet
          </button>
          <button type="button" className="vx-btn-ghost" onClick={() => go('history')}>
            <History size={16} /> History
          </button>
        </div>
      </section>

      <section className="vx-section">
        <p className="vx-section-label">QUICK ACTIONS</p>
        <div className="vx-qa-grid">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="vx-qa-item"
                onClick={() => item.service && openService(item.service)}
              >
                <span className={`vx-qa-icon ${item.tone}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="vx-qa-title">{item.title}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`vx-promo ${current.accent}`}>
        <span className="vx-promo-badge">{current.badge}</span>
        <h2 className="vx-promo-title">{current.headline}</h2>
        <p className="vx-promo-sub">{current.subtext}</p>
        <button
          type="button"
          className="vx-promo-cta"
          onClick={() => current.service && openService(current.service)}
        >
          {current.cta} <ArrowRight size={16} />
        </button>
        <div className="vx-promo-dots">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === slide ? 'is-active' : ''}
              onClick={() => setSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      <section className="vx-section">
        <div className="vx-section-row">
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
