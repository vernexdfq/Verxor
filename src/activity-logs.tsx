import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, Filter, Search, WalletCards } from 'lucide-react';
import { Card } from './components/ui';
import './product-pages.css';

type LogFilter = 'All' | 'Deposits' | 'Numbers' | 'Rentals' | 'Accounts' | 'Boosts';

type HistoryEntry = {
  id: string;
  title: string;
  detail: string;
  amount: string;
  status: string;
  date: string;
  category: Exclude<LogFilter, 'All'>;
  incoming?: boolean;
};

type HistorySummary = {
  totalDeposited: string;
  thisMonth: string;
  serviceSpend: string;
  currentBalance: string;
  currency: string;
};

const summary: HistorySummary = {
  totalDeposited: '$0.00',
  thisMonth: '$0.00',
  serviceSpend: '$0.00',
  currentBalance: '$0.00',
  currency: 'USD',
};

const entries: HistoryEntry[] = [];

export function ActivityLogsPage() {
  const [filter, setFilter] = useState<LogFilter>('All');
  const [query, setQuery] = useState('');
  const filters: LogFilter[] = ['All', 'Deposits', 'Numbers', 'Rentals', 'Accounts', 'Boosts'];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((item) => {
      const matchesFilter = filter === 'All' || item.category === filter;
      const matchesQuery = !q || [item.id, item.title, item.detail, item.status].join(' ').toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="logs-page">
      <header className="product-heading">
        <span className="eyebrow">ACTIVITY</span>
        <h1>History</h1>
        <p>Your deposits, wallet balance and every service order in one clear record.</p>
      </header>

      <section className="history-summary" aria-label="Account financial summary">
        <SummaryCard label="Total deposited" value={summary.totalDeposited} />
        <SummaryCard label="This month" value={summary.thisMonth} />
        <SummaryCard label="Service spend" value={summary.serviceSpend} />
        <SummaryCard label="Current balance" value={summary.currentBalance} />
      </section>

      <div className="history-account-note">
        <WalletCards size={16} />
        <span>Account currency · <strong>{summary.currency}</strong></span>
      </div>

      <div className="history-toolbar">
        <label className="product-search full">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference, number or service"
            aria-label="Search history"
          />
        </label>

        <div className="category-scroll log-filters" aria-label="History filters">
          {filters.map((item) => (
            <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} type="button">
              <Filter size={12} />
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="history-section-head">
        <div>
          <span className="eyebrow">RECORD</span>
          <h2>Deposits & activity</h2>
        </div>
        <span>{results.length} {results.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {results.length === 0 ? (
        <Card className="product-empty logs-empty">
          <div><Clock3 size={20} /></div>
          <strong>{query || filter !== 'All' ? 'No matching activity' : 'No activity yet'}</strong>
          <p>
            {query || filter !== 'All'
              ? 'Try another search or clear the selected filter.'
              : 'Your deposits, purchases, OTP orders and service activity will appear here as soon as your account has activity.'}
          </p>
          {(query || filter !== 'All') && (
            <button type="button" onClick={() => { setQuery(''); setFilter('All'); }}>Clear filters</button>
          )}
        </Card>
      ) : (
        <div className="log-list">
          {results.map((item) => <LogRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="history-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

function LogRow({ item }: { item: HistoryEntry }) {
  return (
    <Card className="log-row">
      <span className={`log-icon ${item.incoming ? 'incoming' : ''}`}>
        {item.incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      </span>
      <div className="log-copy">
        <strong>{item.title}</strong>
        <small>{item.detail}</small>
        <span>{item.date} · {item.id}</span>
      </div>
      <div className="log-value">
        <strong>{item.amount}</strong>
        <small>{item.status}</small>
      </div>
    </Card>
  );
}
