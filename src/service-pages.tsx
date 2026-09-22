import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gift,
  Instagram,
  KeyRound,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import './service-pages.css';
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
  | 'feedback'
  | 'help'
  | 'privacy';

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

export function ServicesPage({ open }: { open: (view: ServiceView) => void }) {
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">VERXOR SERVICES</p>
        <h1>Services</h1>
        <p>Choose a service to get started.</p>
      </section>
      <div className="service-stack">
        {catalog.map(({ id, title, eyebrow, description, icon: Icon }) => (
          <button className="product-card" key={id} onClick={() => open(id)}>
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

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row setting-row-toggle">
      <div>
        <strong>{title}</strong>
        <small>{description}</small>
      </div>
      <button
        type="button"
        className={`pref-toggle${checked ? ' on' : ''}`}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
      >
        <span className="pref-toggle-knob" />
      </button>
    </div>
  );
}

export function ServicePage({ view, onBack }: { view: Exclude<ServiceView, 'services'>; onBack: () => void }) {
  const [ordersEmail, setOrdersEmail] = useState(true);
  const [walletEmail, setWalletEmail] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [promoPush, setPromoPush] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  if (view === 'virtual-numbers' || view === 'rental' || view === 'boost' || view === 'accounts') {
    // Product surfaces live in dedicated modules (virtual-numbers-page, rental-page, product-pages).
    // Keep thin stubs only if routed here by mistake.
    const titles: Record<string, { t: string; e: string; d: string }> = {
      'virtual-numbers': {
        t: 'Virtual Numbers',
        e: 'OTP VERIFICATION',
        d: 'Open from Home or Numbers for the full Server 1 / Server 2 catalog.',
      },
      rental: {
        t: 'Rent a Line',
        e: 'DEDICATED LINE',
        d: 'Open Rent a Line from Home for the full rental workspace.',
      },
      boost: {
        t: 'SMM Boost',
        e: 'SOCIAL GROWTH',
        d: 'Browse growth services with clear order tracking.',
      },
      accounts: {
        t: 'Buy Accounts',
        e: 'ACCOUNT INVENTORY',
        d: 'Browse current inventory and review delivery information.',
      },
    };
    const meta = titles[view];
    return (
      <ServiceLayout title={meta.t} eyebrow={meta.e} description={meta.d} onBack={onBack}>
        <Card className="empty-card compact-empty">
          <strong>Use the main service entry</strong>
          <p>This route is a shell. Enter from Home or Numbers for the live catalog.</p>
        </Card>
      </ServiceLayout>
    );
  }

  if (view === 'number-orders')
    return (
      <ServiceLayout title="Number orders" eyebrow="ORDERS" description="Keep track of your verification number activity." onBack={onBack}>
        <EmptyOrders icon={<KeyRound size={18} />} title="No number orders" text="Your completed and active verification orders will appear here." />
      </ServiceLayout>
    );
  if (view === 'boost-orders')
    return (
      <ServiceLayout title="Boost orders" eyebrow="ORDERS" description="Track delivery and status for your growth orders." onBack={onBack}>
        <EmptyOrders icon={<Package size={18} />} title="No boost orders" text="Orders you place will appear here with their current status." />
      </ServiceLayout>
    );
  if (view === 'account-orders')
    return (
      <ServiceLayout title="Account orders" eyebrow="ORDERS" description="Review your account purchase history." onBack={onBack}>
        <EmptyOrders icon={<Users size={18} />} title="No account orders" text="Your account purchases will appear here." />
      </ServiceLayout>
    );
  if (view === 'rewards')
    return (
      <ServiceLayout title="Rewards" eyebrow="REWARDS" description="See your earned rewards and available benefits." onBack={onBack}>
        <Card className="reward-card">
          <Gift size={22} />
          <div>
            <small>Total rewards</small>
            <strong>₦0.00</strong>
          </div>
        </Card>
        <Card className="info-card">
          <CheckCircle2 size={18} />
          <div>
            <strong>Rewards</strong>
            <p>Eligible rewards will be reflected here automatically.</p>
          </div>
        </Card>
      </ServiceLayout>
    );
  if (view === 'affiliate')
    return (
      <ServiceLayout title="Affiliate" eyebrow="REFERRALS" description="Share your referral link and track eligible rewards." onBack={onBack}>
        <Card className="referral-card">
          <small>Your referral link</small>
          <strong>verxor.com/ref/your-link</strong>
          <button type="button" className="copy-button">
            Copy link
          </button>
        </Card>
      </ServiceLayout>
    );
  if (view === 'alerts') return <NotificationsPage onBack={onBack} />;

  if (view === 'settings')
    return (
      <ServiceLayout
        title="Account & Security"
        eyebrow="ACCOUNT SETTINGS"
        description="Region is set from the phone you registered with. Security controls live here."
        onBack={onBack}
      >
        <Card className="settings-list">
          <div className="setting-row">
            <div>
              <strong>Currency & Region</strong>
              <small>Set by registration phone · change via support if you move</small>
            </div>
            <ArrowRight size={17} />
          </div>
          <div className="setting-row">
            <div>
              <strong>Password</strong>
              <small>Update your account password</small>
            </div>
            <ArrowRight size={17} />
          </div>
          <div className="setting-row">
            <div>
              <strong>Transaction PIN</strong>
              <small>Required for sensitive wallet actions</small>
            </div>
            <ArrowRight size={17} />
          </div>
          <div className="setting-row">
            <div>
              <strong>Sessions</strong>
              <small>Review devices signed in to your account</small>
            </div>
            <ArrowRight size={17} />
          </div>
        </Card>

        <p className="settings-section-label">NOTIFICATION PREFERENCES</p>
        <Card className="settings-list">
          <ToggleRow
            title="Order updates"
            description="Email when an order status changes"
            checked={ordersEmail}
            onChange={setOrdersEmail}
          />
          <ToggleRow
            title="Wallet activity"
            description="Email when funds are added or spent"
            checked={walletEmail}
            onChange={setWalletEmail}
          />
          <ToggleRow
            title="Security alerts"
            description="Notify on new logins and password changes"
            checked={securityAlerts}
            onChange={setSecurityAlerts}
          />
          <ToggleRow
            title="Promotions"
            description="Occasional offers from Verxor"
            checked={promoPush}
            onChange={setPromoPush}
          />
        </Card>

        <p className="settings-section-label">BIOMETRICS</p>
        <Card className="settings-list">
          <div className="setting-row">
            <div>
              <strong>Face ID / fingerprint</strong>
              <small>Coming soon · unlock the app on supported devices</small>
            </div>
          </div>
        </Card>
      </ServiceLayout>
    );

  if (view === 'feedback')
    return (
      <ServiceLayout title="Contact Support" eyebrow="SUPPORT" description="Get help fast through the channels below." onBack={onBack}>
        <div className="support-channels">
          <a href={SOCIAL.telegramSupport} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon telegram">
              <Send size={17} />
            </span>
            <div>
              <strong>Telegram Support</strong>
              <small>Fastest response for order issues</small>
            </div>
            <ArrowRight size={17} />
          </a>
          <a href={SOCIAL.whatsappSupport} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon whatsapp">
              <MessageCircle size={17} />
            </span>
            <div>
              <strong>WhatsApp Support</strong>
              <small>Chat with us directly</small>
            </div>
            <ArrowRight size={17} />
          </a>
          <a href={SOCIAL.email} className="support-channel">
            <span className="support-channel-icon email">
              <Mail size={17} />
            </span>
            <div>
              <strong>Email Support</strong>
              <small>support@verxor.com</small>
            </div>
            <ArrowRight size={17} />
          </a>
        </div>

        <SectionHeader eyebrow="SELF SERVICE" title="Quick answers" />
        <Card className="legal-card">
          <h3>How do I fund my wallet?</h3>
          <p>
            Go to Fund, enter the amount and complete payment. Your balance updates after Flutterwave confirms. Methods
            depend on the country of the phone you registered with (NGN for Nigeria, USD for most other regions).
          </p>
          <h3>Virtual Number vs Rent a Line</h3>
          <p>
            Virtual Numbers are for short OTP verification (Server 1 / Server 2 tiers by price and availability). Rent a
            Line gives you a dedicated number for a selected period with SMS and voice where the provider supports it.
          </p>
          <h3>Number not receiving SMS?</h3>
          <p>
            Some platforms restrict certain routes. Check the tier label before buying and contact support with your
            order ID if the order rules allow a replacement or refund.
          </p>
        </Card>

        <SectionHeader eyebrow="FEEDBACK" title="Send feedback" />
        <Card className="form-card">
          {feedbackSent ? (
            <div className="feedback-success">
              <CheckCircle2 size={20} />
              <div>
                <strong>Thanks — we received it</strong>
                <p>Our team reviews feedback regularly. For urgent order issues use Telegram or WhatsApp above.</p>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="feedback-type">Type</label>
              <select
                id="feedback-type"
                className="form-select"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
              >
                <option value="feature">Feature suggestion</option>
                <option value="bug">Bug report</option>
                <option value="billing">Billing / wallet</option>
                <option value="other">Other</option>
              </select>
              <label htmlFor="feedback-subject">Subject</label>
              <input
                id="feedback-subject"
                className="form-input"
                value={feedbackSubject}
                onChange={(e) => setFeedbackSubject(e.target.value)}
                placeholder="Short summary"
              />
              <label htmlFor="feedback-body">Message</label>
              <textarea
                id="feedback-body"
                rows={4}
                value={feedbackBody}
                onChange={(e) => setFeedbackBody(e.target.value)}
                placeholder="Tell us what happened or what you need"
              />
              <PrimaryButton
                disabled={!feedbackSubject.trim() || !feedbackBody.trim()}
                onClick={() => setFeedbackSent(true)}
              >
                Send feedback
              </PrimaryButton>
            </>
          )}
        </Card>
      </ServiceLayout>
    );

  if (view === 'help')
    return (
      <ServiceLayout title="Help Center" eyebrow="SUPPORT" description="Guides and answers for using Verxor." onBack={onBack}>
        <Card className="legal-card">
          <h3>Getting started</h3>
          <p>
            Fund your wallet, choose a service, select a country or product and confirm your order. Activity appears in
            History.
          </p>
          <h3>Server 1 and Server 2</h3>
          <p>
            Virtual numbers are grouped by server and price tier (Economy, Standard, Fast, Premium). Higher tiers
            generally cost more and are stocked from stronger routes when available. No third-party platform is
            guaranteed to accept any number.
          </p>
          <h3>Account security</h3>
          <p>
            Keep your password and PIN private. Turn on security alerts under Account & Security. Contact support if
            you notice activity you do not recognize.
          </p>
          <h3>Need faster help?</h3>
          <p>Use Telegram or WhatsApp from Contact Support for the quickest response.</p>
        </Card>
      </ServiceLayout>
    );

  if (view === 'privacy')
    return (
      <ServiceLayout title="Privacy Policy" eyebrow="LEGAL" description="How we handle your information." onBack={onBack}>
        <Card className="legal-card">
          <h3>Information We Collect</h3>
          <p>
            Account details (name, email, phone), payment and wallet activity, device and session data needed to keep
            the service secure, and support messages you send us.
          </p>
          <h3>How We Use Information</h3>
          <p>
            To deliver numbers and digital services, process payments, prevent fraud, improve the product, and send
            important account notices.
          </p>
          <h3>Data Protection</h3>
          <p>
            We use industry-standard controls to protect your data. We do not sell personal information. Access is
            limited to systems and people that need it to operate Verxor.
          </p>
          <h3>Cookies</h3>
          <p>We use essential cookies for session and security. Optional analytics only run if you allow them.</p>
          <h3>Your Rights</h3>
          <p>
            You may request access, correction, or deletion of your account data subject to legal and fraud-prevention
            limits. Contact support@verxor.com.
          </p>
          <h3>Third-Party Services</h3>
          <p>
            Payments and number providers process only what is required to fulfill your order. Their policies apply to
            data they receive.
          </p>
          <h3>Updates</h3>
          <p>We may update this policy. Material changes will be reflected on this page with a revised date.</p>
          <h3>Contact</h3>
          <p>Privacy questions: support@verxor.com</p>
        </Card>
      </ServiceLayout>
    );

  return (
    <ServiceLayout title="Coming soon" eyebrow="SERVICE" onBack={onBack}>
      <Card className="empty-card">
        <strong>This section is not ready yet.</strong>
        <p>Please check back later.</p>
      </Card>
    </ServiceLayout>
  );
}

function EmptyOrders({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="empty-card page-empty">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
    </Card>
  );
}
