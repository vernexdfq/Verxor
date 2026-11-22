/**
 * Verxor platform admin — rebuilt from scratch (Phase 1 UI only).
 * Overview = Daily earnings view, mirroring the child-panel layout but
 * from the provider side. All figures stay at zero until Phase 2 APIs land.
 */
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Ban,
  Check,
  FileText,
  Gift,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Menu,
  MessageCircle,
  Pencil,
  Percent,
  Plug,
  Rocket,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
  Gamepad2,
  Wifi,
} from 'lucide-react';
import './admin-page.css';

type AdminSection = 'overview' | 'users' | 'chats' | 'pricing' | 'email-otp' | 'boost' | 'gaming' | 'accounts' | 'gift-cards' | 'rent-sms' | 'data-pricing' | 'providers' | 'settings';

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
  frozen: boolean;
  apiUser: boolean;
  services: Record<string, AdminUserService>;
};

const SESSION_KEY = 'verxor-admin-ok';
const PASS_KEY = 'verxor-admin-pw';
const RATE_KEY = 'verxor-admin-rate';

const NAV: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'chats', label: 'Live Chats', icon: MessageCircle },
  { id: 'pricing', label: 'Virtual Number', icon: Percent },
  { id: 'email-otp', label: 'Email OTP', icon: Mail },
  { id: 'boost', label: 'Boost (SMM)', icon: Rocket },
  { id: 'gaming', label: 'Gaming Top-Up', icon: Gamepad2 },
  { id: 'accounts', label: 'Buy Logs', icon: FileText },
  { id: 'gift-cards', label: 'Gift Cards', icon: Gift },
  { id: 'rent-sms', label: 'Rent SMS', icon: MessageCircle },
  { id: 'data-pricing', label: 'Data Pricing', icon: Wifi },
  { id: 'providers', label: 'Providers', icon: Plug },
  { id: 'settings', label: 'Settings', icon: KeyRound },
];

/** Per-section header — only the Overview page is "Daily earnings". */
const SECTION_META: Record<AdminSection, { title: string; sub: string }> = {
  overview: { title: 'Daily earnings', sub: 'Your gain for today, updated live' },
  users: { title: 'Users', sub: 'Accounts, wallets, bans and manual credits' },
  chats: { title: 'Live Chats', sub: 'Continue customer conversations and cross-check tickets' },
  pricing: { title: 'Virtual Number pricing', sub: 'Markups for retail, API users and Child Panel' },
  'email-otp': { title: 'Email OTP pricing', sub: 'Flat USD markups for retail, API users and Child Panel' },
  boost: { title: 'Boost pricing', sub: 'Per-tier multipliers for retail, API users and Child Panel' },
  gaming: { title: 'Gaming Top-Up pricing', sub: 'Per-tier multipliers on the Shop2TopUp USD cost — retail, Child Panel and API' },
  accounts: { title: 'Buy Logs pricing', sub: 'Account multipliers for Retail and API / Child Panel' },
  'gift-cards': { title: 'Gift Card rates', sub: 'Standalone FX rates decoupled from the global daily rate' },
  'rent-sms': { title: 'Rent-for-SMS pricing', sub: 'Naira prices for number rentals — tiered multipliers your customers pay' },
  'data-pricing': { title: 'Data pricing', sub: 'Provider cost syncs automatically from the live provider — edit retail and API price per bundle (blank = catalog default)' },
  providers: { title: 'Providers', sub: 'Upstream provider health and keys' },
  settings: { title: 'Settings', sub: 'Service switches and announcements' },
};

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

/* ---------- Data Pricing (catalog overrides) ---------- */

type DataPlanRow = {
  planId: number;
  network: string;
  size: string;
  days: string;
  tab: string;
  planType: string | null;
  defaultCost: number | null;
  defaultRetail: number;
  defaultApiPrice: number;
  childPrice: number;
  overrideCost: number | null;
  overrideRetail: number | null;
  overrideApi: number | null;
  overrideChild: number | null;
  hasOverride: boolean;
};

function DataPricingRow({ row, saving, saved, onSave }: {
  row: DataPlanRow;
  saving: boolean;
  saved: boolean;
  onSave: (row: DataPlanRow, drafts: Record<string, string>) => void;
}) {
  const [retail, setRetail] = useState(row.overrideRetail != null ? String(row.overrideRetail) : '');
  const [apiPrice, setApiPrice] = useState(row.overrideApi != null ? String(row.overrideApi) : '');
  const [child, setChild] = useState(row.overrideChild != null ? String(row.overrideChild) : '');
  const effCost = row.defaultCost;
  const effRetail = Number(retail) > 0 ? Number(retail) : row.defaultRetail;
  const effChild = Number(child) > 0 ? Number(child) : (Number(effCost) > 0 ? Math.ceil(Number(effCost) * 1.005) : Math.round(effRetail));
  const inputStyle = (val: string): React.CSSProperties => ({
    height: 30, borderRadius: 8, padding: '0 8px', fontSize: 12, width: '100%',
    border: val.trim() ? '1px solid #2563eb' : '1px solid #e2e8f0',
  });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 90px', minWidth: 620, gap: 8, alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #f1f5f9', fontSize: 13 }}>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', color: '#0f172a' }}>{row.size}</strong>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>#{row.planId} · {row.days}d{row.planType ? ' · ' + row.planType : ''}{row.hasOverride ? ' · edited' : ''}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', textAlign: 'center' }}>{row.defaultCost ? '₦' + row.defaultCost.toLocaleString('en-NG') : '—'}</span>
      <input value={retail} onChange={(e) => setRetail(e.target.value)} placeholder={String(row.defaultRetail)} inputMode="decimal" style={inputStyle(retail)} />
      <input value={apiPrice} onChange={(e) => setApiPrice(e.target.value)} placeholder={String(row.defaultApiPrice)} inputMode="decimal" style={inputStyle(apiPrice)} />
      <input value={child} onChange={(e) => setChild(e.target.value)} placeholder={String(effChild)} inputMode="decimal" style={inputStyle(child)} />
      <button type="button" disabled={saving} onClick={() => onSave(row, { cost: '', retail, apiPrice, child })}
        style={{ height: 30, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: saved ? '#16a34a' : '#2563eb', color: '#fff', border: 'none' }}>
        {saving ? '…' : saved ? 'Saved' : 'Save'}
      </button>
    </div>
  );
}

