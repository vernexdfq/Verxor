import { History } from 'lucide-react';
import { Card } from './components/ui';

export function HistoryPage() {
  return (
    <>
      <section className="page-intro">
        <p className="eyebrow">ACTIVITY</p>
        <h1>History</h1>
        <p>Wallet activity and service orders in one timeline.</p>
      </section>
      <div className="history-filters">
        <button type="button" className="filter-active">All</button>
        <button type="button">Wallet</button>
        <button type="button">Numbers</button>
        <button type="button">Orders</button>
      </div>
      <Card className="activity-empty page-empty">
        <div className="activity-empty-icon">
          <History size={19} />
        </div>
        <strong>No activity yet</strong>
        <p>Fund your wallet or place an order and your activity will appear here.</p>
      </Card>
    </>
  );
}
