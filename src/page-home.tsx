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
  id: string;
  title: string;
  icon: typeof Smartphone;
  tone: string;
  service?: ServiceView;
}[] = [
  { id: 'virtual-numbers', title: 'Virtual Number', icon: Smartphone, tone: 'quick-icon-blue', service: 'virtual-numbers' },
  { id: 'rental', title: 'Rent Number', icon: Clock3, tone: 'quick-icon-cyan', service: 'rental' },
  { id: 'boost', title: 'SMM Boost', icon: Zap, tone: 'quick-icon-amber', service: 'boost' },
  { id: 'accounts', title: 'Buy Accounts', icon: UserRound, tone: 'quick-icon-violet', service: 'accounts' },
  { id: 'data', title: 'Data', icon: Wifi, tone: 'quick-icon-indigo' },
  { id: 'airtime', title: 'Airtime', icon: Phone, tone: 'quick-icon-sky' },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'quick-icon-rose' },
  { id: 'vcard', title: 'Virtual Card', icon: CreditCard, tone: 'quick-icon-emerald' },
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

      {/* Promo / ad strip — Vernex-style slot under quick actions */}
      <section className="home-promo" aria-label="Promotions">
        <div className="home-promo-card">
          <div className="home-promo-copy">
            <span className="home-promo-tag">FEATURED</span>
            <strong>Grow faster with SMM Boost</strong>
            <p>Followers, likes and views — clear delivery tracking.</p>
          </div>
          <button type="button" className="home-promo-cta" onClick={() => openService('boost')}>
            Boost now <ArrowRight size={14} />
          </button>
        </div>
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
          <p>Your wallet activity and orders will appear here.</p>
        </div>
      </Card>
    </>
  );
}
