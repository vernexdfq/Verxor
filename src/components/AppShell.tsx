import type { ReactNode } from 'react';
import { Bell, Clock3, Headphones, Home, LayoutGrid, UserRound, WalletCards } from 'lucide-react';
import { CommunityModal } from './CommunityModal';
import './shell-refinements.css';
import '../topbar-help.css';
import type { Page } from '../types';
import type { ServiceView } from '../service-pages';

function homeGreeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return { line: `Good morning, ${name}`, emoji: '☀️' };
  if (h < 17) return { line: `Good afternoon, ${name}`, emoji: '⛅' };
  return { line: `Good evening, ${name}`, emoji: '🌙' };
}

export function AppShell({
  dark,
  page,
  deepService = false,
  userName = 'User',
  onNavigate,
  onToggleTheme,
  onOpenService,
  onLogout,
  children,
}: {
  dark: boolean;
  page: Page;
  deepService?: boolean;
  userName?: string;
  onNavigate: (page: Page) => void;
  onToggleTheme: () => void;
  onOpenService: (view: ServiceView) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  void onToggleTheme;
  void onLogout;

  const items: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: LayoutGrid },
    { id: 'fund', label: 'Fund', icon: WalletCards },
    { id: 'history', label: 'History', icon: Clock3 },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  const firstName = (userName || 'User').trim().split(/\s+/)[0] || 'User';
  const greet = homeGreeting(firstName);
  // Hide shell topbar on Fund — page has its own title (avoids duplicate header)
  const hideTopbar =
    deepService || page === 'services' || page === 'profile' || page === 'fund';

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className={`app-frame ${deepService ? 'deep-service' : ''}`}>
        {!hideTopbar && (
          <header className={`topbar ${page === 'home' ? 'topbar-home' : ''}`}>
            <div className="topbar-context">
              {page === 'home' ? (
                <div className="home-hero-row">
                  <div className="home-brand-mark" aria-hidden="true">
                    <img src="/brand/verxor-logo.svg" alt="" width="40" height="40" />
                  </div>
                  <div className="topbar-greeting" aria-label="Welcome back">
                    <span>
                      {greet.line} <span className="greet-emoji">{greet.emoji}</span>
                    </span>
                    <small>Your Verxor Dashboard</small>
                  </div>
                </div>
              ) : page === 'history' ? (
                <button
                  className="inner-page-title"
                  onClick={() => onNavigate('home')}
                  aria-label="Back to home"
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                  <strong>History</strong>
                </button>
              ) : null}
            </div>
            {page === 'home' && (
              <div className="topbar-actions">
                <a
                  className="topbar-help"
                  href="https://wa.me/2348141620644"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Help on WhatsApp"
                >
                  <Headphones size={12} strokeWidth={2.4} />
                  <span>HELP</span>
                </a>
                <button
                  type="button"
                  className="topbar-bell"
                  aria-label="Notifications"
                  onClick={() => onOpenService('alerts')}
                >
                  <Bell size={15} strokeWidth={2} />
                  <span className="bell-dot" aria-hidden="true" />
                </button>
              </div>
            )}
          </header>
        )}
        <main className="content">{children}</main>
        {!deepService && (
          <nav className="bottom-nav" aria-label="Primary navigation">
            {items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`nav-item ${page === id ? 'active' : ''}`}
                onClick={() => onNavigate(id)}
                aria-current={page === id ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={page === id ? 2.25 : 1.9} />
                <small>{label}</small>
              </button>
            ))}
          </nav>
        )}
        {page === 'home' && !deepService && <CommunityModal />}
      </div>
    </div>
  );
}
