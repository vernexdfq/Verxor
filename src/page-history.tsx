'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  LayoutList,
  Lock,
  Phone,
  PieChart,
  Plus,
  Rocket,
  RotateCcw,
  Search,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import './history-page.css';

type TxCategory = 'BOOSTING' | 'VIRTUAL_NUMBER' | 'REFUND' | 'FUNDING' | 'DATA' | 'AIRTIME';

type Transaction = {
  id: string;
  category: TxCategory;
  title: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
};

/** Demo feed — replace with GET /api/v1/transactions when live */
const DEMO_TX: Transaction[] = [
  {
    id: 'tx_1',
    category: 'BOOSTING',
    title: 'Boosting: Instagram',
    amount: -386.96,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-16T01:18:00Z',
  },
  {
    id: 'tx_2',
    category: 'BOOSTING',
    title: 'Boosting: Facebook',
    amount: -246.38,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-16T00:48:00Z',
  },
  {
    id: 'tx_3',
    category: 'BOOSTING',
    title: 'Boosting: Twitter',
    amount: -226.98,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-16T00:31:00Z',
  },
  {
    id: 'tx_4',
    category: 'REFUND',
    title: 'Refund: Boosting order',
    amount: 191.1,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-16T00:02:00Z',
  },
  {
    id: 'tx_5',
    category: 'BOOSTING',
    title: 'Boosting: YouTube',
    amount: -191.1,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-16T00:02:00Z',
  },
  {
    id: 'tx_6',
    category: 'VIRTUAL_NUMBER',
    title: 'Virtual Number (US)',
    amount: -2160,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-15T23:13:00Z',
  },
  {
    id: 'tx_7',
    category: 'BOOSTING',
    title: 'Boosting: Spotify',
    amount: -500.26,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-15T12:13:00Z',
  },
  {
    id: 'tx_8',
    category: 'BOOSTING',
    title: 'Boosting: Audiomack',
    amount: -567,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-15T12:05:00Z',
  },
  {
    id: 'tx_9',
    category: 'REFUND',
    title: 'Refund — Cancelled order',
    amount: 3475,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-14T13:02:00Z',
  },
  {
    id: 'tx_10',
    category: 'VIRTUAL_NUMBER',
    title: 'Virtual Number (All countries)',
    amount: -3475,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-14T13:00:00Z',
  },
  {
    id: 'tx_11',
    category: 'FUNDING',
    title: 'Wallet top-up (Paga)',
    amount: 5000,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'tx_12',
    category: 'DATA',
    title: 'Data — MTN 2GB',
    amount: -420,
    currency: 'NGN',
    status: 'SUCCESS',
    createdAt: '2026-07-08T16:22:00Z',
  },
];

const PAGE_SIZE = 8;

const SUMMARY = {
  allTimeFunding: 110960.69,
  currentMonthTopUps: 0,
  currentMonthSpent: 0,
  purchaseCount: 0,
  totalTransactions: 0,
  period: 'September 2026',
};

