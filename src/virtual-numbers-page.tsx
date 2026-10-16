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
import type { AuthSession } from './auth/AuthFlow';
import {
  type CustomerNumberOrder,
  type Pool,
  type Service,
  type Country,
  type ServiceCategory,
  type PriceOption,
  type Step,
  SERVER1_POOLS,
  SERVER2_POOLS,
  USA_COUNTRY,
  WORLDWIDE_COUNTRIES,
  CATEGORIES,
  PROMO_SLIDES,
  LIFETIME_MS,
  CANCEL_LOCK_MS,
  formatNgn,
  formatUsd,
  formatTimer,
} from './virtual-numbers-data';
import { ServiceLogo, PoolCard } from './virtual-numbers-components';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';

export type { CustomerNumberOrder };

/* ── Cache helpers (localStorage + TTL) ───────────────────────────────────── */
const SVC_TTL_MS = 30 * 60 * 1000; // 30 min
const CTR_TTL_MS = 15 * 60 * 1000; // 15 min

function readCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: T };
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode */
  }
}

function mapServices(raw: any[]): Service[] {
  return (raw || []).map((s: any) => ({
    id: s.code || s.id,
    name: s.name,
    category: (s.category || 'other') as ServiceCategory,
  }));
}

export function VirtualNumbersPage({
  onBack,
  onOpenNotifications: _onOpenNotifications,
  orders: externalOrders = [],
  session,
}: {
  onBack: () => void;
  onOpenNotifications: () => void;
  orders?: CustomerNumberOrder[];
  session?: AuthSession | null;
}) {
  const [step, setStep] = useState<Step>('pools');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [category, setCategory] = useState<ServiceCategory>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [liveCountries, setLiveCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const balance = session?.balanceNgn ?? 0;
  const [localOrders, setLocalOrders] = useState<CustomerNumberOrder[]>(() => {
    if (externalOrders && externalOrders.length > 0) return externalOrders;
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('verxor-vn-orders');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CustomerNumberOrder[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [inboxOrder, setInboxOrder] = useState<CustomerNumberOrder | null>(null);
  const [priceSheet, setPriceSheet] = useState<{
    open: boolean;
    options: PriceOption[];
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [confirmSheet, setConfirmSheet] = useState<{
    option: PriceOption;
    service: Service;
    country: Country;
    pool: Pool;
  } | null>(null);
  const [, setTick] = useState(0);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('verxor-vn-orders', JSON.stringify(localOrders));
    } catch {
      /* ignore */
    }
  }, [localOrders]);

  useEffect(() => {
    const t = setInterval(() => setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const allPools = [...SERVER1_POOLS, ...SERVER2_POOLS];
    allPools.forEach((pool) => {
      const key = `verxor-vn-svc-v2-${pool.id}`;
      if (readCache<Service[]>(key, SVC_TTL_MS)) return;
      void fetch(`/api/v1/catalog?mode=services&pool=${encodeURIComponent(pool.id)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) writeCache(key, mapServices(data.services || []));
        })
        .catch(() => {});
    });
  }, []);

  // Auto-cancel + refund when the big lifetime timer hits 0
  useEffect(() => {
    const now = Date.now();
    const expired = localOrders.filter((o) => o.status === 'waiting' && o.expiresAt <= now);
    if (expired.length === 0) return;
    setLocalOrders((prev) =>
      prev.filter((o) => !(o.status === 'waiting' && o.expiresAt <= Date.now())),
    );
    for (const o of expired) {
      void (async () => {
        try {
          let accessToken = loadSessionTokens()?.access_token || '';
          let userId = loadSessionProfile()?.userId || '';
          try {
            const { getSupabaseBrowser } = await import('../lib/supabase/client');
            const sb = getSupabaseBrowser();
            if (sb) {
              const { data: sess } = await sb.auth.getSession();
              if (sess.session?.access_token) accessToken = sess.session.access_token;
              if (sess.session?.user?.id) userId = sess.session.user.id;
            }
          } catch {
            /* ignore */
          }
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
          await fetch('/api/v1/numbers/cancel', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              providerOrderId: o.providerOrderId || o.id,
              orderId: o.id,
              priceNgn: o.priceNgn,
              userId: userId || undefined,
              provider: o.provider || 'grizzly',
            }),
          });
        } catch {
          /* ignore */
        }
      })();
    }
  }, [localOrders]);

  const visibleOrders = useMemo(
    () =>
      localOrders
        .filter((o) => o.status === 'waiting' || o.status === 'received' || o.status === 'completed')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [localOrders],
  );

  /* Permanent strip: always the most recent buy, any status */
  const previewOrders = useMemo(() => {
    if (localOrders.length === 0) return [];
    const sorted = [...localOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted.slice(0, 1);
  }, [localOrders]);

  // NOTE: remainder of file continues - this is PARTIAL RECOVERY
  // Full file will be restored in next commit
  return (
    <div className="vn-page">
      <header className="vn-topbar">
        <button type="button" className="vn-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="vn-topbar-copy">
          <strong>Virtual Numbers</strong>
          <small>Loading full page…</small>
        </div>
      </header>
      <div className="vn-empty">Page update in progress — please refresh in a moment.</div>
    </div>
  );
}
