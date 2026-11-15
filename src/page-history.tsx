'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  AtSign,
  Calendar,
  ChevronRight,
  FileText,
  Gift,
  Globe,
  Mail,
  PhoneCall,
  PhoneForwarded,
  Receipt,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingDown,
  Wallet,
  X,
} from 'lucide-react';
import { formatNgn } from './lib/wallet-ui';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';
import type { ServiceView } from './service-pages';
import './history-page.css';

export type Transaction = {
  id: string;
  title: string;
  amount: number;
  currency: 'NGN' | 'USD';
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  kind?: string;
};

type HistoryPageProps = {
  userId?: string;
  openService?: (view: ServiceView) => void;
  onOpenVnOrders?: () => void;
  goHome?: () => void;
};

type BoxKey =
  | 'deposit'
  | 'vn'
  | 'boost'
  | 'logs'
  | 'email'
  | 'rent-sms'
  | 'rent-sms-calls'
  | 'vtu'
  | 'esim'
  | 'proxies'
  | 'gift-card'
  | 'ai-subs'
  | 'telegram'
  | 'domain';

const HIST_BOXES: {
  key: BoxKey;
  title: string;
  sub: string;
  icon: typeof Wallet;
  soon?: boolean;
}[] = [
  { key: 'deposit', title: 'Deposit History', sub: 'Wallet funding, deposits and payment records', icon: Wallet },
  { key: 'vn', title: 'Virtual Number History', sub: 'OTP numbers, orders and received codes', icon: Smartphone },
  { key: 'boost', title: 'Boost History', sub: 'Social boost orders and delivery status', icon: Rocket },
  { key: 'logs', title: 'Logs History', sub: 'Buy Logs orders and account credentials', icon: FileText },
  { key: 'email', title: 'Email History', sub: 'Emails and OTPs received', icon: Mail, soon: true },
  { key: 'rent-sms', title: 'Rent SMS History', sub: 'SMS rental history', icon: PhoneCall, soon: true },
  { key: 'rent-sms-calls', title: 'Rent SMS/Calls History', sub: 'Calls made and active rental numbers', icon: PhoneForwarded, soon: true },
  { key: 'vtu', title: 'VTU History', sub: 'Airtime, data, cable, electricity, bet wallet, exam pins', icon: Receipt, soon: true },
  { key: 'esim', title: 'eSIM History', sub: 'Purchased eSIMs, QR codes and installation guides', icon: Globe, soon: true },
  { key: 'proxies', title: 'Proxies History', sub: 'Proxy purchases and available proxies', icon: ShieldCheck, soon: true },
  { key: 'gift-card', title: 'Gift Card History', sub: 'Sold gift cards and bought card credentials', icon: Gift, soon: true },
  { key: 'ai-subs', title: 'AI/App Sub History', sub: 'AI accounts and premium subscriptions', icon: Sparkles, soon: true },
  { key: 'telegram', title: 'Telegram Premium History', sub: 'Telegram stars, boosts and premium bought', icon: Send, soon: true },
  { key: 'domain', title: 'Domain Reg History', sub: 'Registered domains and connection details', icon: AtSign, soon: true },
];

function isDeposit(t: Transaction): boolean {
  const kind = (t.kind || '').toLowerCase();
  const title = (t.title || '').toLowerCase();
  return t.amount > 0 || kind === 'fund' || title.includes('wallet fund');
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: 'NGN' | 'USD') {
  const abs = Math.abs(amount);
  if (currency === 'USD') return `$${abs.toFixed(2)}`;
  return `₦${formatNgn(abs)}`;
}

function monthLabel(d = new Date()) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

async function resolveAuth(userIdProp?: string) {
  const profile = loadSessionProfile();
  let accessToken = loadSessionTokens()?.access_token || '';
  let userId = userIdProp || profile?.userId || '';

  try {
    const { getSupabaseBrowser } = await import('../lib/supabase/client');
    const sb = getSupabaseBrowser();
    if (sb) {
      const { data } = await sb.auth.getSession();
      const s = data.session;
      if (s?.access_token) accessToken = s.access_token;
      if (s?.user?.id) userId = s.user.id;
    }
  } catch {
    /* ignore */
  }

  return { accessToken, userId };
}

