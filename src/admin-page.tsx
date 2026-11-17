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
  Shield,
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

type AdminUserService = { enabled: boolean; note: string | null };
type AdminUser = {
  id: string;
  email: string;
  phone: string;
  name: string;
  joined: string;
  balanceNgn: number;
  apiKey: boolean;
  panel: { id: string; name: string; domain: string | null; suspended: boolean } | null;
  banned: boolean;
  services: Record<string, AdminUserService>;
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

function adminHeaders(): Record<string, string> {
  let pw = '';
  try { pw = sessionStorage.getItem(PASS_KEY) || ''; } catch { /* ignore */ }
  return { 'x-admin-password': pw, 'Content-Type': 'application/json' };
}

function serviceEnabled(u: AdminUser, id: string): boolean {
  const override = u.services[id];
  if (override) return override.enabled;
  return API_SERVICES.find((s) => s.id === id)?.on ?? false;
}

function displayName(u: AdminUser): string {
  const label = (u.name || u.email || u.phone || u.id).trim();
  return label.length > 22 ? label.slice(0, 20) + '…' : label;
}

function UserManagement() {
  const [tab, setTab] = useState<AdminUserTab>('all');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [panels, setPanels] = useState<{ id: string; name: string; domain: string | null; suspended: boolean; userId: string | null; balanceNgn?: number; markupPercent?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [adjustMode, setAdjustMode] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [unlockNote, setUnlockNote] = useState('');
  const [panelOpenId, setPanelOpenId] = useState<string | null>(null);
  const [panelAmount, setPanelAmount] = useState('');
  const [panelMode, setPanelMode] = useState<'credit' | 'debit'>('credit');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: adminHeaders(), cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; users?: AdminUser[]; panels?: typeof panels; error?: string };
      if (res.ok && data.ok && Array.isArray(data.users)) {
        setUsers(data.users);
        setPanels(data.panels || []);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const fresh = users.find((u) => u.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [users, selected]);

  const act = async (payload: Record<string, unknown>, okMsg: string): Promise<boolean> => {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setMsg(data.error || 'Action failed');
        return false;
      }
      setMsg(okMsg);
      await load();
      return true;
    } catch {
      setMsg('Network error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const filtered = users.filter((u) => {
    if (tab === 'customers' && (u.panel || u.apiKey)) return false;
    if (tab === 'api' && !u.apiKey) return false;
    if (tab === 'panels' && !u.panel) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  if (selected) {
    const submitAdjust = async () => {
      const amount = Number(adjustAmount.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) { setMsg('Enter a valid amount'); return; }
      const ok = await act(
        { action: adjustMode, userId: selected.id, amount, reason: adjustReason },
        adjustMode === 'credit' ? 'Wallet credited' : 'Wallet debited',
      );
      if (ok) setAdjustAmount('');
    };

    return (
      <div className="vxa-user-detail">
        <button type="button" className="vxa-back" onClick={() => { setSelected(null); setMsg(''); }}>
          <ArrowLeft size={16} /> Back to users
        </button>
        {msg ? <div className="vxa-action-msg">{msg}</div> : null}

        <div className="vxa-user-head">
          <div className="vxa-user-avatar">{displayName(selected).slice(0, 1).toUpperCase()}</div>
          <div className="vxa-user-id">
            <h2>{displayName(selected)}</h2>
            <p>{selected.phone || 'no phone'} · {selected.email || 'no email'}</p>
            <div className="vxa-user-tags">
              {selected.apiKey ? <span className="vxa-tag blue">API Developer</span> : null}
              {selected.panel ? <span className="vxa-tag navy">Child Panel</span> : null}
              <span className="vxa-tag grey">Customer</span>
              {selected.banned ? <span className="vxa-tag banned">Frozen</span> : null}
            </div>
          </div>
          <div className="vxa-user-head-right">
            <button type="button" disabled={busy}
              className={selected.banned ? 'vxa-ban-btn banned' : 'vxa-ban-btn'}
              onClick={() => act(
                { action: selected.banned ? 'unban' : 'ban', userId: selected.id },
                selected.banned ? 'User restored' : 'User frozen',
              )}>
              <Ban size={15} /> {selected.banned ? 'Frozen — tap to restore' : 'Ban / Freeze'}
            </button>
          </div>
        </div>

        <div className="vxa-duo">
          <div className="vxa-tile">
            <span className="vxa-tile-label"><Wallet size={14} /> WALLET BALANCE</span>
            <strong>{naira(selected.balanceNgn)}</strong>
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
              <button type="button" className="vxa-adjust-go" disabled={busy} onClick={submitAdjust}>
                {busy ? 'Working…' : adjustMode === 'credit' ? 'Credit wallet' : 'Debit wallet'}
              </button>
              <p className="vxa-note">Every adjustment is written to the admin audit log.</p>
            </div>
          </div>

          <div className="vxa-tile">
            <span className="vxa-tile-label"><Pencil size={14} /> PHONE NUMBER</span>
            {phoneEditing ? (
              <div className="vxa-rate-edit">
                <div className="vxa-rate-row">
                  <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} aria-label="Phone number" />
                </div>
                <div className="vxa-rate-actions">
                  <button type="button" className="vxa-rate-save" disabled={busy}
                    onClick={async () => {
                      const ok = await act(
                        { action: 'set-phone', userId: selected.id, phone: phoneDraft },
                        'Phone number updated',
                      );
                      if (ok) setPhoneEditing(false);
                    }}>
                    <Check size={14} /> Save
                  </button>
                  <button type="button" className="vxa-rate-cancel" onClick={() => setPhoneEditing(false)}>
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="vxa-rate-row">
                <strong style={{ fontSize: 19 }}>{selected.phone || '—'}</strong>
                <button type="button" className="vxa-rate-btn" aria-label="Edit phone"
                  onClick={() => { setPhoneDraft(selected.phone); setPhoneEditing(true); }}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="vxa-tile-sep">RECENT TRANSACTIONS</p>
            <div className="vxa-empty small">
              <strong>Per-user transactions land here next.</strong>
              <p>Wallet ledger rows for this user join this card in the next build.</p>
            </div>
          </div>
        </div>

        <div className="vxa-card">
          <div className="vxa-card-head">
            <KeyRound size={17} />
            <strong>API service access</strong>
            {selected.apiKey ? <span className="vxa-tag blue">API Developer</span> : <span className="vxa-tag grey">No overrides yet</span>}
          </div>
          <p className="vxa-card-sub">
            Virtual Numbers, Email OTP, Boost and VTU are on by default for every API user.
            Locked services stay off until you verify the user (CAC or personal trust) and toggle them on.
          </p>
          <ul className="vxa-matrix">
            {API_SERVICES.map((s) => {
              const on = serviceEnabled(selected, s.id);
              return (
                <li key={s.id}>
                  <div>
                    <strong>{s.label}</strong>
                    <span>{on ? 'Unlocked' : 'Locked — tap the switch to unlock'}</span>
                  </div>
                  <button type="button" disabled={busy}
                    className={on ? 'vxa-switch on' : 'vxa-switch'}
                    aria-pressed={on}
                    aria-label={`Toggle ${s.label}`}
                    onClick={() => act(
                      { action: 'set-service', userId: selected.id, service: s.id, enabled: !on, unlockNote },
                      !on ? 'Service unlocked' : 'Service locked',
                    )}>
                    <em />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="vxa-unlock-note">
            <label>Unlock note (why this user was approved)</label>
            <input placeholder="e.g. CAC verified, registered business / known in person"
              value={unlockNote} onChange={(e) => setUnlockNote(e.target.value)} />
            <p className="vxa-note">Locked endpoints reply to API users: "Service locked. Contact Verxor Admin on WhatsApp/Telegram to unlock wholesale access."</p>
          </div>
        </div>

        <div className="vxa-card">
          <div className="vxa-card-head">
            <Shield size={17} />
            <strong>Child Panel access</strong>
            {selected.panel ? <span className="vxa-tag navy">Child Panel</span> : <span className="vxa-tag grey">Standard customer</span>}
          </div>
          <p className="vxa-card-sub">
            Upgrade a user to Child Panel after they have paid for a panel and you have delivered it.
            Upgraded users get Child Panel prices on every service.
          </p>
          <ul className="vxa-matrix">
            <li>
              <div>
                <strong>Child Panel</strong>
                <span>{selected.panel ? 'Upgraded — gets Child Panel prices' : 'Not upgraded — standard customer prices'}</span>
              </div>
              <button type="button" disabled={busy}
                className={selected.panel ? 'vxa-switch on' : 'vxa-switch'}
                aria-pressed={Boolean(selected.panel)}
                aria-label="Toggle Child Panel"
                onClick={() => act(
                  { action: 'set-panel', userId: selected.id, enabled: !selected.panel },
                  selected.panel ? 'Downgraded to standard customer' : 'Upgraded to Child Panel',
                )}>
                <em />
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      {msg && tab !== 'panels' ? <div className="vxa-action-msg">{msg}</div> : null}
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
              {id === 'panels' ? <em className="vxa-tab-count">{panels.length}</em> : null}
            </button>
          ))}
        </div>
        <div className="vxa-search">
          <Search size={16} />
          <input placeholder="Search name, phone, email" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Search users" />
        </div>
      </div>

      {loadError ? (
        <div className="vxa-empty">
          <strong>Could not load users.</strong>
          <p>Check that ADMIN_PASSWORD is set and the database is reachable, then reload.</p>
        </div>
      ) : loading ? (
        <div className="vxa-card"><p className="vxa-note">Loading users…</p></div>
      ) : tab === 'panels' ? (
        <div className="vxa-card">
          <div className="vxa-card-head"><strong>Child Panels Monitor</strong></div>
          {msg ? <div className="vxa-action-msg">{msg}</div> : null}
          <p className="vxa-card-sub">
            A user becomes a panel only after paying for the panel and you delivering it, then upgrading them here.
          </p>
          {panels.length === 0 ? (
            <div className="vxa-empty">
              <strong>No child panels yet.</strong>
              <p>When you deliver a panel and upgrade the user, it appears here with its domain, spend and kill-switch.</p>
            </div>
          ) : (
            <ul className="vxa-user-list">
              {panels.map((p) => (
                <li key={p.id} onClick={() => { const u = users.find((x) => x.id === p.userId); if (u) setSelected(u); }}>
                  <div className="vxa-user-cell">
                    <strong>{p.name}</strong>
                    <span>{p.domain || 'no domain'} · markup {p.markupPercent ?? 15}%</span>
                  </div>
                  <div className="vxa-user-cell right">
                    <strong>{naira(p.balanceNgn ?? 0)}</strong>
                    <button type="button" className="vxa-rate-btn" aria-label={`Adjust ${p.name} wallet`}
                      onClick={(e) => { e.stopPropagation(); setPanelOpenId(panelOpenId === p.id ? null : p.id); setPanelAmount(''); }}>
                      <Pencil size={14} />
                    </button>
                    {p.suspended ? <span className="vxa-tag banned">Suspended</span> : <span className="vxa-tag grey">Active</span>}
                  </div>
                  {panelOpenId === p.id ? (
                    <div className="vxa-panel-adjust" onClick={(e) => e.stopPropagation()}>
                      <div className="vxa-adjust-toggle">
                        <button type="button" className={panelMode === 'credit' ? 'active' : ''} onClick={() => setPanelMode('credit')}>+ Add money</button>
                        <button type="button" className={panelMode === 'debit' ? 'active' : ''} onClick={() => setPanelMode('debit')}>− Remove money</button>
                      </div>
                      <input inputMode="decimal" placeholder="Amount" value={panelAmount}
                        onChange={(e) => setPanelAmount(e.target.value)} aria-label="Panel amount" />
                      <button type="button" className="vxa-adjust-go" disabled={busy}
                        onClick={async () => {
                          const amount = Number(panelAmount.replace(/[^0-9.]/g, ''));
                          if (!Number.isFinite(amount) || amount <= 0 || !p.userId) {
                            setMsg('Enter a valid amount (the panel must have a linked wallet)');
                            return;
                          }
                          const ok = await act(
                            { action: 'panel-' + panelMode, userId: p.userId, amount, reason: 'Panel wallet adjustment' },
                            panelMode === 'credit' ? 'Panel wallet credited' : 'Panel wallet debited',
                          );
                          if (ok) { setPanelAmount(''); setPanelOpenId(null); }
                        }}>
                        {busy ? 'Working…' : panelMode === 'credit' ? 'Credit panel wallet' : 'Debit panel wallet'}
                      </button>
                      <p className="vxa-note">Directly moves this panel's reseller wallet · audit logged.</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="vxa-card">
          <div className="vxa-card-head"><strong>Users ({filtered.length})</strong></div>
          {filtered.length === 0 ? (
            <div className="vxa-empty">
              <strong>No users match.</strong>
              <p>Try a different tab or clear the search.</p>
            </div>
          ) : (
            <ul className="vxa-user-list">
              {filtered.map((u) => (
                <li key={u.id} role="button" onClick={() => { setSelected(u); setMsg(''); }}>
                  <div className="vxa-user-avatar small">{displayName(u).slice(0, 1).toUpperCase()}</div>
                  <div className="vxa-user-cell">
                    <strong>{displayName(u)}{u.banned ? <span className="vxa-tag banned">Frozen</span> : null}</strong>
                    <span>{u.phone || 'no phone'} · {u.email || 'no email'}</span>
                  </div>
                  <div className="vxa-user-cell right">
                    <strong>{naira(u.balanceNgn)}</strong>
                    <span>
                      {u.panel ? <span className="vxa-tag navy">Panel</span> : null}
                      {u.apiKey ? <span className="vxa-tag blue">API</span> : null}
                      {!u.panel && !u.apiKey ? <span className="vxa-tag grey">Customer</span> : null}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

type VnMults = { economy: number; standard: number; fast: number; premium: number };
type VnPricingData = { ok?: boolean; rate?: number; retail?: VnMults; api?: VnMults; panel?: VnMults; error?: string };

const VN_TIERS: { id: keyof VnMults; label: string; band: string; sampleUsd: number }[] = [
  { id: 'economy', label: 'Economy', band: 'under $0.50', sampleUsd: 0.25 },
  { id: 'standard', label: 'Standard', band: '$0.50 to $1.00', sampleUsd: 0.75 },
  { id: 'fast', label: 'Fast', band: '$1.01 to $2.00', sampleUsd: 1.5 },
  { id: 'premium', label: 'Premium', band: 'above $2.00', sampleUsd: 3 },
];
const VN_AUDIENCES: { id: 'retail' | 'api' | 'panel'; label: string; hint: string }[] = [
  { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com' },
  { id: 'api', label: 'API users', hint: 'Customers calling our API with a user API key' },
  { id: 'panel', label: 'Child Panel', hint: 'Child panels + users you toggled Child Panel' },
];
const DEFAULT_VN_MULTS: Record<'retail' | 'api' | 'panel', VnMults> = {
  retail: { economy: 5, standard: 4, fast: 3, premium: 2 },
  api: { economy: 2, standard: 1.6, fast: 1.4, premium: 1.25 },
  panel: { economy: 1.5, standard: 1.3, fast: 1.2, premium: 1.15 },
};

function PricingSection() {
  const [data, setData] = useState<VnPricingData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/vn-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as VnPricingData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const mults = (aud: 'retail' | 'api' | 'panel'): VnMults => data?.[aud] || DEFAULT_VN_MULTS[aud];
  const rate = data?.rate ?? 1380;

  const example = (aud: 'retail' | 'api' | 'panel', tier: keyof VnMults, costUsd: number) =>
    Math.ceil(costUsd * rate * mults(aud)[tier]);

  const save = async (aud: 'retail' | 'api' | 'panel', tier: keyof VnMults) => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 1 || v > 50) { setMsg('Enter a multiplier between 1 and 50'); return; }
    setBusy(true);
    setMsg('');
    try {
      const next: VnMults = { ...mults(aud), [tier]: v };
      const res = await fetch('/api/admin/vn-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [aud]: next }),
      });
      const d = (await res.json()) as VnPricingData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — prices change everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      <div className="vxa-duo">
        <div className="vxa-tile">
          <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
          <div className="vxa-rate-row">
            <strong>₦{rate.toLocaleString('en-NG')}</strong>
            <span className="vxa-rate-per">/ $1</span>
          </div>
          <p>Same rate as the Overview tile — edit it there. Applies to retail, API and Child Panel prices.</p>
        </div>
        <div className="vxa-tile">
          <span className="vxa-tile-label"><TrendingUp size={14} /> HOW PRICING WORKS</span>
          <p className="vxa-price-formula">
            Price = Provider USD cost × Naira rate × multiplier.
            The tier is picked by the cost range, never by the customer.
            The server recomputes every charge, so nobody can send a fake price.
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="vxa-empty">
          <strong>Could not load pricing.</strong>
          <p>Run supabase/vn-pricing-tiers.sql in the Supabase SQL Editor, then reload.</p>
        </div>
      ) : (
        <div className="vxa-card">
          <div className="vxa-card-head"><strong>Virtual Number multipliers</strong></div>
          <p className="vxa-card-sub">
            What each audience pays on top of the provider cost. Tap a pencil to change a multiplier.
          </p>
          <div className="vxa-price-table">
            <div className="vxa-price-head">
              <span>Tier</span>
              <span>Provider cost</span>
              {VN_AUDIENCES.map((a) => <span key={a.id}>{a.label}</span>)}
            </div>
            {VN_TIERS.map((t) => (
              <div className="vxa-price-row" key={t.id}>
                <div className="vxa-price-tier">
                  <strong>{t.label}</strong>
                  <span>{t.band}</span>
                </div>
                <div className="vxa-price-band">
                  <span>sample ${t.sampleUsd.toFixed(2)}</span>
                  <small>{naira(example('retail', t.id, t.sampleUsd))} retail</small>
                </div>
                {VN_AUDIENCES.map((a) => {
                  const key = a.id + '-' + t.id;
                  const val = mults(a.id)[t.id];
                  return (
                    <div className="vxa-price-cell" key={a.id}>
                      {editing === key ? (
                        <div className="vxa-rate-edit slim">
                          <div className="vxa-rate-row">
                            <input inputMode="decimal" value={draft} autoFocus aria-label={a.label + ' ' + t.label + ' multiplier'}
                              onChange={(e) => setDraft(e.target.value)} />
                            <span className="vxa-rate-per">×</span>
                          </div>
                          <div className="vxa-rate-actions">
                            <button type="button" className="vxa-rate-save" disabled={busy} onClick={() => save(a.id, t.id)}>
                              <Check size={14} /> Save
                            </button>
                            <button type="button" className="vxa-rate-cancel" onClick={() => setEditing(null)}>
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="vxa-rate-row">
                          <strong>{val}×</strong>
                          <button type="button" className="vxa-rate-btn" aria-label={'Edit ' + a.label + ' ' + t.label + ' multiplier'}
                            onClick={() => { setDraft(String(val)); setEditing(key); }}>
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <ul className="vxa-price-notes">
            {VN_AUDIENCES.map((a) => (
              <li key={a.id}><strong>{a.label}:</strong> {a.hint}</li>
            ))}
          </ul>
          <p className="vxa-note">
            Changes are audit logged and apply instantly — the buy endpoint always recomputes the charge
            from the provider cost, the naira rate and these multipliers.
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
    } catch { /* ignore */ }
  }, []);

  // Load the live USD→NGN rate from admin_settings (falls back to local cache).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pw = sessionStorage.getItem(PASS_KEY) || '';
        const res = await fetch('/api/admin/rate', { headers: { 'x-admin-password': pw }, cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; rate?: number };
        if (!cancelled && res.ok && data.ok && Number(data.rate) > 0) {
          setRate(Number(data.rate));
          setRateDraft(String(Number(data.rate)));
        } else {
          const savedRate = Number(localStorage.getItem(RATE_KEY) || '');
          if (Number.isFinite(savedRate) && savedRate > 0) setRate(savedRate);
        }
      } catch {
        const savedRate = Number(localStorage.getItem(RATE_KEY) || '');
        if (Number.isFinite(savedRate) && savedRate > 0) setRate(savedRate);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const saveRate = async () => {
    const v = Number(rateDraft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v <= 0) return;
    setRateEditing(false);
    setRateSaved(true);
    try {
      localStorage.setItem(RATE_KEY, String(v));
    } catch { /* ignore */ }
    try {
      const pw = sessionStorage.getItem(PASS_KEY) || '';
      const res = await fetch('/api/admin/rate', {
        method: 'PUT',
        headers: { 'x-admin-password': pw, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: v }),
      });
      const data = (await res.json()) as { ok?: boolean; rate?: number };
      if (res.ok && data.ok) {
        setRate(v);
        window.setTimeout(() => setRateSaved(false), 2000);
      } else {
        setRateSaved(false);
      }
    } catch {
      setRateSaved(false);
    }
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
            <PricingSection />
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
