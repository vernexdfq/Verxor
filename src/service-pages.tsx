import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Gift,
  Globe2,
  Instagram,
  KeyRound,
  LockKeyhole,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import './service-pages.css';
import { PromoCarousel, type PromoBanner } from './components/PromoCarousel';
import './components/PromoCarousel.css';
import { NotificationsPage } from './notifications-page';
import { SOCIAL } from './lib/social';

export type ServiceView =
  | 'services'
  | 'virtual-numbers'
  | 'rental'
  | 'boost'
  | 'boost-orders'
  | 'accounts'
  | 'account-orders'
  | 'number-orders'
  | 'rewards'
  | 'affiliate'
  | 'alerts'
  | 'settings'
  | 'security'
  | 'notifications-prefs'
  | 'community'
  | 'feedback'
  | 'help'
  | 'privacy'
  | 'edit-profile'
  | 'referral'
  | 'child-panel'
  | 'api-keys'
  | 'support-center';

const catalog = [
  {
    id: 'virtual-numbers' as const,
    title: 'Virtual Numbers',
    eyebrow: 'OTP VERIFICATION',
    description: 'Choose a country and service, then review available numbers.',
    icon: Phone,
  },
  {
    id: 'rental' as const,
    title: 'Rent a Line',
    eyebrow: 'DEDICATED LINE',
    description: 'Choose a private number and the rental period you need.',
    icon: Clock3,
  },
  {
    id: 'boost' as const,
    title: 'SMM Boost',
    eyebrow: 'SOCIAL GROWTH',
    description: 'Browse growth services with clear order tracking.',
    icon: Instagram,
  },
  {
    id: 'accounts' as const,
    title: 'Buy Accounts',
    eyebrow: 'ACCOUNT INVENTORY',
    description: 'Review available inventory and delivery information.',
    icon: Users,
  },
];

function ServiceLayout({
  title,
  eyebrow,
  description,
  onBack,
  children,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button className="back-button" onClick={onBack} aria-label={`Back from ${title}`}>
        <ArrowLeft size={17} /> Back
      </button>
      <section className="page-intro compact-intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </section>
      {children}
    </>
  );
}

function EmptyOrders({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="empty-card compact-empty">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </Card>
  );
}

const FEATURED_BANNERS: PromoBanner[] = [
  { id: 'virtual-numbers', title: 'Virtual Numbers', image: '/banners/virtual-numbers.svg', destination: '/services/virtual-numbers', action: 'Order Now' },
  { id: 'boost-account', title: 'Boost Account', image: '/banners/boost-account.svg', destination: '/services/boost', action: 'Boost Now' },
  { id: 'rent-number', title: 'Rent a Number', image: '/banners/rent-number.svg', destination: '/services/rent-number', action: 'Open Hub' },
  { id: 'virtual-card', title: 'Virtual Card', image: '/banners/virtual-card.svg', destination: '/services/virtual-card', action: 'Get Card' },
];

