'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  FileText,
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
  description: string;
  tone: string;
  icon: LucideIcon;
  service?: ServiceView;
  tags: string[];
};

/** NOT on Home quick actions — shown first */
const ADDITIONAL: ServiceItem[] = [
  {
    id: 'esim',
    title: 'eSIM Profiles',
    description: 'Global connectivity instantly.',
    tone: 'svc-indigo',
    icon: Globe,
    service: 'esim',
    tags: ['esim', 'roaming', 'sim', 'global'],
  },
  {
    id: 'proxies',
    title: 'Proxies (IP)',
    description: 'Secure residential & datacenter IPs.',
    tone: 'svc-cyan',
    icon: ShieldCheck,
    service: 'proxies',
    tags: ['proxy', 'ip', 'residential'],
  },
  {
    id: 'tv',
    title: 'TV Sub / Cable',
    description: 'Renew DStv, GOtv, and more.',
    tone: 'svc-rose',
    icon: Tv,
    service: 'tv-cable',
    tags: ['dstv', 'gotv', 'cable', 'tv'],
  },
  {
    id: 'electricity',
    title: 'Electricity',
    description: 'Prepaid meter top-ups fast.',
    tone: 'svc-yellow',
    icon: Zap,
    service: 'electricity',
    tags: ['electricity', 'prepaid', 'nepa', 'phcn'],
  },
  {
    id: 'exam-pin',
    title: 'Exam Pin',
    description: 'Purchase results pins effortlessly.',
    tone: 'svc-green',
    icon: GraduationCap,
    service: 'exam-pin',
    tags: ['waec', 'neco', 'jamb', 'pin'],
  },
  {
    id: 'bet-wallet',
    title: 'Bet Wallet',
    description: 'Fund betting wallets instantly.',
    tone: 'svc-orange',
    icon: Gamepad2,
    service: 'bet-wallet',
    tags: ['betting', 'sportybet', 'bet9ja'],
  },
];

/** Same set as Home quick actions — secondary section */
const POPULAR: ServiceItem[] = [
  {
    id: 'virtual-number',
    title: 'Virtual Number',
    description: 'Instant OTP verification.',
    tone: 'svc-blue',
    icon: Phone,
    service: 'virtual-numbers',
    tags: ['otp', 'sms', 'whatsapp', 'telegram'],
  },
  {
    id: 'boost',
    title: 'Boost Account',
    description: 'Social growth orders.',
    tone: 'svc-purple',
    icon: Rocket,
    service: 'boost',
    tags: ['smm', 'instagram', 'tiktok'],
  },
  {
    id: 'buy-logs',
    title: 'Buy Logs',
    description: 'Verified accounts & logs.',
    tone: 'svc-amber',
    icon: FileText,
    service: 'accounts',
    tags: ['accounts', 'logs'],
  },
  {
    id: 'rent-number',
    title: 'Rent Number',
    description: 'Dedicated rental lines.',
    tone: 'svc-emerald',
    icon: PhoneCall,
    service: 'rental',
    tags: ['rental', 'dedicated'],
  },
  {
    id: 'data',
    title: 'Data',
    description: 'Cheap mobile data bundles.',
    tone: 'svc-sky',
    icon: Wifi,
    service: 'data',
    tags: ['data', 'bundle', 'mtn', 'glo'],
  },
  {
    id: 'airtime',
    title: 'Airtime',
    description: 'Top up all networks.',
    tone: 'svc-teal',
    icon: PhoneForwarded,
    service: 'airtime',
    tags: ['airtime', 'topup'],
  },
  {
    id: 'gift-card',
    title: 'Gift Card',
    description: 'Buy & trade gift cards.',
    tone: 'svc-pink',
    icon: Gift,
    service: 'gift-card',
    tags: ['gift', 'trade'],
  },
  {
    id: 'virtual-card',
    title: 'Virtual Card',
    description: 'Online payment cards.',
    tone: 'svc-slate',
    icon: CreditCard,
    service: 'virtual-card',
    tags: ['card', 'usd', 'virtual'],
  },
];

function filterList(items: ServiceItem[], q: string) {
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some((t) => t.includes(q)),
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
  const additional = useMemo(() => filterList(ADDITIONAL, q), [q]);
  const popular = useMemo(() => filterList(POPULAR, q), [q]);
  const total = additional.length + popular.length;

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
          {additional.length > 0 && (
            <section className="svc-hub-group">
              <h2 className="svc-hub-group-title">ADDITIONAL SERVICES</h2>
              <div className="svc-hub-grid-2">
                {additional.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="svc-hub-card-lg"
                      onClick={() => item.service && open(item.service)}
                    >
                      <span className={`svc-hub-icon-lg ${item.tone}`}>
                        <Icon size={22} strokeWidth={1.9} />
                      </span>
                      <span className="svc-hub-card-body">
                        <span className="svc-hub-card-title">
                          {item.title} <ArrowRight size={14} className="svc-arrow" />
                        </span>
                        <span className="svc-hub-card-desc">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {popular.length > 0 && (
            <section className="svc-hub-group">
              <h2 className="svc-hub-group-title">POPULAR SERVICES</h2>
              <div className="svc-hub-grid-2">
                {popular.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="svc-hub-card-sm"
                      onClick={() => item.service && open(item.service)}
                    >
                      <span className={`svc-hub-icon-sm ${item.tone}`}>
                        <Icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="svc-hub-card-title-sm">
                        {item.title}
                        <ArrowRight size={13} className="svc-arrow" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
