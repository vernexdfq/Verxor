'use client';

/**
 * Rent-for-SMS — Grade 1 Fintech build for Verxor.
 *
 * Screen flows:
 *  - Home: Compact Top Bar, Promo-Strip Carousel, Rental Type Selection (Service vs General), My Rentals preview
 *  - Service Flow: Compact Top Bar, Context Promo, Order a Rental card (One-time/Renewable, Service selector, Durations), My Rentals
 *  - History: Complete Rental History & message inspection
 *  - Service Picker: Bottom sheet with instant search, counts, and fast selection
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Hash,
  History as HistoryIcon,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './rental-page.css';

/* ---------------- types ---------------- */

export type RentalType = 'service' | 'general';
export type Mode = 'one-time' | 'renewable';
export type Screen = 'home' | 'flow' | 'history';

export type Rental = {
  id: string;
  reservationId: string;
  serviceName: string;
  duration: string;
  number: string;
  chargedNgn: number;
  status: string;
  endsAt: string | null;
  createdAt: string;
};

export interface PromoSlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  action?: 'picker' | 'history' | 'info';
  image: string;
}

export const RENTAL_PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'promo-1',
    badge: 'NON-VOIP REAL CARRIER',
    title: 'Dedicated US SMS Numbers',
    subtitle: 'Private carrier lines for WhatsApp, Telegram, Google, PayPal & 2,200+ services.',
    ctaText: 'Select Service',
    action: 'picker',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-2',
    badge: 'FLEXIBLE DURATION',
    title: 'One-Time or Renewable Leases',
    subtitle: 'Keep your dedicated number from 1 to 365 days. Unlimited SMS with no message drops.',
    ctaText: 'View Options',
    action: 'info',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-3',
    badge: 'PROMO SLOT',
    title: 'High-Impact Advertisement Strip',
    subtitle: 'A dedicated line for the services you use, with flexible rental periods.',
    ctaText: 'Learn More',
    action: 'info',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85',
  },
];

const MODES: { id: Mode; label: string; hint: string; icon: typeof Flame }[] = [
  { id: 'one-time', label: 'One-time', hint: 'Fixed duration', icon: Flame },
  { id: 'renewable', label: 'Renewable', hint: 'Renew manually', icon: RefreshCw },
];

const DURATION_OPTIONS = [
  { id: '1d', label: '1 Day', days: 1 },
  { id: '7d', label: '7 Days', days: 7 },
  { id: '15d', label: '15 Days', days: 15 },
  { id: '30d', label: '30 Days', days: 30 },
  { id: '90d', label: '90 Days', days: 90 },
  { id: '180d', label: '180 Days', days: 180 },
  { id: '365d', label: '1 Year', days: 365 },
];

const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isLive = (r: Rental) => (r.endsAt ? new Date(r.endsAt).getTime() > Date.now() : r.status === 'active');

/* ---------------- component ---------------- */