export function ServicesPage({ open }: { open: (view: ServiceView) => void }) {
  return (
    <>
      <PromoCarousel
        items={FEATURED_BANNERS}
        label="Featured Verxor services"
        onSelect={(item) => {
          if (item.id === 'virtual-numbers') open('virtual-numbers');
          else if (item.id === 'boost-account') open('boost');
          else if (item.id === 'rent-number') open('rental');
          else open('services');
        }}
      />
      <section className="page-intro">
        <p className="eyebrow">VERXOR SERVICES</p>
        <h1>Services</h1>
        <p>Choose a service to get started.</p>
      </section>
      <div className="service-stack">
        {catalog.map(({ id, title, eyebrow, description, icon: Icon }) => (
          <button className="product-card" key={id} onClick={() => open(id)} type="button">
            <span className="product-icon">
              <Icon size={20} />
            </span>
            <span>
              <em>{eyebrow}</em>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>
    </>
  );
}

export function ServicePage({ view, onBack }: { view: Exclude<ServiceView, 'services'>; onBack: () => void }) {
  if (view === 'alerts') return <NotificationsPage onBack={onBack} />;

  if (view === 'child-panel') {
    return (
      <ServiceLayout
        title="Child Panel"
        eyebrow="WHITE-LABEL"
        description="Run your own branded site. Pricing for Child Panel is separate from API usage."
        onBack={onBack}
      >
        <Card className="form-card">
          <p className="settings-section-label" style={{ marginTop: 0 }}>
            Available to all users
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
            Child Panel lets you offer Verxor services under your own brand. Panel pricing and API pricing are not the
            same — Child Panel is a white-label product with its own plan, while API keys are for programmatic access.
          </p>
          <PrimaryButton type="button">Get started</PrimaryButton>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'api-keys') {
    return (
      <ServiceLayout
        title="API Keys"
        eyebrow="DEVELOPERS"
        description="Generate keys for programmatic access. API pricing is separate from Child Panel."
        onBack={onBack}
      >
        <Card className="form-card">
          <p className="settings-section-label" style={{ marginTop: 0 }}>
            Your API key
          </p>
          <code style={{ display: 'block', marginBottom: 12, fontSize: 12, wordBreak: 'break-all' }}>
            vx_live_••••••••••••••••
          </code>
          <PrimaryButton type="button">Generate new key</PrimaryButton>
          <p className="settings-footnote">
            API usage is billed differently from Child Panel white-label plans.
          </p>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'referral') {
    return (
      <ServiceLayout
        title="Referral Program"
        eyebrow="EARN 10%"
        description="Earn 10% of each referral's first deposit, instantly — once per user."
        onBack={onBack}
      >
        <div className="referral-stats-grid">
          <div className="referral-stat">
            <strong>0</strong>
            <small>Total referrals</small>
          </div>
          <div className="referral-stat">
            <strong>0</strong>
            <small>Successful</small>
          </div>
          <div className="referral-stat">
            <strong>0</strong>
            <small>Pending</small>
          </div>
          <div className="referral-stat">
            <strong>0</strong>
            <small>Flagged</small>
          </div>
        </div>
        <div className="referral-earnings">
          <Gift size={22} color="#16a34a" />
          <div>
            <small>Total referral earnings</small>
            <strong>₦0.00</strong>
          </div>
        </div>
        <Card className="form-card">
          <p className="settings-footnote" style={{ marginTop: 0 }}>
            Referral history stays empty until a referred user completes their first successful deposit.
          </p>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'edit-profile') {
    return (
      <ServiceLayout
        title="Edit Profile"
        eyebrow="ACCOUNT"
        description="Update your personal information. Phone and email cannot be changed."
        onBack={onBack}
      >
        <Card className="form-card">
          <label htmlFor="full-name">Full name</label>
          <input id="full-name" className="form-input" defaultValue="Destiny" />
          <label htmlFor="username">Username</label>
          <input id="username" className="form-input" defaultValue="dennykay042" />
          <label htmlFor="phone-locked">Phone number</label>
          <input id="phone-locked" className="form-input locked" value="08141620644" readOnly disabled />
          <label htmlFor="email-locked">Email address</label>
          <input id="email-locked" className="form-input locked" value="vernexdfq@gmail.com" readOnly disabled />
          <PrimaryButton type="button">Save changes</PrimaryButton>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'security') {
    return (
      <ServiceLayout title="Security" eyebrow="AUTHENTICATION" description="Secure your account and transactions." onBack={onBack}>
        <Card className="form-card">
          <p className="settings-section-label" style={{ marginTop: 0 }}>
            LOGIN PASSWORD
          </p>
          <label htmlFor="current-pw">Current password</label>
          <input id="current-pw" className="form-input" type="password" placeholder="Current password" />
          <label htmlFor="new-pw">New password</label>
          <input id="new-pw" className="form-input" type="password" placeholder="New password" />
          <PrimaryButton type="button">Update password</PrimaryButton>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'support-center') {
    return (
      <ServiceLayout title="Support Center" eyebrow="HELP" description="Channels, FAQs and feedback." onBack={onBack}>
        <Card className="form-card">
          <a href={SOCIAL.whatsappChannel || '#'} target="_blank" rel="noreferrer" className="profile-item" style={{ textDecoration: 'none' }}>
            <span className="profile-item-icon">
              <MessageCircle size={19} />
            </span>
            <span>
              <strong>WhatsApp</strong>
              <small>Chat with support</small>
            </span>
            <ArrowRight size={17} />
          </a>
          <a href={SOCIAL.telegramChannel || '#'} target="_blank" rel="noreferrer" className="profile-item" style={{ textDecoration: 'none' }}>
            <span className="profile-item-icon">
              <Send size={19} />
            </span>
            <span>
              <strong>Telegram</strong>
              <small>Community & updates</small>
            </span>
            <ArrowRight size={17} />
          </a>
          <a href={`mailto:${SOCIAL.email || 'support@verxor.com'}`} className="profile-item" style={{ textDecoration: 'none' }}>
            <span className="profile-item-icon">
              <Mail size={19} />
            </span>
            <span>
              <strong>Email</strong>
              <small>{SOCIAL.email || 'support@verxor.com'}</small>
            </span>
            <ArrowRight size={17} />
          </a>
        </Card>
      </ServiceLayout>
    );
  }

  const title = view.replace(/-/g, ' ');
  return (
    <ServiceLayout title={title} eyebrow="SERVICE" onBack={onBack}>
      <EmptyOrders icon={<Package size={18} />} title="Coming soon" text="This section is available from the main navigation." />
    </ServiceLayout>
  );
}
