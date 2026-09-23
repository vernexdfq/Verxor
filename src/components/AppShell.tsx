import type { ReactNode } from 'react';
import { Clock3, Home, LayoutGrid, UserRound, WalletCards } from 'lucide-react';
import { CommunityModal } from './CommunityModal';
import './shell-refinements.css';
import type { Page } from '../types';
import type { ServiceView } from '../service-pages';

export function AppShell({
  dark,
  page,
  deepService = false,
  onNavigate,
  onToggleTheme,
  onOpenService,
  onLogout,
  children,
}: {
  dark: boolean;
  page: Page;
  deepService?: boolean;
  onNavigate: (page: Page) => void;
  onToggleTheme: () => void;
  onOpenService: (view: ServiceView) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  void onToggleTheme;
  void onOpenService;
  void onLogout;

  const items: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: LayoutGrid },
    { id: 'fund', label: 'Fund', icon: WalletCards },
    { id: 'history', label: 'History', icon: Clock3 },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className={`app-frame ${deepService ? 'deep-service' : ''}`}>
        {!deepService && (
          <header
            className={`topbar ${page === 'home' ? 'topbar-home' : ''} ${page === 'profile' ? 'topbar-profile' : ''}`}
          >
            <div className="topbar-context">
              {page === 'home' ? (
                <div className="topbar-greeting" aria-label="Welcome back">
                  <span>Good morning, Denny</span>
                  <small>Your Verxor dashboard</small>
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
              ) : page === 'services' ? (
                <div className="topbar-greeting" aria-label="Services">
                  <span>Services</span>
                  <small>All products in one place</small>
                </div>
              ) : null}
            </div>
            <div className="topbar-actions" />
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
        {page === 'home' && <CommunityModal />}
      </div>
    </div>
  );
}
