import type { ReactNode } from 'react';
import { Bell, History, Home, Moon, PackageSearch, Smartphone, Sun, UserRound, WalletCards } from 'lucide-react';
import { IconButton } from './ui';
import type { Page } from '../types';
import type { ServiceView } from '../service-pages';

export function AppShell({ dark, page, onNavigate, onToggleTheme, onOpenServices, onOpenService, children }: { dark: boolean; page: Page; onNavigate: (page: Page) => void; onToggleTheme: () => void; onOpenServices: () => void; onOpenService: (view: ServiceView) => void; children: ReactNode }) {
  const items: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home }, { id: 'history', label: 'History', icon: History },
    { id: 'fund', label: 'Fund', icon: WalletCards }, { id: 'numbers', label: 'Numbers', icon: Smartphone }, { id: 'profile', label: 'Profile', icon: UserRound },
  ];
  return <div className={`app ${dark ? 'dark' : ''}`}>
    <div className="app-frame">
      <header className="topbar"><button className="brand-mark" aria-label="Open services" onClick={onOpenServices}>V</button><div className="topbar-actions"><IconButton aria-label="Notifications" onClick={() => onOpenService('alerts')}><Bell size={19}/></IconButton><IconButton aria-label="Toggle theme" onClick={onToggleTheme}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</IconButton></div></header>
      <main className="content">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={18}/><small>{label}</small></button>)}
        <button className="nav-item services-nav" onClick={onOpenServices}><PackageSearch size={18}/><small>Services</small></button>
      </nav>
    </div>
  </div>;
}
