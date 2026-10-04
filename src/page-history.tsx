'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  LayoutList,
  PieChart,
  Receipt,
  Search,
  ShoppingBag,
  TrendingDown,
  Wallet,
  X,
} from 'lucide-react';
import { formatNgn } from './lib/wallet-ui';
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
};

type ViewMode = 'list' | 'stats';

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
  return `\u20a6${formatNgn(abs)}`;
}

function monthLabel(d = new Date()) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

export function HistoryPage({ userId }: HistoryPageProps) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await fetch(`/api/v1/transactions${q}`, { cache: 'no-store' }).catch(() => null);
      if (res && res.ok) {
        const data = (await res.json()) as { ok?: boolean; items?: Transaction[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
      setError('Could not load transactions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.kind && t.kind.toLowerCase().includes(q)),
    );
  }, [items, query]);

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

  return (
    <div className="hist-page">
      <header className="hist-head">
        <h1>Transactions</h1>
      </header>

      <div className="hist-toggles" role="tablist" aria-label="History views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={view === 'list' ? 'active' : ''}
          onClick={() => setView('list')}
        >
          <LayoutList size={18} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'stats'}
          className={view === 'stats' ? 'active' : ''}
          onClick={() => setView('stats')}
        >
          <PieChart size={18} strokeWidth={2.2} />
        </button>
      </div>

      {view === 'list' ? (
        <>
          <div className="hist-search">
            <Search size={16} className="hist-search-icon" />
            <input
              type="search"
              placeholder="Search transactions..."
              aria-label="Search transactions"
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

          <section className="hist-list-section" aria-label="All activity">
            <h2 className="hist-section-label">ALL ACTIVITY</h2>

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
                <strong>No transactions yet</strong>
                <p>
                  Your transaction history will appear here once you make your first deposit or
                  purchase.
                </p>
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
        </>
      ) : (
        <section className="hist-stats" aria-label="Transaction summary">
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
            <span className="hist-stat-label">THIS MONTH&apos;S TOP-UPS</span>
            <strong>{formatMoney(stats.monthTopUps, stats.currency)}</strong>
            <small>{stats.monthName}</small>
          </article>

          <article className="hist-stat-card hist-stat-violet">
            <div className="hist-stat-icon">
              <TrendingDown size={18} strokeWidth={2} />
            </div>
            <span className="hist-stat-label">THIS MONTH&apos;S SPENDING</span>
            <strong>{formatMoney(stats.monthSpending, stats.currency)}</strong>
            <small>{stats.monthName}</small>
          </article>

          <article className="hist-stat-card hist-stat-deep">
            <div className="hist-stat-icon">
              <ShoppingBag size={18} strokeWidth={2} />
            </div>
            <span className="hist-stat-label">TOTAL PURCHASES</span>
            <strong>{stats.totalPurchases}</strong>
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
              <span>
                <ShoppingBag size={14} strokeWidth={2} /> PURCHASE COUNT
              </span>
              <strong>{stats.totalPurchases}</strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
