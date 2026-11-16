/**
 * Verxor platform admin — rebuilt from scratch (Phase 1 UI only).
 * Overview = Daily earnings view, mirroring the child-panel layout but
 * from the provider side. All figures stay at zero until Phase 2 APIs land.
 */
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Check,
  KeyRound,
  LayoutDashboard,
  Lock,
  Menu,
  Pencil,
  Percent,
  Plug,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import './admin-page.css';

type AdminSection = 'overview' | 'pricing' | 'providers' | 'settings';

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';
const RATE_KEY = 'verxor-admin-rate';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'settings', label: 'Settings', icon: KeyRound },
];

function naira(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lastNDays(n: number) {
  const out: { key: string; label: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = i === 0
      ? 'Today'
      : d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
    out.push({ key: d.toISOString().slice(0, 10), label, isToday: i === 0 });
  }
  return out;
}

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<AdminSection>('overview');
  const [menuOpen, setMenuOpen] = useState(false);

  // Today's USD→NGN rate. UI-only for now: Phase 2 moves it to the database
  // so editing it here updates every service and every child panel.
  const [rate, setRate] = useState(1380);
  const [rateEditing, setRateEditing] = useState(false);
  const [rateDraft, setRateDraft] = useState('1380');
  const [rateSaved, setRateSaved] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
      const savedRate = Number(localStorage.getItem(RATE_KEY) || '');
      if (Number.isFinite(savedRate) && savedRate > 0) setRate(savedRate);
    } catch { /* ignore */ }
  }, []);

  const saveRate = () => {
    const v = Number(rateDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v <= 0) return;
    setRate(v);
    setRateEditing(false);
    setRateSaved(true);
    try {
      localStorage.setItem(RATE_KEY, String(v));
      window.setTimeout(() => setRateSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      if (!res.ok || !data.ok) {
        setLoginError(data.reason || 'Login failed');
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
        sessionStorage.setItem(PASS_KEY, password);
      } catch { /* ignore */ }
      setUnlocked(true);
      setPassword('');
    } catch {
      setLoginError('Network error');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(PASS_KEY);
    } catch { /* ignore */ }
    setUnlocked(false);
  };

  if (!unlocked) {
    return (
      <div className="vxa-login">
        <form className="vxa-login-card" onSubmit={handleLogin}>
          <div className="vxa-login-mark"><Lock size={22} /></div>
          <h1>Verxor Admin</h1>
          <p>Operator console. Set <strong>ADMIN_PASSWORD</strong> on Vercel, then sign in.</p>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" required />
          </label>
          {loginError ? <div className="vxa-login-error">{loginError}</div> : null}
          <button type="submit" disabled={loginBusy}>{loginBusy ? 'Checking…' : 'Enter admin'}</button>
          <button type="button" className="vxa-login-back" onClick={onBack}>Back to site</button>
        </form>
      </div>
    );
  }

  const days = lastNDays(14);

  return (
    <div className="vxa">
      {/* ── Sidebar ── */}
      <aside className={menuOpen ? 'vxa-side open' : 'vxa-side'}>
        <nav className="vxa-nav" aria-label="Admin sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={section === id ? 'active' : ''}
              onClick={() => { setSection(id); setMenuOpen(false); }}>
              <Icon size={18} strokeWidth={section === id ? 2.25 : 1.85} />
              {label}
            </button>
          ))}
        </nav>
        <div className="vxa-side-foot">
          <button type="button" onClick={handleLogout}><KeyRound size={16} /> Lock admin</button>
          <button type="button" onClick={onBack}><ArrowLeft size={16} /> Back to site</button>
        </div>
      </aside>
      {menuOpen ? <button type="button" className="vxa-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      {/* ── Main ── */}
      <div className="vxa-main">
        <header className="vxa-top">
          <button type="button" className="vxa-burger" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <h1>Daily earnings</h1>
            <p>Your gain for today, updated live</p>
          </div>
        </header>

        {section === 'overview' && (
          <section className="vxa-body">
            {/* Today's profit hero */}
            <div className="vxa-hero">
              <span className="vxa-hero-label"><TrendingUp size={15} /> TODAY'S PROFIT</span>
              <strong>{naira(0)}</strong>
              <em>0 orders completed today · all services combined</em>
            </div>

            {/* Total transactions + today's rate */}
            <div className="vxa-duo">
              <div className="vxa-tile">
                <span className="vxa-tile-label"><Wallet size={14} /> TOTAL TRANSACTIONS</span>
                <strong>{naira(0)}</strong>
                <p>Everything customers bought today</p>
              </div>
              <div className="vxa-tile">
                <span className="vxa-tile-label"><Percent size={14} /> TODAY'S RATE</span>
                {rateEditing ? (
                  <div className="vxa-rate-edit">
                    <div className="vxa-rate-row">
                      <span>₦</span>
                      <input inputMode="decimal" value={rateDraft} autoFocus
                        onChange={(e) => setRateDraft(e.target.value)} aria-label="Naira per dollar" />
                      <span className="vxa-rate-per">/ $1</span>
                    </div>
                    <div className="vxa-rate-actions">
                      <button type="button" className="vxa-rate-save" onClick={saveRate}><Check size={14} /> Save</button>
                      <button type="button" className="vxa-rate-cancel" onClick={() => { setRateEditing(false); setRateDraft(String(rate)); }}>
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="vxa-rate-row">
                    <strong>₦{rate.toLocaleString('en-NG')}</strong>
                    <span className="vxa-rate-per">/ $1</span>
                    <button type="button" className="vxa-rate-btn" aria-label="Edit rate"
                      onClick={() => { setRateDraft(String(rate)); setRateEditing(true); }}>
                      <Pencil size={14} />
                    </button>
                    {rateSaved ? <em className="vxa-rate-saved">Saved</em> : null}
                  </div>
                )}
                <p>Per dollar · used by all services and child panels</p>
              </div>
            </div>

            {/* Most used services today */}
            <div className="vxa-card">
              <div className="vxa-card-head">
                <BarChart3 size={17} />
                <strong>Most-used services today</strong>
              </div>
              <p className="vxa-card-sub">The service customers use most today sits at the top — that's where the money is being made.</p>
              <div className="vxa-empty">
                <strong>No completed orders today yet.</strong>
                <p>As customers buy, services appear here ranked by usage.</p>
              </div>
            </div>

            {/* Last 14 days */}
            <div className="vxa-card">
              <div className="vxa-card-head"><strong>Last 14 days</strong></div>
              <ul className="vxa-days">
                {days.map((d) => (
                  <li key={d.key} className={d.isToday ? 'today' : ''}>
                    <div>
                      <strong>{d.label}</strong>
                      <span>0 orders · {naira(0)} sales</span>
                    </div>
                    <em>+{naira(0)}</em>
                  </li>
                ))}
              </ul>
              <p className="vxa-note">Day rows fill from real orders once the Overview API is connected in Phase 2.</p>
            </div>
          </section>
        )}

        {section === 'pricing' && (
          <section className="vxa-body">
            <div className="vxa-empty tall">
              <strong>Pricing</strong>
              <p>Rate cards, markups and child-panel pricing land here in Phase 2, stored in the database so changes apply instantly platform-wide.</p>
            </div>
          </section>
        )}

        {section === 'providers' && (
          <section className="vxa-body">
            <div className="vxa-empty tall">
              <strong>Providers</strong>
              <p>Upstream provider health, keys and toggles land here in Phase 2. Keys stay server-side only.</p>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section className="vxa-body">
            <div className="vxa-empty tall">
              <strong>Settings</strong>
              <p>Service on/off switches, announcements and admin access land here in Phase 2.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
