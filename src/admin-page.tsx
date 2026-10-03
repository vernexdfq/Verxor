/**
 * Verxor platform admin (operator console).
 * Entry: /admin → /workspace?admin=1 or footer "admin" link.
 * Gate: ADMIN_PASSWORD via /api/admin/login
 */
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  Copy,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Package,
  Percent,
  Plug,
  Settings,
  ToggleLeft,
  Users,
  Wallet,
} from 'lucide-react';
import './admin-page.css';

type AdminSection =
  | 'overview'
  | 'catalog'
  | 'pricing'
  | 'panels'
  | 'orders'
  | 'users'
  | 'providers'
  | 'feedback'
  | 'settings';

type AdminPageProps = { onBack: () => void };

type FeedbackRow = {
  id: string;
  type?: string;
  subject?: string;
  message?: string;
  user_name?: string;
  user_contact?: string;
  user_email?: string;
  status?: string;
  created_at?: string;
};

type ServiceStatus = 'live' | 'coming_soon' | 'hidden';
type ServiceScope = 'global' | 'nigeria' | 'both';

type CatalogItem = {
  id: string;
  name: string;
  scope: ServiceScope;
  status: ServiceStatus;
  provider: string;
};

type PriceRow = {
  id: string;
  service: string;
  costUsd: number;
  retailUsd: number;
  retailNgn: number;
  panelMarkupPct: number;
};

type PanelInfo = {
  name: string;
  status: 'active' | 'pending';
  apiKeyPrefix: string;
  balanceUsd: number;
  markupPct: number;
};

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'catalog', label: 'Catalog', icon: ToggleLeft },
  { id: 'pricing', label: 'Pricing', icon: Percent },
  { id: 'panels', label: 'Child panels', icon: Building2 },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DEFAULT_CATALOG: CatalogItem[] = [
  { id: 'virtual-numbers', name: 'Virtual Number', scope: 'global', status: 'live', provider: '5sim / PVAPins' },
  { id: 'boost', name: 'Boost Account', scope: 'global', status: 'live', provider: 'SMM' },
  { id: 'accounts', name: 'Buy Logs', scope: 'global', status: 'coming_soon', provider: 'AccsZone' },
  { id: 'rental', name: 'Rent Number', scope: 'global', status: 'live', provider: 'Rental pool' },
  { id: 'esim', name: 'eSIM', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'proxies', name: 'Proxies', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'gift-card', name: 'Gift Card', scope: 'global', status: 'live', provider: 'Trade desk' },
  { id: 'virtual-card', name: 'Virtual Card', scope: 'global', status: 'coming_soon', provider: '—' },
  { id: 'airtime', name: 'Airtime', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'data', name: 'Data', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'tv-cable', name: 'TV Subscription', scope: 'nigeria', status: 'live', provider: 'VTU' },
  { id: 'bet-wallet', name: 'Bet Wallet', scope: 'nigeria', status: 'live', provider: 'Betting' },
];

const DEFAULT_PRICES: PriceRow[] = [
  { id: 'vn-eco', service: 'Virtual Numbers · Economy', costUsd: 0.22, retailUsd: 0.3, retailNgn: 480, panelMarkupPct: 15 },
  { id: 'vn-std', service: 'Virtual Numbers · Standard', costUsd: 0.65, retailUsd: 0.88, retailNgn: 1408, panelMarkupPct: 15 },
  { id: 'vn-fast', service: 'Virtual Numbers · Fast', costUsd: 1.2, retailUsd: 1.62, retailNgn: 2592, panelMarkupPct: 12 },
  { id: 'vn-prem', service: 'Virtual Numbers · Premium', costUsd: 2.4, retailUsd: 3.24, retailNgn: 5184, panelMarkupPct: 12 },
  { id: 'boost', service: 'Boost Account (base)', costUsd: 1.0, retailUsd: 1.5, retailNgn: 2400, panelMarkupPct: 20 },
  { id: 'logs', service: 'Buy Logs (base)', costUsd: 2.0, retailUsd: 3.5, retailNgn: 5600, panelMarkupPct: 18 },
  { id: 'airtime', service: 'Airtime (NG)', costUsd: 0, retailUsd: 0, retailNgn: 100, panelMarkupPct: 5 },
  { id: 'data', service: 'Data (NG)', costUsd: 0, retailUsd: 0, retailNgn: 500, panelMarkupPct: 5 },
];

const TYPE_LABEL: Record<string, string> = {
  feature: 'Feature Suggestion',
  bug: 'Bug / Issue Report',
  poor: 'Poor Experience',
  like: 'What You Like',
  general: 'General Suggestion',
};

