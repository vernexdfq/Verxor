'use client';

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
  UserRound,
} from 'lucide-react';
import type { ServiceView } from './service-pages';
import './profile-page.css';

export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <div className="prof-page">
      <section className="prof-hero" aria-label="Profile summary">
        <div className="prof-avatar" aria-hidden>
          D
        </div>
        <div className="prof-hero-text">
          <strong>Destiny</strong>
          <span>vernexdfq@gmail.com</span>
        </div>
        <button
          type="button"
          className="prof-edit-btn"
          onClick={() => openService('edit-profile')}
        >
          <UserRound size={14} />
          Edit
        </button>
      </section>

      <button type="button" className="prof-refer" onClick={() => openService('referral')}>
        <span className="prof-refer-icon">
          <Gift size={20} />
        </span>
        <span className="prof-refer-copy">
          <strong>Refer &amp; Earn</strong>
          <small>Get 10% of every referral&apos;s first deposit</small>
        </span>
        <span className="prof-refer-cta">
          Invite <ArrowRight size={14} />
        </span>
      </button>

      <ProfileGroup title="ACCOUNT SETTINGS">
        <ProfileItem
          icon={<Bell size={18} />}
          title="Notifications"
          description="Push, email & alerts"
          onClick={() => openService('notifications-prefs')}
        />
        <ProfileItem
          icon={<ShieldCheck size={18} />}
          title="Security"
          description="Password, PIN & 2FA"
          onClick={() => openService('security')}
        />
      </ProfileGroup>

      <ProfileGroup title="MANAGEMENT">
        <ProfileItem
          icon={<Globe2 size={18} />}
          title="Child Panel"
          description="Run your own white-label site"
          onClick={() => openService('child-panel')}
        />
        <ProfileItem
          icon={<KeyRound size={18} />}
          title="API Keys"
          description="Credentials & webhooks"
          onClick={() => openService('api-keys')}
        />
        <ProfileItem
          icon={<MessageSquare size={18} />}
          title="Support Center"
          description="Help, tickets & channels"
          onClick={() => openService('support-center')}
        />
      </ProfileGroup>

      <button type="button" className="prof-logout">
        <LogOut size={18} />
        Log out
      </button>
    </div>
  );
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="prof-group">
      <h2 className="prof-group-title">{title}</h2>
      <div className="prof-list">{children}</div>
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
  return (
    <button type="button" className="prof-item" onClick={onClick}>
      <span className="prof-item-icon">{icon}</span>
      <span className="prof-item-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowRight size={16} className="prof-item-arrow" />
    </button>
  );
}
