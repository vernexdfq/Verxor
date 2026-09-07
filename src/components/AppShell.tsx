import type { ReactNode } from 'react';
import { Bell, History, Home, Moon, Smartphone, Sun, UserRound, WalletCards } from 'lucide-react';
import { IconButton } from './ui';
import type { Page } from '../types';

export function AppShell({ dark, page, onNavigate, onToggleTheme, children }: { dark: boolean; page: Page; onNavigate: (page: Page) => void; onToggleTheme: () => void; children: ReactNode }) {
  const items: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home }, { id: 'history', label: 'History', icon: History },
    { id: 'fund', label: 'Fund', icon: WalletCards }, { id: 'numbers', label: 'Numbers', icon: Smartphone }, { id: 'profile', label: 'Profile', icon: UserRound },
  ];
  return <div className={`app ${dark ? 'dark' : ''}`}>
    <div className="app-frame">
      <header className="topbar"><div className="brand-mark">V</div><div className="topbar-actions"><IconButton aria-label="Notifications"><Bell size={19}/></IconButton><IconButton aria-label="Toggle theme" onClick={onToggleTheme}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</IconButton></div></header>
      <main className="content">{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => onNavigate(id)} aria-current={page === id ? 'page' : undefined}><Icon size={18}/><small>{label}</small></button>)}
      </nav>
    </div>
  </div>;
}
