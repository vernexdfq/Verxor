'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe2,
  Phone,
  Rocket,
  Wallet,
  Zap,
} from 'lucide-react';
import './data-page.css';

/* Minimal safe restore - full data page will be restored if incomplete */
const WALLET_BALANCE = 0;

function money(n: number) {
  return '₦' + n.toLocaleString('en-NG');
}

export function DataPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="data-page" style={{ padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={onBack} aria-label="Back" style={{ border: '1px solid #e2e8f0', borderRadius: 999, width: 40, height: 40, background: '#fff' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>Data</strong>
          <div style={{ fontSize: 12, color: '#64748b' }}>Cheap mobile data bundles</div>
        </div>
        <div style={{ marginLeft: 'auto', fontWeight: 700 }}>{money(WALLET_BALANCE)}</div>
      </header>
      <p style={{ color: '#64748b', fontSize: 14 }}>
        Data plans will load here. Wallet balance is ₦0 until funded.
      </p>
      <div style={{ marginTop: 24, padding: 16, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <strong style={{ color: '#1e40af' }}>Coming back fully</strong>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#334155' }}>
          Select network, choose a plan, enter phone number, and pay from wallet.
        </p>
      </div>
    </div>
  );
}
