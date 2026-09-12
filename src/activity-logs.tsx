import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock3, FileText, Filter, History, Search } from 'lucide-react';
import { Card } from './components/ui';
import './product-pages.css';

type LogFilter = 'All' | 'Wallet' | 'Numbers' | 'Rentals' | 'Accounts' | 'Boosts';

export function ActivityLogsPage() {
  const [filter, setFilter] = useState<LogFilter>('All');
  const [query, setQuery] = useState('');
  const filters: LogFilter[] = ['All', 'Wallet', 'Numbers', 'Rentals', 'Accounts', 'Boosts'];
  const results = useMemo(() => [], [filter, query]);

  return <div className="logs-page">
    <header className="product-heading"><span className="eyebrow">ACTIVITY</span><h1>History</h1><p>A clear record of wallet activity and every service order.</p></header>
    <div className="logs-summary"><div><span className="logs-summary-icon"><History size={18} /></span><div><strong>All activity</strong><small>Payments, orders and account events</small></div></div><span className="logs-secure"><FileText size={14} /> Account record</span></div>
    <label className="product-search full"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by reference or service" /></label>
    <div className="category-scroll log-filters">{filters.map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}><Filter size={12} /> {f}</button>)}</div>
    {results.length === 0 ? <Card className="product-empty logs-empty"><div><Clock3 size={20} /></div><strong>No activity yet</strong><p>Once you fund your wallet or place an order, the full record will appear here with its status, amount and reference.</p><button onClick={() => setFilter('All')}>Clear filters</button></Card> : <div className="log-list">{results.map((item: any) => <LogRow key={item.id} item={item} />)}</div>}
  </div>;
}

function LogRow({ item }: { item: { id: string; title: string; detail: string; amount: string; status: string; incoming?: boolean } }) {
  return <Card className="log-row"><span className={`log-icon ${item.incoming ? 'incoming' : ''}`}>{item.incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div className="log-copy"><strong>{item.title}</strong><small>{item.detail}</small></div><div className="log-value"><strong>{item.amount}</strong><small>{item.status}</small></div></Card>;
}
