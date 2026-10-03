/**
 * Main Verxor platform admin (operator console).
 * Not partner/wholesaler admin. No password in v1 — security added later.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Building2,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Package,
  Percent,
  Plug,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import './admin-page.css';

type AdminSection =
  | 'overview'
  | 'wholesale'
  | 'partners'
  | 'orders'
  | 'providers'
  | 'feedback'
  | 'settings';

type AdminPageProps = {
  onBack: () => void;
};

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

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'wholesale', label: 'Wholesale rates', icon: Percent },
  { id: 'partners', label: 'Partners', icon: Building2 },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const STATS = [
  { label: 'Platform wallet (preview)', value: '₦0.00', hint: 'Live ledger later' },
  { label: 'Partners', value: '0', hint: 'Reseller tenants' },
  { label: 'Orders today', value: '0', hint: 'All services' },
  { label: 'Open providers', value: '0', hint: 'Connected APIs' },
];

const WHOLESALE_ROWS = [
  { service: 'Virtual Numbers', rule: 'Cost × rate card', status: 'Configured (preview)' },
  { service: 'SMM Boost', rule: 'Cost × rate card', status: 'Configured (preview)' },
  { service: 'Buy Accounts', rule: 'Cost × rate card', status: 'Configured (preview)' },
  { service: 'Rent a Line', rule: 'Cost × rate card', status: 'Pending inventory' },
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

export function AdminPage({ onBack }: AdminPageProps) {
  const [section, setSection] = useState<AdminSection>('overview');
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState('');

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
    if (section === 'feedback') {
      void loadFeedback();
    }
  }, [section, loadFeedback]);

  return (
    <div className="vx-admin">
      <aside className="vx-admin-side">
        <div className="vx-admin-brand">
          <span className="vx-admin-mark">V</span>
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
          <div className="vx-admin-badge">Preview · no login yet</div>
        </header>

        {section === 'overview' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Operator console for wholesale rates, partners, orders and providers. Customer app and
              partner panels are separate. Security (password / 2FA) will be added before production
              traffic.
            </p>
            <div className="vx-admin-stats">
              {STATS.map((s) => (
                <article key={s.label} className="vx-admin-stat">
                  <small>{s.label}</small>
                  <strong>{s.value}</strong>
                  <span>{s.hint}</span>
                </article>
              ))}
            </div>
            <div className="vx-admin-grid-2">
              <article className="vx-admin-card">
                <div className="vx-admin-card-head">
                  <Activity size={18} />
                  <strong>Recent activity</strong>
                </div>
                <div className="vx-admin-empty">
                  <p>No platform events yet. Orders and partner top-ups will list here.</p>
                </div>
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
                    <span>Provider adapters</span>
                    <em>Not connected</em>
                  </li>
                  <li>
                    <span>Flutterwave / funding</span>
                    <em>Not connected</em>
                  </li>
                  <li>
                    <span>Admin auth</span>
                    <em>Open preview</em>
                  </li>
                </ul>
              </article>
            </div>
          </section>
        )}

        {section === 'wholesale' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Category rules that turn provider cost into Verxor wholesale. Partners only see
              wholesale and set their own retail margins.
            </p>
            <div className="vx-admin-table-wrap">
              <table className="vx-admin-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Pricing rule</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {WHOLESALE_ROWS.map((row) => (
                    <tr key={row.service}>
                      <td>{row.service}</td>
                      <td>{row.rule}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="vx-admin-note">
              Live rate inputs and FX will bind to the pricing engine when the backend is wired.
            </p>
          </section>
        )}

        {section === 'partners' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Reseller tenants (e.g. Vernex panel). Each partner has a prepaid platform wallet and
              retail margins. This is not the partner-facing admin.
            </p>
            <div className="vx-admin-empty tall">
              <Users size={28} strokeWidth={1.4} />
              <strong>No partners yet</strong>
              <p>When you onboard a reseller, they appear here with balance, status and rate tier.</p>
            </div>
          </section>
        )}

        {section === 'orders' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">Cross-tenant order feed for OTP, SMM, accounts and rentals.</p>
            <div className="vx-admin-empty tall">
              <Package size={28} strokeWidth={1.4} />
              <strong>No orders yet</strong>
              <p>Successful and failed fulfillments will show here for support and auditing.</p>
            </div>
          </section>
        )}

        {section === 'providers' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              Upstream provider adapters are managed behind the platform service layer. Provider credentials stay on the server —
              never in partner UIs.
            </p>
            <div className="vx-admin-empty tall">
              <Plug size={28} strokeWidth={1.4} />
              <strong>No providers connected</strong>
              <p>Connect adapters when you are ready to serve live inventory.</p>
            </div>
          </section>
        )}

        {section === 'feedback' && (
          <section className="vx-admin-section">
            <p className="vx-admin-lead">
              User feedback from the app. Each submission is emailed to support@verxor.com (with Reply-To set to the user when available) and stored here when Supabase is connected.
            </p>
            <div style={{ marginBottom: 12 }}>
              <button type="button" className="vx-admin-exit" style={{ position: 'static' }} onClick={() => void loadFeedback()}>
                Refresh
              </button>
            </div>
            {fbLoading ? (
              <p className="vx-admin-note">Loading…</p>
            ) : fbError ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} strokeWidth={1.4} />
                <strong>Inbox not ready</strong>
                <p>{fbError}. Run the feedback SQL and set Supabase env vars on Vercel.</p>
              </div>
            ) : feedback.length === 0 ? (
              <div className="vx-admin-empty tall">
                <MessageSquare size={28} strokeWidth={1.4} />
                <strong>No feedback yet</strong>
                <p>When users send feedback from Profile → Feedback, it will list here.</p>
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
                          <div>{row.user_name || '—'}</div>
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
            <p className="vx-admin-lead">Platform defaults. Login protection will land in this section.</p>
            <div className="vx-admin-card">
              <ul className="vx-admin-list">
                <li>
                  <span>Admin password</span>
                  <em>Not set (preview open)</em>
                </li>
                <li>
                  <span>Support channel</span>
                  <em>WhatsApp / Telegram (app links)</em>
                </li>
                <li>
                  <span>Default display currency</span>
                  <em>Set per user at registration</em>
                </li>
                <li>
                  <span>
                    <CreditCard size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
                    Payout / Flutterwave
                  </span>
                  <em>Not connected</em>
                </li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
