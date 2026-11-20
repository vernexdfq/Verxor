'use client';

/**
 * Rent-for-SMS — fresh Verxor build (UI-first).
 *
 * Step 1 (this file): entry screen + Service Rental flow + Rental History,
 * all UI. Prices are finalized later — the duration grid shows an honest
 * "prices being finalized" state, checkout stays disabled until then.
 * No fake data anywhere: service list comes from the live endpoint once the
 * provider keys are set; until then we show the real setup state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Hash,
  History as HistoryIcon,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './rental-page.css';

/* ---------------- types ---------------- */

type RentalType = 'service' | 'general';
type Mode = 'one-time' | 'renewable';
type Screen = 'home' | 'flow' | 'history';

type Rental = {
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

const MODES: { id: Mode; label: string; hint: string; icon: typeof Flame }[] = [
  { id: 'one-time', label: 'One-time', hint: 'Fixed duration', icon: Flame },
  { id: 'renewable', label: 'Renewable', hint: 'Renew manually', icon: RefreshCw },
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  /* live service list (from the existing endpoint; real state, no fakes) */
  const [services, setServices] = useState<string[] | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);

  /* my rentals (existing endpoint) */
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rentalsLoaded, setRentalsLoaded] = useState(false);

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

  const liveCount = rentals.filter(isLive).length;

  /* ---------------- screens ---------------- */

  const openType = (t: RentalType) => {
    setType(t);
    setService(null);
    setMode('one-time');
    setScreen('flow');
  };

  return (
    <div className="rsm-page">
      <header className="rsm-head">
        <button type="button" className="rsm-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Rent a Number</h1>
          <p>US non-VoIP mobile numbers for SMS verification.</p>
        </div>
        <button
          type="button"
          className="rsm-head-history"
          onClick={() => setScreen('history')}
          aria-label="Rental history"
        >
          <HistoryIcon size={18} />
        </button>
      </header>

      {screen === 'home' ? (
        <main className="rsm-body">
          <section className="rsm-hero">
            <span className="rsm-hero-eyebrow">VERXOR RENTALS</span>
            <h2>Own a US number, on your terms.</h2>
            <p>Pick a service, choose your duration, and receive unlimited SMS on a dedicated non-VoIP number.</p>
            <div className="rsm-hero-meta">
              <span><Smartphone size={13} /> Non-VoIP</span>
              <span><Clock size={13} /> 1 – 365 days</span>
              <span><Wallet size={13} /> Wallet checkout</span>
            </div>
          </section>

          <h3 className="rsm-section-title">Choose a rental type</h3>
          <section className="rsm-types">
            <button type="button" className="rsm-type" onClick={() => openType('service')}>
              <span className="rsm-type-icon"><Hash size={22} /></span>
              <span className="rsm-type-copy">
                <strong>Service Rental</strong>
                <small>Choose the app first, then rent a dedicated US number for the duration you need.</small>
              </span>
              <span className="rsm-type-foot">
                <span className="rsm-chip on"><Check size={11} /> Available</span>
                <ChevronRight size={16} />
              </span>
            </button>

            <button type="button" className="rsm-type soon" disabled>
              <span className="rsm-type-icon"><CalendarClock size={22} /></span>
              <span className="rsm-type-copy">
                <strong>General Rental</strong>
                <small>One general-purpose number, any service, 1 to 365 days.</small>
              </span>
              <span className="rsm-type-foot">
                <span className="rsm-chip soon-chip"><Clock size={11} /> Coming soon</span>
                <ChevronRight size={16} />
              </span>
            </button>
          </section>

          <section className="rsm-mine">
            <div className="rsm-mine-head">
              <h3>My Rentals</h3>
              <button type="button" onClick={() => setScreen('history')}>View all <ArrowRight size={13} /></button>
            </div>
            {liveCount > 0 ? (
              rentals.filter(isLive).slice(0, 2).map((r) => (
                <div className="rsm-mine-row" key={r.id}>
                  <span className="rsm-mine-num"><Hash size={13} /> {r.number || 'Pending'}</span>
                  <span className="rsm-mine-service">{r.serviceName}</span>
                  <span className="rsm-chip on">Active</span>
                </div>
              ))
            ) : (
              <div className="rsm-mine-empty">
                <p>{rentalsLoaded ? 'No rentals yet — order your first number from Service Rental.' : 'Loading your rentals…'}</p>
              </div>
            )}
          </section>

          <button type="button" className="rsm-history-link" onClick={() => setScreen('history')}>
            <HistoryIcon size={16} />
            <span>View Rental History</span>
            <small>Numbers, messages and receipts, all in one place.</small>
          </button>
        </main>
      ) : null}

      {screen === 'flow' ? (
        <main className="rsm-body">
          <section className="rsm-flow-head">
            <button type="button" className="rsm-flow-back" onClick={() => setScreen('home')}>
              <ArrowLeft size={15} /> <span>Back</span>
            </button>
            <span className="rsm-flow-tag">{type === 'service' ? 'SERVICE RENTAL' : 'GENERAL RENTAL'}</span>
          </section>

          <h3 className="rsm-section-title">Order a rental</h3>

          <div className="rsm-modes">
            {MODES.map(({ id, label, hint, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={mode === id ? 'rsm-mode active' : 'rsm-mode'}
                onClick={() => setMode(id)}
              >
                <Icon size={16} />
                <span className="rsm-mode-copy">
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </span>
          </button>
            ))}
          </div>

          <h4 className="rsm-field-label">Service</h4>
          <button type="button" className="rsm-service-field" onClick={() => setPickerOpen(true)}>
            {service ? (
              <><span className="rsm-service-picked"><Hash size={14} /> {service}</span><ChevronRight size={16} /></>
            ) : (
              <>
                <Search size={15} />
                <span className="rsm-service-hint">
                  Search &amp; select a service
                  {services ? <small>{services.length.toLocaleString()} available</small> : null}
                </span>
                <ChevronRight size={16} />
              </>
            )}
          </button>

          {service ? (
            <section className="rsm-durations">
              <div className="rsm-durations-head">
                <h4 className="rsm-field-label">Duration</h4>
                <span className="rsm-chip note"><Info size={11} /> Prices being finalized</span>
              </div>
              <div className="rsm-dur-grid">
                {['1 day', '7 days', '15 days', '30 days', '90 days', '180 days', '1 year'].map((d) => (
                  <button type="button" className="rsm-dur" key={d} disabled>
                    <strong>{d}</strong>
                    <small>TBD</small>
                  </button>
                ))}
              </div>
              <div className="rsm-final-note">
                <AlertCircle size={14} />
                <p>Rental prices are being finalized. Checkout opens as soon as pricing is locked — your wallet will be charged then.</p>
              </div>
            </section>
          ) : (
            <div className="rsm-final-note">
              <Info size={14} />
              <p>Rentals give you a dedicated US number for your chosen duration. Receive unlimited SMS and view every message in your Rental History.</p>
            </div>
          )}
        </main>
      ) : null}

      {screen === 'history' ? (
        <main className="rsm-body">
          <section className="rsm-flow-head">
            <button type="button" className="rsm-flow-back" onClick={() => setScreen('home')}>
              <ArrowLeft size={15} /> <span>Back</span>
            </button>
            <span className="rsm-flow-tag">RENTAL HISTORY</span>
          </section>

          <h3 className="rsm-section-title">Rental History</h3>
          {rentals.length ? (
            <section className="rsm-hist">
              {rentals.map((r) => (
                <div className="rsm-hist-row" key={r.id}>
                  <span className="rsm-hist-icon"><Hash size={15} /></span>
                  <span className="rsm-hist-copy">
                    <strong>{r.number || 'Number pending'}</strong>
                    <small>{r.serviceName} · from {fmtDate(r.createdAt)}</small>
                  </span>
                  <span className="rsm-hist-meta">
                    <span className={isLive(r) ? 'rsm-chip on' : 'rsm-chip off'}>
                      {isLive(r) ? 'Active' : 'Ended'}
                    </span>
                  </span>
                </div>
              ))}
            </section>
          ) : (
            <div className="rsm-hist-empty">
              <HistoryIcon size={26} />
              <p>No rentals yet.</p>
              <button type="button" className="rsm-hist-cta" onClick={() => openType('service')}>
                Order your first rental <ArrowRight size={14} />
              </button>
            </div>
          )}
        </main>
      ) : null}

      {/* service picker modal */}
      {pickerOpen ? (
        <div className="rsm-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="rsm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Select service">
            <div className="rsm-modal-head">
              <strong>Select Service</strong>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="rsm-modal-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search service…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search service"
                autoFocus
              />
            </div>
            {services === null && !servicesError ? (
              <div className="rsm-modal-state"><Loader2 size={17} className="spin" /> Loading services…</div>
            ) : servicesError ? (
              <div className={isSetup ? 'rsm-modal-state setup' : 'rsm-modal-state'}>
                {isSetup ? <Clock size={16} /> : <AlertCircle size={16} />}
                <p>{isSetup ? 'Provider setup is finishing — the live service list appears here shortly.' : servicesError}</p>
              </div>
            ) : (
              <>
                <p className="rsm-modal-count">
                  {filtered.length.toLocaleString()} of {services!.length.toLocaleString()}{' '}
                  {mode === 'one-time' ? 'one-time' : 'renewable'} services
                </p>
                <ul className="rsm-modal-list">
                  {filtered.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => {
                          setService(s);
                          setPickerOpen(false);
                          setQuery('');
                        }}
                      >
                        <span className="rsm-li-icon"><Hash size={13} /></span>
                        <span>{s}</span>
                        {service === s ? <Check size={14} /> : null}
                      </button>
                    </li>
                  ))}
                  {!filtered.length ? <li className="rsm-li-none">No service matches “{query}”.</li> : null}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
