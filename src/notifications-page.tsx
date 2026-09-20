import { BellRing, CheckCircle2, Clock3, KeyRound, ShieldCheck, WalletCards } from 'lucide-react';
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
};

export function NotificationsPage({
  notifications = [],
  onBack: _onBack,
}: {
  notifications?: VerxorNotification[];
  onBack?: () => void;
}) {
  const unreadCount = notifications.filter((item) => item.unread).length;
  const otpEvents = notifications.filter((item) => item.kind === 'otp');
  const otherEvents = notifications.filter((item) => item.kind !== 'otp');

  return (
    <div className="notifications-page">
      <section className="notification-heading">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Notifications</h1>
          <p>OTP messages, number orders, wallet and security updates.</p>
        </div>
        {unreadCount > 0 && <span className="notification-count">{unreadCount} new</span>}
      </section>

      <section className="notification-section">
        <div className="notification-section-head">
          <div>
            <span className="notification-section-label">VERIFICATION</span>
            <h2>OTP activity</h2>
          </div>
          <span>{otpEvents.length} {otpEvents.length === 1 ? 'message' : 'messages'}</span>
        </div>

        {otpEvents.length === 0 ? (
          <Card className="notification-empty compact">
            <span className="notification-empty-icon"><KeyRound size={20} /></span>
            <div>
              <strong>No OTP messages yet</strong>
              <p>When one of your purchased numbers receives an OTP, the number, service and code will appear here.</p>
            </div>
          </Card>
        ) : (
          <div className="notification-list">
            {otpEvents.map((item) => <NotificationRow key={item.id} item={item} />)}
          </div>
        )}
      </section>

      <section className="notification-section">
        <div className="notification-section-head">
          <div>
            <span className="notification-section-label">ACCOUNT ACTIVITY</span>
            <h2>Updates</h2>
          </div>
          <span>{otherEvents.length}</span>
        </div>

        {otherEvents.length === 0 ? (
          <Card className="notification-empty compact">
            <span className="notification-empty-icon"><BellRing size={20} /></span>
            <div>
              <strong>You're all caught up</strong>
              <p>New order, wallet and security updates will appear here.</p>
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

function NotificationRow({ item }: { item: VerxorNotification }) {
  const icon = item.kind === 'otp'
    ? <KeyRound size={17} />
    : item.kind === 'wallet'
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
        {item.number && <small className="notification-number">{item.number}{item.code ? ` · OTP ${item.code}` : ''}</small>}
        <small>{item.time}</small>
      </div>
    </Card>
  );
}
