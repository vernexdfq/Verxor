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
  Ban,
  Check,
  KeyRound,
  LayoutDashboard,
  Lock,
  Menu,
  Pencil,
  Percent,
  Plug,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import './admin-page.css';

type AdminSection = 'overview' | 'users' | 'pricing' | 'providers' | 'settings';

type AdminUserTab = 'all' | 'customers' | 'api' | 'panels';

/** Per-API-user service permissions. Auto-enabled vs locked by default. */
const API_SERVICES: { id: string; label: string; on: boolean }[] = [
  { id: 'virtual-numbers', label: 'Virtual Number (OTP)', on: true },
  { id: 'email-otp', label: 'Email OTP', on: true },
  { id: 'boost', label: 'Boost Account (SMM)', on: true },
  { id: 'vtu', label: 'VTU (Data, Airtime, Electricity, Exam Pin, Bet Wallet, Cable TV)', on: true },
  { id: 'buy-logs', label: 'Buy Logs & Accounts', on: false },
  { id: 'rent-sms', label: 'Rent for SMS (Non-VoIP)', on: false },
  { id: 'rent-sms-calls', label: 'Rent for SMS/Calls (SignalWire)', on: false },
  { id: 'telegram-premium', label: 'Telegram Premium', on: false },
];

/**
 * Phase 1 preview user. Clearly marked as preview; Phase 2 replaces this
 * whole list with live data from the profiles / api_keys / child_panels tables.
 */
const PREVIEW_USER = {
  id: 'preview-1',
  name: 'Preview User',
  contact: '0801 234 5678',
  email: 'preview@verxor.com',
  joined: 'Nov 2026',
  balance: 12500,
  apiKey: true,
  panel: false,
  banned: false,
  services: API_SERVICES,
};

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';
const RATE_KEY = 'verxor-admin-rate';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
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

