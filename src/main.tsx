import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, ChevronRight, Moon, ShieldCheck, Sparkles, Sun, Wallet } from 'lucide-react';
import './styles.css';

function App() {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <div className="app-frame">
        <header className="topbar">
          <div className="brand-mark" aria-label="Verxor">V</div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setDark((value) => !value)}>
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <main className="content">
          <section className="hero">
            <div>
              <p className="eyebrow">WELCOME BACK</p>
              <h1>Everything you need,<br />in one place.</h1>
              <p className="hero-copy">Manage your Verxor services with a faster, cleaner experience.</p>
            </div>
            <div className="hero-icon"><Sparkles size={22} /></div>
          </section>

          <section className="balance-card">
            <div className="balance-top">
              <span>Available balance</span>
              <ShieldCheck size={18} />
            </div>
            <div className="balance">₦0.00</div>
            <button className="primary-button"><Wallet size={18} /> Fund wallet <ChevronRight size={17} /></button>
          </section>

          <section className="section-heading">
            <div><p className="eyebrow">SERVICES</p><h2>Quick actions</h2></div>
          </section>
          <div className="action-grid">
            <button className="action-card"><span className="action-icon">+</span><span><strong>Fund wallet</strong><small>Add money securely</small></span><ChevronRight size={17} /></button>
            <button className="action-card"><span className="action-icon">#</span><span><strong>Virtual numbers</strong><small>Browse available numbers</small></span><ChevronRight size={17} /></button>
          </div>

          <section className="section-heading activity-heading">
            <div><p className="eyebrow">ACTIVITY</p><h2>Recent activity</h2></div>
            <button className="text-button">View all</button>
          </section>
          <div className="empty-card">
            <div className="empty-icon">✓</div>
            <strong>No recent activity</strong>
            <p>Your transactions and orders will appear here.</p>
          </div>
        </main>

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

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
