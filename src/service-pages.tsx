import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Facebook,
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

function XIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TikTokIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.83 2.83 0 0 1-2.79 2.81 2.83 2.83 0 0 1-2.81-2.81 2.83 2.83 0 0 1 2.81-2.81c.28 0 .56.04.83.11v-3.5a6.37 6.37 0 0 0-1.08-.09A6.26 6.26 0 0 0 3 16.4a6.26 6.26 0 0 0 6.26 6.26 6.26 6.26 0 0 0 6.26-6.26V8.9a8.2 8.2 0 0 0 4.77 1.52V6.97a4.85 4.85 0 0 1-.7-.28Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ServicePage({ view, onBack }: { view: Exclude<ServiceView, 'services'>; onBack: () => void }) {
  const [ordersEmail, setOrdersEmail] = useState(true);
  const [walletEmail, setWalletEmail] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [promoPush, setPromoPush] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'ok'>('idle');
  const [pinStep, setPinStep] = useState<'idle' | 'auth' | 'set'>('idle');
  const [pinAuthPw, setPinAuthPw] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [fullName, setFullName] = useState('Destiny');
  const [username, setUsername] = useState('dennykay042');
  const [profileSaved, setProfileSaved] = useState(false);
  const [refCopied, setRefCopied] = useState<'code' | 'link' | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const referralCode = 'VERXOR-DENNY';
  const referralLink = `https://verxor.com/register?ref=${referralCode}`;

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setRefCopied(kind);
      window.setTimeout(() => setRefCopied(null), 1800);
    } catch {
      setRefCopied(null);
    }
  };

  if (view === 'virtual-numbers' || view === 'rental' || view === 'boost' || view === 'accounts') {
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
      </ServiceLayout>
    );
  if (view === 'affiliate')
    return (
      <ServiceLayout title="Affiliate" eyebrow="REFERRALS" description="Share your referral link and track eligible rewards." onBack={onBack}>
        <Card className="referral-card">
          <small>Your referral link</small>
          <strong>{referralLink}</strong>
          <button type="button" className="copy-button" onClick={() => copyText(referralLink, 'link')}>
            {refCopied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </Card>
      </ServiceLayout>
    );
  if (view === 'alerts') return <NotificationsPage onBack={onBack} />;

  /* —— EDIT PROFILE —— */
  if (view === 'edit-profile')
    return (
      <ServiceLayout
        title="Edit Profile"
        eyebrow="ACCOUNT"
        description="Update your personal information. Phone and email cannot be changed."
        onBack={onBack}
      >
        <Card className="form-card">
          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            className="form-input"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setProfileSaved(false);
            }}
            placeholder="Full name"
          />
          <label htmlFor="username">Username</label>
          <input
            id="username"
            className="form-input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.replace(/\s/g, ''));
              setProfileSaved(false);
            }}
            placeholder="@username"
          />
          <label htmlFor="phone-locked">Phone number</label>
          <input id="phone-locked" className="form-input locked" value="08141620644" readOnly disabled />
          <p className="form-hint-locked">Cannot be changed · used for region and security</p>
          <label htmlFor="email-locked">Email address</label>
          <input id="email-locked" className="form-input locked" value="vernexdfq@gmail.com" readOnly disabled />
          <p className="form-hint-locked">Cannot be changed</p>
          <PrimaryButton
            disabled={!fullName.trim() || !username.trim()}
            onClick={() => setProfileSaved(true)}
          >
            {profileSaved ? (
              <>
                <Check size={18} /> Saved
              </>
            ) : (
              'Save changes'
            )}
          </PrimaryButton>
        </Card>
      </ServiceLayout>
    );

  /* —— REFERRAL PROGRAM —— */
  if (view === 'referral')
    return (
      <ServiceLayout
        title="Referral Program"
        eyebrow="EARN 10%"
        description="Earn 10% of each referral's first deposit, instantly — once per user."
        onBack={onBack}
      >
        <div className="referral-stats-grid">
          <div className="referral-stat">
            <strong>1</strong>
            <small>Total referrals</small>
          </div>
          <div className="referral-stat">
            <strong>0</strong>
            <small>Successful</small>
          </div>
          <div className="referral-stat">
            <strong>1</strong>
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
          <p className="settings-section-label" style={{ marginTop: 0 }}>
            Your referral details
          </p>
          <div className="referral-detail-row">
            <div>
              <small style={{ color: 'var(--muted)', fontSize: 10 }}>CODE</small>
              <code>{referralCode}</code>
            </div>
            <button type="button" className="copy-button" onClick={() => copyText(referralCode, 'code')}>
              {refCopied === 'code' ? <Check size={14} /> : <Copy size={14} />}
              {refCopied === 'code' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="referral-detail-row">
            <div style={{ minWidth: 0 }}>
              <small style={{ color: 'var(--muted)', fontSize: 10 }}>LINK</small>
              <code style={{ fontSize: 11 }}>{referralLink}</code>
            </div>
            <button type="button" className="copy-button" onClick={() => copyText(referralLink, 'link')}>
              {refCopied === 'link' ? <Check size={14} /> : <Copy size={14} />}
              {refCopied === 'link' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="settings-footnote">
            Rewards are credited instantly when your referred user makes their first successful deposit — 10% of that
            deposit, once per user.
          </p>
        </Card>

        <SectionHeader eyebrow="HISTORY" title="Referral history" />
        <Card className="form-card">
          <div className="referral-history-item">
            <div>
              <strong style={{ fontSize: 13 }}>dennybadmanvj</strong>
              <small style={{ display: 'block', color: 'var(--muted)', fontSize: 10, marginTop: 2 }}>
                dennygodzilla0@gmail.com · Joined 22/09/2026
              </small>
            </div>
            <span className="referral-badge">PENDING</span>
          </div>
          <p className="settings-footnote" style={{ marginTop: 8 }}>
            Awaiting first deposit
          </p>
        </Card>
      </ServiceLayout>
    );

  /* —— NOTIFICATIONS PREFS —— */
  if (view === 'notifications-prefs')
    return (
      <ServiceLayout
        title="Notifications"
        eyebrow="PREFERENCES"
        description="Choose which emails and alerts you receive. Essential account messages always send."
        onBack={onBack}
      >
        <Card className="settings-list">
          <ToggleRow
            title="Transaction emails"
            description="Receipts and confirmations for purchases and payments"
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
            title="Login alerts"
            description="Get notified every time you log into your account"
            checked={loginAlerts}
            onChange={setLoginAlerts}
          />
          <ToggleRow
            title="Security alerts"
            description="New device or password changes"
            checked={securityAlerts}
            onChange={setSecurityAlerts}
          />
          <ToggleRow
            title="Updates & announcements"
            description="Product updates and important notices"
            checked={promoPush}
            onChange={setPromoPush}
          />
        </Card>
        <p className="settings-footnote">
          You will always receive essential account-related emails regardless of these preferences.
        </p>
      </ServiceLayout>
    );

  /* —— SECURITY —— */
  if (view === 'security')
    return (
      <ServiceLayout
        title="Security"
        eyebrow="AUTHENTICATION"
        description="Secure your account and transactions."
        onBack={onBack}
      >
        <p className="settings-section-label">LOGIN PASSWORD</p>
        <Card className="form-card">
          <label htmlFor="current-pw">Current password</label>
          <div className="pw-field">
            <input
              id="current-pw"
              className="form-input"
              type={showPw ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle visibility">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <label htmlFor="new-pw">New password</label>
          <input
            id="new-pw"
            className="form-input"
            type={showPw ? 'text' : 'password'}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <label htmlFor="confirm-pw">Confirm new password</label>
          <input
            id="confirm-pw"
            className="form-input"
            type={showPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <p className="pw-hint">At least 6 characters</p>
          <PrimaryButton
            disabled={newPw.length < 6 || newPw !== confirmPw || !currentPw}
            onClick={() => setPwStatus('ok')}
          >
            {pwStatus === 'ok' ? 'Password updated' : 'Update password'}
          </PrimaryButton>
        </Card>

        <p className="settings-section-label">TRANSACTION PIN</p>
        <Card className="form-card">
          {pinStep === 'idle' && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>
                4-digit PIN required for sensitive wallet actions. Enter your login password to set or change it.
              </p>
              <PrimaryButton onClick={() => setPinStep('auth')}>Set / change PIN</PrimaryButton>
            </>
          )}
          {pinStep === 'auth' && (
            <>
              <label htmlFor="pin-auth">Account password</label>
              <input
                id="pin-auth"
                className="form-input"
                type="password"
                value={pinAuthPw}
                onChange={(e) => setPinAuthPw(e.target.value)}
                placeholder="Enter your account password"
              />
              <PrimaryButton disabled={pinAuthPw.length < 4} onClick={() => setPinStep('set')}>
                Continue
              </PrimaryButton>
            </>
          )}
          {pinStep === 'set' && (
            <>
              <label htmlFor="pin-new">New 4-digit PIN</label>
              <input
                id="pin-new"
                className="form-input"
                inputMode="numeric"
                maxLength={4}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
              <label htmlFor="pin-confirm">Confirm PIN</label>
              <input
                id="pin-confirm"
                className="form-input"
                inputMode="numeric"
                maxLength={4}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
              />
              <PrimaryButton
                disabled={pinValue.length !== 4 || pinValue !== pinConfirm}
                onClick={() => {
                  setPinStep('idle');
                  setPinAuthPw('');
                  setPinValue('');
                  setPinConfirm('');
                }}
              >
                Save PIN
              </PrimaryButton>
            </>
          )}
        </Card>

        <p className="settings-section-label">AUTHENTICATION</p>
        <Card className="settings-list">
          <ToggleRow
            title="Biometric login"
            description="Face ID / Touch ID on supported devices"
            checked={biometric}
            onChange={setBiometric}
          />
          <div className="setting-row">
            <div>
              <strong>Two-factor authentication</strong>
              <small>Coming soon</small>
            </div>
            <span className="soon-badge">SOON</span>
          </div>
          <button type="button" className="setting-row" onClick={() => {}} style={{ width: '100%', background: 'transparent', border: 0, borderBottom: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer' }}>
            <div>
              <strong>Privacy policy</strong>
              <small>How we handle your data</small>
            </div>
            <ArrowRight size={17} color="var(--faint)" />
          </button>
        </Card>
        <p className="settings-footnote">
          Open Privacy Policy from Support Center or ask support for the full legal document.
        </p>
      </ServiceLayout>
    );

  /* —— CHILD PANEL —— */
  if (view === 'child-panel')
    return (
      <ServiceLayout
        title="Child Panel"
        eyebrow="WHITE-LABEL"
        description="Run your own branded virtual-number and digital services site powered by Verxor."
        onBack={onBack}
      >
        <Card className="info-card">
          <Globe2 size={22} />
          <div>
            <strong>Own a site under your brand</strong>
            <p>
              White-label panel with your domain, pricing margins, and branding. Verxor handles routing, providers, and
              infrastructure in the background. You set retail prices in your admin; wholesale rates come from Verxor API.
            </p>
          </div>
        </Card>
        <Card className="form-card">
          <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: '20px' }}>
            Child Panel is available for approved partners. Contact support to request access, discuss pricing, and get
            your subdomain or custom domain connected.
          </p>
          <a href={SOCIAL.telegramSupport} target="_blank" rel="noopener noreferrer" className="primary-button" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Chat on Telegram
          </a>
        </Card>
      </ServiceLayout>
    );

  /* —— API KEYS —— */
  if (view === 'api-keys')
    return (
      <ServiceLayout
        title="API Keys"
        eyebrow="DEVELOPER"
        description="Integrate Verxor services into your own systems."
        onBack={onBack}
      >
        <Card className="form-card">
          <label htmlFor="webhook">Webhook URL</label>
          <input
            id="webhook"
            className="form-input"
            value={webhookUrl}
            onChange={(e) => {
              setWebhookUrl(e.target.value);
              setWebhookSaved(false);
            }}
            placeholder="https://your-server.com/webhooks/verxor"
          />
          <PrimaryButton disabled={!webhookUrl.trim()} onClick={() => setWebhookSaved(true)}>
            {webhookSaved ? 'Webhook saved' : 'Save webhook URL'}
          </PrimaryButton>
          <p className="settings-footnote">Receive real-time POST notifications for orders.</p>
        </Card>

        <p className="settings-section-label">Security best practices</p>
        <Card className="legal-card">
          <p>✓ Store the API key in a secure server-side environment variable. Never commit it to source control.</p>
          <p>✓ Always send requests over HTTPS — never call the API from a public client without a server proxy.</p>
          <p>✓ Rotate the key immediately if you suspect it has been exposed.</p>
          <p>✓ Use the webhook URL to react to events instead of polling — it scales better.</p>
        </Card>

        <Card className="info-card">
          <KeyRound size={20} />
          <div>
            <strong>Full API documentation</strong>
            <p>Endpoints, parameters, error codes and examples will be published for approved API clients.</p>
          </div>
        </Card>
      </ServiceLayout>
    );

  /* —— SUPPORT CENTER —— */
  if (view === 'support-center')
    return (
      <ServiceLayout
        title="Help & Support"
        eyebrow="SUPPORT"
        description="We are here to help you 24/7."
        onBack={onBack}
      >
        <p className="settings-section-label" style={{ marginTop: 0 }}>
          Support channels
        </p>
        <div className="support-channels">
          <a href={SOCIAL.whatsappSupport} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon whatsapp">
              <MessageCircle size={17} />
            </span>
            <div>
              <strong>WhatsApp Support</strong>
              <small>Chat with us on WhatsApp</small>
            </div>
            <ArrowRight size={17} />
          </a>
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

        <p className="settings-section-label">Self service</p>
        <div className="support-channels">
          <button type="button" className="support-channel" onClick={() => {}} style={{ cursor: 'default' }}>
            <span className="support-channel-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <ShieldCheck size={17} />
            </span>
            <div>
              <strong>Help Center & Guides</strong>
              <small>Step-by-step guides to fund, buy numbers, and more</small>
            </div>
            <ArrowRight size={17} />
          </button>
        </div>

        <p className="settings-section-label">Follow us</p>
        <div className="support-channels">
          {SOCIAL.instagram ? (
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon instagram">
                <Instagram size={17} />
              </span>
              <div>
                <strong>Instagram</strong>
                <small>@verxorofficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.twitter ? (
            <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon x">
                <XIcon size={17} />
              </span>
              <div>
                <strong>X (Twitter)</strong>
                <small>@VerxorOfficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.facebook ? (
            <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon facebook">
                <Facebook size={17} />
              </span>
              <div>
                <strong>Facebook</strong>
                <small>Verxor official</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.tiktok ? (
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon tiktok">
                <TikTokIcon size={17} />
              </span>
              <div>
                <strong>TikTok</strong>
                <small>@verxorofficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          <a href={SOCIAL.telegramChannel} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon telegram">
              <Send size={17} />
            </span>
            <div>
              <strong>Telegram channel</strong>
              <small>Announcements and updates</small>
            </div>
            <ArrowRight size={17} />
          </a>
        </div>

        <p className="settings-section-label">FAQs</p>
        <Card className="legal-card">
          <h3>How do I fund my wallet?</h3>
          <p>
            Go to Fund, enter the amount and complete payment. Your balance updates after confirmation. Methods depend on
            the country of the phone you registered with.
          </p>
          <h3>What is Server 1 vs Server 2?</h3>
          <p>
            Virtual numbers are grouped by price and availability into Server 1 and Server 2 tiers (Economy, Fast,
            Standard, Premium). Higher tiers generally offer stronger delivery for stricter platforms.
          </p>
          <h3>How does referral work?</h3>
          <p>Share your code or link. You earn 10% of each referred user&apos;s first successful deposit, once per user.</p>
        </Card>

        <p className="settings-section-label">Feedback</p>
        <Card className="form-card">
          <label htmlFor="fb-type">Feedback type</label>
          <select
            id="fb-type"
            className="form-input"
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value)}
          >
            <option value="">Choose one…</option>
            <option value="feature">Feature suggestion</option>
            <option value="bug">Bug / issue report</option>
            <option value="poor">Poor experience</option>
            <option value="like">What you like</option>
            <option value="general">General suggestion</option>
          </select>
          <label htmlFor="fb-subject">Subject</label>
          <input
            id="fb-subject"
            className="form-input"
            value={feedbackSubject}
            onChange={(e) => setFeedbackSubject(e.target.value)}
            placeholder="Sum it up in a few words"
          />
          <label htmlFor="fb-body">Your message</label>
          <textarea
            id="fb-body"
            rows={4}
            value={feedbackBody}
            onChange={(e) => setFeedbackBody(e.target.value)}
            placeholder="Tell us as much detail as you'd like…"
          />
          <PrimaryButton
            disabled={!feedbackType || !feedbackSubject.trim() || !feedbackBody.trim()}
            onClick={() => setFeedbackSent(true)}
          >
            {feedbackSent ? 'Feedback sent' : 'Send feedback'}
          </PrimaryButton>
        </Card>
      </ServiceLayout>
    );

  if (view === 'settings')
    return (
      <ServiceLayout
        title="Account"
        eyebrow="ACCOUNT SETTINGS"
        description="Region is set from the phone you registered with."
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
              <strong>Personal information</strong>
              <small>Use Edit Profile from the profile header</small>
            </div>
            <ArrowRight size={17} />
          </div>
        </Card>
      </ServiceLayout>
    );

  if (view === 'community')
    return (
      <ServiceLayout
        title="Follow us"
        eyebrow="COMMUNITY"
        description="Official Verxor channels for updates and support."
        onBack={onBack}
      >
        <div className="support-channels">
          <a href={SOCIAL.telegramChannel} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon telegram">
              <Send size={17} />
            </span>
            <div>
              <strong>Telegram</strong>
              <small>Announcements and updates</small>
            </div>
            <ArrowRight size={17} />
          </a>
          <a href={SOCIAL.whatsappChannel} target="_blank" rel="noopener noreferrer" className="support-channel">
            <span className="support-channel-icon whatsapp">
              <MessageCircle size={17} />
            </span>
            <div>
              <strong>WhatsApp</strong>
              <small>Official channel</small>
            </div>
            <ArrowRight size={17} />
          </a>
          {SOCIAL.instagram ? (
            <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon instagram">
                <Instagram size={17} />
              </span>
              <div>
                <strong>Instagram</strong>
                <small>@verxorofficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.twitter ? (
            <a href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon x">
                <XIcon size={17} />
              </span>
              <div>
                <strong>X (Twitter)</strong>
                <small>@VerxorOfficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.facebook ? (
            <a href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon facebook">
                <Facebook size={17} />
              </span>
              <div>
                <strong>Facebook</strong>
                <small>Verxor official</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
          {SOCIAL.tiktok ? (
            <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" className="support-channel">
              <span className="support-channel-icon tiktok">
                <TikTokIcon size={17} />
              </span>
              <div>
                <strong>TikTok</strong>
                <small>@verxorofficial</small>
              </div>
              <ArrowRight size={17} />
            </a>
          ) : null}
        </div>
      </ServiceLayout>
    );

  if (view === 'feedback' || view === 'help')
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
      </ServiceLayout>
    );

  if (view === 'privacy')
    return (
      <ServiceLayout title="Privacy Policy" eyebrow="LEGAL" description="How we handle your information." onBack={onBack}>
        <Card className="legal-card">
          <h3>Information We Collect</h3>
          <p>
            Account details (name, email, phone), payment and wallet activity, device and session data needed to keep the
            service secure, and support messages you send us.
          </p>
          <h3>How We Use Information</h3>
          <p>
            To deliver numbers and digital services, process payments, prevent fraud, improve the product, and send
            important account notices.
          </p>
          <h3>Data Protection</h3>
          <p>
            We use industry-standard controls to protect your data. We do not sell personal information. Access is limited
            to systems and people that need it to operate Verxor.
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
