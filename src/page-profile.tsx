'use client';

import type { ReactNode } from 'react';
import {
  Bell,
  ChevronRight,
  FileText,
  Gift,
  Globe2,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  LogOut,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { ServiceView } from './service-pages';
import './profile-page.css';

const USER = {
  name: 'Destiny',
  email: 'vernexdfq@gmail.com',
  role: 'Tenant / User',
  memberSince: 'Member since September 2026',
  initial: 'D',
};

export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <div className="prof-page">
      <header className="prof-page-head">
        <h1>Settings &amp; Profile</h1>
        <p>Manage your account, security &amp; tenancy</p>
      </header>

      {/* Hero */}
      <section className="prof-hero" aria-label="Profile summary">
        <div className="prof-hero-left">
          <div className="prof-avatar-wrap">
            <div className="prof-avatar" aria-hidden>
              {USER.initial}
            </div>
            <span className="prof-pro-badge">PRO</span>
          </div>
          <div className="prof-hero-meta">
            <strong className="prof-name">{USER.name}</strong>
            <span className="prof-email">{USER.email}</span>
            <span className="prof-role">{USER.role}</span>
            <span className="prof-since">{USER.memberSince}</span>
          </div>
        </div>
        <button
          type="button"
          className="prof-edit-pill"
          onClick={() => openService('edit-profile')}
        >
          EDIT PROFILE <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      </section>

      {/* Refer & Earn */}
      <button type="button" className="prof-refer" onClick={() => openService('referral')}>
        <span className="prof-refer-icon">
          <Gift size={20} strokeWidth={1.9} />
        </span>
        <span className="prof-refer-copy">
          <strong>Refer &amp; Earn</strong>
          <small>Earn commission on every invited user&apos;s deposit</small>
        </span>
        <span className="prof-refer-cta">Invite</span>
      </button>

      {/* Account & Security */}
      <ProfileGroup title="ACCOUNT & SECURITY">
        <ProfileItem
          icon={<Bell size={18} />}
          tone="tone-blue"
          title="Notifications"
          description="Push, Email, Order Alerts"
          onClick={() => openService('notifications-prefs')}
        />
        <ProfileItem
          icon={<ShieldCheck size={18} />}
          tone="tone-purple"
          title="Security & 2FA"
          description="Password, 2FA, Active Sessions"
          onClick={() => openService('security')}
        />
        <ProfileItem
          icon={<UserCheck size={18} />}
          tone="tone-green"
          title="KYC & Limits"
          description="Verification level & funding limits"
          onClick={() => openService('settings')}
        />
        <ProfileItem
          icon={<FileText size={18} />}
          tone="tone-slate"
          title="Privacy Policy"
          description="Data usage & compliance"
          onClick={() => openService('privacy')}
        />
      </ProfileGroup>

      {/* Management & Developer */}
      <ProfileGroup title="MANAGEMENT & DEVELOPER">
        <ProfileItem
          icon={<Globe2 size={18} />}
          tone="tone-violet"
          title="Child Panel (Whitelabel)"
          description="Own a reseller panel powered by Verxor"
          onClick={() => openService('child-panel')}
        />
        <ProfileItem
          icon={<KeyRound size={18} />}
          tone="tone-amber"
          title="API Keys & Docs"
          description="Manage developer keys & webhooks (Commercial product)"
          onClick={() => openService('api-keys')}
        />
        <ProfileItem
          icon={<LifeBuoy size={18} />}
          tone="tone-sky"
          title="Support Center"
          description="Tickets, SLA & disputes"
          onClick={() => openService('support-center')}
        />
        <ProfileItem
          icon={<HelpCircle size={18} />}
          tone="tone-teal"
          title="FAQ"
          description="Knowledge base & self-service"
          onClick={() => openService('help')}
        />
        <ProfileItem
          icon={<MessageSquare size={18} />}
          tone="tone-rose"
          title="Feedback"
          description="Bug reports & feature requests"
          onClick={() => openService('feedback')}
        />
      </ProfileGroup>

      <button type="button" className="prof-logout">
        <LogOut size={18} />
        Log Out
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
  tone,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  tone: string;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="prof-item" onClick={onClick}>
      <span className={`prof-item-icon ${tone}`}>{icon}</span>
      <span className="prof-item-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ChevronRight size={16} className="prof-item-arrow" strokeWidth={2} />
    </button>
  );
}
