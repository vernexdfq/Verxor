import type { ReactNode } from 'react';
import {
  ArrowRight,
  Bell,
  Gift,
  Globe2,
  KeyRound,
  LogOut,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Card } from './components/ui';
import type { ServiceView } from './service-pages';

export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <>
      <section className="profile-hero-card" aria-label="Profile summary">
        <div className="profile-hero-inner">
          <div className="profile-avatar-lg">V</div>
          <div className="profile-hero-copy">
            <strong>Destiny</strong>
            <small>vernexdfq@gmail.com</small>
          </div>
          <button type="button" className="profile-open-btn" onClick={() => openService('edit-profile')}>
            PROFILE <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <button type="button" className="refer-earn-card" onClick={() => openService('referral')}>
        <span className="refer-earn-icon">
          <Gift size={20} />
        </span>
        <span className="refer-earn-copy">
          <strong>Refer &amp; Earn</strong>
          <small>Get 10% of every referral&apos;s first deposit</small>
        </span>
        <span className="refer-earn-cta">Invite</span>
      </button>

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
