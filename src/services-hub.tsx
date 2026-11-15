'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  CreditCard,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  PhoneForwarded,
  Repeat,
  Search,
  Sparkles,
  Trophy,
  Tv,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceView } from './service-pages';
import './services-hub.css';

type ServiceItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  service?: ServiceView;
  soon?: boolean;
  tags: string[];
};

/** Digital services — new & upcoming, shown first */
const DIGITAL: ServiceItem[] = [
  { id: 'esim', title: 'eSIM', icon: Globe, soon: true, tags: ['esim', 'sim', 'travel'] },
  { id: 'virtual-card', title: 'Virtual Card', icon: CreditCard, soon: true, tags: ['card', 'usd', 'virtual'] },
  { id: 'sell-gift-card', title: 'Buy Gift Card', icon: Gift, service: 'gift-card', tags: ['gift', 'sell', 'redeem'] },
  { id: 'trade-gift-card', title: 'Trade Gift Card', icon: Repeat, service: 'gift-card', tags: ['gift', 'trade', 'exchange'] },
  { id: 'ai-subs', title: 'AI/App Subs', icon: Sparkles, soon: true, tags: ['ai', 'subscription', 'chatgpt', 'netflix'] },
  { id: 'gaming', title: 'Gaming Top Up', icon: Trophy, soon: true, tags: ['game', 'gaming', 'steam'] },
  { id: 'domain', title: 'Domain Reg', icon: AtSign, soon: true, tags: ['domain', 'website', 'dns'] },
];

/** Nigerian VTU services */
const VTU: ServiceItem[] = [
  { id: 'data', title: 'Data', icon: Wifi, service: 'data', tags: ['data', 'bundle', 'mtn', 'glo'] },
  { id: 'airtime', title: 'Airtime', icon: PhoneForwarded, service: 'airtime', tags: ['airtime', 'topup'] },
  { id: 'tv', title: 'TV Sub / Cable', icon: Tv, service: 'tv-cable', tags: ['dstv', 'gotv', 'cable', 'tv'] },
  { id: 'electricity', title: 'Electricity', icon: Zap, service: 'electricity', tags: ['electricity', 'prepaid', 'nepa'] },
  { id: 'exam-pin', title: 'Exam Pin', icon: GraduationCap, service: 'exam-pin', tags: ['waec', 'neco', 'jamb', 'pin'] },
  { id: 'bet-wallet', title: 'Bet Wallet', icon: Gamepad2, service: 'bet-wallet', tags: ['betting', 'sportybet', 'bet9ja'] },
];

function filterList(items: ServiceItem[], q: string) {
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q)),
  );
}

function TileGrid({ items, onOpen }: { items: ServiceItem[]; onOpen: (view: ServiceView) => void }) {
  return (
    <div className="svc-hub-grid-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className="svc-hub-tile"
            aria-label={item.soon ? `${item.title} coming soon` : item.title}
            onClick={() => {
              if (item.soon) {
                window.alert('Service coming soon');
                return;
              }
              if (item.service) onOpen(item.service);
            }}
          >
            <span className="svc-hub-tile-icon">
              <Icon size={20} strokeWidth={1.9} />
              {item.soon ? <span className="svc-hub-soon">SOON</span> : null}
            </span>
            <span className="svc-hub-tile-label">{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ServicesHub({
  open,
  onBack,
}: {
  open: (view: ServiceView) => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(true);

  const q = query.trim().toLowerCase();
  const digital = useMemo(() => filterList(DIGITAL, q), [q]);
  const vtu = useMemo(() => filterList(VTU, q), [q]);
  const total = digital.length + vtu.length;

  return (
    <div className="svc-hub">
      <header className="svc-hub-top">
        <button type="button" className="svc-hub-icon-btn" aria-label="Back" onClick={() => onBack?.()}>
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="svc-hub-title">All Services</h1>
        <button
          type="button"
          className="svc-hub-icon-btn"
          aria-label={searchOpen ? 'Hide search' : 'Search'}
          onClick={() => setSearchOpen((v) => !v)}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </header>

      {searchOpen && (
        <div className="svc-hub-search">
          <Search size={16} className="svc-hub-search-icon" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for services (e.g., eSIM, Cable, TV)…"
            aria-label="Search services"
          />
          {query ? (
            <button type="button" className="svc-hub-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          ) : null}
        </div>
      )}

      {total === 0 ? (
        <div className="svc-hub-empty">
          <strong>No services found</strong>
          <p>Try another keyword.</p>
        </div>
      ) : (
        <>
          {digital.length > 0 && (
            <section className="svc-hub-group">
              <h2 className="svc-hub-group-title">DIGITAL SERVICES</h2>
              <TileGrid items={digital} onOpen={open} />
            </section>
          )}
          {vtu.length > 0 && (
            <section className="svc-hub-group">
              <h2 className="svc-hub-group-title">VTU SERVICES</h2>
              <TileGrid items={vtu} onOpen={open} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
