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
            {wallet.symbol}
            {wallet.amount}
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

export function HistoryPage() {
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">ACTIVITY</p>
        <h1>History</h1>
        <p>Wallet activity and service orders in one timeline.</p>
      </section>
      <div className="history-filters">
        <button className="filter-active">All</button>
        <button>Wallet</button>
        <button>Numbers</button>
        <button>Orders</button>
      </div>
      <Card className="activity-empty page-empty">
        <div className="activity-empty-icon">
          <History size={19} />
        </div>
        <strong>No activity yet</strong>
        <p>Fund your wallet or place an order and your activity will appear here.</p>
      </Card>
    </>
  );
}

export function FundPage() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(region.methods[0]?.id ?? 'card');
  const [status, setStatus] = useState<'idle' | 'ready'>('idle');

  const numeric = useMemo(() => {
    const n = Number(String(amount).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const canContinue = numeric > 0 && Boolean(method);

  const onPreset = (value: number) => {
    setAmount(String(value));
    setStatus('idle');
  };

  const onContinue = () => {
    if (!canContinue) return;
    setStatus('ready');
  };

  return (
    <>
      <section className="page-intro fund-intro">
        <p className="eyebrow">WALLET</p>
        <h1>Fund</h1>
        <p>
          Add money in {wallet.code}. Methods match your account region ({wallet.regionLabel}).
        </p>
      </section>

      <Card className="fund-summary">
        <div>
          <span>AVAILABLE BALANCE · {wallet.code}</span>
          <strong>
            {wallet.symbol}
            {wallet.amount}
          </strong>
        </div>
        <WalletCards size={22} />
      </Card>

      <Card className="fund-card fund-card-clean">
        <label htmlFor="fund-amount">Amount</label>
        <div className="amount-input">
          <span>{wallet.symbol}</span>
          <input
            id="fund-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ''));
              setStatus('idle');
            }}
            aria-label="Funding amount"
          />
        </div>

        <div className={`amount-options amount-options-${region.presets.length}`}>
          {region.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={numeric === preset ? 'preset-active' : undefined}
              onClick={() => onPreset(preset)}
            >
              {formatMoney(preset)}
            </button>
          ))}
        </div>

        <div className="fund-method-block">
          <span className="fund-method-label">Payment method</span>
          <div className="fund-method-list" role="radiogroup" aria-label="Payment method">
            {region.methods.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`fund-method${active ? ' active' : ''}`}
                  onClick={() => {
                    setMethod(m.id);
                    setStatus('idle');
                  }}
                >
                  <span className="fund-method-icon">
                    {m.icon === 'card' ? (
                      <CreditCard size={18} />
                    ) : m.icon === 'bank' ? (
                      <Building2 size={18} />
                    ) : (
                      <Smartphone size={18} />
                    )}
                  </span>
                  <span className="fund-method-copy">
                    <strong>{m.title}</strong>
                    <small>{m.description}</small>
                  </span>
                  <span className={`fund-method-check${active ? ' on' : ''}`} aria-hidden>
                    {active ? <Check size={14} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <PrimaryButton disabled={!canContinue} onClick={onContinue}>
          {status === 'ready' ? (
            <>
              <Check size={18} /> Ready for checkout
            </>
          ) : (
            <>
              <Plus size={18} /> Continue
            </>
          )}
        </PrimaryButton>

        {status === 'ready' && (
          <p className="fund-ready-note">
            Amount {formatMoney(numeric)} via {region.methods.find((x) => x.id === method)?.title}. Flutterwave
            checkout opens here once the live session is wired for your region.
          </p>
        )}
      </Card>

      <Card className="security-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Secure funding</strong>
          <p>Confirmation and wallet credit appear in History after the payment provider confirms.</p>
        </div>
      </Card>
    </>
  );
}

export function NumbersPage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <>
      <section className="page-intro numbers-intro">
        <p className="eyebrow">NUMBERS</p>
        <h1>Choose a number service</h1>
        <p>Use a virtual number for OTPs or rent a line for longer-term access.</p>
      </section>
      <div className="number-choice-list">
        <button className="number-choice" onClick={() => openService('virtual-numbers')}>
          <span className="number-choice-icon">
            <Smartphone size={22} />
          </span>
          <span>
            <strong>Virtual Numbers</strong>
            <small>OTP verification</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button className="number-choice" onClick={() => openService('rental')}>
          <span className="number-choice-icon">
            <Clock3 size={22} />
          </span>
          <span>
            <strong>Rent a Line</strong>
            <small>Long-term numbers</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
      <SectionHeader
        eyebrow="ACTIVITY"
        title="Number history"
        action={
          <button className="text-button">
            View all <ArrowRight size={14} />
          </button>
        }
      />
      <Card className="activity-empty">
        <div className="activity-empty-icon">
          <History size={19} />
        </div>
        <strong>No number activity</strong>
        <p>Your number orders and rentals will appear here.</p>
      </Card>
    </>
  );
}

/**
 * Professional profile shell.
 * Structure: Fleexa-style sections + Primex depth where specified.
 * Colors: Verxor primary only. No delete account. Phone/email locked.
 */
export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <>
      {/* Header card */}
      <section className="profile-hero-card" aria-label="Profile summary">
        <div className="profile-hero-inner">
          <div className="profile-avatar-lg">V</div>
          <div className="profile-hero-copy">
            <strong>Destiny</strong>
            <small>vernexdfq@gmail.com</small>
          </div>
          <button
            type="button"
            className="profile-open-btn"
            onClick={() => openService('edit-profile')}
          >
            PROFILE <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Refer & Earn */}
      <button
        type="button"
        className="refer-earn-card"
        onClick={() => openService('referral')}
      >
        <span className="refer-earn-icon">
          <Gift size={20} />
        </span>
        <span className="refer-earn-copy">
          <strong>Refer &amp; Earn</strong>
          <small>Get 10% of every referral&apos;s first deposit</small>
        </span>
        <span className="refer-earn-cta">Invite</span>
      </button>

      {/* Account settings */}
      <ProfileGroup title="ACCOUNT SETTINGS">
        <ProfileItem
          icon={<Bell size={19} />}
          title="Notifications"
          description="Push, Email, Alerts"
          onClick={() => openService('notifications-prefs')}
        />
        <ProfileItem
          icon={<ShieldCheck size={19} />}
          title="Security"
          description="Password, PIN, Biometrics, 2FA"
          onClick={() => openService('security')}
        />
      </ProfileGroup>

      {/* Management */}
      <ProfileGroup title="MANAGEMENT">
        <ProfileItem
          icon={<Globe2 size={19} />}
          title="Child Panel"
          description="Run your own white-label site"
          onClick={() => openService('child-panel')}
        />
        <ProfileItem
          icon={<KeyRound size={19} />}
          title="API Keys"
          description="Manage API credentials & webhooks"
          onClick={() => openService('api-keys')}
        />
        <ProfileItem
          icon={<MessageSquare size={19} />}
          title="Support Center"
          description="Help docs, tickets & channels"
          onClick={() => openService('support-center')}
        />
      </ProfileGroup>

      <section className="profile-group account-danger">
        <button type="button" className="logout-button">
          <LogOut size={18} /> Log out
        </button>
      </section>
    </>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="profile-group">
      <h2>{title}</h2>
      <Card className="profile-list">{children}</Card>
    </section>
  );
}

function ProfileItem({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="profile-item-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {onClick ? <ArrowRight size={17} /> : null}
    </>
  );
  return onClick ? (
    <button type="button" className="profile-item" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="profile-item">{content}</div>
  );
}
