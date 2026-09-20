import { ArrowLeft, BellRing, CheckCircle2, Clock3, KeyRound, ShieldCheck, WalletCards } from 'lucide-react';
import { Card } from './components/ui';
import './service-pages.css';

export type NotificationKind = 'otp' | 'order' | 'wallet' | 'security' | 'system';

export type VerxorNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  time: string;
  unread?: boolean;
  number?: string;
  code?: string;
  service?: string;
};

export type PurchasedNumber = {
  id: string;
  number: string;
  service: string;
  label?: string;
  status: 'active' | 'completed' | 'expired' | 'pending';
  purchasedAt: string;
};

export function NotificationsPage({
  notifications = [],
  purchasedNumbers = [],
  balance = '$0.00',
  onBack,
}: {
  notifications?: VerxorNotification[];
  purchasedNumbers?: PurchasedNumber[];
  balance?: string;
  onBack?: () => void;
}) {
  const unreadCount = notifications.filter((item) => item.unread).length;
  const otpEvents = notifications.filter((item) => item.kind === 'otp');
  const otherEvents = notifications.filter((item) => item.kind !== 'otp');

  return (
    <div className="notifications-page">
      <header className="notification-topbar">
        <button type="button" className="notification-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <strong>Notifications</strong>
        <div className="notification-top-actions">
          <span className="notification-wallet" aria-label={`Wallet balance ${balance}`}>
            <WalletCards size={16} aria-hidden="true" />
            <span>{balance}</span>
          </span>
          <span className="notification-bell" aria-hidden="true">
            <BellRing size={17} />
          </span>
        </div>
      </header>

      <section className="notification-heading">
        <div>
          <span className="eyebrow">ACCOUNT ACTIVITY</span>
          <h1>Notifications</h1>
          <p>OTP messages, purchased-number updates, wallet activity and security alerts.</p>
        </div>
        {unreadCount > 0 && <span className="notification-count">{unreadCount} new</span>}
      </section>

      <section className="notification-section">
        <div className="notification-section-head">
          <div>
            <span className="notification-section-label">VERIFICATION</span>
            <h2>OTP messages</h2>
          </div>
          <span>{otpEvents.length} {otpEvents.length === 1 ? 'message' : 'messages'}</span>
        </div>

        {otpEvents.length === 0 ? (
          <Card className="notification-empty compact">
            <span className="notification-empty-icon"><KeyRound size={20} /></span>
            <div>
              <strong>No OTP messages yet</strong>
              <p>When one of your purchased numbers receives a verification code, the service, number and code will appear here.</p>
            </div>
          </Card>
        ) : (
          <div className="notification-list">
            {otpEvents.map((item) => <OtpRow key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section className="notification-section">
        <div className="notification-section-head">
          <div>
            <span className="notification-section-label">YOUR NUMBERS</span>
            <h2>Purchased numbers</h2>
          </div>
          <span>{purchasedNumbers.length} {purchasedNumbers.length === 1 ? 'number' : 'numbers'}</span>
        </div>

        {purchasedNumbers.length === 0 ? (
          <Card className="notification-empty compact">
            <span className="notification-empty-icon"><CheckCircle2 size={20} /></span>
            <div>
              <strong>No purchased numbers yet</strong>
              <p>Numbers you buy will be listed here with their service and current status.</p>
            </div>
          </Card>
        ) : (
          <div className="purchased-number-list">
            {purchasedNumbers.map((item) => <PurchasedNumberRow key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section className="notification-section">
        <div className="notification-section-head">
          <div>
            <span className="notification-section-label">ACCOUNT</span>
            <h2>Updates</h2>
          </div>
          <span>{otherEvents.length}</span>
        </div>

        {otherEvents.length === 0 ? (
          <Card className="notification-empty compact">
            <span className="notification-empty-icon"><BellRing size={20} /></span>
            <div>
              <strong>You're all caught up</strong>
              <p>New wallet, order and security updates will appear here.</p>
            </div>
          </Card>
        ) : (
          <div className="notification-list">
            {otherEvents.map((item) => <NotificationRow key={item.id} item={item} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function OtpRow({ item }: { item: VerxorNotification }) {
  return (
    <Card className={`notification-row otp-row ${item.unread ? 'unread' : ''}`}>
      <span className="notification-icon otp"><KeyRound size={17} /></span>
      <div className="notification-copy">
        <div>
          <strong>{item.service || item.title}</strong>
          {item.unread && <i aria-label="Unread" />}
        </div>
        <p>{item.number || 'Purchased number'} · {item.message}</p>
        <div className="notification-otp-meta">
          {item.code && <strong className="notification-code">{item.code}</strong>}
          <small>{item.time}</small>
        </div>
      </div>
    </Card>
  );
}

function PurchasedNumberRow({ item }: { item: PurchasedNumber }) {
  return (
    <Card className="purchased-number-row">
      <span className="purchased-number-icon"><KeyRound size={16} /></span>
      <div className="notification-copy">
        <strong>{item.number}</strong>
        <p>{item.service}{item.label ? ` · ${item.label}` : ''}</p>
        <small>Purchased {item.purchasedAt}</small>
      </div>
      <span className={`purchased-number-status ${item.status}`}>{item.status}</span>
    </Card>
  );
}

function NotificationRow({ item }: { item: VerxorNotification }) {
  const icon = item.kind === 'wallet'
    ? <WalletCards size={17} />
    : item.kind === 'security'
      ? <ShieldCheck size={17} />
      : item.kind === 'order'
        ? <CheckCircle2 size={17} />
        : <Clock3 size={17} />;

  return (
    <Card className={`notification-row ${item.unread ? 'unread' : ''}`}>
      <span className={`notification-icon ${item.kind}`}>{icon}</span>
      <div className="notification-copy">
        <div>
          <strong>{item.title}</strong>
          {item.unread && <i aria-label="Unread" />}
        </div>
        <p>{item.message}</p>
        <small>{item.time}</small>
      </div>
    </Card>
  );
}
