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
  Facebook,
  FileText,
  History,
  Instagram,
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
import { SOCIAL } from './lib/social';

/**
 * Account region drives wallet currency + payment methods.
 * Production: set from signup phone / SIM / profile (not hard-coded forever).
 * Demo default: NG so Naira + local methods show for the primary market.
 */
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

// Demo presentation only. Production wallet data will come from the authenticated account.
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
            Amount {formatMoney(numeric)} via {region.methods.find((x) => x.id === method)?.title}.
            Flutterwave checkout opens here once the live session is wired for your region.
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

/** X (Twitter) mark — lucide has no stable X icon in this version */
function XIcon({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.83 2.83 0 0 1-2.79 2.81 2.83 2.83 0 0 1-2.81-2.81 2.83 2.83 0 0 1 2.81-2.81c.28 0 .56.04.83.11v-3.5a6.37 6.37 0 0 0-1.08-.09A6.26 6.26 0 0 0 3 16.4a6.26 6.26 0 0 0 6.26 6.26 6.26 6.26 0 0 0 6.26-6.26V8.9a8.2 8.2 0 0 0 4.77 1.52V6.97a4.85 4.85 0 0 1-.7-.28Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  const [copied, setCopied] = useState(false);
  const referralCode = 'VERXOR-DENNY';

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <section className="profile-summary" aria-label="Profile summary">
        <div className="profile-avatar">V</div>
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>Your profile</h1>
          <p>
            Member since 2026 · {wallet.regionLabel} · {wallet.code}
          </p>
        </div>
      </section>

      <ProfileGroup title="ACCOUNT INFORMATION">
        <ProfileItem
          icon={<UserRound size={19} />}
          title="Personal information"
          description="Name, username, phone and email"
          onClick={() => openService('settings')}
        />
      </ProfileGroup>

      <ProfileGroup title="PREFERENCES">
        <ProfileItem
          icon={<MapPin size={19} />}
          title="Currency & Region"
          description={`${wallet.code} · ${wallet.regionLabel}`}
          onClick={() => openService('settings')}
        />
        <ProfileItem
          icon={<Bell size={19} />}
          title="Notifications"
          description="Order, wallet and security alerts"
          onClick={() => openService('settings')}
        />
      </ProfileGroup>

      <ProfileGroup title="SECURITY">
        <ProfileItem
          icon={<LockKeyhole size={19} />}
          title="Security"
          description="Password, PIN and active sessions"
          onClick={() => openService('settings')}
        />
        <ProfileItem
          icon={<FileText size={19} />}
          title="Privacy policy"
          description="How we handle your data"
          onClick={() => openService('privacy')}
        />
      </ProfileGroup>

      <ProfileGroup title="SUPPORT">
        <ProfileItem
          icon={<ShieldCheck size={19} />}
          title="Help Center"
          description="Guides and common questions"
          onClick={() => openService('help')}
        />
        <ProfileItem
          icon={<MessageSquare size={19} />}
          title="Contact support"
          description="Telegram · WhatsApp · Email"
          onClick={() => openService('feedback')}
        />
        <ProfileItem
          icon={<MessageCircle size={19} />}
          title="Send feedback"
          description="Report a bug or suggest a feature"
          onClick={() => openService('feedback')}
        />
      </ProfileGroup>

      <ProfileGroup title="COMMUNITY">
        <ProfileExternal
          href={SOCIAL.telegramChannel}
          icon={<Send size={19} />}
          iconClass="profile-item-icon-telegram"
          title="Telegram"
          description="Announcements and updates"
        />
        <ProfileExternal
          href={SOCIAL.whatsappChannel}
          icon={<MessageCircle size={19} />}
          iconClass="profile-item-icon-whatsapp"
          title="WhatsApp"
          description="Official channel"
        />
        {SOCIAL.instagram ? (
          <ProfileExternal
            href={SOCIAL.instagram}
            icon={<Instagram size={19} />}
            iconClass="profile-item-icon-instagram"
            title="Instagram"
            description="@verxorofficial"
          />
        ) : null}
        {SOCIAL.twitter ? (
          <ProfileExternal
            href={SOCIAL.twitter}
            icon={<XIcon size={19} />}
            iconClass="profile-item-icon-x"
            title="X (Twitter)"
            description="@VerxorOfficial"
          />
        ) : null}
        {SOCIAL.facebook ? (
          <ProfileExternal
            href={SOCIAL.facebook}
            icon={<Facebook size={19} />}
            iconClass="profile-item-icon-facebook"
            title="Facebook"
            description="Verxor official"
          />
        ) : null}
        {SOCIAL.tiktok ? (
          <ProfileExternal
            href={SOCIAL.tiktok}
            icon={<TikTokIcon size={19} />}
            iconClass="profile-item-icon-tiktok"
            title="TikTok"
            description="@verxorofficial"
          />
        ) : null}
      </ProfileGroup>

      <section className="profile-group">
        <h2>REFERRAL</h2>
        <Card className="profile-referral-card">
          <div className="referral-copy">
            <span className="referral-label">REFERRAL CODE</span>
            <strong>{referralCode}</strong>
          </div>
          <button
            className="profile-copy-button"
            onClick={copyReferral}
            aria-label={copied ? 'Referral code copied' : 'Copy referral code'}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </Card>
      </section>

      <section className="profile-group account-danger">
        <h2>ACCOUNT</h2>
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

function ProfileExternal({
  href,
  icon,
  iconClass,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: string;
}) {
  return (
    <a className="profile-item profile-item-link" href={href} target="_blank" rel="noopener noreferrer">
      <span className={`profile-item-icon ${iconClass}`}>{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={17} />
    </a>
  );
}