function UserManagement() {
  const [tab, setTab] = useState<AdminUserTab>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<typeof PREVIEW_USER | null>(null);

  const [adjustMode, setAdjustMode] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [services, setServices] = useState(API_SERVICES);
  const [unlockNote, setUnlockNote] = useState('');
  const [banned, setBanned] = useState(false);

  const comingSoon = () =>
    window.alert('Phase 2: this action connects to the live database.');

  if (selected) {
    return (
      <div className="vxa-user-detail">
        <button type="button" className="vxa-back" onClick={() => setSelected(null)}>
          <ArrowLeft size={16} /> Back to users
        </button>

        {/* Header */}
        <div className="vxa-user-head">
          <div className="vxa-user-avatar">{selected.name.slice(0, 1).toUpperCase()}</div>
          <div className="vxa-user-id">
            <h2>{selected.name} <span className="vxa-tag preview">PREVIEW</span></h2>
            <p>{selected.contact} · {selected.email} · Joined {selected.joined}</p>
            <div className="vxa-user-tags">
              {selected.apiKey ? <span className="vxa-tag blue">API Developer</span> : null}
              {selected.panel ? <span className="vxa-tag navy">Child Panel</span> : null}
              <span className="vxa-tag grey">Customer</span>
            </div>
          </div>
          <div className="vxa-user-head-right">
            <button type="button" className={banned ? 'vxa-ban-btn banned' : 'vxa-ban-btn'} onClick={() => { setBanned(!banned); comingSoon(); }}>
              <Ban size={15} /> {banned ? 'Frozen — tap to restore' : 'Ban / Freeze'}
            </button>
          </div>
        </div>

        <div className="vxa-duo">
          {/* Wallet */}
          <div className="vxa-tile">
            <span className="vxa-tile-label"><Wallet size={14} /> WALLET BALANCE</span>
            <strong>{naira(selected.balance)}</strong>
            <div className="vxa-adjust">
              <div className="vxa-adjust-toggle">
                <button type="button" className={adjustMode === 'credit' ? 'active' : ''} onClick={() => setAdjustMode('credit')}>+ Add money</button>
                <button type="button" className={adjustMode === 'debit' ? 'active' : ''} onClick={() => setAdjustMode('debit')}>− Remove money</button>
              </div>
              <input inputMode="decimal" placeholder="Amount" value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)} aria-label="Amount" />
              <div className="vxa-chips">
                {[500, 1000, 2000, 5000, 10000].map((v) => (
                  <button type="button" key={v} onClick={() => setAdjustAmount(String(v))}>₦{v.toLocaleString('en-NG')}</button>
                ))}
              </div>
              <input placeholder="Reason (optional)" value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)} aria-label="Reason" />
              <button type="button" className="vxa-adjust-go" onClick={comingSoon}>
                {adjustMode === 'credit' ? 'Credit wallet' : 'Debit wallet'}
              </button>
              <p className="vxa-note">Every adjustment is written to the admin audit log in Phase 2.</p>
            </div>
          </div>

          {/* Contact + transactions */}
          <div className="vxa-tile">
            <span className="vxa-tile-label"><Pencil size={14} /> PHONE NUMBER</span>
            {phoneEditing ? (
              <div className="vxa-rate-edit">
                <div className="vxa-rate-row">
                  <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} aria-label="Phone number" />
                </div>
                <div className="vxa-rate-actions">
                  <button type="button" className="vxa-rate-save" onClick={() => { setPhoneEditing(false); comingSoon(); }}>
                    <Check size={14} /> Save
                  </button>
                  <button type="button" className="vxa-rate-cancel" onClick={() => setPhoneEditing(false)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="vxa-rate-row">
                <strong style={{ fontSize: 19 }}>{selected.contact}</strong>
                <button type="button" className="vxa-rate-btn" aria-label="Edit phone"
                  onClick={() => { setPhoneDraft(selected.contact); setPhoneEditing(true); }}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="vxa-tile-sep">RECENT TRANSACTIONS</p>
            <div className="vxa-empty small">
              <strong>No transactions yet.</strong>
              <p>Real orders and funding records appear here in Phase 2.</p>
            </div>
          </div>
        </div>

        {/* API permission matrix */}
        <div className="vxa-card">
          <div className="vxa-card-head">
            <KeyRound size={17} />
            <strong>API service access</strong>
            {selected.apiKey ? <span className="vxa-tag blue">API Developer</span> : <span className="vxa-tag grey">No API key</span>}
          </div>
          <p className="vxa-card-sub">
            Virtual Numbers, Email OTP, Boost and VTU are on by default for every API user.
            Locked services stay off until you verify the user (CAC or personal trust) and toggle them on.
          </p>
          <ul className="vxa-matrix">
            {services.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{s.label}</strong>
                  <span>{s.on ? 'Unlocked' : 'Locked — contact admin to unlock'}</span>
                </div>
                <button type="button"
                  className={s.on ? 'vxa-switch on' : 'vxa-switch'}
                  aria-pressed={s.on}
                  aria-label={`Toggle ${s.label}`}
                  onClick={() => {
                    setServices((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, on: !x.on } : x)),
                    );
                    if (!s.on) window.alert("Phase 2: unlock saves to the database with your note and opens this service for the user's API key.");
                  }}>
                  <em />
                </button>
              </li>
            ))}
          </ul>
          <div className="vxa-unlock-note">
            <label>Unlock note (why this user was approved)</label>
            <input placeholder="e.g. CAC verified, registered business / known in person"
              value={unlockNote} onChange={(e) => setUnlockNote(e.target.value)} />
            <p className="vxa-note">Locked endpoints reply: "Service locked. Contact Verxor Admin on WhatsApp/Telegram to unlock wholesale access."</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="vxa-users-toolbar">
        <div className="vxa-tabs">
          {([
            ['all', 'All'],
            ['customers', 'Customers'],
            ['api', 'API Developers'],
            ['panels', 'Child Panels'],
          ] as [AdminUserTab, string][]).map(([id, label]) => (
            <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
              {id === 'panels' ? <em className="vxa-tab-count">0</em> : null}
            </button>
          ))}
        </div>
        <div className="vxa-search">
          <Search size={16} />
          <input placeholder="Search name, phone, email or reference" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
      </div>

      {tab === 'panels' ? (
        <div className="vxa-card">
          <div className="vxa-card-head"><strong>Child Panels Monitor</strong></div>
          <p className="vxa-card-sub">
            Connected panels with custom domain, today's API volume, last activity and a Suspend / Activate kill-switch.
            A user becomes a panel only after paying for the panel and you deliver it, then you upgrade them here.
          </p>
          <div className="vxa-empty">
            <strong>No child panels yet.</strong>
            <p>When you deliver a panel and upgrade the user, it appears here with its domain, spend and kill-switch.</p>
          </div>
        </div>
      ) : (
        <div className="vxa-card">
          <div className="vxa-card-head"><strong>Users</strong></div>
          <ul className="vxa-user-list">
            <li onClick={() => setSelected(PREVIEW_USER)} role="button">
              <div className="vxa-user-avatar small">P</div>
              <div className="vxa-user-cell">
                <strong>Preview User <span className="vxa-tag preview">PREVIEW</span></strong>
                <span>0801 234 5678 · preview@verxor.com</span>
              </div>
              <div className="vxa-user-cell right">
                <strong>{naira(PREVIEW_USER.balance)}</strong>
                <span className="vxa-tag blue">API Developer</span>
              </div>
            </li>
          </ul>
          <p className="vxa-note">
            This preview row lets you see the user detail design. Phase 2 replaces it with the live user list
            (customers, API developers and panels) from the database.
          </p>
        </div>
      )}
    </>
  );
}