function formatWhen(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function panelPriceUsd(cost: number, markupPct: number) {
  return Math.round(cost * (1 + markupPct / 100) * 100) / 100;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [section, setSection] = useState<AdminSection>('overview');
  const [catalog, setCatalog] = useState<CatalogItem[]>(DEFAULT_CATALOG);
  const [prices, setPrices] = useState<PriceRow[]>(DEFAULT_PRICES);
  const [panel, setPanel] = useState<PanelInfo>({
    name: 'Vernex',
    status: 'pending',
    apiKeyPrefix: '—',
    balanceUsd: 0,
    markupPct: 15,
  });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [copyOk, setCopyOk] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
    } catch {
      /* ignore */
    }
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
      } catch {
        /* ignore */
      }
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
    } catch {
      /* ignore */
    }
    setUnlocked(false);
    setGeneratedKey(null);
  };

  const loadFeedback = useCallback(async () => {
    setFbLoading(true);
    setFbError('');
    try {
      const res = await fetch('/api/feedback', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; items?: FeedbackRow[]; reason?: string };
      if (!res.ok || data.ok === false) {
        setFbError(data.reason || 'Could not load feedback');
        setFeedback([]);
      } else {
        setFeedback(Array.isArray(data.items) ? data.items : []);
      }
    } catch {
      setFbError('Network error loading feedback');
      setFeedback([]);
    } finally {
      setFbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'feedback' && unlocked) void loadFeedback();
  }, [section, loadFeedback, unlocked]);

  const generatePanelKey = async () => {
    setKeyBusy(true);
    setKeyError('');
    setGeneratedKey(null);
    let pw = '';
    try {
      pw = sessionStorage.getItem(PASS_KEY) || '';
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch('/api/admin/panel-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, panelName: panel.name }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        panel?: { apiKey: string; apiKeyPrefix: string };
      };
      if (!res.ok || !data.ok || !data.panel) {
        setKeyError(data.reason || 'Could not generate key');
        return;
      }
      setGeneratedKey(data.panel.apiKey);
      setPanel((p) => ({
        ...p,
        status: 'active',
        apiKeyPrefix: data.panel!.apiKeyPrefix + '…',
      }));
    } catch {
      setKeyError('Network error');
    } finally {
      setKeyBusy(false);
    }
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const cycleStatus = (id: string) => {
    setCatalog((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const next: ServiceStatus =
          r.status === 'live' ? 'coming_soon' : r.status === 'coming_soon' ? 'hidden' : 'live';
        return { ...r, status: next };
      }),
    );
  };

  const updatePrice = (id: string, field: keyof PriceRow, value: number) => {
    setPrices((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: value };
      }),
    );
  };

  const liveCount = useMemo(() => catalog.filter((c) => c.status === 'live').length, [catalog]);

  if (!unlocked) {
    return (
      <div className="vx-admin-login">
        <form className="vx-admin-login-card" onSubmit={handleLogin}>
          <div className="vx-admin-login-mark">
            <Lock size={22} />
          </div>
          <h1>Verxor Admin</h1>
          <p>
            Operator console. Set <strong>ADMIN_PASSWORD</strong> on Vercel, then sign in.
          </p>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              required
            />
          </label>
          {loginError ? <div className="vx-admin-login-error">{loginError}</div> : null}
          <button type="submit" disabled={loginBusy}>
            {loginBusy ? 'Checking…' : 'Enter admin'}
          </button>
          <button type="button" className="vx-admin-login-back" onClick={onBack}>
            Back to app
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="vx-admin">
      <aside className="vx-admin-side">
        <div className="vx-admin-brand">
          <span className="vx-admin-mark">
            <img src="/brand/verxor-logo.svg" alt="" width={34} height={34} />
          </span>
          <div>
            <strong>Verxor Admin</strong>
            <small>Platform operator</small>
          </div>
        </div>
        <nav className="vx-admin-nav" aria-label="Admin sections">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={section === id ? 'active' : ''}
              onClick={() => setSection(id)}
            >
              <Icon size={18} strokeWidth={section === id ? 2.25 : 1.85} />
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="vx-admin-exit" onClick={handleLogout}>
          <KeyRound size={16} />
          Lock admin
        </button>
        <button type="button" className="vx-admin-exit" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to site
        </button>
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
            <p className="vx-admin-lead">
              Control catalog visibility, retail vs panel pricing, Vernex API keys, and provider health.
              Child panel rates are separate from retail so Vernex never sees end-user prices.
            </p>
            <div className="vx-admin-stats">
              <article className="vx-admin-stat">
                <small>Services live</small>
                <strong>{liveCount}</strong>
                <span>of {catalog.length} in catalog</span>
              </article>
              <article className="vx-admin-stat">
                <small>Child panels</small>
                <strong>1</strong>
                <span>Vernex · {panel.status}</span>
              </article>
              <article className="vx-admin-stat">
                <small>Orders today</small>
                <strong>0</strong>
                <span>All services</span>
              </article>
              <article className="vx-admin-stat">
                <small>Default panel markup</small>
                <strong>{panel.markupPct}%</strong>
                <span>Over provider cost (USD)</span>
              </article>
            </div>
            <div className="vx-admin-grid-2">
              <article className="vx-admin-card">
                <div className="vx-admin-card-head">
                  <Activity size={18} />
                  <strong>Quick path</strong>
                </div>
                <ul className="vx-admin-list">
                  <li>
                    <span>1. Catalog</span>
                    <em>Turn services live / Nigeria-only</em>
                  </li>
                  <li>
                    <span>2. Pricing</span>
                    <em>Cost USD · retail NGN/USD · panel %</em>
                  </li>
                  <li>
                    <span>3. Child panels</span>
                    <em>Generate Vernex API key</em>
                  </li>
                  <li>
                    <span>4. Env on Vernex</span>
                    <em>VERXOR_API_BASE + VERXOR_PANEL_API_KEY</em>
                  </li>
                </ul>
              </article>
              <article className="vx-admin-card">
                <div className="vx-admin-card-head">
                  <Wallet size={18} />
                  <strong>System health</strong>
                </div>
                <ul className="vx-admin-list">
                  <li>
                    <span>App deploy</span>
                    <em className="ok">Online</em>
                  </li>
                  <li>
                    <span>Admin auth</span>
                    <em className="ok">Password gate</em>
                  </li>
                  <li>
                    <span>Provider adapters</span>
                    <em>Check Providers tab</em>
                  </li>
                  <li>
                    <span>Panel API</span>
                    <em>Key issue ready · routes next</em>
                  </li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {section === 'catalog' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Click status to cycle Live → Coming soon → Hidden. Nigeria-only services stay gated for non-NG
              accounts in the consumer app.
            </p>
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Scope</th>
                    <th>Provider</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>
                        <span className={`vx-pill scope-${row.scope}`}>{row.scope}</span>
                      </td>
                      <td>{row.provider}</td>
                      <td>
                        <button
                          type="button"
                          className={`vx-status-btn status-${row.status}`}
                          onClick={() => cycleStatus(row.id)}
                        >
                          {row.status === 'live'
                            ? 'Live'
                            : row.status === 'coming_soon'
                              ? 'Coming soon'
                              : 'Hidden'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="vx-admin-note">
              UI state for this session. Persist to Supabase catalog table in the finishing pass.
            </p>
          </section>
        )}

        {section === 'pricing' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Provider cost in <strong>USD</strong>. Retail shown dual <strong>USD + NGN</strong>. Child panel
              price = cost × (1 + panel markup %). Vernex pays panel price, not retail.
            </p>
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Cost USD</th>
                    <th>Retail USD</th>
                    <th>Retail NGN</th>
                    <th>Panel %</th>
                    <th>Panel USD</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((row) => (
                    <tr key={row.id}>
                      <td>{row.service}</td>
                      <td>
                        <input
                          className="vx-admin-input"
                          type="number"
                          step="0.01"
                          value={row.costUsd}
                          onChange={(e) => updatePrice(row.id, 'costUsd', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="vx-admin-input"
                          type="number"
                          step="0.01"
                          value={row.retailUsd}
                          onChange={(e) => updatePrice(row.id, 'retailUsd', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="vx-admin-input"
                          type="number"
                          step="1"
                          value={row.retailNgn}
                          onChange={(e) => updatePrice(row.id, 'retailNgn', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className="vx-admin-input"
                          type="number"
                          step="1"
                          value={row.panelMarkupPct}
                          onChange={(e) => updatePrice(row.id, 'panelMarkupPct', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <strong>${panelPriceUsd(row.costUsd, row.panelMarkupPct).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'panels' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Day-one child panel: <strong>Vernex only</strong>. Generate an API key, then put base URL + key in
              Vernex environment variables so orders debit their panel rate automatically.
            </p>
            <div className="vx-admin-card">
              <div className="vx-admin-card-head">
                <Building2 size={18} />
                <strong>{panel.name}</strong>
                <span className={`vx-pill scope-${panel.status === 'active' ? 'global' : 'nigeria'}`}>
                  {panel.status}
                </span>
              </div>
              <ul className="vx-admin-list">
                <li>
                  <span>API key prefix</span>
                  <em>{panel.apiKeyPrefix}</em>
                </li>
                <li>
                  <span>Balance (USD)</span>
                  <em>${panel.balanceUsd.toFixed(2)}</em>
                </li>
                <li>
                  <span>Default markup</span>
                  <em>
                    <input
                      className="vx-admin-input inline"
                      type="number"
                      value={panel.markupPct}
                      onChange={(e) => setPanel((p) => ({ ...p, markupPct: Number(e.target.value) || 0 }))}
                    />
                    %
                  </em>
                </li>
                <li>
                  <span>Base URL</span>
                  <em>https://verxor.com/api/v1</em>
                </li>
              </ul>
              <div className="vx-admin-actions">
                <button
                  type="button"
                  className="vx-admin-primary"
                  disabled={keyBusy}
                  onClick={() => void generatePanelKey()}
                >
                  <KeyRound size={16} />
                  {keyBusy ? 'Generating…' : 'Generate API key'}
                </button>
              </div>
              {keyError ? <p className="vx-admin-login-error">{keyError}</p> : null}
              {generatedKey ? (
                <div className="vx-admin-keybox">
                  <p>
                    <strong>Copy once — shown only now</strong>
                  </p>
                  <code>{generatedKey}</code>
                  <button type="button" className="vx-admin-primary" onClick={() => void copyKey()}>
                    <Copy size={14} /> {copyOk ? 'Copied' : 'Copy key'}
                  </button>
                  <pre className="vx-admin-env">{`# Vernex (child panel) environment variables
VERXOR_API_BASE=https://verxor.com/api/v1
VERXOR_PANEL_API_KEY=${generatedKey}`}</pre>
                </div>
              ) : null}
            </div>
            <p className="vx-admin-note">
              After finishing, panel routes will authenticate this key and charge panel USD rates from Pricing.
            </p>
          </section>
        )}

        {section === 'orders' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Cross-tenant order feed (retail + Vernex).</p>
            <div className="vx-admin-empty tall">
              <Package size={28} strokeWidth={1.4} />
              <strong>No orders yet</strong>
              <p>When buys complete, they list here for support and refunds.</p>
            </div>
          </section>
        )}

        {section === 'users' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Search profiles and adjust wallets.</p>
            <div className="vx-admin-empty tall">
              <Users size={28} strokeWidth={1.4} />
              <strong>User tools next</strong>
              <p>Supabase profiles + wallets land with the finishing pass.</p>
            </div>
          </section>
        )}

        {section === 'providers' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Upstream adapters. Keys stay on the server only.</p>
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Use</th>
                    <th>Env</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['5sim', 'OTP', 'FIVESIM_API_KEY'],
                    ['PVAPins', 'OTP', 'PVAPINS_API_KEY'],
                    ['GrizzlySMS', 'OTP', 'GRIZZLYSMS_API_KEY'],
                    ['SmsBower', 'OTP', 'SMSBOWER_API_KEY'],
                    ['AccsZone', 'Buy logs', 'ACCSZONE_API_KEY'],
                  ].map(([name, use, env]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{use}</td>
                      <td>
                        <code>{env}</code>
                      </td>
                      <td>
                        <em>Server env</em>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'feedback' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">User feedback from the app.</p>
            <div style={{ marginBottom: 12 }}>
              <button type="button" className="vx-admin-primary" onClick={() => void loadFeedback()}>
                Refresh
              </button>
            </div>
            {fbLoading ? (
              <p className="vx-admin-note">Loading…</p>
            ) : fbError ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} strokeWidth={1.4} />
                <strong>Inbox not ready</strong>
                <p>{fbError}</p>
              </div>
            ) : feedback.length === 0 ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} strokeWidth={1.4} />
                <strong>No feedback yet</strong>
                <p>When users submit from the app, messages appear here.</p>
              </div>
            ) : (
              <div className="vx-admin-table-wrap">
                <table className="vx-admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((row) => (
                      <tr key={row.id}>
                        <td>{formatWhen(row.created_at)}</td>
                        <td>{TYPE_LABEL[row.type || ''] || row.type || '—'}</td>
                        <td>{row.user_name || row.user_email || row.user_contact || '—'}</td>
                        <td>{row.subject || row.message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {section === 'settings' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Platform defaults and entry points.</p>
            <div className="vx-admin-card">
              <ul className="vx-admin-list">
                <li>
                  <span>Admin URL</span>
                  <em>/admin → /workspace?admin=1</em>
                </li>
                <li>
                  <span>Hidden footer</span>
                  <em>Landing “ops” link</em>
                </li>
                <li>
                  <span>ADMIN_PASSWORD</span>
                  <em>Vercel secret</em>
                </li>
                <li>
                  <span>
                    <CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Funding
                  </span>
                  <em>Flutterwave webhook present</em>
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
