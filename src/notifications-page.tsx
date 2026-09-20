import { ArrowLeft, BellRing, CheckCircle2, Clock3, KeyRound, ShieldCheck, WalletCards } from 'lucide-react';
import { Card } from './components/ui';
import './service-pages.css';

export type NotificationKind = 'otp' | 'order' | 'wallet' | 'security' | 'system' | 'number';

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
  statusLabel?: string;
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
  balance = '$0.00',
  onBack,
}: {
  notifications?: VerxorNotification[];
  /** @deprecated Purchased numbers belong on Virtual Numbers / History — not on this feed */
  purchasedNumbers?: PurchasedNumber[];
  balance?: string;
  onBack?: () => void;
}) {
  const unreadCount = notifications.filter((item) => item.unread).length;
  const sorted = [...notifications].sort((a, b) => {
    if (a.unread === b.unread) return 0;
    return a.unread ? -1 : 1;
  });

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
          <span className="eyebrow">LATEST</span>
          <h1>Notifications</h1>
          <p>Orders, OTP codes, wallet activity and security alerts.</p>
        </div>
        {unreadCount > 0 ? (
          <span className="notification-count">{unreadCount} new</span>
        ) : (
          <span className="notification-count muted">{sorted.length} total</span>
        )}
      </section>

      {sorted.length === 0 ? (
        <Card className="notification-empty compact">
          <span className="notification-empty-icon">
            <BellRing size={20} />
          </span>
          <div>
            <strong>You're all caught up</strong>
            <p>New orders, OTP codes, wallet and security updates will appear here.</p>
          </div>
        </Card>
      ) : (
        <div className="notification-list">
          {sorted.map((item) =>
            item.kind === 'otp' ? (
              <OtpRow key={item.id} item={item} />
            ) : (
              <NotificationRow key={item.id} item={item} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function OtpRow({ item }: { item: VerxorNotification }) {
  return (
    <Card className={`notification-row otp-row ${item.unread ? 'unread' : ''}`}>
      <span className="notification-icon otp">
        <KeyRound size={17} />
      </span>
      <div className="notification-copy">
        <div>
          <strong>{item.service || item.title}</strong>
          {item.unread && <i aria-label="Unread" />}
          {item.statusLabel && <span className="notification-badge success">{item.statusLabel}</span>}
        </div>
        <p>
          {item.number || 'Purchased number'}
          {item.message ? ` · ${item.message}` : ''}
        </p>
        <div className="notification-otp-meta">
          {item.code && <strong className="notification-code">{item.code}</strong>}
          <small>{item.time}</small>
        </div>
      </div>
    </Card>
  );
}

function NotificationRow({ item }: { item: VerxorNotification }) {
  const icon =
    item.kind === 'wallet' ? (
      <WalletCards size={17} />
    ) : item.kind === 'security' ? (
      <ShieldCheck size={17} />
    ) : item.kind === 'order' || item.kind === 'number' ? (
      <CheckCircle2 size={17} />
    ) : (
      <Clock3 size={17} />
    );

  return (
    <Card className={`notification-row ${item.unread ? 'unread' : ''}`}>
      <span className={`notification-icon ${item.kind}`}>{icon}</span>
      <div className="notification-copy">
        <div>
          <strong>{item.title}</strong>
          {item.unread && <i aria-label="Unread" />}
          {item.statusLabel && (
            <span className={`notification-badge ${item.kind === 'order' || item.kind === 'number' ? 'success' : ''}`}>
              {item.statusLabel}
            </span>
          )}
        </div>
        <p>{item.message}</p>
        <small>{item.time}</small>
      </div>
    </Card>
  );
}
