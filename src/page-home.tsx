import { ArrowRight, Clock3, Eye, History, Plus, Smartphone, UserRound, Zap } from 'lucide-react';
import { Card, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const wallet = { amount: '0.00', symbol: '₦', code: 'NGN' };

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
      <SectionHeader eyebrow="SERVICES" title="Quick actions" />
      <div className="quick-grid">
        <button className="quick-card" type="button" onClick={() => openService('virtual-numbers')}>
          <span className="quick-icon quick-icon-blue">
            <Smartphone size={21} />
          </span>
          <span className="quick-copy">
            <strong>Virtual Numbers</strong>
            <small>OTP verification</small>
          </span>
        </button>
        <button className="quick-card" type="button" onClick={() => openService('rental')}>
          <span className="quick-icon quick-icon-violet">
            <Clock3 size={21} />
          </span>
          <span className="quick-copy">
            <strong>Rent a Line</strong>
            <small>Long-term numbers</small>
          </span>
        </button>
        <button className="quick-card" type="button" onClick={() => openService('boost')}>
          <span className="quick-icon quick-icon-amber">
            <Zap size={21} />
          </span>
          <span className="quick-copy">
            <strong>SMM Boost</strong>
            <small>Social growth</small>
          </span>
        </button>
        <button className="quick-card" type="button" onClick={() => openService('accounts')}>
          <span className="quick-icon quick-icon-cyan">
            <UserRound size={21} />
          </span>
          <span className="quick-copy">
            <strong>Buy Accounts</strong>
            <small>Available inventory</small>
          </span>
        </button>
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
