import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Gift,
  Globe2,
  History,
  KeyRound,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

type AccountRegion = 'NG' | 'US' | 'GH' | 'GB';

const accountRegion: AccountRegion = 'NG';

const REGION_CONFIG: Record<
  AccountRegion,
  {
    code: string;
    symbol: string;
    label: string;
    presets: number[];
    methods: { id: string; title: string; description: string; icon: 'card' | 'bank' | 'ussd' }[];
  }
> = {
  NG: {
    code: 'NGN',
    symbol: '₦',
    label: 'Nigeria',
    presets: [2000, 5000, 10000, 25000],
    methods: [
      { id: 'bank', title: 'Bank transfer', description: 'Pay with your Nigerian bank', icon: 'bank' },
      { id: 'card', title: 'Card', description: 'Visa, Mastercard, Verve', icon: 'card' },
      { id: 'ussd', title: 'USSD', description: 'Pay from any mobile line', icon: 'ussd' },
    ],
  },
  US: {
    code: 'USD',
    symbol: '$',
    label: 'United States',
    presets: [10, 25, 50, 100],
    methods: [
      { id: 'card', title: 'Card', description: 'Visa, Mastercard, Amex', icon: 'card' },
      { id: 'bank', title: 'Bank / ACH', description: 'US bank account', icon: 'bank' },
    ],
  },
  GH: {
    code: 'GHS',
    symbol: 'GH₵',
    label: 'Ghana',
    presets: [50, 100, 200, 500],
    methods: [
      { id: 'momo', title: 'Mobile money', description: 'MTN, Vodafone, AirtelTigo', icon: 'ussd' },
      { id: 'card', title: 'Card', description: 'Local and international cards', icon: 'card' },
    ],
  },
  GB: {
    code: 'GBP',
    symbol: '£',
    label: 'United Kingdom',
    presets: [10, 25, 50, 100],
    methods: [
      { id: 'card', title: 'Card', description: 'Visa, Mastercard', icon: 'card' },
      { id: 'bank', title: 'Bank transfer', description: 'UK account', icon: 'bank' },
    ],
  },
};

const region = REGION_CONFIG[accountRegion];

const wallet = {
  amount: '0.00',
  code: region.code,
  symbol: region.symbol,
  regionLabel: region.label,
};

function formatMoney(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: wallet.code,
      maximumFractionDigits: wallet.code === 'NGN' ? 0 : 2,
    }).format(value);
  } catch {
    return `${wallet.symbol}${value}`;
  }
}

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
            {wallet.code}&nbsp;{wallet.amount}
          </strong>
          <button className="balance-visibility" aria-label="Show balance">
            <Eye size={18} />
          </button>
        </div>
        <div className="wallet-actions">
          <button className="wallet-primary" onClick={() => go('fund')}>
            <Plus size={18} /> Fund Wallet
          </button>
          <button className="wallet-secondary" onClick={() => go('history')}>
            <History size={18} /> History
          </button>
        </div>
      </Card>
      <SectionHeader eyebrow="SERVICES" title="Quick actions" />
      <div className="quick-grid">
        <button className="quick-card" onClick={() => openService('virtual-numbers')}>
          <span className="quick-icon quick-icon-blue">
            <Smartphone size={21} />
          </span>
          <span className="quick-copy">
            <strong>Virtual Numbers</strong>
            <small>OTP verification</small>
          </span>
        </button>
        <button className="quick-card" onClick={() => openService('rental')}>
          <span className="quick-icon quick-icon-violet">
            <Clock3 size={21} />
          </span>
          <span className="quick-copy">
            <strong>Rent a Line</strong>
            <small>Long-term numbers</small>
          </span>
        </button>
        <button className="quick-card" onClick={() => openService('boost')}>
          <span className="quick-icon quick-icon-amber">
            <Zap size={21} />
          </span>
          <span className="quick-copy">
            <strong>SMM Boost</strong>
            <small>Social growth</small>
          </span>
        </button>
        <button className="quick-card" onClick={() => openService('accounts')}>
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
          <button className="text-button" onClick={() => go('history')}>
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