type OverviewDay = { date: string; orders: number; sales: number; net: number };
type OverviewData = {
  ok?: boolean;
  todaySales?: number;
  todayOrders?: number;
  todayRefunds?: number;
  todayNet?: number;
  newUsers?: number;
  days?: OverviewDay[];
  services?: { name: string; orders: number; sales: number }[];
};

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

  // Phase 2: live overview data from /api/admin/overview
  const [ov, setOv] = useState<OverviewData | null>(null);
  const [ovError, setOvError] = useState(false);

  useEffect(() => {
    if (!unlocked || section !== 'overview') return;
    let cancelled = false;
    const load = async () => {
      try {
        const pw = sessionStorage.getItem(PASS_KEY) || '';
        const res = await fetch('/api/admin/overview', {
          headers: { 'x-admin-password': pw },
          cache: 'no-store',
        });
        const data = (await res.json()) as OverviewData;
        if (!cancelled) {
          if (res.ok && data.ok) { setOv(data); setOvError(false); } else { setOvError(true); }
        }
      } catch {
        if (!cancelled) setOvError(true);
      }
    };
    load();
    const t = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [unlocked, section]);

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
              <strong>{naira(ov?.todayNet ?? 0)}</strong>
              <em>{ov?.todayOrders ?? 0} orders completed today · {ov?.todayRefunds ?? 0} refunded · all services combined</em>
            </div>

            {/* Total transactions + today's rate */}
            <div className="vxa-duo">
              <div className="vxa-tile">
                <span className="vxa-tile-label"><Wallet size={14} /> TOTAL TRANSACTIONS</span>
                <strong>{naira(ov?.todaySales ?? 0)}</strong>
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
              {ov && ov.services && ov.services.length > 0 ? (
                <ul className="vxa-days">
                  {ov.services.map((s) => (
                    <li key={s.name}>
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.orders} order{s.orders === 1 ? '' : 's'} today</span>
                      </div>
                      <em>+{naira(s.sales)}</em>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="vxa-empty">
                  <strong>No completed orders today yet.</strong>
                  <p>As customers buy, services appear here ranked by usage.</p>
                </div>
              )}
            </div>

            {/* Last 14 days */}
            <div className="vxa-card">
              <div className="vxa-card-head"><strong>Last 14 days</strong></div>
              <ul className="vxa-days">
                {(ov?.days && ov.days.length ? ov.days : days.map((d) => ({ date: d.key, orders: 0, sales: 0, net: 0 }))).map((d, idx, arr) => (
                  <li key={d.date} className={idx === arr.length - 1 ? 'today' : ''}>
                    <div>
                      <strong>{idx === arr.length - 1
                        ? 'Today'
                        : new Date(d.date + 'T12:00:00Z').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                      <span>{d.orders} order{d.orders === 1 ? '' : 's'} · {naira(d.sales)} sales</span>
                    </div>
                    <em>+{naira(d.net)}</em>
                  </li>
                ))}
              </ul>
              <p className="vxa-note">
                {ovError
                  ? 'Could not load live data — reload or check the server logs.'
                  : 'Live from your order ledger · refreshes every minute. Profit = customer sales minus refunds; exact per-service margins arrive with the pricing tables.'}
              </p>
            </div>
          </section>
        )}

        {section === 'users' && (
          <section className="vxa-body">
            <UserManagement />
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
