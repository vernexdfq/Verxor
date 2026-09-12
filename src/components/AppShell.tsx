import type { ReactNode } from 'react';
import { Bell, Home, Moon, Smartphone, Sun, UserRound, WalletCards } from 'lucide-react';
import { IconButton } from './ui';
import { CommunityModal } from './CommunityModal';
import type { Page } from '../types';
import type { ServiceView } from '../service-pages';

export function AppShell({ dark, page, onNavigate, onToggleTheme, onOpenService, children }: { dark: boolean; page: Page; onNavigate: (page: Page) => void; onToggleTheme: () => void; onOpenService: (view: ServiceView) => void; children: ReactNode }) {
  const items: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'numbers', label: 'Numbers', icon: Smartphone },
    { id: 'fund', label: 'Fund', icon: WalletCards },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  return <div className={`app ${dark ? 'dark' : ''}`}>
    <div className="app-frame">
      <header className={`topbar ${page === 'home' ? 'topbar-home' : ''} ${page === 'profile' ? 'topbar-profile' : ''}`}>
        {page === 'home' ? <>
          <button className="brand-mark" aria-label="Verxor home" onClick={() => onNavigate('home')}>V</button>
          <div className="topbar-greeting" aria-label="Welcome back"><span>Good morning, Denny</span><small>Your Verxor dashboard</small></div>
        </> : <button className="brand-mark" aria-label="Verxor home" onClick={() => onNavigate('home')}>V</button>}
        <div className="topbar-actions">
          <IconButton aria-label="Toggle theme" onClick={onToggleTheme}>{dark ? <Sun size={19} /> : <Moon size={19} />}</IconButton>
          <IconButton aria-label="Notifications" onClick={() => onOpenService('alerts')}><Bell size={19} /></IconButton>
        </div>
      </header>
      <main className="content">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-current={page === id ? 'page' : undefined}>
          <Icon size={19} strokeWidth={page === id ? 2.25 : 1.9} /><small>{label}</small>
        </button>)}
      </nav>
      <CommunityModal />
    </div>
  </div>;
}
