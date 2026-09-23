import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  Gift,
  History,
  Phone,
  Plus,
  Smartphone,
  UserRound,
  Wifi,
  Zap,
} from 'lucide-react';
import { Card, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '0.00', symbol: '₦', code: 'NGN' };

const QUICK_ACTIONS: {
  id: ServiceView | 'coming-data' | 'coming-airtime' | 'coming-gift' | 'coming-vcard';
  title: string;
  subtitle: string;
  icon: typeof Smartphone;
  tone: string;
  service?: ServiceView;
}[] = [
  {
    id: 'virtual-numbers',
    title: 'Virtual Number',
    subtitle: 'OTP codes',
    icon: Smartphone,
    tone: 'quick-icon-blue',
    service: 'virtual-numbers',
  },
  {
    id: 'rental',
    title: 'Rent Number',
    subtitle: 'Long-term',
    icon: Clock3,
    tone: 'quick-icon-cyan',
    service: 'rental',
  },
  {
    id: 'boost',
    title: 'SMM Boost',
    subtitle: 'Social growth',
    icon: Zap,
    tone: 'quick-icon-amber',
    service: 'boost',
  },
  {
    id: 'accounts',
    title: 'Buy Accounts',
    subtitle: 'Inventory',
    icon: UserRound,
    tone: 'quick-icon-violet',
    service: 'accounts',
  },
  {
    id: 'coming-data',
    title: 'Data',
    subtitle: 'Mobile data',
    icon: Wifi,
    tone: 'quick-icon-indigo',
  },
  {
    id: 'coming-airtime',
    title: 'Airtime',
    subtitle: 'Top-up',
    icon: Phone,
    tone: 'quick-icon-sky',
  },
  {
    id: 'coming-gift',
    title: 'Gift Card',
    subtitle: 'Trade cards',
    icon: Gift,
    tone: 'quick-icon-rose',
  },
  {
    id: 'coming-vcard',
    title: 'Virtual Card',
    subtitle: 'Spend online',
    icon: CreditCard,
    tone: 'quick-icon-emerald',
  },
];

export function HomePage({ go, openService }: { go: (page: Page) => void; openService: (view: ServiceView) => void }) {
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
            {wallet.symbol}
            {wallet.amount}
          </strong>
          <button className="balance-visibility" aria-label="Show balance" type="button">
            <Eye size={18} />
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
        <div className="quick-grid quick-grid-8">
          {QUICK_ACTIONS.map(({ id, title, subtitle, icon: Icon, tone, service }) => (
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
              <small>{subtitle}</small>
            </button>
          ))}
        </div>
      </div>

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
          <p>Your wallet activity and orders will appear here.</p>
        </div>
      </Card>
    </>
  );
}