export function HistoryPage({ userId: userIdProp, openService, onOpenVnOrders, goHome }: HistoryPageProps) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [openCat, setOpenCat] = useState<'deposit' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ctx = await resolveAuth(userIdProp);
      const q = ctx.userId ? `?userId=${encodeURIComponent(ctx.userId)}` : '';
      const headers: Record<string, string> = {};
      if (ctx.accessToken) headers.Authorization = `Bearer ${ctx.accessToken}`;

      const res = await fetch(`/api/v1/transactions${q}`, {
        cache: 'no-store',
        headers,
      }).catch(() => null);

      if (res && res.ok) {
        const data = (await res.json()) as { ok?: boolean; items?: Transaction[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setItems([]);
        if (res && res.status === 401) setError('Sign in to see your history');
      }
    } catch {
      setItems([]);
      setError('Could not load transactions');
    } finally {
      setLoading(false);
    }
  }, [userIdProp]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = openCat === 'deposit' ? items.filter((t) => isDeposit(t)) : items;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.kind && t.kind.toLowerCase().includes(q)),
    );
    return list;
  }, [items, query, openCat]);

  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    let allTimeFunding = 0;
    let monthTopUps = 0;
    let monthSpending = 0;
    let totalPurchases = 0;
    let monthTxCount = 0;
    let currency: 'NGN' | 'USD' = 'NGN';

    for (const t of items) {
      if (t.currency === 'USD') currency = 'USD';
      const isThisMonth = (() => {
        try {
          const d = new Date(t.createdAt);
          return d.getFullYear() === y && d.getMonth() === m;
        } catch {
          return false;
        }
      })();

      if (t.amount > 0) {
        allTimeFunding += t.amount;
        if (isThisMonth) monthTopUps += t.amount;
      } else if (t.amount < 0) {
        if (isThisMonth) monthSpending += Math.abs(t.amount);
        totalPurchases += 1;
      }
      if (isThisMonth) monthTxCount += 1;
    }

    return {
      allTimeFunding,
      monthTopUps,
      monthSpending,
      totalPurchases,
      monthTxCount,
      currency,
      monthName: monthLabel(now),
    };
  }, [items]);

  const openBox = (key: BoxKey, soon?: boolean) => {
    if (soon) {
      window.alert('This history page is coming soon');
      return;
    }
    if (key === 'vn') {
      onOpenVnOrders?.();
      return;
    }
    if (key === 'boost') {
      openService?.('boost');
      return;
    }
    if (key === 'logs') {
      openService?.('accounts');
      return;
    }
    if (key === 'deposit') {
      setQuery('');
      setOpenCat('deposit');
    }
  };

  return (
    <div className="hist-page">
      {!openCat ? (
        <>
          <header className="hist-head hist-head-row">
            <button
              type="button"
              className="hist-back-btn"
              aria-label="Back to home"
              onClick={() => goHome?.()}
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>
            <h1>History</h1>
          </header>

          <section className="hist-boxes" aria-label="History categories">
            {HIST_BOXES.map((box) => {
              const Icon = box.icon;
              return (
                <button
                  key={box.key}
                  type="button"
                  className="hist-box"
                  onClick={() => openBox(box.key, box.soon)}
                >
                  <span className="hist-box-icon">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="hist-box-copy">
                    <strong>{box.title}</strong>
                    <small>{box.sub}</small>
                  </span>
                  {box.soon ? <span className="hist-soon">SOON</span> : null}
                  <ChevronRight size={18} strokeWidth={2.2} className="hist-box-chevron" />
                </button>
              );
            })}
          </section>
        </>
      ) : (
        <>
          <header className="hist-sub-head">
            <button
              type="button"
              className="hist-back-btn"
              aria-label="Back to History"
              onClick={() => setOpenCat(null)}
            >
              <ArrowLeft size={18} strokeWidth={2.2} />
            </button>
            <h1>Deposit History</h1>
          </header>

          <div className="hist-sub-banner">
            <span className="hist-box-icon">
              <Wallet size={20} strokeWidth={2} />
            </span>
            <span className="hist-box-copy">
              <strong>Deposit History</strong>
              <small>Wallet funding, deposits and payment records</small>
            </span>
          </div>

          <div className="hist-search">
            <Search size={16} className="hist-search-icon" />
            <input
              type="search"
              placeholder="Search deposits..."
              aria-label="Search deposits"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="hist-search-clear"
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <section className="hist-list-section" aria-label="Deposit history">
            {loading ? (
              <div className="hist-empty">
                <div className="hist-empty-icon hist-empty-icon--muted">
                  <Receipt size={28} strokeWidth={1.8} />
                </div>
                <p>Loading...</p>
              </div>
            ) : error ? (
              <div className="hist-empty">
                <div className="hist-empty-icon hist-empty-icon--muted">
                  <Receipt size={28} strokeWidth={1.8} />
                </div>
                <strong>{error}</strong>
                <button type="button" className="hist-retry" onClick={() => void load()}>
                  Try again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="hist-empty">
                <div className="hist-empty-icon">
                  <Receipt size={28} strokeWidth={1.8} />
                </div>
                <strong>No history yet</strong>
                <p>Your records will show here once available.</p>
              </div>
            ) : (
              <ul className="hist-list">
                {filtered.map((tx) => {
                  const negative = tx.amount < 0;
                  const amountLabel = `${negative ? '-' : '+'}${formatMoney(tx.amount, tx.currency)}`;
                  return (
                    <li key={tx.id} className="hist-row">
                      <div
                        className={`hist-icon ${
                          negative ? 'tx-amber' : tx.status === 'failed' ? 'tx-slate' : 'tx-mint'
                        }`}
                      >
                        {negative ? (
                          <ShoppingBag size={18} strokeWidth={2} />
                        ) : (
                          <Wallet size={18} strokeWidth={2} />
                        )}
                      </div>
                      <div className="hist-row-main">
                        <span className="hist-row-title">{tx.title}</span>
                        <span className="hist-row-time">{formatWhen(tx.createdAt)}</span>
                      </div>
                      <div className="hist-row-meta">
                        <span className={negative ? 'hist-amt minus' : 'hist-amt plus'}>
                          {amountLabel}
                        </span>
                        <span className={`hist-status status-${tx.status}`}>
                          {tx.status === 'success'
                            ? 'Success'
                            : tx.status === 'pending'
                              ? 'Pending'
                              : 'Failed'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="hist-stats" aria-label="Funding summary">
            <article className="hist-stat-card hist-stat-navy">
              <div className="hist-stat-icon">
                <Wallet size={18} strokeWidth={2} />
              </div>
              <span className="hist-stat-label">ALL-TIME FUNDING</span>
              <strong>{formatMoney(stats.allTimeFunding, stats.currency)}</strong>
              <small>Total deposits ever made</small>
            </article>

            <article className="hist-stat-card hist-stat-teal">
              <div className="hist-stat-icon">
                <TrendingDown size={18} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
              </div>
              <span className="hist-stat-label">THIS MONTH'S TOP-UPS</span>
              <strong>{formatMoney(stats.monthTopUps, stats.currency)}</strong>
              <small>{stats.monthName}</small>
            </article>

            <div className="hist-month-summary">
              <h2>
                <Calendar size={16} strokeWidth={2.2} />
                {stats.monthName} Summary
              </h2>
              <div className="hist-month-row">
                <span>
                  <ArrowLeftRight size={14} strokeWidth={2} /> TOTAL TRANSACTIONS
                </span>
                <strong>{stats.monthTxCount}</strong>
              </div>
              <div className="hist-month-row hist-month-row--up">
                <span>
                  <span className="hist-dot hist-dot--green" /> TOTAL TOP-UPS
                </span>
                <strong className="pos">{formatMoney(stats.monthTopUps, stats.currency)}</strong>
              </div>
              <div className="hist-month-row hist-month-row--down">
                <span>
                  <span className="hist-dot hist-dot--red" /> TOTAL SPENT
                </span>
                <strong className="neg">{formatMoney(stats.monthSpending, stats.currency)}</strong>
              </div>
              <div className="hist-month-row">
                <ShoppingBag size={14} strokeWidth={2} />
                <span> PURCHASE COUNT</span>
                <strong>{stats.totalPurchases}</strong>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
