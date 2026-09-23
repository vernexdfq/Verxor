import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Globe2,
  History,
  Phone,
  Plus,
  Smartphone,
  UserRound,
  Wifi,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Card, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '0.00', symbol: '₦', code: 'NGN' };

const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: typeof Smartphone;
  tone: string;
  service?: ServiceView;
}[] = [
  {
    id: 'virtual-numbers',
    title: 'Virtual Number',
    icon: Smartphone,
    tone: 'quick-icon-blue',
    service: 'virtual-numbers',
  },
  {
    id: 'rental',
    title: 'Rent Number',
    icon: Clock3,
    tone: 'quick-icon-cyan',
    service: 'rental',
  },
  {
    id: 'boost',
    title: 'SMM Boost',
    icon: Zap,
    tone: 'quick-icon-amber',
    service: 'boost',
  },
  {
    id: 'accounts',
    title: 'Buy Accounts',
    icon: UserRound,
    tone: 'quick-icon-violet',
    service: 'accounts',
  },
  { id: 'data', title: 'Data', icon: Wifi, tone: 'quick-icon-indigo' },
  { id: 'airtime', title: 'Airtime', icon: Phone, tone: 'quick-icon-sky' },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'quick-icon-rose' },
  {
    id: 'vcard',
    title: 'Virtual Card',
    icon: CreditCard,
    tone: 'quick-icon-emerald',
  },
];

const HOME_PROMOS = [
  {
    id: 'numbers',
    eyebrow: 'VIRTUAL NUMBERS',
    title: 'Get a verification number when you need one.',
    detail: 'Browse supported pools and place an order from your Verxor wallet.',
    action: 'Explore numbers',
    service: 'virtual-numbers' as ServiceView,
    icon: Smartphone,
    mark: 'VN',
  },
  {
    id: 'rental',
    eyebrow: 'RENT A LINE',
    title: 'Keep a dedicated line for longer workflows.',
    detail: 'Choose a rental period and manage the line from one dashboard.',
    action: 'View rentals',
    service: 'rental' as ServiceView,
    icon: Phone,
    mark: 'RL',
  },
  {
    id: 'growth',
    eyebrow: 'SMM BOOST',
    title: 'Run social growth orders with clear tracking.',
    detail: 'Choose a service, submit an order and follow its delivery status.',
    action: 'Open SMM',
    service: 'boost' as ServiceView,
    icon: Zap,
    mark: 'SM',
  },
] as const;

export function HomePage({
  go,
  openService,
}: {
  go: (page: Page) => void;
  openService: (view: ServiceView) => void;
}) {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <>
      <Card className="wallet-card">
        <div className="wallet-card-top">
          <span>AVAILABLE BALANCE</span>
          <span className="wallet-status">
            <i /> Active
          </span>
        </div>
        <div className="wallet-amount-row">
          <strong>
            {showBalance ? (
              <>
                {wallet.symbol}
                {wallet.amount}
              </>
            ) : (
              `${wallet.symbol}••••`
            )}
          </strong>
          <button
            className="balance-visibility"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            type="button"
            onClick={() => setShowBalance((v) => !v)}
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="wallet-actions">
          <button className="wallet-primary" type="button" onClick={() => go('fund')}>
            <Plus size={18} /> Fund Wallet
          </button>
          <button className="wallet-secondary" type="button" onClick={() => go('history')}>
            <History size={18} /> History
          </button>
        </div>
      </Card>

      <div className="quick-section">
        <p className="quick-section-label">QUICK ACTIONS</p>
        <div className="quick-grid-8">
          {QUICK_ACTIONS.map(({ id, title, icon: Icon, tone, service }) => (
            <button
              key={id}
              className="quick-tile"
              type="button"
              onClick={() => {
                if (service) openService(service);
              }}
              aria-label={title}
            >
              <span className={`quick-icon ${tone}`}>
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <strong>{title}</strong>
            </button>
          ))}
        </div>
      </div>

      <section className="home-promo-rail" aria-label="Featured services">
        {HOME_PROMOS.map(({ id, eyebrow, title, detail, action, service, icon: Icon, mark }) => (
          <article className="home-promo-card" key={id}>
            <div className="home-promo-main">
              <div className="home-promo-brand">
                <span className="home-promo-mark">{mark}</span>
                <span className="home-promo-tag">{eyebrow}</span>
              </div>
              <strong>{title}</strong>
              <p>{detail}</p>
              <button
                type="button"
                className="home-promo-cta"
                onClick={() => openService(service)}
              >
                {action} <ArrowRight size={14} />
              </button>
            </div>
            <div className="home-promo-icon" aria-hidden="true">
              <Icon size={24} strokeWidth={1.8} />
            </div>
          </article>
        ))}
      </section>

      <SectionHeader
        eyebrow="ACTIVITY"
        title="Recent activity"
        action={
          <button className="text-button" type="button" onClick={() => go('history')}>
            View all <ArrowRight size={14} />
          </button>
        }
      />
      <Card className="activity-empty">
        <div className="activity-empty-icon">
          <History size={18} />
        </div>
        <div>
          <strong>No recent activity</strong>
          <p>Wallet funding and orders will show up here.</p>
        </div>
      </Card>
    </>
  );
}