function DataPricingSection() {
  const NETWORKS = ['all', 'mtn', 'airtel', 'glo', '9mobile'];
  const [rows, setRows] = useState<DataPlanRow[]>([]);
  const [net, setNet] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/data-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setErr(String(data.error || 'Could not load data pricing.'));
        setRows([]);
      } else {
        setRows(data.rows as DataPlanRow[]);
      }
    } catch {
      setErr('Could not load data pricing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async (row: DataPlanRow, drafts: Record<string, string>) => {
    setSavingId(row.planId);
    setSavedId(null);
    try {
      const parse = (v: string | undefined) => {
        const s = (v ?? '').trim();
        if (!s) return null;
        const n = Number(s.replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const res = await fetch('/api/admin/data-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({
          planId: row.planId,
          network: row.network,
          cost: parse(drafts.cost),
          retail: parse(drafts.retail),
          apiPrice: parse(drafts.apiPrice),
          childPrice: parse(drafts.child),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setErr(String(data.error || 'Save failed.'));
      } else {
        setSavedId(row.planId);
        await load();
        setTimeout(() => setSavedId(null), 2000);
      }
    } catch {
      setErr('Save failed.');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = rows.filter((r) =>
    (net === 'all' || r.network === net) &&
    (!q.trim() || (r.size + ' ' + r.planId).toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {NETWORKS.map((n) => (
          <button key={n} type="button" onClick={() => setNet(n)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: net === n ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: net === n ? '#2563eb' : '#fff', color: net === n ? '#fff' : '#475569',
            }}>
            {n === 'all' ? 'All networks' : n === '9mobile' ? '9mobile' : n.toUpperCase()}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search size or plan id"
          style={{ marginLeft: 'auto', height: 34, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 12px', fontSize: 13 }} />
      </div>

      {err ? <p style={{ color: '#b91c1c', fontSize: 13 }}>{err}</p> : null}
      {loading ? <p style={{ color: '#64748b', fontSize: 13 }}>Loading catalog…</p> : null}

      {!loading && !err ? (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflowX: 'auto', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr 90px', minWidth: 620, gap: 8, padding: '10px 14px', background: '#f8fafc', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            <span>Bundle</span><span>Provider</span><span>Retail</span><span>API (users)</span><span>Child</span><span></span>
          </div>
          {filtered.map((r) => (
            <DataPricingRow key={r.planId} row={r} saving={savingId === r.planId} saved={savedId === r.planId} onSave={save} />
          ))}
          {filtered.length === 0 ? <p style={{ padding: 16, fontSize: 13, color: '#94a3b8' }}>No plans match.</p> : null}
        </div>
      ) : null}

      <p style={{ fontSize: 12, color: '#94a3b8' }}>
        Leave a field blank to use the catalog default. Child price auto-follows the cost (+0.5%).
        Changes take effect immediately on the shop, the public API and all child panels.
      </p>
    </div>
  );
}

/* ---------- Live Chats (admin inbox / conversation continuation) ---------- */

type AdminChatConversation = {
  id: string;
  user_id: string | null;
  status: string;
  subject: string | null;
  ticket_id?: string | null;
  unread_admin?: number;
  customer?: { email: string | null; phone: string | null; name: string | null } | null;
  updated_at: string;
};
type AdminChatMessage = { id: string; role: string; content: string; created_at: string };

function chatTicket(c: AdminChatConversation): string | null {
  return c.ticket_id || c.subject?.match(/\[(VX-\d{3,6})\]/)?.[1] || null;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CHAT_STATUS_TAG: Record<string, string> = {
  ai: 'AI',
  waiting_admin: 'Waiting',
  admin: 'You replied',
  closed: 'Archived',
};

function LiveChats() {
  const [conversations, setConversations] = useState<AdminChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminChatConversation | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'closed'>('all');
  const threadRef = useRef<HTMLDivElement>(null);

  const chatCustomerLabel = (c: AdminChatConversation): string => {
    if (c.customer?.email || c.customer?.phone) return c.customer.email || c.customer.phone || '';
    if (c.customer?.name) return c.customer.name;
    return c.user_id ? c.user_id.slice(0, 8) : 'visitor';
  };

  const scrollThread = () => {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const loadList = async () => {
    try {
      const res = await fetch('/api/admin/chat', { headers: adminHeaders(), cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; conversations?: AdminChatConversation[] };
      if (res.ok && data.ok) {
        setConversations(data.conversations || []);
        setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
  };

  const loadThread = async (id: string, scroll = true) => {
    try {
      const res = await fetch(`/api/admin/chat?conversationId=${encodeURIComponent(id)}`, {
        headers: adminHeaders(),
        cache: 'no-store',
      });
      const data = (await res.json()) as {
        ok?: boolean;
        conversation?: AdminChatConversation;
        messages?: AdminChatMessage[];
      };
      if (res.ok && data.ok && data.conversation) {
        setSelected(data.conversation);
        setSelectedId(id);
        setMessages(data.messages || []);
        if (scroll) scrollThread();
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void loadList();
    const t = window.setInterval(() => {
      void loadList();
      if (selectedId) void loadThread(selectedId, false);
    }, 15000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selectedId || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ conversationId: selectedId, text }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setReply('');
        await loadThread(selectedId);
        await loadList();
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vxa-chat">
      <aside className="vxa-chat-list">
        {loadError ? (
          <p className="vxa-chat-err">Could not load chats. Check the connection and reload.</p>
        ) : null}
        {!loadError && conversations.length === 0 ? (
          <p className="vxa-chat-err">No customer chats yet. They appear here the moment a customer starts one.</p>
        ) : null}
        <div className="vxa-chat-filters">
          {([['all', 'All'], ['waiting', 'Waiting'], ['closed', 'Archived']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`vxa-chat-filter${filter === id ? ' active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
              {id === 'waiting'
                ? ` (${conversations.filter((c) => c.status === 'waiting_admin').length})`
                : ''}
            </button>
          ))}
        </div>
        {conversations
          .filter((c) => (filter === 'all' ? true : filter === 'waiting' ? c.status === 'waiting_admin' : c.status === 'closed'))
          .map((c) => {
          const ticket = chatTicket(c);
          return (
            <button
              key={c.id}
              type="button"
              className={`vxa-chat-item${selectedId === c.id ? ' active' : ''}`}
              onClick={() => void loadThread(c.id)}
            >
              <span className="vxa-chat-item-top">
                <strong>{ticket ? ticket : c.subject || 'Conversation'}</strong>
                <em>{timeAgo(c.updated_at)}</em>
              </span>
              <span className="vxa-chat-item-sub">
                <i className={`vxa-chat-status s-${c.status}`}>
                  {CHAT_STATUS_TAG[c.status] || c.status}
                </i>
                <span className="vxa-chat-item-user">{chatCustomerLabel(c)}</span>
                {c.unread_admin && c.unread_admin > 0 && selectedId !== c.id ? (
                  <i className="vxa-chat-unread">{c.unread_admin > 9 ? '9+' : c.unread_admin}</i>
                ) : null}
              </span>
            </button>
          );
        })}
      </aside>
      <div className="vxa-chat-thread">
        {!selected ? (
          <p className="vxa-chat-empty">Pick a conversation on the left to read it and reply.</p>
        ) : (
          <>
            <header className="vxa-chat-thread-head">
              <strong>{chatTicket(selected) ? `${chatTicket(selected)} · ` : ''}{selected.subject || 'Conversation'}</strong>
              <span>
                Status: {CHAT_STATUS_TAG[selected.status] || selected.status}
                {' · '}customer: {selected.customer?.email || selected.customer?.phone || chatCustomerLabel(selected)}
                {' · '}updated {timeAgo(selected.updated_at)}
              </span>
            </header>
            <div className="vxa-chat-msgs" ref={threadRef}>
              {messages.map((m) => (
                <div key={m.id} className={`vxa-chat-msg role-${m.role}`}>
                  <div className="vxa-chat-bubble">{m.content}</div>
                  <span className="vxa-chat-meta">{m.role === 'user' ? 'Customer' : m.role === 'admin' ? 'You' : 'Assistant'} · {timeAgo(m.created_at)}</span>
                </div>
              ))}
              {messages.length === 0 ? <p className="vxa-chat-empty">No messages in this conversation.</p> : null}
            </div>
            <form className="vxa-chat-reply" onSubmit={sendReply}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply — it lands in the customer's chat instantly…"
                disabled={busy}
                aria-label="Reply to customer"
              />
              <button type="submit" disabled={busy || !reply.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function UserManagement({ focusUserId }: { focusUserId?: string | null }) {
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
  const [txOpen, setTxOpen] = useState(false);

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

  const focusApplied = useRef<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!focusUserId || focusApplied.current === focusUserId || users.length === 0) return;
    const found = users.find((u) => u.id === focusUserId);
    if (found) {
      setSelected(found);
      focusApplied.current = focusUserId;
    }
  }, [focusUserId, users]);

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
              {selected.apiKey || selected.apiUser ? <span className="vxa-tag blue">API Developer</span> : null}
              {selected.panel ? <span className="vxa-tag navy">Child Panel</span> : null}
              <span className="vxa-tag grey">Customer</span>
              {selected.banned ? <span className="vxa-tag banned">Banned</span> : null}
              {selected.frozen ? <span className="vxa-tag frozen">Frozen</span> : null}
            </div>
          </div>
          <div className="vxa-user-head-right">
            <button type="button" disabled={busy}
              className={selected.banned ? 'vxa-ban-btn banned' : 'vxa-ban-btn'}
              onClick={() => act(
                { action: selected.banned ? 'unban' : 'ban', userId: selected.id },
                selected.banned ? 'User unbanned' : 'User banned',
              )}>
              <Ban size={15} /> {selected.banned ? 'Unban' : 'Ban'}
            </button>
            <button type="button" disabled={busy}
              className={selected.frozen ? 'vxa-freeze-btn frozen' : 'vxa-freeze-btn'}
              onClick={() => act(

                { action: selected.frozen ? 'unfreeze' : 'freeze', userId: selected.id },
                selected.frozen ? 'User unfrozen' : 'User frozen',
              )}>
              <Lock size={15} /> {selected.frozen ? 'Unfreeze' : 'Freeze'}
            </button>
            <button type="button" disabled={busy} className="vxa-del-btn"
              onClick={() => {
                if (!window.confirm(`Delete ${displayName(selected)} permanently?\n\nThis erases their profile, wallet, balance, orders, chats and flags. It cannot be undone.`)) return;
                void (async () => {
                  const ok = await act(
                    { action: 'delete-account', userId: selected.id },
                    'User and all their data deleted',
                  );
                  if (ok) setSelected(null);
                })();
              }}>
              <Trash2 size={15} /> Delete account
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
            <div className="vxa-tx-peek">
              <button type="button" className="vxa-tx-chip" aria-expanded={txOpen}
                onClick={() => setTxOpen(!txOpen)}>
                <Wallet size={13} /> Transactions
                <em>{txOpen ? 'Hide' : 'View'}</em>
              </button>
              {txOpen ? (
                <div className="vxa-empty small">
                  <strong>Per-user transactions land here next.</strong>
                  <p>Wallet ledger rows for this user join this card in the next build.</p>
                </div>
              ) : null}
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
            <KeyRound size={17} />
            <strong>API user access</strong>
            {selected.apiUser ? <span className="vxa-tag blue">API User</span> : <span className="vxa-tag grey">Retail customer</span>}
          </div>
          <p className="vxa-card-sub">
            Upgrade a customer to API user after they pay for API access.
            Upgraded accounts see API prices on every service, on the site and through the API.
            Turn it off anytime to send them back to retail prices.
          </p>
          <ul className="vxa-matrix">
            <li>
              <div>
                <strong>API User</strong>
                <span>{selected.apiUser ? 'Upgraded — gets API prices everywhere' : 'Not upgraded — retail prices'}</span>
              </div>
              <button type="button" disabled={busy}
                className={selected.apiUser ? 'vxa-switch on' : 'vxa-switch'}
                aria-pressed={selected.apiUser}
                aria-label="Toggle API user"
                onClick={() => act(
                  { action: 'set-api-user', userId: selected.id, enabled: !selected.apiUser },
                  selected.apiUser ? 'Downgraded to retail prices' : 'Upgraded to API user prices',
                )}>
                <em />
              </button>
            </li>
          </ul>
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
                    <strong>{displayName(u)}</strong>
                    <span>{u.email || u.phone || 'no contact'}</span>
                  </div>
                  <div className="vxa-user-cell mid">
                    <span>{u.joined || '—'}</span>
                  </div>
                  <div className="vxa-user-cell right">
                    <span className="vxa-user-balance">{naira(u.balanceNgn)}</span>
                    <span>
                      {u.banned ? <span className="vxa-tag banned">Banned</span> : null}
                      {u.frozen ? <span className="vxa-tag frozen">Frozen</span> : null}
                      {u.panel ? <span className="vxa-tag navy">Panel</span> : null}
                      {u.apiUser || u.apiKey ? <span className="vxa-tag blue">API</span> : null}
                      {!u.panel && !u.apiUser && !u.apiKey ? <span className="vxa-tag grey">Customer</span> : null}
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

type EmailOtpMarkupsData = { ok?: boolean; rate?: number; retail?: number; api?: number; panel?: number; error?: string };
const DEFAULT_EMAIL_OTP_MARKUPS: Record<'retail' | 'api' | 'panel', number> = { retail: 0.25, api: 0.18, panel: 0.12 };
const EMAIL_OTP_AUDIENCES: { id: 'retail' | 'api' | 'panel'; label: string; hint: string }[] = [
  { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com' },
  { id: 'api', label: 'API users', hint: 'Users you toggled as API user' },
  { id: 'panel', label: 'Child Panel', hint: 'Child panels + users you toggled Child Panel' },
];

/** Same rounding rule as the server: (cost + markup) x rate, 450-500 band snaps to 500. */
function emailOtpSample(costUsd: number, markup: number, rate: number) {
  const ngn = Math.round((costUsd + markup) * rate);
  if (ngn > 450 && ngn <= 500) return 500;
  return ngn;
}

function EmailOtpSection() {
  const [data, setData] = useState<EmailOtpMarkupsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/email-otp-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as EmailOtpMarkupsData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const markups = (aud: 'retail' | 'api' | 'panel'): number =>
    (data && data[aud] && data[aud]! > 0 ? data[aud]! : DEFAULT_EMAIL_OTP_MARKUPS[aud]);
  const rate = data?.rate ?? 1380;

  const save = async (aud: 'retail' | 'api' | 'panel') => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 0.01 || v > 5) { setMsg('Enter a markup between $0.01 and $5.00'); return; }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/email-otp-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [aud]: v }),
      });
      const d = (await res.json()) as EmailOtpMarkupsData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — Email OTP prices update everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load Email OTP settings</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <>
          <div className="vxa-duo">
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
              <div className="vxa-rate-row">
                <strong>₦{rate.toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
              </div>
              <p>Shared with Virtual Numbers — change it in the Overview daily rate. Applies to retail, API and Child Panel prices.</p>
            </div>
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Mail size={14} /> HOW EMAIL PRICING WORKS</span>
              <p className="vxa-price-formula">
                Price = (provider cost + flat markup) × the naira rate, rounded.
                Prices above ₦450 up to ₦500 snap to ₦500 — anything above ₦500 keeps its real price.
                Every price is recomputed on the server per request.
              </p>
            </div>
          </div>

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Flat markups (USD added to provider cost)</strong></div>
            <p className="vxa-card-sub">
              Tap the pencil to change a markup. Save once and every email price updates instantly,
              for the site and the API.
            </p>
            <div className="vxa-mu-list">
              {EMAIL_OTP_AUDIENCES.map((a) => {
                const m = markups(a.id);
                return (
                  <div className="vxa-mu-row" key={a.id}>
                    <strong className="t">{a.label}</strong>
                    <span className="h">{a.hint}</span>
                    {editing === a.id ? (
                      <div className="vxa-mu-edit">
                        <input
                          value={draft}
                          inputMode="decimal"
                          aria-label={'Edit ' + a.label + ' markup'}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void save(a.id); }}
                        />
                        <button type="button" disabled={busy} onClick={() => void save(a.id)}>Save</button>
                        <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="vxa-mu-val">
                        <strong>${m.toFixed(2)}</strong>
                        <button
                          type="button"
                          className="vxa-mu-pencil"
                          aria-label={'Edit ' + a.label + ' markup'}
                          onClick={() => { setEditing(a.id); setDraft(String(m)); }}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Sample prices</strong></div>
            <div className="vxa-samp-table">
              <div className="vxa-samp-head">
                <span>Provider cost</span>
                {EMAIL_OTP_AUDIENCES.map((a) => <span key={a.id}>{a.label}</span>)}
              </div>
              {[0.0015, 0.01, 0.04, 0.1, 0.6].map((c) => (
                <div className="vxa-samp-row" key={c}>
                  <div className="vxa-price-tier">
                    <strong>${c < 0.01 ? c : c.toFixed(2)}</strong>
                    <span>per email</span>
                  </div>
                  {EMAIL_OTP_AUDIENCES.map((a) => (
                    <div className="vxa-samp-cell" key={a.id}>
                      <em className="vxa-price-aud">{a.label}</em>
                      <strong>{naira(emailOtpSample(c, markups(a.id), rate))}</strong>
                    </div>
                  ))}
                </div>
              ))}

            </div>
            <ul className="vxa-price-notes">
              <li>Formula: (provider cost + markup) × ₦{rate.toLocaleString('en-NG')} rate, rounded.</li>
              <li>Prices between ₦450 and ₦500 snap to ₦500. Above ₦500 the real price stays — no ceiling.</li>
              <li>Retail $0.25 · API users $0.18 · Child Panel $0.12 are only defaults — the boxes above are the live values.</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

type BoostMarkupsData = {
  ok?: boolean;
  rate?: number;
  retail?: number[];
  api?: number[];
  child?: number[];
  error?: string;
};

const DEFAULT_BOOST_MARKUPS: Record<'retail' | 'api' | 'child', number[]> = {
  retail: [4.0, 3.0, 2.0, 1.5],
  api: [2.2, 1.8, 1.5, 1.25],
  child: [1.6, 1.4, 1.25, 1.15],
};

const BOOST_TIERS: { label: string; hint: string }[] = [
  { label: '≤ $0.50', hint: 'per 1,000 wholesale' },
  { label: '$0.51 – $1.00', hint: 'per 1,000 wholesale' },
  { label: '$1.01 – $2.00', hint: 'per 1,000 wholesale' },
  { label: '> $2.00', hint: 'per 1,000 wholesale' },
];

const BOOST_AUDIENCES: { id: 'retail' | 'api' | 'child'; label: string; hint: string }[] = [
  { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com' },
  { id: 'api', label: 'API users', hint: 'Users you toggled as API user' },
  { id: 'child', label: 'Child Panel', hint: 'Child panels (vx_panel_* keys)' },
];

/** Same formula as the server: wholesale USD/1k × multiplier × rate. */
function boostSample(costUsd: number, mult: number, rate: number) {
  return Math.round(costUsd * mult * rate);
}

function BoostPricingSection() {
  const [data, setData] = useState<BoostMarkupsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/boost-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as BoostMarkupsData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const tiers = (aud: 'retail' | 'api' | 'child'): number[] => {
    const v = data?.[aud];
    if (v && v.length === 4 && v.every((n) => Number(n) > 0)) return v;
    return DEFAULT_BOOST_MARKUPS[aud];
  };
  const rate = data?.rate ?? 1380;

  const save = async (aud: 'retail' | 'api' | 'child', tierIdx: number) => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 1 || v > 20) { setMsg('Enter a multiplier between 1.0 and 20'); return; }
    const next = [...tiers(aud)];
    next[tierIdx] = v;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/boost-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [aud]: next }),
      });
      const d = (await res.json()) as BoostMarkupsData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — Boost prices update everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load Boost pricing settings</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <>
          <div className="vxa-duo">
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
              <div className="vxa-rate-row">
                <strong>₦{rate.toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
              </div>
              <p>Shared with Virtual Numbers and Email OTP — change it in the Overview daily rate. Applies to retail, API and Child Panel boost prices.</p>
            </div>
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Rocket size={14} /> HOW BOOST PRICING WORKS</span>
              <p className="vxa-price-formula">
                Price per 1,000 = wholesale USD cost × audience multiplier × the naira rate.
                The wholesale tier is picked from the provider rate per service, and every
                price is recomputed on the server at order time — the customer can never
                send their own price.
              </p>
            </div>
          </div>

          {BOOST_AUDIENCES.map((a) => (
            <div className="vxa-card" key={a.id}>
              <div className="vxa-card-head"><strong>{a.label} multipliers</strong></div>
              <p className="vxa-card-sub">{a.hint} · tap the pencil to change any tier multiplier.</p>
              <div className="vxa-mu-list">
                {BOOST_TIERS.map((t, i) => {
                  const key = a.id + '-' + i;
                  const m = tiers(a.id)[i];
                  return (
                    <div className="vxa-mu-row" key={key}>
                      <strong className="t">Wholesale {t.label}</strong>
                      <span className="h">{t.hint}</span>
                      {editing === key ? (
                        <div className="vxa-mu-edit">
                          <input
                            value={draft}
                            inputMode="decimal"
                            aria-label={'Edit ' + a.label + ' tier ' + (i + 1) + ' multiplier'}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void save(a.id, i); }}
                          />
                          <button type="button" disabled={busy} onClick={() => void save(a.id, i)}>Save</button>
                          <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="vxa-mu-val">
                          <strong>{m}×</strong>
                          <button
                            type="button"
                            className="vxa-mu-pencil"
                            aria-label={'Edit ' + a.label + ' tier ' + (i + 1) + ' multiplier'}
                            onClick={() => { setEditing(key); setDraft(String(m)); }}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Sample prices (per 1,000)</strong></div>
            <div className="vxa-samp-table">
              <div className="vxa-samp-head">
                <span>Wholesale cost</span>
                {BOOST_AUDIENCES.map((a) => <span key={a.id}>{a.label}</span>)}
              </div>
              {[0.25, 0.75, 1.5, 3.0].map((c) => (
                <div className="vxa-samp-row" key={c}>
                  <div className="vxa-price-tier">
                    <strong>${c.toFixed(2)}</strong>
                    <span>per 1,000</span>
                  </div>
                  {BOOST_AUDIENCES.map((a) => {
                    const tierIdx = c <= 0.5 ? 0 : c <= 1 ? 1 : c <= 2 ? 2 : 3;
                    return (
                      <div className="vxa-samp-cell" key={a.id}>
                        <em className="vxa-price-aud">{a.label}</em>
                        <strong>{naira(boostSample(c, tiers(a.id)[tierIdx], rate))}</strong>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <ul className="vxa-price-notes">
              <li>Formula: wholesale USD/1k × multiplier × ₦{rate.toLocaleString('en-NG')} rate.</li>
              <li>Retail 4.0 / 3.0 / 2.0 / 1.5 · API 2.2 / 1.8 / 1.5 / 1.25 · Child 1.6 / 1.4 / 1.25 / 1.15 are only defaults — the boxes above are the live values.</li>
              <li>Partial orders and cancels refund only what the provider did not deliver, exactly like JustAnotherPanel.</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

type AccountsMarkupsData = {
  ok?: boolean;
  rate?: number;
  retail?: number[];
  wholesale?: number[];
  roundUpNgn?: number;
  error?: string;
};

const DEFAULT_ACCOUNTS_MARKUPS_UI = { retail: [3.0, 2.0, 1.4], wholesale: [1.5, 1.25, 1.15] };

const ACCOUNTS_TIERS: { label: string; hint: string }[] = [
  { label: '$0.01 – $1.00', hint: 'provider cost per account' },
  { label: '$1.01 – $10.00', hint: 'provider cost per account' },
  { label: '> $10.00', hint: 'provider cost per account' },
];

/** Same formulas as the server: retail rounds up to roundUpNgn, wholesale is whole naira. */
function accountsRetailSample(costUsd: number, mult: number, rate: number, roundUp: number) {
  const raw = costUsd * mult * rate;
  const step = Number.isFinite(roundUp) && roundUp > 1 ? Math.round(roundUp) : 1;
  return Math.ceil(raw / step) * step;
}

function AccountsPricingSection() {
  const [data, setData] = useState<AccountsMarkupsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/accounts-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as AccountsMarkupsData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const group = (g: 'retail' | 'wholesale'): number[] => {
    const v = data?.[g];
    if (v && v.length === 3 && v.every((n) => Number(n) > 0)) return v;
    return DEFAULT_ACCOUNTS_MARKUPS_UI[g];
  };
  const rate = data?.rate ?? 1380;
  const roundUp = data?.roundUpNgn ?? 50;

  const saveTiers = async (g: 'retail' | 'wholesale', tierIdx: number) => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 1 || v > 20) { setMsg('Enter a multiplier between 1.0 and 20'); return; }
    const next = [...group(g)];
    next[tierIdx] = v;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/accounts-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [g]: next }),
      });
      const d = (await res.json()) as AccountsMarkupsData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — Buy Logs prices update everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const saveRoundUp = async () => {
    const v = Number(draft.replace(/[^0-9]/g, ''));
    if (!Number.isInteger(v) || v < 1 || v > 1000) { setMsg('Round-up must be a whole number between 1 and 1000 (e.g. 50)'); return; }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/accounts-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ roundUpNgn: v }),
      });
      const d = (await res.json()) as AccountsMarkupsData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — retail prices now round up to the nearest ₦' + v);
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const groups: { id: 'retail' | 'wholesale'; label: string; hint: string }[] = [
    { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com — naira price rounds up' },
    { id: 'wholesale', label: 'API users & Child Panel', hint: 'vx_panel_* keys and API users — whole naira' },
  ];

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load Buy Logs pricing settings</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <>
          <div className="vxa-duo">
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
              <div className="vxa-rate-row">
                <strong>₦{rate.toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
              </div>
              <p>Shared with all services — change it in the Overview daily rate. Applies to both Retail and API / Child Panel account prices.</p>
            </div>
            <div className="vxa-tile">
              <span className="vxa-tile-label"><FileText size={14} /> HOW BUY LOGS PRICING WORKS</span>
              <p className="vxa-price-formula">
                Retail price = provider USD cost × retail multiplier × rate, then rounded up to the
                nearest ₦{roundUp}. API and Child Panel price = provider USD cost × wholesale
                multiplier × rate, whole naira. Everything is recomputed on the server at order
                time — the customer can never send their own price.
              </p>
            </div>
          </div>

          {groups.map((g) => (
            <div className="vxa-card" key={g.id}>
              <div className="vxa-card-head"><strong>{g.label} multipliers</strong></div>
              <p className="vxa-card-sub">{g.hint} · tap the pencil to change any tier multiplier.</p>
              <div className="vxa-mu-list">
                {ACCOUNTS_TIERS.map((t, i) => {
                  const key = g.id + '-' + i;
                  const m = group(g.id)[i];
                  return (
                    <div className="vxa-mu-row" key={key}>
                      <strong className="t">{t.label}</strong>
                      <span className="h">{t.hint}</span>
                      {editing === key ? (
                        <div className="vxa-mu-edit">
                          <input
                            value={draft}
                            inputMode="decimal"
                            aria-label={'Edit ' + g.label + ' tier ' + (i + 1) + ' multiplier'}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void saveTiers(g.id, i); }}
                          />
                          <button type="button" disabled={busy} onClick={() => void saveTiers(g.id, i)}>Save</button>
                          <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="vxa-mu-val">
                          <strong>{m}×</strong>
                          <button
                            type="button"
                            className="vxa-mu-pencil"
                            aria-label={'Edit ' + g.label + ' tier ' + (i + 1) + ' multiplier'}
                            onClick={() => { setEditing(key); setDraft(String(m)); }}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Retail rounding rule</strong></div>
            <p className="vxa-card-sub">Retail naira prices round UP to the nearest this many naira. Wholesale is not rounded.</p>
            <div className="vxa-mu-list">
              <div className="vxa-mu-row">
                <strong className="t">Round up to nearest</strong>
                <span className="h">e.g. 50 → a ₦1,656 account sells at ₦1,700</span>
                {editing === 'roundUp' ? (
                  <div className="vxa-mu-edit">
                    <input
                      value={draft}
                      inputMode="numeric"
                      aria-label="Edit retail round-up naira step"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveRoundUp(); }}
                    />
                    <button type="button" disabled={busy} onClick={() => void saveRoundUp()}>Save</button>
                    <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="vxa-mu-val">
                    <strong>₦{roundUp}</strong>
                    <button
                      type="button"
                      className="vxa-mu-pencil"
                      aria-label="Edit retail round-up naira step"
                      onClick={() => { setEditing('roundUp'); setDraft(String(roundUp)); }}
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Sample prices</strong></div>
            <div className="vxa-samp-table">
              <div className="vxa-samp-head">
                <span>Provider cost</span>
                <span>Retail</span>
                <span>API / Child Panel</span>
              </div>
              {[0.4, 2.21, 100].map((c) => {
                const tierIdx = c <= 1 ? 0 : c <= 10 ? 1 : 2;
                return (
                  <div className="vxa-samp-row" key={c}>
                    <div className="vxa-price-tier">
                      <strong>${c.toFixed(2)}</strong>
                      <span>per account</span>
                    </div>
                    <div className="vxa-samp-cell">
                      <em className="vxa-price-aud">Retail</em>
                      <strong>{naira(accountsRetailSample(c, group('retail')[tierIdx], rate, roundUp))}</strong>
                    </div>
                    <div className="vxa-samp-cell">
                      <em className="vxa-price-aud">Wholesale</em>
                      <strong>{naira(Math.round(c * group('wholesale')[tierIdx] * rate))}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
            <ul className="vxa-price-notes">
              <li>Formula: provider USD cost × multiplier × ₦{rate.toLocaleString('en-NG')} rate.</li>
              <li>Retail 3.0 / 2.0 / 1.4 · API &amp; Child Panel 1.5 / 1.25 / 1.15 are only defaults — the boxes above are the live values.</li>
              <li>Examples from your sheet: a $0.40 Facebook account sells retail at ₦{accountsRetailSample(0.4, group('retail')[0], rate, roundUp).toLocaleString('en-NG')} and wholesale at ${(0.4 * group('wholesale')[0]).toFixed(2)} (₦{Math.round(0.4 * group('wholesale')[0] * rate).toLocaleString('en-NG')}).</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

type GamingMarkupsData = {
  ok?: boolean;
  rate?: number;
  retail?: number[];
  child?: number[];
  api?: number[];
  error?: string;
};

const DEFAULT_GAMING_MARKUPS: Record<'retail' | 'child' | 'api', number[]> = {
  retail: [1.25, 1.15, 1.1, 1.07],
  child: [1.12, 1.07, 1.05, 1.03],
  api: [1.12, 1.07, 1.05, 1.03],
};

const GAMING_TIERS: { label: string; hint: string }[] = [
  { label: '≤ $1.00', hint: 'Micro Packs (provider base cost)' },
  { label: '$1.01 – $4.99', hint: 'Small Packs (provider base cost)' },
  { label: '$5.00 – $24.99', hint: 'Standard Packs (provider base cost)' },
  { label: '≥ $25.00', hint: 'High-Value Packs (provider base cost)' },
];

const GAMING_AUDIENCES: { id: 'retail' | 'child' | 'api'; label: string; hint: string }[] = [
  { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com' },
  { id: 'child', label: 'Child Panel', hint: 'Child panels (vx_panel_* keys, e.g. ernexdigital.com)' },
  { id: 'api', label: 'API users', hint: 'Users you toggled as API user (vx_api_* keys)' },
];

/** Same formula as the server: base USD cost × multiplier × rate, rounded. */
function gamingSample(costUsd: number, mult: number, rate: number) {
  return Math.round(costUsd * mult * rate);
}

function GamingPricingSection() {
  const [data, setData] = useState<GamingMarkupsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/gaming-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as GamingMarkupsData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const tiers = (aud: 'retail' | 'child' | 'api'): number[] => {
    const v = data?.[aud];
    if (v && v.length === 4 && v.every((n) => Number(n) > 0)) return v;
    return DEFAULT_GAMING_MARKUPS[aud];
  };
  const rate = data?.rate ?? 1380;

  const save = async (aud: 'retail' | 'child' | 'api', tierIdx: number) => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 1 || v > 20) { setMsg('Enter a multiplier between 1.0 and 20'); return; }
    const next = [...tiers(aud)];
    next[tierIdx] = v;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/gaming-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [aud]: next }),
      });
      const d = (await res.json()) as GamingMarkupsData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d);
      setEditing(null);
      setMsg('Saved — gaming prices update everywhere within 15 seconds');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load gaming top-up pricing settings</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <>
          <div className="vxa-duo">
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
              <div className="vxa-rate-row">
                <strong>₦{rate.toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
              </div>
              <p>Shared with every service — change it in the Overview daily rate. Applies to retail, Child Panel and API gaming prices.</p>
            </div>
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Gamepad2 size={14} /> HOW GAMING PRICING WORKS</span>
              <p className="vxa-price-formula">
                Price = Shop2TopUp base USD cost × audience multiplier × the naira rate.
                The tier is picked from the provider cost of the denomination, and the
                total is recomputed on the server at purchase time — the customer can
                never send their own price.
              </p>
            </div>
          </div>

          {GAMING_AUDIENCES.map((a) => (
            <div className="vxa-card" key={a.id}>
              <div className="vxa-card-head"><strong>{a.label} multipliers</strong></div>
              <p className="vxa-card-sub">{a.hint} · tap the pencil to change any tier multiplier.</p>
              <div className="vxa-mu-list">
                {GAMING_TIERS.map((t, i) => {
                  const key = a.id + '-' + i;
                  const m = tiers(a.id)[i];
                  return (
                    <div className="vxa-mu-row" key={key}>
                      <strong className="t">{t.label}</strong>
                      <span className="h">{t.hint}</span>
                      {editing === key ? (
                        <div className="vxa-mu-edit">
                          <input
                            value={draft}
                            inputMode="decimal"
                            aria-label={'Edit ' + a.label + ' tier ' + (i + 1) + ' multiplier'}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') void save(a.id, i); }}
                          />
                          <button type="button" disabled={busy} onClick={() => void save(a.id, i)}>Save</button>
                          <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="vxa-mu-val">
                          <strong>{m}×</strong>
                          <button
                            type="button"
                            className="vxa-mu-pencil"
                            aria-label={'Edit ' + a.label + ' tier ' + (i + 1) + ' multiplier'}
                            onClick={() => { setEditing(key); setDraft(String(m)); }}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Sample prices</strong></div>
            <div className="vxa-samp-table">
              <div className="vxa-samp-head">
                <span>Provider base cost</span>
                {GAMING_AUDIENCES.map((a) => <span key={a.id}>{a.label}</span>)}
              </div>
              {[0.5, 2, 10, 50].map((c) => (
                <div className="vxa-samp-row" key={c}>
                  <div className="vxa-price-tier">
                    <strong>${c.toFixed(2)}</strong>
                    <span>base cost</span>
                  </div>
                  {GAMING_AUDIENCES.map((a) => {
                    const tierIdx = c <= 1 ? 0 : c <= 4.99 ? 1 : c <= 24.99 ? 2 : 3;
                    return (
                      <div className="vxa-samp-cell" key={a.id}>
                        <em className="vxa-price-aud">{a.label}</em>
                        <strong>{naira(gamingSample(c, tiers(a.id)[tierIdx], rate))}</strong>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <ul className="vxa-price-notes">
              <li>Formula: Shop2TopUp base cost × multiplier × ₦{rate.toLocaleString('en-NG')} rate.</li>
              <li>Retail 1.25 / 1.15 / 1.10 / 1.07 · Child & API 1.12 / 1.07 / 1.05 / 1.03 are only defaults — the boxes above are the live values.</li>
              <li>Catalog grid prices update on the next request; running servers pick up new multipliers within 15 seconds.</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}

type GiftCardRatesData = { ok?: boolean; retail?: number; api?: number; trade?: number; error?: string };

const GIFT_CARD_DEFAULT_RATES_UI = { retail: 1460, api: 1415, trade: 1200 };

/**
 * Admin → Pricing → Gift Cards: three standalone FX rates (retail, API/panel,
 * trade/buy-back) decoupled from the global usd_ngn_rate. Naira per $1.
 */
function GiftCardsSection() {
  const [data, setData] = useState<GiftCardRatesData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<'retail' | 'api' | 'trade' | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const res = await fetch('/api/admin/giftcard-rates', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as GiftCardRatesData;
      if (res.ok && d.ok) { setData(d); setLoadError(false); } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const rateOf = (k: 'retail' | 'api' | 'trade'): number =>
    data && data[k] && data[k]! > 0 ? data[k]! : GIFT_CARD_DEFAULT_RATES_UI[k];

  const save = async (k: 'retail' | 'api' | 'trade') => {
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 100 || v > 10000) { setMsg('Enter a rate between ₦100 and ₦10,000 per $1'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/giftcard-rates', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ [k]: v }),
      });
      const d = (await res.json()) as GiftCardRatesData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setData(d); setEditing(null);
      setMsg('Saved — Gift Card prices update everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const rows: { key: 'retail' | 'api' | 'trade'; label: string; hint: string; icon: typeof Percent }[] = [
    { key: 'retail', label: 'Retail rate', hint: 'What customers pay on the Gift Cards page', icon: Percent },
    { key: 'api', label: 'API / Child Panel rate', hint: 'Wholesale rate for API users and child panels', icon: Plug },
    { key: 'trade', label: 'Trade / Buy-back rate', hint: 'Payout when customers sell cards to Verxor', icon: TrendingUp },

  ];

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}
      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load Gift Card rates</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <div className="vxa-duo">
          {rows.map(({ key, label, hint, icon: Icon }) => (
            <div className="vxa-tile" key={key}>
              <span className="vxa-tile-label"><Icon size={14} /> {label.toUpperCase()}</span>
              <div className="vxa-rate-row">
                <strong>₦{rateOf(key).toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
                {editing === key ? (
                  <div className="vxa-rate-actions">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} inputMode="numeric" aria-label={label} />
                    <button type="button" className="vxa-rate-save" disabled={busy} onClick={() => void save(key)}>Save</button>
                    <button type="button" className="vxa-rate-cancel" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="vxa-rate-actions">
                    <button type="button" className="vxa-rate-btn" onClick={() => { setEditing(key); setDraft(String(rateOf(key))); }}>
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <p>{hint}. Standalone rate — the global daily ₦ rate does NOT affect gift cards.</p>
            </div>
          ))}
          <div className="vxa-tile">
            <span className="vxa-tile-label"><Gift size={14} /> HOW PRICING WORKS</span>
            <p>Gift card prices never follow the Overview daily rate. Price = provider USD cost × the standalone rate above, rounded to whole Naira. USD is never shown to customers.</p>
            <p>Trade flow: when a customer sells a card back to Verxor, payout = card face value × the Trade rate.</p>
          </div>
        </div>
      )}
    </>
  );
}

type RentSmsTierRow = {
  label?: string;
  minUsd: number;
  maxUsd: number | null;
  panel: number;
  api: number;
  retail: number;
};
type RentSmsPricingData = {
  ok?: boolean;
  rate?: number;
  tiers?: Array<{
    label?: string;
    minUsd?: number;
    maxUsd?: number | null;
    multipliers?: { panel?: number; api?: number; retail?: number };
    panel?: number;
    api?: number;
    retail?: number;
  }>;
  error?: string;
};

const RENT_SMS_DEFAULT_TIERS_UI: RentSmsTierRow[] = [
  { label: 'Short & small', minUsd: 0, maxUsd: 3.5, panel: 1.25, api: 1.4, retail: 1.8 },
  { label: 'Standard single-app', minUsd: 3.51, maxUsd: 6.99, panel: 1.12, api: 1.2, retail: 1.38 },
  { label: 'All-Services & mid', minUsd: 7, maxUsd: 15, panel: 1.1, api: 1.15, retail: 1.25 },
  { label: 'Long multi-month', minUsd: 15.01, maxUsd: 50, panel: 1.06, api: 1.1, retail: 1.15 },
  { label: 'Annual', minUsd: 50.01, maxUsd: null, panel: 1.03, api: 1.05, retail: 1.1 },
];

const RENT_SMS_AUDIENCES: { id: 'panel' | 'api' | 'retail'; label: string; hint: string }[] = [
  { id: 'retail', label: 'Retail', hint: 'Customers buying on verxor.com' },
  { id: 'api', label: 'API', hint: 'API users' },
  { id: 'panel', label: 'Child Panel', hint: 'Child panels (child panel keys)' },
];

/** Representative rentals for the sample table — one per tier, NAIRA only. */
const RENT_SMS_SAMPLES: { tierIdx: number; desc: string; costUsd: number }[] = [
  { tierIdx: 0, desc: 'WhatsApp · 1–3 days', costUsd: 1.5 },
  { tierIdx: 1, desc: 'WhatsApp · 30 days', costUsd: 5 },
  { tierIdx: 2, desc: 'All-Services · 30 days', costUsd: 10 },
  { tierIdx: 3, desc: 'Long line · 90 days', costUsd: 30 },
  { tierIdx: 4, desc: 'All-Services · 1 year', costUsd: 75 },
];

function rentSmsRoundUp50(n: number): number {
  return Math.max(0, Math.ceil(n / 50) * 50);
}

/** Flatten the API tier rows (multipliers nested) into the UI row shape. */
function rentSmsFlatTiers(data: RentSmsPricingData): RentSmsTierRow[] {
  const raw = data.tiers && data.tiers.length ? data.tiers : [];
  const rows = raw.map((t, i): RentSmsTierRow => {
    const fallback = RENT_SMS_DEFAULT_TIERS_UI[i] ?? RENT_SMS_DEFAULT_TIERS_UI[0];
    const num = (v: unknown, d: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 && n <= 10 ? n : d;
    };
    return {
      label: t.label ?? fallback.label,
      minUsd: Number.isFinite(Number(t.minUsd)) ? Number(t.minUsd) : fallback.minUsd,
      maxUsd: t.maxUsd === null || t.maxUsd === undefined ? (Number.isFinite(Number(t.maxUsd)) ? Number(t.maxUsd) : null) : Number(t.maxUsd) ?? null,
      panel: num(t.multipliers?.panel ?? t.panel, fallback.panel),
      api: num(t.multipliers?.api ?? t.api, fallback.api),
      retail: num(t.multipliers?.retail ?? t.retail, fallback.retail),
    };
  });
  return rows.length ? rows : RENT_SMS_DEFAULT_TIERS_UI.map((t) => ({ ...t }));
}

/** Naira cost band for one tier — no dollars shown anywhere in the UI. */
function rentSmsBandNgn(t: RentSmsTierRow, rate: number): string {
  const r = rate > 0 ? rate : 1380;
  const min = Math.round((t.minUsd || 0) * r);
  if (t.maxUsd === null || t.maxUsd === undefined) return `Provider cost ₦${min.toLocaleString('en-NG')} and above`;
  const max = Math.round((Number(t.maxUsd) + 0.01) * r);
  return min <= 0 ? `Provider cost up to ₦${max.toLocaleString('en-NG')}` : `Provider cost ₦${min.toLocaleString('en-NG')} – ₦${max.toLocaleString('en-NG')}`;
}

function RentSmsSection() {
  const [tiers, setTiers] = useState<RentSmsTierRow[] | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const liveRate = rate ?? 1380;

  const load = async () => {
    try {
      const res = await fetch('/api/admin/rent-sms-pricing', { headers: adminHeaders(), cache: 'no-store' });
      const d = (await res.json()) as RentSmsPricingData;
      if (res.ok && d.ok) {
        setTiers(rentSmsFlatTiers(d));
        setRate(d.rate ?? null);
        setLoadError(false);
      } else { setLoadError(true); }
    } catch { setLoadError(true); }
  };

  useEffect(() => { void load(); }, []);

  const save = async (tierIdx: number, aud: 'panel' | 'api' | 'retail') => {
    if (!tiers) return;
    const v = Number(draft.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(v) || v < 1 || v > 10) { setMsg('Enter a multiplier between 1.0 and 10.0'); return; }
    const next = tiers.map((t, i) => (i === tierIdx ? { ...t, [aud]: v } : t));
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/admin/rent-sms-pricing', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ tiers: next }),
      });
      const d = (await res.json()) as RentSmsPricingData;
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setTiers(rentSmsFlatTiers(d));
      setRate(d.rate ?? rate);
      setEditing(null);
      setMsg('Saved — Rent-for-SMS prices update everywhere immediately');
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const rows = tiers ?? RENT_SMS_DEFAULT_TIERS_UI;

  return (
    <>
      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty tall">
          <strong>Could not load Rent-for-SMS pricing</strong>
          <p>Check that the server can reach the database, then reload.</p>
        </div>
      ) : (
        <>
          <div className="vxa-duo">
            <div className="vxa-tile">
              <span className="vxa-tile-label"><Percent size={14} /> GLOBAL NAIRA RATE</span>
              <div className="vxa-rate-row">
                <strong>₦{liveRate.toLocaleString('en-NG')}</strong>
                <span className="vxa-rate-per">/ $1</span>
              </div>
              <p>Shared with Virtual Numbers — change it in the Overview daily rate. Applies to Retail, API and Child Panel prices.</p>
            </div>
            <div className="vxa-tile">
              <span className="vxa-tile-label"><MessageCircle size={14} /> HOW PRICING WORKS</span>
              <p className="vxa-price-formula">
                Customer price = provider cost converted to Naira × the tier multiplier, rounded
                up to the nearest ₦50. Customers only ever see Naira. The server re-quotes every
                order, so a stale or fake price can never be charged.
              </p>
            </div>
          </div>

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Tier multipliers (Naira price = cost × multiplier)</strong></div>
            <p className="vxa-card-sub">
              Five tiers by what a line costs us. Tap the pencil to change a multiplier — Save
              once and every Rent-for-SMS price updates instantly, for the site and the API.
            </p>
            <div className="vxa-mu-list">
              {rows.map((t, i) => (
                <div className="vxa-mu-row" key={i}>
                  <strong className="t">{t.label ?? `Tier ${i + 1}`}</strong>
                  <span className="h">{rentSmsBandNgn(t, liveRate)}</span>
                  {RENT_SMS_AUDIENCES.map((a) => {
                    const key = `${i}:${a.id}`;
                    const m = t[a.id];
                    return editing === key ? (
                      <div className="vxa-mu-edit" key={a.id}>
                        <input
                          value={draft}
                          inputMode="decimal"
                          aria-label={`${t.label ?? `Tier ${i + 1}`} ${a.label} multiplier`}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void save(i, a.id); }}
                        />
                        <button type="button" disabled={busy} onClick={() => void save(i, a.id)}>Save</button>
                        <button type="button" className="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="vxa-mu-val" key={a.id}>
                        <em className="vxa-price-aud">{a.label}</em>
                        <strong>×{Number(m).toFixed(2)}</strong>
                        <button
                          type="button"
                          className="vxa-mu-pencil"
                          aria-label={`Edit ${t.label ?? `Tier ${i + 1}`} ${a.label} multiplier`}
                          onClick={() => { setEditing(key); setDraft(String(m)); }}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="vxa-card">
            <div className="vxa-card-head"><strong>Sample customer prices</strong></div>
            <p className="vxa-card-sub">
              What a real rental in each tier costs us in Naira, and what each audience pays with
              your current multipliers (rounded up to the nearest ₦50).
            </p>
            <div className="vxa-samp-table">
              <div className="vxa-samp-head">
                <span>Rental</span>
                <span>Cost to us</span>
                {RENT_SMS_AUDIENCES.map((a) => <span key={a.id}>{a.label} pays</span>)}
              </div>
              {RENT_SMS_SAMPLES.map((s) => {
                const t = rows[s.tierIdx] ?? rows[0];
                const costNgn = Math.round(s.costUsd * liveRate);
                return (
                  <div className="vxa-samp-row" key={s.tierIdx}>
                    <div className="vxa-price-tier">
                      <strong>{s.desc}</strong>
                      <span>{t.label ?? `Tier ${s.tierIdx + 1}`}</span>
                    </div>
                    <div className="vxa-samp-cell">
                      <em className="vxa-price-aud">Cost</em>
                      <strong>{naira(costNgn)}</strong>
                    </div>
                    {RENT_SMS_AUDIENCES.map((a) => (
                      <div className="vxa-samp-cell" key={a.id}>
                        <em className="vxa-price-aud">{a.label}</em>
                        <strong>{naira(rentSmsRoundUp50(costNgn * t[a.id]))}</strong>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <ul className="vxa-price-notes">
              <li>Every price is rounded UP to the nearest ₦50 — the same rule customers see at checkout.</li>
              <li>Choosing a specific area code uses the same tier multiplier — no extra charge for a chosen state.</li>
              <li>The default tiers above are live until you change them; the boxes show your saved values.</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}


function VirtualNumberSection() {
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
          <strong>Could not load Virtual Number pricing.</strong>
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
                          <em className="vxa-price-aud">{a.label}</em>
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

export function AdminPage({
  onBack,
  initialSection = 'overview',
}: {
  onBack: () => void;
  initialSection?: AdminSection;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [focusUserId, setFocusUserId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [section, setSection] = useState<AdminSection>(initialSection);
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
    // Telegram deep link: /admin?user=<id> opens the Users section on that user.
    const q = new URLSearchParams(window.location.search).get('user');
    if (q) {
      setFocusUserId(q);
      setSection('users');
    }
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
            <h1>{SECTION_META[section].title}</h1>
            <p>{SECTION_META[section].sub}</p>
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
                {(ov?.days && ov.days.length ? ov.days : days.map((d) => ({ date: d.key, orders: 0, sales: 0, net: 0 }))).map((d, idx) => (
                  <li key={d.date} className={idx === 0 ? 'today' : ''}>
                    <div>
                      <strong>{idx === 0
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
            <UserManagement focusUserId={focusUserId} />
          </section>
        )}

        {section === 'chats' && (
          <section className="vxa-body">
            <LiveChats />
          </section>
        )}

        {section === 'pricing' && (
          <section className="vxa-body">
            <VirtualNumberSection />
          </section>
        )}

        {section === 'email-otp' && (
          <section className="vxa-body">
            <EmailOtpSection />
          </section>
        )}

        {section === 'boost' && (
          <section className="vxa-body">
            <BoostPricingSection />
          </section>
        )}

        {section === 'gaming' && (
          <section className="vxa-body">
            <GamingPricingSection />
          </section>
        )}

        {section === 'accounts' && (
          <section className="vxa-body">
            <AccountsPricingSection />
          </section>
        )}

        {section === 'gift-cards' && (
          <section className="vxa-body">
            <GiftCardsSection />
          </section>
        )}

        {section === 'rent-sms' && (
          <section className="vxa-body">
            <RentSmsSection />
          </section>
        )}

        {section === 'data-pricing' && (
          <section className="vxa-body">
            <DataPricingSection />
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
