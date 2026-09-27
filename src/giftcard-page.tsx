'use client';

import { useState } from 'react';
import { LayoutGrid, Clock, Wallet, Home } from 'lucide-react';
import './giftcard-page.css';

type TabId = 'home' | 'trade' | 'activity' | 'wallet';

export function GiftCardPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<TabId>('trade');

  return (
    <div className="gc-shell">
      <div className="gc-scroll">
        {/* Content intentionally empty — bottom nav only */}
        <div className="gc-page" style={{ minHeight: '60vh' }} />
      </div>

      <nav className="gc-bottom-nav">
        <button
          type="button"
          className={tab === 'home' ? 'active' : ''}
          onClick={() => {
            setTab('home');
            onBack?.();
          }}
        >
          <Home size={22} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className={tab === 'trade' ? 'active' : ''}
          onClick={() => setTab('trade')}
        >
          <LayoutGrid size={22} />
          <span>Trade</span>
        </button>
        <button
          type="button"
          className={tab === 'activity' ? 'active' : ''}
          onClick={() => setTab('activity')}
        >
          <Clock size={22} />
          <span>Activity</span>
        </button>
        <button
          type="button"
          className={tab === 'wallet' ? 'active' : ''}
          onClick={() => setTab('wallet')}
        >
          <Wallet size={22} />
          <span>Wallet</span>
        </button>
      </nav>
    </div>
  );
}

export default GiftCardPage;
