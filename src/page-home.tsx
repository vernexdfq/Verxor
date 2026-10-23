'use client';

import {
  ArrowRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Globe,
  History,
  Phone,
  PhoneCall,
  Plus,
  Rocket,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Page } from './types';
import type { ServiceView } from './service-pages';
import type { AuthSession } from './auth/AuthFlow';
import { formatHomeBalance, formatNgn } from './lib/wallet-ui';
import { loadSessionTokens, loadSessionProfile } from './auth/session-unlock';

/** Global services only — Nigerian VTU lives on Services page */
const QUICK_ACTIONS: {
  id: string;
  title: string;
  icon: typeof Phone;
  tone: string;
  service?: ServiceView;
  soon?: boolean;
}[] = [
  { id: 'virtual-numbers', title: 'Virtual Number', icon: Phone, tone: 'qa-blue', service: 'virtual-numbers' },
  { id: 'boost', title: 'Boost Account', icon: Rocket, tone: 'qa-purple', service: 'boost' },
  { id: 'accounts', title: 'Buy Logs', icon: FileText, tone: 'qa-amber', service: 'accounts' },
  { id: 'rental', title: 'Rent Number', icon: PhoneCall, tone: 'qa-teal', service: 'rental' },
  { id: 'esim', title: 'eSIM', icon: Globe, tone: 'qa-royal', service: 'esim', soon: true },
  { id: 'proxies', title: 'Proxies', icon: ShieldCheck, tone: 'qa-green', service: 'proxies', soon: true },
  { id: 'gift', title: 'Gift Card', icon: Gift, tone: 'qa-pink', service: 'gift-card', soon: true },
  { id: 'vcard', title: 'Virtual Card', icon: CreditCard, tone: 'qa-slate', service: 'virtual-card' },
];

const PROMO_SLIDES: {
  id: string;
  badge: string;
  headline: string;
  subtext: string;
  cta: string;
  service?: ServiceView;
  accent: string;
}[] = [
  {
    id: 'virtual-number',
    badge: 'INSTANT NUMBERS',
    headline: 'Get a number in seconds',
    subtext: 'OTP for WhatsApp, Telegram & more.',
    cta: 'Get Number',
    service: 'virtual-numbers',
    accent: 'promo-accent-blue',
  },
  {
    id: 'boost-account',
    badge: 'SOCIAL GROWTH',
    headline: 'Boost your social reach',
    subtext: 'Followers, likes & views — tracked.',
    cta: 'Boost Now',
    service: 'boost',
    accent: 'promo-accent-purple',
  },
  {
    id: 'buy-logs',
    badge: 'MARKETPLACE',
    headline: 'Browse digital logs',
    subtext: 'Verified accounts with instant delivery.',
    cta: 'Explore Logs',
    service: 'accounts',
    accent: 'promo-accent-amber',
  },
  {
    id: 'rent-number',
    badge: 'NUMBER RENTAL',
    headline: 'Rent dedicated lines',
    subtext: 'Long-term SMS & call numbers.',
    cta: 'Rent Line',
    service: 'rental',
    accent: 'promo-accent-teal',
  },
  {
    id: 'esim',
    badge: 'eSIM',
    headline: 'Stay connected abroad',
    subtext: 'Digital SIM profiles for travel.',
    cta: 'Get eSIM',
    service: 'esim',
    accent: 'promo-accent-sky',
  },
  {
    id: 'proxies',
    badge: 'PROXIES',
    headline: 'Secure residential IPs',
    subtext: 'Residential & datacenter proxies.',
    cta: 'Browse Proxies',
    accent: 'promo-accent-green',
  },
  {
    id: 'gift-card',
    badge: 'GIFT CARDS',
    headline: 'Trade gift cards easily',
    subtext: 'Buy from users or redeem brands.',
    cta: 'Open Cards',
    service: 'gift-card',
    accent: 'promo-accent-pink',
  },
  {
    id: 'virtual-card',
    badge: 'VIRTUAL CARDS',
    headline: 'Pay anywhere online',
    subtext: 'Dollar & local cards for checkout.',
    cta: 'Get Card',
    service: 'virtual-card',
    accent: 'promo-accent-indigo',
  },
];

