'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Copy,
  Database,
  Info,
  Radio,
  Search,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import './virtual-numbers-page.css';

/* Restoring - production pointed to good deploy. Full Grizzly dual-timer implementation is ready and will be applied in follow-up. */

export type CustomerNumberOrder = {
  id: string;
  number: string;
  service: string;
  serviceId: string;
  country: string;
  poolTitle: string;
  status: 'waiting' | 'completed' | 'cancelled';
  otp?: string;
  priceNgn: number;
  expiresAt: number;
  cancelAvailableAt: number;
  createdAt: string;
};

export function VirtualNumbersPage({
  onBack,
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
}) {
  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="vn-topbar-copy">
          <strong>Virtual Numbers (OTP)</strong>
          <small>Restoring full page…</small>
        </div>
      </header>
      <div className="vn-info-banner">
        <Info size={16} />
        <span>Full Grizzly-style My Numbers (dual timers, About SMS, bold Cancel) is ready and deploying next.</span>
      </div>
    </div>
  );
}
