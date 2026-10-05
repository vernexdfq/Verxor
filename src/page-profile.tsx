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
import type { AuthSession } from './auth/AuthFlow';
import './profile-page.css';

export function ProfilePage({
  openService,
  session,
  onLogout,
}: {
  openService: (view: ServiceView) => void;
  session?: AuthSession | null;
  onLogout?: () => void;
}) {
  const name = (session?.name || 'User').trim() || 'User';
  const email =
    session?.email ||
    (session?.method === 'email' ? session.contact : '') ||
    session?.contact ||
    '';
  const initial = name.charAt(0).toUpperCase() || 'U';
  const USER = {
    name,
    email: email || 'No contact on file',
    role: 'Member',
    memberSince: '',
    initial,
  };

  return (
    <div className="prof-page">
      <header className="prof-page-head">
        <h1>Settings & Profile</h1>
        <p>Manage your account, security & tenancy</p>
      </header>

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
            {USER.memberSince ? <span className="prof-since">{USER.memberSince}</span> : null}
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

      <button type="button" className="prof-refer" onClick={() => openService('referral')}>
        <span className="prof-refer-icon">
          <Gift size={20} strokeWidth={1.9} />
        </span>
        <span className="prof-refer-copy">
          <strong>Refer & Earn</strong>
          <small>Earn commission on every invited user's deposit</small>
        </span>
        <span className="prof-refer-cta">Invite</span>
      </button>

      <ProfileGroup title="ACCOUNT">
        <ProfileItem
          icon={<Bell size={18} />}
          tone="tone-blue"
          title="Notifications"
          description="Alerts, SMS & email preferences"
          onClick={() => openService('notifications-prefs')}
        />
        <ProfileItem
          icon={<ShieldCheck size={18} />}
          tone="tone-green"
          title="Security"
          description="PIN, biometric & session controls"
          onClick={() => openService('security')}
        />
        <ProfileItem
          icon={<UserCheck size={18} />}
          tone="tone-indigo"
          title="Settings"
          description="Language, currency & display"
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
          onClick={() => openService('faq')}
        />
        <ProfileItem
          icon={<MessageSquare size={18} />}
          tone="tone-rose"
          title="Feedback"
          description="Bug reports & feature requests"
          onClick={() => openService('feedback')}
        />
      </ProfileGroup>

      <button
        type="button"
        className="prof-logout"
        onClick={() => {
          try {
            sessionStorage.setItem('verxor-force-signin', '1');
          } catch {
            /* ignore */
          }
          onLogout?.();
        }}
      >
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
