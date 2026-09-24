'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
  description: string;
  filter: Exclude<FilterId, 'all'>;
  tone: string;
  icon: LucideIcon;
  service: ServiceView;
  tags: string[];
};

type ServiceGroup = {
  id: 'more' | 'popular';
  title: string;
  subtitle: string;
  items: ServiceItem[];
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verification', label: 'Verification' },
  { id: 'telecoms', label: 'Telecoms' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'financials', label: 'Financials' },
];

const GROUPS: ServiceGroup[] = [
  {
    id: 'more',
    title: 'MORE SERVICES',
    subtitle: 'Explore services beyond your Home quick actions.',
    items: [
      {
        id: 'esim',
        title: 'eSIM Profiles',
        description: 'Global mobile connectivity, instantly.',
        filter: 'telecoms',
        tone: 'svc-indigo',
        icon: Globe,
        service: 'esim',
        tags: ['esim', 'roaming', 'sim', 'global'],
      },
      {
        id: 'proxies',
        title: 'Proxies (IP)',
        description: 'Private IP access for supported use cases.',
        filter: 'telecoms',
        tone: 'svc-cyan',
        icon: ShieldCheck,
        service: 'proxies',
        tags: ['proxy', 'proxies', 'ip', 'residential'],
      },
      {
        id: 'tv-cable',
        title: 'TV Sub / Cable',
        description: 'Renew supported TV subscriptions with ease.',
        filter: 'utilities',
        tone: 'svc-rose',
        icon: Tv,
        service: 'tv-cable',
        tags: ['dstv', 'gotv', 'cable', 'tv', 'subscription'],
      },
      {
        id: 'electricity',
        title: 'Electricity',
        description: 'Pay supported prepaid electricity meters.',
        filter: 'utilities',
        tone: 'svc-yellow',
        icon: Zap,
        service: 'electricity',
        tags: ['electricity', 'prepaid', 'meter', 'phcn'],
      },
      {
        id: 'exam-pin',
        title: 'Exam Pin',
        description: 'Purchase supported examination pins.',
        filter: 'utilities',
        tone: 'svc-green',
        icon: GraduationCap,
        service: 'exam-pin',
        tags: ['waec', 'neco', 'jamb', 'exam', 'pin'],
      },
      {
        id: 'bet-wallet',
        title: 'Bet Wallet',
        description: 'Fund supported betting wallets securely.',
        filter: 'financials',
        tone: 'svc-orange',
        icon: Gamepad2,
        service: 'bet-wallet',
        tags: ['betting', 'sportybet', 'bet9ja', 'wallet'],
      },
    ],
  },
  {
    id: 'popular',
    title: 'POPULAR SERVICES',
    subtitle: 'Your most-used Verxor services.',
    items: [
      {
        id: 'virtual-number',
        title: 'Virtual Number',
        description: 'Get an OTP-ready number for supported services.',
        filter: 'verification',
        tone: 'svc-blue',
        icon: Phone,
        service: 'virtual-numbers',
        tags: ['otp', 'sms', 'verification', 'whatsapp', 'number'],
      },
      {
        id: 'boost-account',
        title: 'Boost Account',
        description: 'Order social growth services in a few taps.',
        filter: 'verification',
        tone: 'svc-purple',
        icon: Rocket,
        service: 'boost',
        tags: ['smm', 'instagram', 'tiktok', 'followers', 'likes'],
      },
      {
        id: 'buy-logs',
        title: 'Buy Logs',
        description: 'Browse available digital account inventory.',
        filter: 'verification',
        tone: 'svc-amber',
        icon: Store,
        service: 'accounts',
        tags: ['accounts', 'logs', 'facebook', 'instagram', 'inventory'],
      },
      {
        id: 'rent-number',
        title: 'Rent Number',
        description: 'Keep a dedicated number active for longer.',
        filter: 'verification',
        tone: 'svc-emerald',
        icon: PhoneCall,
        service: 'rental',
        tags: ['rental', 'dedicated', 'line', 'sms'],
      },
      {
        id: 'data',
        title: 'Data',
        description: 'Buy mobile data bundles for supported networks.',
        filter: 'telecoms',
        tone: 'svc-sky',
        icon: Wifi,
        service: 'data',
        tags: ['data', 'bundle', 'mtn', 'glo', 'airtel'],
      },
      {
        id: 'airtime',
        title: 'Airtime',
        description: 'Top up supported networks instantly.',
        filter: 'telecoms',
        tone: 'svc-teal',
        icon: PhoneForwarded,
        service: 'airtime',
        tags: ['airtime', 'topup', 'recharge', 'network'],
      },
      {
        id: 'gift-card',
        title: 'Gift Card',
        description: 'Access supported gift-card products and flows.',
        filter: 'financials',
        tone: 'svc-pink',
        icon: Gift,
        service: 'gift-card',
        tags: ['gift', 'cards', 'trade', 'itunes', 'steam'],
      },
      {
        id: 'virtual-card',
        title: 'Virtual Card',
        description: 'Create and manage supported virtual cards.',
        filter: 'financials',
        tone: 'svc-slate',
        icon: CreditCard,
        service: 'virtual-card',
        tags: ['card', 'usd', 'virtual', 'payments'],
      },
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98 },
};

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

    return GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const matchesFilter = filter === 'all' || item.filter === filter;
        const matchesQuery =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.includes(q));

        return matchesFilter && matchesQuery;
      }),
    })).filter((group) => group.items.length > 0);
  }, [query, filter]);

  const total = filteredGroups.reduce((count, group) => count + group.items.length, 0);

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

        <div className="svc-hub-heading">
          <h1 className="svc-hub-title">ALL SERVICES</h1>
          <p>Everything available on Verxor</p>
        </div>

        <button
          type="button"
          className="svc-hub-icon-btn"
          aria-label={searchOpen ? 'Hide search' : 'Search services'}
          onClick={() => setSearchOpen((value) => !value)}
        >
          {searchOpen ? <X size={18} /> : <Search size={18} />}
        </button>
      </header>

      <div className="svc-hub-sticky">
        {searchOpen && (
          <div className="svc-hub-search">
            <Search size={17} className="svc-hub-search-icon" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services, eSIM, cable, electricity…"
              aria-label="Search all services"
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
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={filter === item.id ? 'pill active' : 'pill'}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <motion.div
          className="svc-hub-empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Search size={22} />
          <strong>No services found</strong>
          <p>Try another keyword or clear your filters.</p>
          <button
            type="button"
            className="svc-hub-reset"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Reset search
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filteredGroups.map((group) => (
            <motion.section
              key={group.id}
              className="svc-hub-group"
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="svc-hub-group-heading">
                <div>
                  <h2 className="svc-hub-group-title">{group.title}</h2>
                  <p>{group.subtitle}</p>
                </div>
                <span>{group.items.length}</span>
              </div>

              <motion.div className="svc-hub-grid" layout>
                <AnimatePresence mode="popLayout">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        className="svc-hub-card"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        transition={{ duration: 0.18 }}
                        onClick={() => open(item.service)}
                        whileTap={{ scale: 0.985 }}
                      >
                        <span className={`svc-hub-icon ${item.tone}`}>
                          <Icon size={24} strokeWidth={1.9} />
                        </span>

                        <span className="svc-hub-card-copy">
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                        </span>

                        <span className="svc-hub-card-arrow" aria-hidden>
                          <ArrowRight size={16} strokeWidth={2.2} />
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