function formatMoney(n: number) {
  const abs = Math.abs(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : n > 0 ? '+' : ''}₦${abs}`;
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function catMeta(cat: TxCategory) {
  switch (cat) {
    case 'BOOSTING':
      return { Icon: Rocket, tone: 'tx-purple' };
    case 'VIRTUAL_NUMBER':
      return { Icon: Phone, tone: 'tx-amber' };
    case 'REFUND':
      return { Icon: RotateCcw, tone: 'tx-mint' };
    case 'FUNDING':
      return { Icon: Wallet, tone: 'tx-blue' };
    case 'DATA':
      return { Icon: Upload, tone: 'tx-sky' };
    case 'AIRTIME':
      return { Icon: Phone, tone: 'tx-teal' };
    default:
      return { Icon: ArrowLeftRight, tone: 'tx-slate' };
  }
}

export function HistoryPage() {
  const [view, setView] = useState<'list' | 'stats'>('list');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEMO_TX;
    return DEMO_TX.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="hist-page">
      <header className="hist-header">
        <h1 className="hist-title">Transactions</h1>
      </header>

      <div className="hist-toggles" role="tablist" aria-label="History views">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={view === 'list' ? 'hist-toggle active' : 'hist-toggle'}
          onClick={() => setView('list')}
          aria-label="List view"
        >
          <LayoutList size={18} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'stats'}
          className={view === 'stats' ? 'hist-toggle active' : 'hist-toggle'}
          onClick={() => setView('stats')}
          aria-label="Summary view"
        >
          <PieChart size={18} />
        </button>
      </div>

      {view === 'list' ? (
        <>
          <div className="hist-search">
            <Search size={16} className="hist-search-icon" aria-hidden />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search transactions…"
              aria-label="Search transactions"
            />
            {query ? (
              <button
                type="button"
                className="hist-search-clear"
                aria-label="Clear"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <p className="hist-section-label">ALL ACTIVITY</p>

          {slice.length === 0 ? (
            <div className="hist-empty">
              <strong>No transactions found</strong>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <ul className="hist-list">
              {slice.map((tx) => {
                const { Icon, tone } = catMeta(tx.category);
                const positive = tx.amount > 0;
                return (
                  <li key={tx.id} className="hist-row">
                    <span className={`hist-icon ${tone}`}>
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <div className="hist-row-main">
                      <strong className="hist-row-title">{tx.title}</strong>
                      <span className="hist-row-time">{formatWhen(tx.createdAt)}</span>
                    </div>
                    <div className="hist-row-meta">
                      <span className={positive ? 'hist-amt plus' : 'hist-amt minus'}>
                        {formatMoney(tx.amount)}
                      </span>
                      <span className="hist-status">
                        <CheckCircle2 size={12} /> Success
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="hist-pager">
            <button
              type="button"
              className="hist-page-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Previous
            </button>
            <span className="hist-page-info">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="hist-page-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next ›
            </button>
          </div>
        </>
      ) : (
        <div className="hist-stats">
          <article className="hist-stat-card hist-stat-navy">
            <Wallet size={18} />
            <span className="hist-stat-label">ALL-TIME FUNDING</span>
            <strong>₦{SUMMARY.allTimeFunding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
            <small>Total deposits ever made</small>
          </article>

          <article className="hist-stat-card hist-stat-teal">
            <Plus size={18} />
            <span className="hist-stat-label">THIS MONTH&apos;S TOP-UPS</span>
            <strong>₦{SUMMARY.currentMonthTopUps.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
            <small>{SUMMARY.period}</small>
          </article>

          <article className="hist-stat-card hist-stat-violet">
            <Upload size={18} />
            <span className="hist-stat-label">THIS MONTH&apos;S SPENDING</span>
            <strong>₦{SUMMARY.currentMonthSpent.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
            <small>{SUMMARY.period}</small>
          </article>

          <article className="hist-stat-card hist-stat-deep">
            <Lock size={18} />
            <span className="hist-stat-label">TOTAL PURCHASES</span>
            <strong>{SUMMARY.purchaseCount}</strong>
            <small>{SUMMARY.period}</small>
          </article>

          <section className="hist-month-summary">
            <h2>
              <CalendarDays size={16} /> {SUMMARY.period} Summary
            </h2>
            <div className="hist-month-row">
              <span>TOTAL TRANSACTIONS</span>
              <strong>{SUMMARY.totalTransactions}</strong>
            </div>
            <div className="hist-month-row hist-row-green">
              <span>TOTAL TOP-UPS</span>
              <strong>₦{SUMMARY.currentMonthTopUps.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className="hist-month-row hist-row-rose">
              <span>TOTAL SPENT</span>
              <strong>₦{SUMMARY.currentMonthSpent.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div className="hist-month-row">
              <span>PURCHASE COUNT</span>
              <strong>{SUMMARY.purchaseCount}</strong>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