type ActivityItem = {
  id: string;
  title: string;
  amount: number;
  currency: 'NGN' | 'USD';
  createdAt: string;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMoney(amount: number, currency: 'NGN' | 'USD') {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '+';
  if (currency === 'USD') return `${sign}$${abs.toFixed(2)}`;
  return `${sign}\u20a6${formatNgn(abs)}`;
}

export function HomePage({
  go,
  openService,
  session,
}: {
  go: (page: Page) => void;
  openService: (view: ServiceView) => void;
  session?: AuthSession | null;
}) {
  const balance = formatHomeBalance(
    session?.balanceNgn ?? 0,
    session?.balanceUsd ?? 0,
    session?.homeCurrency === 'USD' ? 'USD' : 'NGN',
  );
  const wallet = { amount: balance.amount, symbol: balance.symbol };
  const [showBalance, setShowBalance] = useState(true);
  const [promoIndex, setPromoIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setPromoIndex((i) => (i + 1) % PROMO_SLIDES.length);
    }, 4500);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRecentLoading(true);
      try {
        let accessToken = loadSessionTokens()?.access_token || '';
        let userId = loadSessionProfile()?.userId || '';
        try {
          const { getSupabaseBrowser } = await import('../lib/supabase/client');
          const sb = getSupabaseBrowser();
          if (sb) {
            const { data } = await sb.auth.getSession();
            const s = data.session;
            if (s?.access_token) accessToken = s.access_token;
            if (s?.user?.id) userId = s.user.id;
          }
        } catch {
          /* ignore */
        }

        if (!userId && !accessToken) {
          if (!cancelled) {
            setRecent([]);
            setRecentLoading(false);
          }
          return;
        }

        const headers: Record<string, string> = {};
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
        const res = await fetch(`/api/v1/transactions${q}`, {
          headers,
          cache: 'no-store',
        }).catch(() => null);
        if (!res || !res.ok || cancelled) {
          if (!cancelled) setRecent([]);
          return;
        }
        const data = (await res.json()) as { items?: ActivityItem[] };
        if (!cancelled) {
          setRecent(Array.isArray(data.items) ? data.items.slice(0, 2) : []);
        }
      } catch {
        if (!cancelled) setRecent([]);
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.balanceNgn, session?.balanceUsd]);

  const promo = PROMO_SLIDES[promoIndex];

  const openPromo = () => {
    if (promo.service) openService(promo.service);
  };

  return (
    <div className="vx-home">
      <section className="vx-wallet" aria-label="Available balance">
        <div className="vx-wallet-top">
          <span className="vx-wallet-label">AVAILABLE BALANCE</span>
          <span className="vx-wallet-active">
            <i /> Active
          </span>
        </div>
        <div className="vx-wallet-amount">
          <strong>
            {showBalance ? (
              <>
                {wallet.symbol}
                {wallet.amount}
              </>
            ) : (
              `${wallet.symbol}••••••`
            )}
          </strong>
          <button
            type="button"
            className="vx-wallet-eye"
            aria-label={showBalance ? 'Hide balance' : 'Show balance'}
            onClick={() => setShowBalance((v) => !v)}
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="vx-wallet-actions">
          <button type="button" className="vx-btn-fund" onClick={() => go('fund')}>
            <Plus size={18} strokeWidth={2.5} /> Fund Wallet
          </button>
          <button type="button" className="vx-btn-history" onClick={() => go('history')}>
            <History size={16} /> History
          </button>
        </div>
      </section>

      <section className="vx-quick" aria-label="Quick actions">
        <p className="vx-section-label">QUICK ACTIONS</p>
        <div className="vx-quick-grid">
          {QUICK_ACTIONS.map(({ id, title, icon: Icon, tone, service, soon }) => (
            <button
              key={id}
              type="button"
              className="vx-quick-tile"
              aria-label={soon ? `${title} coming soon` : title}
              onClick={() => {
                if (soon) {
                  window.alert('Service coming soon');
                  return;
                }
                if (service) openService(service);
              }}
            >
              <span className={`vx-quick-icon ${tone}`} style={{ position: 'relative' }}>
                <Icon size={20} strokeWidth={1.9} />
                {soon ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -10,
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: 8,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      padding: '2px 5px',
                      borderRadius: 999,
                      lineHeight: 1.2,
                    }}
                  >
                    SOON
                  </span>
                ) : null}
              </span>
              <strong>{title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section
        className="vx-promo"
        aria-label="Promotions"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <button type="button" className={`vx-promo-card ${promo.accent}`} onClick={openPromo}>
          <img
            className="vx-promo-logo"
            src="/brand/verxor-logo.svg"
            alt="Verxor"
            width="28"
            height="28"
          />
          <div className="vx-promo-copy">
            <span className="vx-promo-badge">{promo.badge}</span>
            <strong className="vx-promo-headline">{promo.headline}</strong>
            <p className="vx-promo-sub">{promo.subtext}</p>
            <span className="vx-promo-cta">
              {promo.cta} <ArrowRight size={16} />
            </span>
          </div>
          <div className="vx-promo-glow" aria-hidden />
        </button>
        <div className="vx-promo-dots" role="tablist" aria-label="Promo slides">
          {PROMO_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === promoIndex}
              className={i === promoIndex ? 'dot active' : 'dot'}
              onClick={() => setPromoIndex(i)}
            />
          ))}
        </div>
      </section>

      <section className="vx-activity" aria-label="Recent activity">
        <div className="vx-activity-head">
          <p className="vx-section-label" style={{ margin: 0 }}>
            RECENT ACTIVITY
          </p>
          <button type="button" className="vx-view-all" onClick={() => go('history')}>
            View all →
          </button>
        </div>

        {recentLoading ? (
          <div className="vx-activity-empty">
            <div className="vx-activity-icon">
              <Clock3 size={18} />
            </div>
            <div>
              <strong>Loading…</strong>
              <p>Fetching recent wallet activity.</p>
            </div>
          </div>
        ) : recent.length === 0 ? (
          <div className="vx-activity-empty">
            <div className="vx-activity-icon">
              <Clock3 size={18} />
            </div>
            <div>
              <strong>No recent activity</strong>
              <p>Wallet and order activity will show here.</p>
            </div>
          </div>
        ) : (
          <ul className="vx-activity-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {recent.map((tx) => (
              <li
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#fff',
                  borderRadius: 14,
                  border: '1px solid #E8EEF5',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: tx.amount >= 0 ? '#ECFDF5' : '#F5F3FF',
                    display: 'grid',
                    placeItems: 'center',
                    color: tx.amount >= 0 ? '#059669' : '#7C3AED',
                    flexShrink: 0,
                  }}
                >
                  {tx.amount >= 0 ? <Wallet size={18} /> : <Phone size={18} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tx.title}
                  </strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{formatWhen(tx.createdAt)}</span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 14,
                      color: tx.amount >= 0 ? '#059669' : '#dc2626',
                    }}
                  >
                    {formatMoney(tx.amount, tx.currency)}
                  </strong>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#059669',
                      background: '#ECFDF5',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    Success
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
