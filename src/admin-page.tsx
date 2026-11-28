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
  const [userTx, setUserTx] = useState<Array<{
    kind: string; amountNgn: number | null; amountUsd: number | null;
    currency: string; reference: string; description: string; createdAt: string;
  }> | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txUserId, setTxUserId] = useState('');

  const loadUserTx = async (uid: string) => {
    setTxUserId(uid);
    setTxLoading(true);
    try {
      const res = await fetch(`/api/admin/users/transactions?userId=${encodeURIComponent(uid)}`, {
        headers: adminHeaders(),
        cache: 'no-store',
      });
      const data = (await res.json()) as { ok?: boolean; transactions?: typeof userTx };
      if (res.ok && data.ok && Array.isArray(data.transactions)) setUserTx(data.transactions);
      else setUserTx([]);
    } catch {
      setUserTx([]);
    } finally {
      setTxLoading(false);
    }
  };

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
                onClick={() => {
                  const next = !txOpen;
                  setTxOpen(next);
                  if (next && (!userTx || txLoading || txUserId !== selected.id)) void loadUserTx(selected.id);
                }}>
                <Wallet size={13} /> Transactions
                <em>{txOpen ? 'Hide' : 'View'}</em>
              </button>
              {txOpen ? (
                <div>
                  {txLoading ? (
                    <p className="vxa-note">Loading transactions…</p>
                  ) : !userTx || userTx.length === 0 ? (
                    <p className="vxa-note">No transactions on this wallet yet.</p>
                  ) : (
                    <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {userTx.map((t, i) => {
                        const ngn = t.amountNgn;
                        const usd = t.amountUsd;
                        const value = ngn !== null ? ngn : usd !== null ? usd : 0;
                        const isCredit = t.kind === 'fund' || t.kind === 'refund' ||
                          (ngn !== null ? ngn > 0 : usd !== null ? usd > 0 : false);
                        const label =
                          t.kind === 'purchase' ? 'Purchase' :
                          t.kind === 'fund' ? 'Wallet funding' :
                          t.kind === 'refund' ? 'Refund' :
                          t.kind === 'adjustment' ? 'Admin adjustment' :
                          t.kind === 'wholesale_debit' ? 'Panel wholesale debit' :
                          t.description || t.kind;
                        const day = t.createdAt ? new Date(t.createdAt) : null;
                        const when = day && !Number.isNaN(day.getTime())
                          ? day.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '';
                        return (
                          <div key={t.reference + t.createdAt + i}
                            style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', borderBottom: '1px solid rgba(148,163,184,0.18)', paddingBottom: 6, fontSize: 13 }}>
                            <div style={{ minWidth: 0 }}>
                              <strong style={{ display: 'block' }}>{label}</strong>
                              <span style={{ color: '#94a3b8', fontSize: 11, wordBreak: 'break-all' }}>{when}{t.reference ? ` · ${t.reference}` : ''}</span>
                            </div>
                            <em style={{ color: isCredit ? '#16a34a' : '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {isCredit ? '+' : '−'}{ngn !== null ? `₦${Math.abs(ngn).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${Math.abs(usd ?? 0).toFixed(2)}`}
                            </em>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="vxa-note" style={{ marginTop: 6 }}>
                    Newest first · every wallet event: purchases, funding, refunds, adjustments. Scroll to see older entries.
                  </p>
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
type VnPricingData = { ok?: boolean; rate?: number; step?: number; retail?: VnMults; api?: VnMults; panel?: VnMults; error?: string };

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

type AdminEmailOrder = {
  id: string;
  userId: string;
  userLabel: string;
  provider: string;
  providerOrderId: string;
  email: string;
  site: string;
  domain: string;
  costUsd: number;
  chargedNgn: number;
  audience: string;
  status: string;
  message: string | null;
  createdAt: string;
};

const EMAIL_ORDER_STATUSES = ['all', 'waiting', 'completed', 'cancelled', 'refunded'];

function statusTone(s: string): string {
  if (s === 'completed') return 'ok';
  if (s === 'waiting') return 'wait';
  if (s === 'refunded' || s === 'cancelled') return 'bad';
  return 'wait';
}

function EmailOrdersSection() {
  const [orders, setOrders] = useState<AdminEmailOrder[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('waiting');
  const [editMessage, setEditMessage] = useState('');

  const load = async () => {
    setLoadError(false);
    try {
      const params = new URLSearchParams({ status, limit: '100' });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/admin/email-orders?${params.toString()}`, {
        headers: adminHeaders(),
        cache: 'no-store',
      });
      const d = (await res.json()) as { ok?: boolean; orders?: AdminEmailOrder[] };
      if (res.ok && d.ok) {
        setOrders(d.orders || []);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

  const openEdit = (o: AdminEmailOrder) => {
    setEditId(o.id);
    setEditStatus(o.status || 'waiting');
    setEditMessage(o.message || '');
    setMsg('');
  };

  const saveEdit = async () => {
    if (!editId || busy) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/email-orders', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ id: editId, status: editStatus, message: editMessage }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setMsg(d.error || 'Could not save'); return; }
      setEditId(null);
      setMsg('Order updated — the customer sees the change instantly');
      await load();
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  const refund = async (o: AdminEmailOrder) => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/email-orders', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ id: o.id, refund: true }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setMsg(d.error || 'Refund failed'); return; }
      setMsg(`Refunded ₦${o.chargedNgn.toLocaleString('en-NG')} to ${o.userLabel}`);
      await load();
    } catch { setMsg('Network error'); } finally { setBusy(false); }
  };

  return (
    <div className="vxa-card" style={{ marginTop: 14 }}>
      <div className="vxa-card-head"><strong>Customer email orders</strong></div>
      <p className="vxa-card-sub">
        Every purchased inbox with live status. Tap an order to edit its status or the OTP message the
        customer sees, or refund the charge straight to their wallet.
      </p>

      <div className="vxa-eo-toolbar">
        <div className="vxa-eo-search">
          <Search size={14} />
          <input
            value={q}
            placeholder="Search email, site or order id"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void load(); }}
          />
          <button type="button" disabled={busy} onClick={() => void load()}>Search</button>
        </div>
        <div className="vxa-chips">
          {EMAIL_ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={status === s ? 'on' : ''}
              onClick={() => setStatus(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {msg ? <div className="vxa-action-msg">{msg}</div> : null}

      {loadError ? (
        <div className="vxa-empty">
          <strong>Could not load email orders</strong>
          <p>Check the server connection, then search again.</p>
        </div>
      ) : orders === null ? (
        <div className="vxa-empty"><strong>Loading orders…</strong></div>
      ) : orders.length === 0 ? (
        <div className="vxa-empty">
          <strong>No email orders {status !== 'all' ? `with status "${status}"` : 'yet'}</strong>
          <p>Orders appear here the moment customers buy an inbox.</p>
        </div>
      ) : (
        <div className="vxa-eo-list">
          {orders.map((o) => {
            const editing = editId === o.id;
            return (
              <div className={`vxa-eo-row${editing ? ' open' : ''}`} key={o.id}>
                <button type="button" className="vxa-eo-main" onClick={() => (editing ? setEditId(null) : openEdit(o))}>
                  <div className="vxa-eo-line">
                    <strong>{o.email}</strong>
                    <span className={`vxa-eo-badge ${statusTone(o.status)}`}>{o.status}</span>
                  </div>
                  <div className="vxa-eo-sub">
                    {o.site} · {o.userLabel} · ₦{o.chargedNgn.toLocaleString('en-NG')} ·{' '}
                    {new Date(o.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </button>

                {editing ? (
                  <div className="vxa-eo-edit">
                    <label>
                      Status
                      <div className="vxa-chips">
                        {['waiting', 'completed', 'cancelled', 'refunded'].map((s) => (
                          <button key={s} type="button" className={editStatus === s ? 'on' : ''} onClick={() => setEditStatus(s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label>
                      Message the customer sees (OTP)
                      <textarea
                        value={editMessage}
                        rows={3}
                        placeholder="Paste the OTP or verification message here…"
                        onChange={(e) => setEditMessage(e.target.value)}
                      />
                    </label>
                    <div className="vxa-eo-actions">
                      <button type="button" className="ghost" disabled={busy} onClick={() => setEditId(null)}>Cancel</button>
                      <button type="button" disabled={busy} onClick={() => void saveEdit()}>Save</button>
                      <button
                        type="button"
                        className="warn"
                        disabled={busy || o.status === 'refunded'}
                        onClick={() => void refund(o)}
                      >
                        Refund ₦{o.chargedNgn.toLocaleString('en-NG')}
                      </button>
                    </div>
                  </div>
                ) : null}
