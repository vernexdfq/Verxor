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
};

const notifications: VerxorNotification[] = [];

// Notifications are intentionally customer-scoped. The live backend will populate
// this list from the authenticated user's OTP, order, wallet and security events.
// Never expose another customer's numbers or OTP codes here.

export function NotificationsPage({ onBack }: { onBack: () => void }) {
  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <div className="notifications-page">
      <section className="notification-heading">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Notifications</h1>
          <p>OTP, order, wallet and account updates for you.</p>
        </div>
        {unreadCount > 0 && <span className="notification-count">{unreadCount} new</span>}
      </section>

      {notifications.length === 0 ? (
        <Card className="notification-empty">
          <span className="notification-empty-icon"><BellRing size={21} /></span>
          <strong>You're all caught up</strong>
          <p>
            New OTP messages, number orders, wallet updates and security alerts will appear here.
          </p>
        </Card>
      ) : (
        <div className="notification-list">
          {notifications.map((item) => <NotificationRow key={item.id} item={item} />)}
        </div>
      )}
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
        <small>{item.time}</small>
      </div>
    </Card>
  );
}
