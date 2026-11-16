/**
 * Verxor platform admin (operator console) — Phase 1 UI rebuild.
 * Overview-first: daily earnings + most used services. Backend wiring is Phase 2.
 */
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BarChart3,
  KeyRound,
  LayoutDashboard,
  Lock,
  Percent,
  Plug,
  TrendingUp,
} from 'lucide-react';
import './admin-page.css';

type AdminSection = 'overview' | 'pricing' | 'providers' | 'settings';

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'settings', label: 'Settings', icon: KeyRound },
];

/** Services tracked for the "most used today" list. */
const TRACKED_SERVICES = [
  'Virtual Numbers',
  'Data',
  'Airtime',
  'Boost',
  'Buy Logs',
  'Gift Cards',
  'Rental',
  'eSIM',
];

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<AdminSection>('overview');

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
    } catch { /* ignore */ }
  }, []);

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
      <div className="vx-admin-login">
        <form className="vx-admin-login-card" onSubmit={handleLogin}>
          <div className="vx-admin-login-mark"><Lock size={22} /></div>
          <h1>Verxor Admin</h1>
          <p>Operator console. Set <strong>ADMIN_PASSWORD</strong> on Vercel, then sign in.</p>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" required />
          </label>
          {loginError ? <div className="vx-admin-login-error">{loginError}</div> : null}
          <button type="submit" disabled={loginBusy}>{loginBusy ? 'Checking…' : 'Enter admin'}</button>
          <button type="button" className="vx-admin-login-back" onClick={onBack}>Back to app</button>
        </form>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="vx-admin">
      <aside className="vx-admin-side">
        <div className="vx-admin-brand">
          <span className="vx-admin-mark"><img src="/brand/verxor-logo.svg" alt="" width={34} height={34} /></span>
          <div><strong>Verxor Admin</strong><small>Platform operator</small></div>
        </div>
        <nav className="vx-admin-nav" aria-label="Admin sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
              <Icon size={18} strokeWidth={section === id ? 2.25 : 1.85} />
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="vx-admin-exit" onClick={handleLogout}><KeyRound size={16} /> Lock admin</button>
        <button type="button" className="vx-admin-exit" onClick={onBack}><ArrowLeft size={16} /> Back to site</button>
      </aside>

      <div className="vx-admin-main">
        <header className="vx-admin-top">
          <div>
            <span className="vx-admin-eyebrow">VERXOR PLATFORM</span>
            <h1>{NAV.find((n) => n.id === section)?.label ?? 'Admin'}</h1>
          </div>
          <div className="vx-admin-badge">Authenticated · session</div>
        </header>

        {section === 'overview' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">{today}</p>

            {/* Daily earnings hero */}
            <div className="vx-admin-card vx-admin-earnings">
              <div className="vx-admin-earnings-head">
                <span className="vx-admin-earnings-icon"><TrendingUp size={20} /></span>
                <div>
                  <small>Daily Earnings · Today</small>
                  <strong>₦0.00</strong>
                  <em>Live totals connect in Phase 2 — this card will update automatically.</em>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="vx-admin-stats">
              <div className="vx-admin-stat">
                <small>Orders Today</small>
                <strong>—</strong>
                <span>Awaiting live data</span>
              </div>
              <div className="vx-admin-stat">
                <small>Revenue Today</small>
                <strong>—</strong>
                <span>Awaiting live data</span>
              </div>
              <div className="vx-admin-stat">
                <small>Failed Orders</small>
                <strong>—</strong>
                <span>Awaiting live data</span>
              </div>
              <div className="vx-admin-stat">
                <small>New Users Today</small>
                <strong>—</strong>
                <span>Awaiting live data</span>
              </div>
            </div>

            {/* Most used services today */}
            <div className="vx-admin-card">
              <div className="vx-admin-card-head">
                <BarChart3 size={17} />
                <strong>Most Used Services Today</strong>
              </div>
              <ul className="vx-admin-list">
                {TRACKED_SERVICES.map((s) => (
                  <li key={s}>
                    <span>{s}</span>
                    <em>— orders</em>
                  </li>
                ))}
              </ul>
              <p className="vx-admin-note" style={{ marginTop: 10 }}>
                Ranks by real order counts once the Overview API is connected in Phase 2.
              </p>
            </div>
          </section>
        )}

        {section === 'pricing' && (
          <section className="vx-admin-section">
            <div className="vx-admin-empty tall">
              <strong>Pricing is being rebuilt</strong>
              <p>
                Rate cards, markups and panel pricing move here in Phase 2, backed by the database
                so prices apply platform-wide without a deploy.
              </p>
            </div>
          </section>
        )}

        {section === 'providers' && (
          <section className="vx-admin-section">
            <div className="vx-admin-empty tall">
              <strong>Providers is being rebuilt</strong>
              <p>
                Upstream provider status, keys and health checks move here in Phase 2.
                Keys stay on the server only.
              </p>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section className="vx-admin-section">
            <div className="vx-admin-empty tall">
              <strong>Settings is being rebuilt</strong>
              <p>
                Service on/off switches, announcements and admin access move here in Phase 2.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
