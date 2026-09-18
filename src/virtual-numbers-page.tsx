import { ArrowLeft, Bell, ChevronRight, Globe2, WalletCards } from 'lucide-react';
import './virtual-numbers-page.css';

type Pool = {
  id: string;
  title: string;
  subtitle: 'Available numbers' | 'From price';
  kind: 'VoIP' | 'Non-VoIP';
  location: 'USA' | 'Worldwide';
};

const VOIP_POOLS: Pool[] = [
  { id: 'usa-economy', title: 'USA · Economy', subtitle: 'Available numbers', kind: 'VoIP', location: 'USA' },
  { id: 'usa-standard', title: 'USA · Standard', subtitle: 'Available numbers', kind: 'VoIP', location: 'USA' },
  { id: 'worldwide-economy', title: 'Worldwide · Economy', subtitle: 'Available numbers', kind: 'VoIP', location: 'Worldwide' },
  { id: 'worldwide-standard', title: 'Worldwide · Standard', subtitle: 'Available numbers', kind: 'VoIP', location: 'Worldwide' },
];

const NON_VOIP_POOLS: Pool[] = [
  { id: 'usa-fast', title: 'USA · Fast', subtitle: 'From price', kind: 'Non-VoIP', location: 'USA' },
  { id: 'usa-premium', title: 'USA · Premium', subtitle: 'From price', kind: 'Non-VoIP', location: 'USA' },
  { id: 'worldwide-fast', title: 'Worldwide · Fast', subtitle: 'From price', kind: 'Non-VoIP', location: 'Worldwide' },
  { id: 'worldwide-premium', title: 'Worldwide · Premium', subtitle: 'From price', kind: 'Non-VoIP', location: 'Worldwide' },
];

function PoolCard({ pool, onSelect }: { pool: Pool; onSelect: (pool: Pool) => void }) {
  return (
    <button
      type="button"
      className="vn-pool-choice"
      onClick={() => onSelect(pool)}
      aria-label={`Select ${pool.title}`}
    >
      <span className="vn-pool-icon" aria-hidden="true">
        {pool.location === 'USA' ? <span className="vn-flag">🇺🇸</span> : <Globe2 size={19} />}
      </span>
      <span className="vn-pool-copy">
        <strong>{pool.title}</strong>
        <small>{pool.subtitle}</small>
      </span>
      <ChevronRight className="vn-pool-chevron" size={17} aria-hidden="true" />
    </button>
  );
}

export function VirtualNumbersPage({ onBack }: { onBack: () => void }) {
  const selectPool = (pool: Pool) => {
    const url = new URL(window.location.href);
    url.searchParams.set('pool', pool.id);
    window.history.pushState({ poolId: pool.id }, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={onBack} aria-label="Back to services">
          <ArrowLeft size={19} aria-hidden="true" />
        </button>

        <h1>Virtual Numbers</h1>

        <div className="vn-top-actions">
          <button type="button" className="vn-wallet-pill" aria-label="Wallet balance">
            <WalletCards size={15} aria-hidden="true" />
            <span>$0.00</span>
          </button>
          <button type="button" className="vn-notification" aria-label="Notifications">
            <Bell size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="vn-intro" aria-labelledby="virtual-numbers-heading">
        <h2 id="virtual-numbers-heading">Virtual Numbers</h2>
        <p>Choose a number based on compatibility, speed and price.</p>
      </section>

      <section className="vn-pool-grid" aria-label="Number pools">
        <div className="vn-pool-column">
          <span className="vn-type-tag">VoIP</span>
          <div className="vn-pool-list">
            {VOIP_POOLS.map((pool) => (
              <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
            ))}
          </div>
        </div>

        <div className="vn-pool-column">
          <span className="vn-type-tag">Non-VoIP</span>
          <div className="vn-pool-list">
            {NON_VOIP_POOLS.map((pool) => (
              <PoolCard key={pool.id} pool={pool} onSelect={selectPool} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
