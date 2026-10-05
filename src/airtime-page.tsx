'use client';

import { ArrowLeft, Wallet } from 'lucide-react';
import './airtime-page.css';

/** Temporary safe stub — full UI restored next. Balance always from session (0 until funded). */
export function AirtimePage({ onBack }: { onBack: () => void }) {
  return (
    <div className="air-page">
      <header className="air-topbar">
        <button type="button" className="air-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="air-topbar-copy">
          <strong>Airtime</strong>
          <small>Top up Nigerian networks</small>
        </div>
        <div className="air-balance" aria-label="Wallet balance">
          <Wallet size={14} />
          <span>₦0</span>
        </div>
      </header>
      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
        <p>Airtime is temporarily refreshing.</p>
        <p style={{ fontSize: 13 }}>Your wallet shows ₦0 until you fund it.</p>
      </div>
    </div>
  );
}
