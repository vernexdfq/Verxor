'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, LayoutGrid, Search } from 'lucide-react';
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

export function HistoryPage({ userId }: HistoryPageProps) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div className="hist-page">
      <header className="hist-head">
        <h1>Transactions</h1>
      </header>

      <div className="hist-toggles" role="tablist" aria-label="History views">
        <button type="button" className="active" role="tab" aria-selected>
          <LayoutGrid size={18} />
        </button>
        <button type="button" role="tab" aria-selected={false} disabled title="Coming soon">
          <Clock3 size={18} />
        </button>
      </div>

      <div className="hist-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search transactions..."
          aria-label="Search transactions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="hist-list" aria-label="All activity">
        <h2 className="hist-section-label">ALL ACTIVITY</h2>

        {loading ? (
          <div className="hist-empty">
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="hist-empty">
            <strong>{error}</strong>
          </div>
        ) : filtered.length === 0 ? (
          <div className="hist-empty">
            <strong>No transactions yet</strong>
            <p>Your funding, purchases, and refunds will show up here.</p>
          </div>
        ) : (
          <ul>
            {filtered.map((tx) => {
              const negative = tx.amount < 0;
              const symbol = tx.currency === 'USD' ? '$' : '\u20a6';
              const abs = Math.abs(tx.amount);
              const amountLabel =
                tx.currency === 'USD'
                  ? `${negative ? '-' : '+'}$${abs.toFixed(2)}`
                  : `${negative ? '-' : '+'}${symbol}${formatNgn(abs)}`;
              return (
                <li key={tx.id} className="hist-row">
                  <div className="hist-row-main">
                    <strong>{tx.title}</strong>
                    <span className="hist-when">{formatWhen(tx.createdAt)}</span>
                  </div>
                  <div className="hist-row-side">
                    <span className={negative ? 'hist-amt neg' : 'hist-amt pos'}>{amountLabel}</span>
                    <span className={`hist-status status-${tx.status}`}>
                      {tx.status === 'success' ? 'Success' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