export function RentalPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('home');
  const [type, setType] = useState<RentalType>('service');

  /* flow state */
  const [mode, setMode] = useState<Mode>('one-time');
  const [service, setService] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>('30d');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* promo carousel state */
  const [promoIdx, setPromoIdx] = useState(0);

  /* live service list */
  const [services, setServices] = useState<string[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  /* my rentals */
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rentalsLoaded, setRentalsLoaded] = useState(false);

  /* Auto-advance promo carousel */
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIdx((prev) => (prev + 1) % RENTAL_PROMO_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = loadSessionTokens()?.access_token || session?.accessToken || '';
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        const { data: sess } = await sb.auth.getSession();
        if (sess.session?.access_token) headers.Authorization = `Bearer ${sess.session.access_token}`;
      }
    } catch {
      /* optional */
    }
    if (!headers.Authorization && token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [session]);

  /* load service list once */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/v1/rent-sms/services', { cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; services?: string[]; error?: string };
        if (!alive) return;
        if (res.ok && data.ok && data.services) {
          setServices(data.services);
        } else {
          setServicesError(data.error || 'Could not load the service list right now.');
          setIsSetup(res.status === 503 || /going live|setup/i.test(data.error || ''));
        }
      } catch {
        if (alive) setServicesError('Network error while loading the service list.');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* load my rentals */
  const loadRentals = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const userId = session?.userId || loadSessionProfile()?.userId || '';
      const url = userId
        ? `/api/v1/rent-sms/numbers?userId=${encodeURIComponent(userId)}`
        : '/api/v1/rent-sms/numbers';
      const res = await fetch(url, { headers, cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; rentals?: Rental[] };
      if (res.ok && data.ok) setRentals(data.rentals || []);
    } catch {
      /* best-effort */
    } finally {
      setRentalsLoaded(true);
    }
  }, [authHeaders, session]);

  useEffect(() => {
    void loadRentals();
  }, [loadRentals]);

  const filtered = useMemo(() => {
    if (!services) return [];
    const q = query.trim().toLowerCase();
    return q ? services.filter((s) => s.toLowerCase().includes(q)) : services;
  }, [services, query]);

  const liveRentals = useMemo(() => rentals.filter(isLive), [rentals]);
  const liveCount = liveRentals.length;

  const openType = (t: RentalType) => {
    setType(t);
    setService(null);
    setMode('one-time');
    setScreen('flow');
  };

  const handleBack = () => {
    if (screen === 'flow') {
      setScreen('home');
    } else if (screen === 'history') {
      setScreen('home');
    } else {
      onBack();
    }
  };

  const activePromo = RENTAL_PROMO_SLIDES[promoIdx];

  const handlePromoCta = (slide: PromoSlide) => {
    if (slide.action === 'picker') {
      if (screen !== 'flow') setScreen('flow');
      setPickerOpen(true);
    } else if (slide.action === 'history') {
      setScreen('history');
    } else {
      if (screen !== 'flow') setScreen('flow');
    }
  };

  return (
    <div className="rsm-page">
      {/* ----------------- COMPACT TOP BAR ----------------- */}
      <header className="rsm-topbar">
        <button
          type="button"
          className="rsm-topbar-btn"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="rsm-topbar-center">
          <h1 className="rsm-topbar-title">
            {screen === 'history'
              ? 'Rental History'
              : screen === 'flow'
              ? type === 'service' ? 'Service Rental' : 'General Rental'
              : 'Rent a Number'}
          </h1>
          <span className="rsm-topbar-sub">
            {screen === 'history'
              ? 'Numbers, logs & active leases'
              : screen === 'flow'
              ? 'Dedicated US non-VoIP lines'
              : 'US non-VoIP SMS verification'}
          </span>
        </div>

        <div className="rsm-topbar-right">
          {session?.balanceNgn !== undefined && (
            <button
              type="button"
              className="rsm-topbar-bal"
              onClick={onFund}
              title="Wallet balance — click to fund"
            >
              <Wallet size={12} />
              <span>₦{session.balanceNgn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </button>
          )}

          <button
            type="button"
            className={`rsm-topbar-btn ${screen === 'history' ? 'active' : ''}`}
            onClick={() => setScreen(screen === 'history' ? 'home' : 'history')}
            aria-label="Rental History"
            title="Rental History"
          >
            <HistoryIcon size={17} />
            {liveCount > 0 && <span className="rsm-badge-dot" />}
          </button>
        </div>
      </header>

      {/* ----------------- HOME SCREEN ----------------- */}
      {screen === 'home' ? (
        <main className="rsm-body">
          {/* COMPACT PROMO STRIP PLACEHOLDER */}
          <section className="rsm-promo-strip" data-promo-slide={activePromo.id} style={{ backgroundImage: `linear-gradient(90deg, rgba(7,18,42,.92) 0%, rgba(7,18,42,.76) 52%, rgba(7,18,42,.30) 100%), url("${activePromo.image}")` }} aria-label="Promotion banner">
            <div className="rsm-promo-content">
              <div className="rsm-promo-badge">
                <Sparkles size={11} />
                <span>{activePromo.badge}</span>
              </div>
              <h2 className="rsm-promo-title">{activePromo.title}</h2>
              <p className="rsm-promo-desc">{activePromo.subtitle}</p>
              {activePromo.ctaText && (
                <button
                  type="button"
                  className="rsm-promo-cta"
                  onClick={() => handlePromoCta(activePromo)}
                >
                  {activePromo.ctaText} <ArrowRight size={12} />
                </button>
              )}
            </div>

            <div className="rsm-promo-dots">
              {RENTAL_PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === promoIdx ? 'active' : ''}
                  onClick={() => setPromoIdx(i)}
                  aria-label={`Show slide ${i + 1}`}
                />
              ))}
            </div>
          </section>

          {/* RENTAL TYPES */}
          <div className="rsm-section-head">
            <h3>Choose a rental type</h3>
            <span className="rsm-section-count">2 routes available</span>
          </div>

          <section className="rsm-types-grid">
            <button
              type="button"
              className="rsm-type-card"
              onClick={() => openType('service')}
            >
              <div className="rsm-type-icon-box blue">
                <Hash size={20} />
              </div>
              <div className="rsm-type-details">
                <div className="rsm-type-title-row">
                  <strong>Service Rental</strong>
                  <span className="rsm-status-chip online">
                    <Check size={11} /> Available
                  </span>
                </div>
                <p>Choose the app or service first, then rent a dedicated US number for the duration you need.</p>
              </div>
              <div className="rsm-type-arrow">
                <ChevronRight size={18} />
              </div>
            </button>

            <button
              type="button"
              className="rsm-type-card disabled"
              disabled
            >
              <div className="rsm-type-icon-box gray">
                <CalendarClock size={20} />
              </div>
              <div className="rsm-type-details">
                <div className="rsm-type-title-row">
                  <strong>General Rental</strong>
                  <span className="rsm-status-chip pending">
                    <Clock size={11} /> Coming soon
                  </span>
                </div>
                <p>One general-purpose US number for 1, 7, 30, 90, or 365 days. No specific service selection required.</p>
              </div>
              <div className="rsm-type-arrow">
                <ChevronRight size={18} />
              </div>
            </button>
          </section>

          {/* MY RENTALS PREVIEW */}
          <section className="rsm-mine-card">
            <div className="rsm-mine-header">
              <div className="rsm-mine-title-wrap">
                <Smartphone size={16} />
                <h3>My Rentals</h3>
                {liveCount > 0 && <span className="rsm-counter-pill">{liveCount} active</span>}
              </div>
              <button
                type="button"
                className="rsm-view-all-link"
                onClick={() => setScreen('history')}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {liveCount > 0 ? (
              <div className="rsm-mine-list">
                {liveRentals.slice(0, 3).map((r) => (
                  <div className="rsm-mine-item" key={r.id}>
                    <div className="rsm-mine-item-left">
                      <span className="rsm-mine-phone">
                        <Hash size={13} /> {r.number || 'Pending allocation'}
                      </span>
                      <span className="rsm-mine-sub">{r.serviceName} · {r.duration}</span>
                    </div>
                    <span className="rsm-status-chip online">Active</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rsm-mine-empty">
                <p>{rentalsLoaded ? 'No active rentals yet. Order your first number above.' : 'Loading rentals…'}</p>
              </div>
            )}
          </section>

          {/* HISTORY SHORTCUT LINK */}
          <button
            type="button"
            className="rsm-history-banner-btn"
            onClick={() => setScreen('history')}
          >
            <div className="rsm-history-icon-circle">
              <HistoryIcon size={16} />
            </div>
            <div className="rsm-history-text">
              <strong>Rental History &amp; SMS Logs</strong>
              <small>View past numbers, received SMS codes, and transaction receipts.</small>
            </div>
            <ChevronRight size={17} className="rsm-muted-chevron" />
          </button>
        </main>
      ) : null}

      {/* ----------------- SERVICE RENTAL FLOW ----------------- */}
      {screen === 'flow' ? (
        <main className="rsm-body">
          {/* COMPACT PROMO STRIP IN FLOW */}
          <section className="rsm-promo-strip compact" data-promo-slide={activePromo.id} style={{ backgroundImage: `linear-gradient(90deg, rgba(7,18,42,.92) 0%, rgba(7,18,42,.72) 58%, rgba(7,18,42,.24) 100%), url("${activePromo.image}")` }} aria-label="Promotion banner">
            <div className="rsm-promo-content">
              <div className="rsm-promo-badge">
                <Sparkles size={11} />
                <span>{activePromo.badge}</span>
              </div>
              <h2 className="rsm-promo-title">{activePromo.title}</h2>
              <p className="rsm-promo-desc">{activePromo.subtitle}</p>
            </div>
            <div className="rsm-promo-dots">
              {RENTAL_PROMO_SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className={i === promoIdx ? 'active' : ''}
                  onClick={() => setPromoIdx(i)}
                  aria-label={`Show slide ${i + 1}`}
                />
              ))}
            </div>
          </section>

          {/* BACK BREADCRUMB */}
          <div className="rsm-breadcrumb-bar">
            <button
              type="button"
              className="rsm-breadcrumb-btn"
              onClick={() => setScreen('home')}
            >
              <ArrowLeft size={14} /> Back to rental types
            </button>
            <span className="rsm-breadcrumb-tag">
              {type === 'service' ? 'SERVICE RENTAL' : 'GENERAL RENTAL'}
            </span>
          </div>

          {/* ORDER A RENTAL CARD */}
          <section className="rsm-order-card">
            <div className="rsm-order-card-header">
              <h3>Order a Rental</h3>
              <p>Configure your rental duration and choose an SMS service.</p>
            </div>

            {/* MODE SWITCHER */}
            <div className="rsm-modes-toggle">
              {MODES.map(({ id, label, hint, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  className={`rsm-mode-tab ${mode === id ? 'active' : ''}`}
                  onClick={() => setMode(id)}
                >
                  <div className="rsm-mode-tab-head">
                    <Icon size={15} />
                    <strong>{label}</strong>
                  </div>
                  <small>{hint}</small>
                </button>
              ))}
            </div>

            {/* SERVICE SELECTION FIELD */}
            <div className="rsm-form-field">
              <div className="rsm-field-top">
                <label className="rsm-label">SERVICE</label>
                {services ? (
                  <span className="rsm-field-count-chip">
                    {services.length.toLocaleString()} available
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                className={`rsm-service-trigger ${service ? 'selected' : ''}`}
                onClick={() => setPickerOpen(true)}
              >
                <div className="rsm-service-trigger-left">
                  <div className="rsm-service-icon-box">
                    {service ? <Hash size={16} /> : <Search size={16} />}
                  </div>
                  <div className="rsm-service-trigger-copy">
                    {service ? (
                      <>
                        <strong className="rsm-selected-name">{service}</strong>
                        <small>US non-VoIP route</small>
                      </>
                    ) : (
                      <>
                        <strong className="rsm-placeholder-name">Search &amp; select a service</strong>
                        <small>Tap to view supported apps</small>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown size={18} className="rsm-service-chevron" />
              </button>
            </div>

            {/* DURATION SELECTION */}
            <div className="rsm-form-field">
              <div className="rsm-field-top">
                <label className="rsm-label">DURATION</label>
                <span className="rsm-field-pill-note">
                  <Info size={11} /> Prices being finalized
                </span>
              </div>

              <div className="rsm-durations-grid">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    className={`rsm-duration-pill ${selectedDuration === d.id ? 'active' : ''}`}
                    onClick={() => setSelectedDuration(d.id)}
                  >
                    <span className="rsm-dur-label">{d.label}</span>
                    <span className="rsm-dur-state">TBD</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FINTECH ASSURANCE NOTE */}
            <div className="rsm-assurance-callout">
              <ShieldCheck size={18} />
              <div className="rsm-callout-text">
                <strong>Dedicated &amp; Private Number</strong>
                <p>
                  Rentals give you a dedicated US number for your chosen duration.
                  Receive unlimited SMS verification codes with messages stored securely in your Rental History.
                </p>
              </div>
            </div>

            {/* ACTION CTA BUTTON */}
            <div className="rsm-order-footer">
              <button
                type="button"
                className="rsm-order-cta-disabled"
                disabled
              >
                {service ? 'Pricing being finalized — Checkout opening shortly' : 'Select a service to proceed'}
              </button>
            </div>
          </section>

          {/* MY RENTALS SECTION IN FLOW */}
          <section className="rsm-mine-card">
            <div className="rsm-mine-header">
              <div className="rsm-mine-title-wrap">
                <Smartphone size={16} />
                <h3>My Rentals</h3>
                {liveCount > 0 && <span className="rsm-counter-pill">{liveCount} active</span>}
              </div>
              <button
                type="button"
                className="rsm-view-all-link"
                onClick={() => setScreen('history')}
              >
                View all <ArrowRight size={13} />
              </button>
            </div>

            {liveCount > 0 ? (
              <div className="rsm-mine-list">
                {liveRentals.slice(0, 2).map((r) => (
                  <div className="rsm-mine-item" key={r.id}>
                    <div className="rsm-mine-item-left">
                      <span className="rsm-mine-phone">
                        <Hash size={13} /> {r.number || 'Pending allocation'}
                      </span>
                      <span className="rsm-mine-sub">{r.serviceName} · {r.duration}</span>
                    </div>
                    <span className="rsm-status-chip online">Active</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rsm-mine-empty">
                <p>{rentalsLoaded ? 'No active rentals yet. Select a service above to get started.' : 'Loading rentals…'}</p>
              </div>
            )}
          </section>
        </main>
      ) : null}

      {/* ----------------- RENTAL HISTORY SCREEN ----------------- */}
      {screen === 'history' ? (
        <main className="rsm-body">
          <div className="rsm-breadcrumb-bar">
            <button
              type="button"
              className="rsm-breadcrumb-btn"
              onClick={() => setScreen('home')}
            >
              <ArrowLeft size={14} /> Back to rentals
            </button>
            <span className="rsm-breadcrumb-tag">RENTAL HISTORY</span>
          </div>

          <div className="rsm-section-head">
            <h3>Rental History</h3>
            <span className="rsm-section-count">{rentals.length} total records</span>
          </div>

          {rentals.length ? (
            <section className="rsm-history-list">
              {rentals.map((r) => (
                <div className="rsm-history-card" key={r.id}>
                  <div className="rsm-history-card-icon">
                    <Hash size={17} />
                  </div>
                  <div className="rsm-history-card-details">
                    <div className="rsm-history-card-row">
                      <strong className="rsm-history-phone">{r.number || 'Number pending'}</strong>
                      <span className={`rsm-status-chip ${isLive(r) ? 'online' : 'ended'}`}>
                        {isLive(r) ? 'Active' : 'Ended'}
                      </span>
                    </div>
                    <div className="rsm-history-meta-sub">
                      <span>{r.serviceName}</span>
                      <span>•</span>
                      <span>{r.duration}</span>
                      <span>•</span>
                      <span>From {fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="rsm-history-empty-card">
              <div className="rsm-empty-icon-wrap">
                <HistoryIcon size={28} />
              </div>
              <h4>No rentals recorded</h4>
              <p>When you rent a dedicated number, your lease details, expiration dates, and incoming SMS codes appear here.</p>
              <button
                type="button"
                className="rsm-primary-btn"
                onClick={() => openType('service')}
              >
                Order a Service Rental <ArrowRight size={14} />
              </button>
            </div>
          )}
        </main>
      ) : null}

      {/* ----------------- SERVICE PICKER BOTTOM SHEET ----------------- */}
      {pickerOpen ? (
        <div className="rsm-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="rsm-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Select Service"
          >
            {/* DRAG HANDLE */}
            <div className="rsm-modal-handle" />

            {/* MODAL HEADER */}
            <div className="rsm-modal-head">
              <div className="rsm-modal-head-titles">
                <strong>Select Service</strong>
                <small>Choose an app for dedicated SMS verification</small>
              </div>
              <button
                type="button"
                className="rsm-modal-close-btn"
                onClick={() => setPickerOpen(false)}
                aria-label="Close service selector"
              >
                <X size={18} />
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="rsm-modal-search-wrapper">
              <div className="rsm-modal-search-bar">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search app or service (e.g. WhatsApp, Google, Telegram)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search service"
                  autoFocus
                />
                {query ? (
                  <button
                    type="button"
                    className="rsm-search-clear-btn"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* SERVICE COUNT INDICATOR */}
            {services && !servicesError ? (
              <div className="rsm-modal-count-row">
                <span>
                  Showing {filtered.length.toLocaleString()} of {services.length.toLocaleString()}{' '}
                  {mode === 'one-time' ? 'one-time' : 'renewable'} services
                </span>
              </div>
            ) : null}

            {/* SERVICE LIST */}
            <div className="rsm-modal-body">
              {services === null && !servicesError ? (
                <div className="rsm-modal-status-box">
                  <Loader2 size={20} className="rsm-spin-anim" />
                  <p>Loading available services…</p>
                </div>
              ) : servicesError ? (
                <div className={`rsm-modal-status-box ${isSetup ? 'setup' : 'error'}`}>
                  {isSetup ? <Clock size={20} /> : <AlertCircle size={20} />}
                  <p>{isSetup ? 'Provider setup is finalizing — live services will appear shortly.' : servicesError}</p>
                </div>
              ) : (
                <ul className="rsm-service-list">
                  {filtered.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className={`rsm-service-item-btn ${service === s ? 'active' : ''}`}
                        onClick={() => {
                          setService(s);
                          setPickerOpen(false);
                          setQuery('');
                        }}
                      >
                        <div className="rsm-service-item-left">
                          <span className="rsm-service-item-icon">
                            <Hash size={14} />
                          </span>
                          <span className="rsm-service-item-name">{s}</span>
                        </div>
                        {service === s ? (
                          <span className="rsm-service-selected-check">
                            <Check size={16} />
                          </span>
                        ) : (
                          <ChevronRight size={15} className="rsm-service-item-chevron" />
                        )}
                      </button>
                    </li>
                  ))}
                  {!filtered.length ? (
                    <li className="rsm-service-empty-item">
                      <p>No service matches “{query}”.</p>
                      <button
                        type="button"
                        className="rsm-clear-query-btn"
                        onClick={() => setQuery('')}
                      >
                        Reset search
                      </button>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
