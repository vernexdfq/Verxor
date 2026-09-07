import type { ReactNode } from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import { IconButton } from './ui';

export function AppShell({ dark, onToggleTheme, children }: { dark: boolean; onToggleTheme: () => void; children: ReactNode }) {
  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-mark">V</div>
          <div className="topbar-actions">
            <IconButton aria-label="Notifications"><Bell size={19} /></IconButton>
            <IconButton aria-label="Toggle theme" onClick={onToggleTheme}>{dark ? <Sun size={19} /> : <Moon size={19} />}</IconButton>
          </div>
        </header>
        <main className="content">{children}</main>
        <nav className="bottom-nav" aria-label="Primary navigation">
          <a className="nav-item active" href="#home"><span>⌂</span><small>Home</small></a>
          <a className="nav-item" href="#history"><span>◷</span><small>History</small></a>
          <a className="nav-item" href="#fund"><span>＋</span><small>Fund</small></a>
          <a className="nav-item" href="#numbers"><span>▦</span><small>Numbers</small></a>
          <a className="nav-item" href="#profile"><span>○</span><small>Profile</small></a>
        </nav>
      </div>
    </div>
  );
}
