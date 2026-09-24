'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Rocket,
  Search,
  ShieldCheck,
  Store,
  Tv,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceView } from './service-pages';
import './services-hub.css';

type FilterId = 'all' | 'verification' | 'telecoms' | 'utilities' | 'financials';

type ServiceItem = {
  id: string;
  title: string;
  filter: Exclude<FilterId, 'all'>;
  tone: string;
  icon: LucideIcon;
  service?: ServiceView;
  tags: string[];
};

type ServiceGroup = {
  id: string;
  title: string;
  filter: Exclude<FilterId, 'all'>;
  items: ServiceItem[];
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'verification', label: 'Verification' },
  { id: 'telecoms', label: 'Telecoms' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'financials', label: 'Financials' },
];

const GROUPS: ServiceGroup[] = [
  {
    id: 'verification',
    title: 'VERIFICATION & DIGITAL GROWTH',
    filter: 'verification',
    items: [
      {
        id: 'virtual-number',
        title: 'Virtual Number',
        filter: 'verification',
        tone: 'svc-blue',
        icon: Phone,
        service: 'virtual-numbers',
        tags: ['otp', 'sms', 'verification', 'whatsapp'],
      },
      {
        id: 'boost',
        title: 'Boost Account',
        filter: 'verification',
        tone: 'svc-purple',
        icon: Rocket,
        service: 'boost',
        tags: ['smm', 'instagram', 'tiktok', 'followers'],
      },
      {
        id: 'buy-logs',
        title: 'Buy Logs',
        filter: 'verification',
        tone: 'svc-amber',
        icon: Store,
        service: 'accounts',
        tags: ['accounts', 'logs', 'facebook', 'instagram'],
      },
      {
        id: 'rent-number',
        title: 'Rent Number',
        filter: 'verification',
        tone: 'svc-emerald',
        icon: PhoneCall,
        service: 'rental',
        tags: ['rental', 'dedicated', 'line'],
      },
    ],
  },
  {
    id: 'telecoms',
    title: 'TELECOMS & NETWORKING',
    filter: 'telecoms',
    items: [
      {
        id: 'data',
        title: 'Data',
        filter: 'telecoms',
        tone: 'svc-sky',
        icon: Wifi,
        service: 'data',
        tags: ['data', 'bundle', 'mtn', 'glo', 'airtel'],
      },
      {
        id: 'airtime',
        title: 'Airtime',
        filter: 'telecoms',
        tone: 'svc-teal',
        icon: PhoneForwarded,
        service: 'airtime',
        tags: ['airtime', 'topup', 'recharge'],
      },
      {
        id: 'esim',
        title: 'eSIM',
        filter: 'telecoms',
        tone: 'svc-indigo',
        icon: Globe,
        service: 'esim',
        tags: ['esim', 'roaming', 'sim'],
      },
      {
        id: 'proxies',
        title: 'Proxies',
        filter: 'telecoms',
        tone: 'svc-cyan',
        icon: ShieldCheck,
        service: 'proxies',
        tags: ['proxy', 'ip', 'residential'],
      },
    ],
  },
  {
    id: 'utilities',
    title: 'BILLS & UTILITIES',
    filter: 'utilities',
    items: [
      {
        id: 'tv',
        title: 'TV Sub / Cable',
        filter: 'utilities',
        tone: 'svc-rose',
        icon: Tv,
        service: 'tv-cable',
        tags: ['dstv', 'gotv', 'cable', 'tv'],
      },
      {
        id: 'electricity',
        title: 'Electricity',
        filter: 'utilities',
        tone: 'svc-yellow',
        icon: Zap,
        service: 'electricity',
        tags: ['electricity', 'prepaid', 'nepa', 'phcn'],
      },
      {
        id: 'exam-pin',
        title: 'Exam Pin',
        filter: 'utilities',
        tone: 'svc-green',
        icon: GraduationCap,
        service: 'exam-pin',
        tags: ['waec', 'neco', 'jamb', 'pin'],
      },
    ],
  },
  {
    id: 'financials',
    title: 'FINANCIALS & GAMING',
    filter: 'financials',
    items: [
      {
        id: 'virtual-card',
        title: 'Virtual Card',
        filter: 'financials',
        tone: 'svc-slate',
        icon: CreditCard,
        service: 'virtual-card',
        tags: ['card', 'usd', 'virtual'],
      },
      {
        id: 'gift-card',
        title: 'Gift Card',
        filter: 'financials',
        tone: 'svc-pink',
        icon: Gift,
        service: 'gift-card',
        tags: ['gift', 'trade', 'itunes', 'steam'],
      },
      {
        id: 'bet-wallet',
        title: 'Bet Wallet',
        filter: 'financials',
        tone: 'svc-orange',
        icon: Gamepad2,
        service: 'bet-wallet',
        tags: ['betting', 'sportybet', 'bet9ja'],
      },
    ],
  },
];

export function ServicesHub({
  open,
  onBack,
}: {
  open: (view: ServiceView) => void;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [searchOpen, setSearchOpen] = useState(true);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.map((group) => {
      if (filter !== 'all' && group.filter !== filter) {
        return { ...group, items: [] as ServiceItem[] };
      }
      const items = group.items.filter((item) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.tags.some((t) => t.includes(q)) ||
          group.title.toLowerCase().includes(q)
        );
      });
      return { ...group, items };
    }).filter((g) => g.items.length > 0);
  }, [query, filter]);

  const total = filteredGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="svc-hub">
      <header className="svc-hub-top">
        <button
          type="button"
          className="svc-hub-icon-btn"
          aria-label="Back"
          onClick={() => onBack?.()}
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="svc-hub-title">ALL SERVICES</h1>
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
            placeholder="Search services (e.g. eSIM, Cable TV, Proxies)…"
            aria-label="Search services"
          />
          {query ? (
            <button
              type="button"
              className="svc-hub-clear"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      )}

      <div className="svc-hub-pills" role="tablist" aria-label="Service categories">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? 'pill active' : 'pill'}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <div className="svc-hub-empty">
          <strong>No services found</strong>
          <p>Try another keyword or clear filters.</p>
        </div>
      ) : (
        filteredGroups.map((group) => (
          <section key={group.id} className="svc-hub-group">
            <h2 className="svc-hub-group-title">{group.title}</h2>
            <div className="svc-hub-grid">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="svc-hub-card"
                    onClick={() => {
                      if (item.service) open(item.service);
                    }}
                  >
                    <span className={`svc-hub-icon ${item.tone}`}>
                      <Icon size={22} strokeWidth={1.9} />
                    </span>
                    <span className="svc-hub-card-label">{item.title}</span>
                    <ArrowRight size={14} className="svc-hub-card-arrow" aria-hidden />
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
