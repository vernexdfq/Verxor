/**
 * Verxor platform admin — operator console
 * Entry: /admin → /workspace?admin=1 | footer admin
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  Copy,
  CreditCard,
  KeyRound,
  Lock,
  MessageSquare,
  Package,
  Users,
  Wallet,
} from 'lucide-react';
import './admin-page.css';
import {
  DEFAULT_CATALOG,
  DEFAULT_PRICES,
  NAV,
  PASS_KEY,
  SESSION_KEY,
  TYPE_LABEL,
  formatWhen,
  panelUsd,
  type AdminSection,
  type CatalogItem,
  type FeedbackRow,
  type PriceRow,
} from './admin-constants';

export function AdminPage({ onBack }: { onBack: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<AdminSection>('overview');
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [panel, setPanel] = useState({
    name: 'Vernex',
    status: 'pending' as 'active' | 'pending',
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
      /* */
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
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
        /* */
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
      /* */
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
      /* */
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
      setPanel((p) => ({ ...p, status: 'active', apiKeyPrefix: data.panel!.apiKeyPrefix + '…' }));
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
      /* */
    }
  };

  const cycleStatus = (id: string) => {
    setCatalog((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const next =
          r.status === 'live' ? 'coming_soon' : r.status === 'coming_soon' ? 'hidden' : 'live';
        return { ...r, status: next as CatalogItem['status'] };
      }),
    );
  };

  const updatePrice = (id: string, field: keyof PriceRow, value: number) => {
    setPrices((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
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
          <p>Operator console. Set ADMIN_PASSWORD on Vercel (secret), then sign in.</p>
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
              Catalog, dual-currency pricing, and Vernex panel API keys. Panel rates stay separate from retail.
            </p>
            <div className="vx-admin-stats">
              <article className="vx-admin-stat">
                <small>Services live</small>
                <strong>{liveCount}</strong>
                <span>of {catalog.length}</span>
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
                <small>Panel markup</small>
                <strong>{panel.markupPct}%</strong>
                <span>Over cost USD</span>
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
                    <em>Live / coming soon / hidden</em>
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
                    <span>4. Vernex env</span>
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
                    <span>Providers</span>
                    <em>See Providers tab</em>
                  </li>
                  <li>
                    <span>Panel API</span>
                    <em>Key issue ready</em>
                  </li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {section === 'catalog' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Click status to cycle Live → Coming soon → Hidden. Nigeria scope stays gated for non-NG accounts.
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
            <p className="vx-admin-note">Session UI state — persist to Supabase in the finishing pass.</p>
          </section>
        )}

        {section === 'pricing' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Cost in <strong>USD</strong>. Retail dual <strong>USD + NGN</strong>. Panel price = cost × (1 +
              panel %).
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
                          onChange={(e) =>
                            updatePrice(row.id, 'panelMarkupPct', Number(e.target.value))
                          }
                        />
                      </td>
                      <td>
                        <strong>${panelUsd(row.costUsd, row.panelMarkupPct).toFixed(2)}</strong>
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
              Day-one panel: <strong>Vernex</strong>. Generate a key, then set env vars on their host.
            </p>
            <div className="vx-admin-card">
              <div className="vx-admin-card-head">
                <Building2 size={18} />
                <strong>{panel.name}</strong>
                <span className={`vx-pill status-${panel.status === 'active' ? 'live' : 'coming_soon'}`}>
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
                      onChange={(e) =>
                        setPanel((p) => ({ ...p, markupPct: Number(e.target.value) || 0 }))
                      }
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
                  <pre className="vx-admin-env">{`# Vernex environment\nVERXOR_API_BASE=https://verxor.com/api/v1\nVERXOR_PANEL_API_KEY=${generatedKey}`}</pre>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {section === 'orders' && (
          <section className="vx-admin-section">
            <div className="vx-admin-empty tall">
              <Package size={28} strokeWidth={1.4} />
              <strong>No orders yet</strong>
              <p>Retail + Vernex fulfillments will list here.</p>
            </div>
          </section>
        )}

        {section === 'users' && (
          <section className="vx-admin-section">
            <div className="vx-admin-empty tall">
              <Users size={28} strokeWidth={1.4} />
              <strong>User tools next</strong>
              <p>Wallet credit/search binds to Supabase profiles in the finishing pass.</p>
            </div>
          </section>
        )}

        {section === 'providers' && (
          <section className="vx-admin-section">
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Use</th>
                    <th>Env</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['5sim', 'OTP', 'FIVESIM_API_KEY'],
                    ['PVAPins', 'OTP', 'PVAPINS_API_KEY'],
                    ['GrizzlySMS', 'OTP', 'GRIZZLY_API_KEY'],
                    ['SmsBower', 'OTP', 'SMSBOWER_API_KEY'],
                    ['AccsZone', 'Buy logs', 'ACCSZONE_API_KEY'],
                  ].map(([n, u, e]) => (
                    <tr key={n}>
                      <td>{n}</td>
                      <td>{u}</td>
                      <td>
                        <code>{e}</code>
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
            <button
              type="button"
              className="vx-admin-exit"
              style={{ position: 'static', marginBottom: 12 }}
              onClick={() => void loadFeedback()}
            >
              Refresh
            </button>
            {fbLoading ? (
              <p className="vx-admin-note">Loading…</p>
            ) : fbError ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} />
                <strong>Inbox not ready</strong>
                <p>{fbError}</p>
              </div>
            ) : feedback.length === 0 ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} />
                <strong>No feedback yet</strong>
              </div>
            ) : (
              <div className="vx-admin-table-wrap">
                <table className="vx-admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>Subject</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedback.map((row) => (
                      <tr key={row.id}>
                        <td>{formatWhen(row.created_at)}</td>
                        <td>{TYPE_LABEL[row.type || ''] || row.type || '—'}</td>
                        <td>
                          {row.user_name || '—'}
                          <br />
                          <small style={{ color: '#64748b' }}>
                            {row.user_email || row.user_contact || ''}
                          </small>
                        </td>
                        <td>{row.subject || '—'}</td>
                        <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{row.message || '—'}</td>
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
            <div className="vx-admin-card">
              <ul className="vx-admin-list">
                <li>
                  <span>Admin URL</span>
                  <em>/admin → /workspace?admin=1</em>
                </li>
                <li>
                  <span>Hidden footer</span>
                  <em>Landing “admin” link</em>
                </li>
                <li>
                  <span>ADMIN_PASSWORD</span>
                  <em>Vercel secret</em>
                </li>
                <li>
                  <span>
                    <CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                    Funding
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
