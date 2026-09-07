import { StrictMode, useState } from 'react';
import { ChevronRight, Sparkles, ShieldCheck, Wallet } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import './styles.css';

function Home() {
  return <>
    <section className="hero">
      <div><p className="eyebrow">WELCOME BACK</p><h1>Everything you need,<br />in one place.</h1><p className="hero-copy">Manage your Verxor services with a faster, cleaner experience.</p></div>
      <div className="hero-icon"><Sparkles size={21} /></div>
    </section>
    <Card className="balance-card">
      <div className="balance-top"><span>Available balance</span><ShieldCheck size={18} /></div>
      <div className="balance">₦0.00</div>
      <PrimaryButton><Wallet size={18} /> Fund wallet <ChevronRight size={17} /></PrimaryButton>
    </Card>
    <SectionHeader eyebrow="SERVICES" title="Quick actions" />
    <div className="action-grid">
      <button className="action-card"><span className="action-icon">+</span><span><strong>Fund wallet</strong><small>Add money securely</small></span><ChevronRight size={17} /></button>
      <button className="action-card"><span className="action-icon">#</span><span><strong>Virtual numbers</strong><small>Browse available numbers</small></span><ChevronRight size={17} /></button>
    </div>
    <SectionHeader eyebrow="ACTIVITY" title="Recent activity" action={<button className="text-button">View all</button>} />
    <Card className="empty-card"><div className="empty-icon">✓</div><strong>No recent activity</strong><p>Your transactions and orders will appear here.</p></Card>
  </>;
}

function App() {
  const [dark, setDark] = useState(false);
  return <AppShell dark={dark} onToggleTheme={() => setDark(v => !v)}><Home /></AppShell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
