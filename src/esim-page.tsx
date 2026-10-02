'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Globe2,
  RefreshCw,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import './esim-page.css';

type PlanType = 'data-sms' | 'data-only';
type Coverage = 'All' | 'Local' | 'Regional' | 'Global';

type EsimPlan = {
  id: string;
  type: PlanType;
  dataGb: number | 'Unlimited';
  sms?: number;
  mins?: number;
  days: number;
  price: number;
  carrier?: string;
  topUp?: boolean;
  coverage: Coverage[];
};

type Country = {
  id: string;
  name: string;
  flag: string;
  fromPrice: number;
  planCount: number;
  validityLabel: string;
  plans: EsimPlan[];
};

function money(n: number) {
  return (
    '\u20a6' +
    n.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

const VALIDITY_OPTIONS = [3, 7, 15, 30, 60, 90, 180, 365, 0] as const;

const COUNTRIES: Country[] = [
  {
    id: 'us',
    name: 'United States',
    flag: '🇺🇸',
    fromPrice: 5177,
    planCount: 27,
    validityLabel: '3-365 days available',
    plans: [
      { id: 'us-ds-5', type: 'data-sms', dataGb: 5, sms: 50, mins: 50, days: 30, price: 21620, carrier: 'Change+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-ds-10', type: 'data-sms', dataGb: 10, sms: 100, mins: 100, days: 30, price: 33495, carrier: 'Change+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-ds-20', type: 'data-sms', dataGb: 20, sms: 200, mins: 200, days: 30, price: 50852, carrier: 'Change+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-3', type: 'data-only', dataGb: 3, days: 30, price: 9135, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-5', type: 'data-only', dataGb: 5, days: 30, price: 13094, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-10', type: 'data-only', dataGb: 10, days: 30, price: 21315, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-20', type: 'data-only', dataGb: 20, days: 30, price: 33191, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-unl-30', type: 'data-only', dataGb: 'Unlimited', days: 30, price: 140070, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-1-7', type: 'data-only', dataGb: 1, days: 7, price: 5481, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-unl-7', type: 'data-only', dataGb: 'Unlimited', days: 7, price: 35018, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-2-15', type: 'data-only', dataGb: 2, days: 15, price: 7613, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
      { id: 'us-do-unl-3', type: 'data-only', dataGb: 'Unlimited', days: 3, price: 19184, carrier: 'Change', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    flag: '🇬🇧',
    fromPrice: 4568,
    planCount: 26,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'uk-ds-5', type: 'data-sms', dataGb: 5, sms: 50, mins: 50, days: 30, price: 13703, carrier: 'Uki Mobile+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-ds-10', type: 'data-sms', dataGb: 10, sms: 100, mins: 100, days: 30, price: 22229, carrier: 'Uki Mobile+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-ds-20', type: 'data-sms', dataGb: 20, sms: 200, mins: 200, days: 30, price: 34713, carrier: 'Uki Mobile+', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-do-3', type: 'data-only', dataGb: 3, days: 30, price: 7004, carrier: 'Uki Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-do-5', type: 'data-only', dataGb: 5, days: 30, price: 9440, carrier: 'Uki Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-do-10', type: 'data-only', dataGb: 10, days: 30, price: 14616, carrier: 'Uki Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-do-20', type: 'data-only', dataGb: 20, days: 30, price: 27710, carrier: 'Uki Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'uk-do-unl', type: 'data-only', dataGb: 'Unlimited', days: 30, price: 75516, carrier: 'Uki Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'ca',
    name: 'Canada',
    flag: '🇨🇦',
    fromPrice: 14830,
    planCount: 18,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'ca-do-5', type: 'data-only', dataGb: 5, days: 30, price: 45615, carrier: 'Canada Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ca-do-10', type: 'data-only', dataGb: 10, days: 30, price: 57216, carrier: 'Canada Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ca-do-20', type: 'data-only', dataGb: 20, days: 30, price: 90894, carrier: 'Canada Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ca-do-50', type: 'data-only', dataGb: 50, days: 30, price: 203924, carrier: 'Canada Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'ng',
    name: 'Nigeria',
    flag: '🇳🇬',
    fromPrice: 7613,
    planCount: 11,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'ng-do-2', type: 'data-only', dataGb: 2, days: 7, price: 7613, carrier: 'NG Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ng-do-5', type: 'data-only', dataGb: 5, days: 30, price: 12450, carrier: 'NG Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ng-do-10', type: 'data-only', dataGb: 10, days: 30, price: 18900, carrier: 'NG Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'ng-ds-5', type: 'data-sms', dataGb: 5, sms: 50, mins: 50, days: 30, price: 21500, carrier: 'NG Mobile+', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'au',
    name: 'Australia',
    flag: '🇦🇺',
    fromPrice: 4263,
    planCount: 12,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'au-do-3', type: 'data-only', dataGb: 3, days: 30, price: 4263, carrier: 'AU Mobile', topUp: true, coverage: ['All', 'Local'] },
      { id: 'au-do-10', type: 'data-only', dataGb: 10, days: 30, price: 11200, carrier: 'AU Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'de',
    name: 'Germany',
    flag: '🇩🇪',
    fromPrice: 5120,
    planCount: 14,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'de-do-5', type: 'data-only', dataGb: 5, days: 30, price: 5120, carrier: 'EU Mobile', topUp: true, coverage: ['All', 'Regional'] },
      { id: 'de-do-15', type: 'data-only', dataGb: 15, days: 30, price: 14800, carrier: 'EU Mobile', topUp: true, coverage: ['All', 'Regional'] },
    ],
  },
  {
    id: 'fr',
    name: 'France',
    flag: '🇫🇷',
    fromPrice: 4890,
    planCount: 12,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'fr-do-5', type: 'data-only', dataGb: 5, days: 30, price: 4890, carrier: 'EU Mobile', topUp: true, coverage: ['All', 'Regional'] },
    ],
  },
  {
    id: 'ae',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    fromPrice: 9200,
    planCount: 9,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'ae-do-5', type: 'data-only', dataGb: 5, days: 30, price: 9200, carrier: 'Gulf Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'sg',
    name: 'Singapore',
    flag: '🇸🇬',
    fromPrice: 6100,
    planCount: 10,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'sg-do-5', type: 'data-only', dataGb: 5, days: 30, price: 6100, carrier: 'SG Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
  {
    id: 'za',
    name: 'South Africa',
    flag: '🇿🇦',
    fromPrice: 7800,
    planCount: 8,
    validityLabel: '3-30 days available',
    plans: [
      { id: 'za-do-5', type: 'data-only', dataGb: 5, days: 30, price: 7800, carrier: 'ZA Mobile', topUp: true, coverage: ['All', 'Local'] },
    ],
  },
];

function planTitle(p: EsimPlan) {
  const data = p.dataGb === 'Unlimited' ? 'Unlimited' : `${p.dataGb} GB`;
  if (p.type === 'data-sms') {
    return `${data} - ${p.sms} SMS - ${p.mins} Mins - ${p.days} days`;
  }
  return `${data} - ${p.days} days`;
}

function dataChip(p: EsimPlan) {
  return p.dataGb === 'Unlimited' ? 'Unlimited' : `${p.dataGb} GB`;
}

export function EsimPage({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Country | null>(null);
  const [planType, setPlanType] = useState<PlanType>('data-sms');
  const [coverage, setCoverage] = useState<Coverage>('All');
  const [validity, setValidity] = useState<number>(30);
  const [showCoverageMenu, setShowCoverageMenu] = useState(false);
  const [showValiditySheet, setShowValiditySheet] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  const openCountry = (c: Country) => {
    setSelected(c);
    setPlanType('data-sms');
    setCoverage('All');
    setValidity(30);
    setShowCoverageMenu(false);
    setShowValiditySheet(false);
    setLoadingPlans(true);
    window.setTimeout(() => setLoadingPlans(false), 420);
  };

  const closeCountry = () => {
    setSelected(null);
    setShowCoverageMenu(false);
    setShowValiditySheet(false);
  };

  const hasDataSms = useMemo(() => {
    if (!selected) return false;
    return selected.plans.some((p) => p.type === 'data-sms');
  }, [selected]);

  // Strict filter by user's selected tab — never force-switch
  const visiblePlans = useMemo(() => {
    if (!selected) return [];
    return selected.plans.filter((p) => {
      if (p.type !== planType) return false;
      if (coverage !== 'All' && !p.coverage.includes(coverage)) return false;
      if (validity !== 0 && p.days !== validity) return false;
      return true;
    });
  }, [selected, planType, coverage, validity]);

  const summaryLine = useMemo(() => {
    if (!selected) return '';
    const typeLabel = planType === 'data-sms' ? 'Data + SMS' : 'Data Only';
    const daysLabel = validity === 0 ? 'All days' : `${validity} days`;
    return `${typeLabel} · ${coverage} · ${daysLabel}`;
  }, [selected, planType, coverage, validity]);

  const handleBuy = async (plan: EsimPlan) => {
    if (buyingId) return;
    setBuyingId(plan.id);
    await new Promise((r) => setTimeout(r, 900));
    setBuyingId(null);
    showToast(`eSIM purchased — ${planTitle(plan)}`);
  };

  const handleRefresh = () => {
    if (!selected) return;
    setLoadingPlans(true);
    window.setTimeout(() => setLoadingPlans(false), 400);
  };

  return (
    <div className="esim-page">
      <header className="esim-topbar">
        <button type="button" className="esim-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <h1 className="esim-top-title">eSIM Store</h1>
        <span className="esim-top-spacer" />
      </header>

      <div className="esim-scroll">
        <div className="esim-intro">
          <h2 className="esim-h1">Premium eSIM</h2>
          <p className="esim-sub">Select your destination to view packages.</p>
        </div>

        <section className="esim-hero" aria-label="Connect Worldwide">
          <div className="esim-hero-copy">
            <span className="esim-hero-badge">ALL COUNTRIES</span>
            <strong>Connect Worldwide</strong>
            <p>Instant digital eSIM packages</p>
          </div>
          <div className="esim-hero-art" aria-hidden>
            <Globe2 size={56} strokeWidth={1.4} />
          </div>
        </section>

        <div className="esim-search-wrap">
          <Search size={18} className="esim-search-icon" aria-hidden />
          <input
            type="search"
            className="esim-search"
            placeholder="Search country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search country"
          />
          {query ? (
            <button
              type="button"
              className="esim-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="esim-country-list" role="list">
          {filteredCountries.length === 0 ? (
            <div className="esim-empty-inline">
              <p>No countries match "{query}"</p>
            </div>
          ) : (
            filteredCountries.map((c) => (
              <button
                key={c.id}
                type="button"
                className="esim-country-row"
                role="listitem"
                onClick={() => openCountry(c)}
              >
                <span className="esim-flag" aria-hidden>
                  {c.flag}
                </span>
                <span className="esim-country-meta">
                  <strong>{c.name}</strong>
                  <span className="esim-country-price">
                    From {money(c.fromPrice)} · {c.planCount} plans
                  </span>
                  <span className="esim-country-validity">{c.validityLabel}</span>
                </span>
                <ArrowRight size={18} className="esim-chevron" strokeWidth={2} />
              </button>
            ))
          )}
        </div>
      </div>

      {selected ? (
        <div className="esim-sheet-root" role="dialog" aria-modal="true" aria-label={selected.name}>
          <button type="button" className="esim-sheet-backdrop" onClick={closeCountry} aria-label="Close" />
          <div className="esim-sheet">
            <div className="esim-sheet-handle" aria-hidden />
            <div className="esim-sheet-head">
              <span className="esim-flag lg">{selected.flag}</span>
              <div className="esim-sheet-titles">
                <strong>{selected.name}</strong>
                <span>{summaryLine}</span>
              </div>
              <button type="button" className="esim-icon-btn" onClick={handleRefresh} aria-label="Refresh plans">
                <RefreshCw size={16} strokeWidth={2.2} className={loadingPlans ? 'spin' : ''} />
              </button>
              <button type="button" className="esim-icon-btn" onClick={closeCountry} aria-label="Close">
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="esim-seg" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={planType === 'data-sms'}
                className={planType === 'data-sms' ? 'active' : ''}
                onClick={() => setPlanType('data-sms')}
              >
                Data + SMS
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={planType === 'data-only'}
                className={planType === 'data-only' ? 'active' : ''}
                onClick={() => setPlanType('data-only')}
              >
                Data Only
              </button>
            </div>

            {!hasDataSms && planType === 'data-sms' ? (
              <div className="esim-note" role="status">
                Data + SMS is not available for this destination.
              </div>
            ) : null}

            <div className="esim-filters">
              <div className="esim-filter-wrap">
                <button
                  type="button"
                  className="esim-filter"
                  onClick={() => {
                    setShowCoverageMenu((v) => !v);
                    setShowValiditySheet(false);
                  }}
                >
                  <Globe2 size={14} strokeWidth={2.2} />
                  <span>
                    <small>Coverage</small>
                    <strong>{coverage}</strong>
                  </span>
                  <span className="esim-filter-caret">▾</span>
                </button>
                {showCoverageMenu ? (
                  <div className="esim-dropdown" role="listbox">
                    {(['All', 'Local', 'Regional', 'Global'] as Coverage[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={coverage === c}
                        className={coverage === c ? 'active' : ''}
                        onClick={() => {
                          setCoverage(c);
                          setShowCoverageMenu(false);
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="esim-filter"
                onClick={() => {
                  setShowValiditySheet(true);
                  setShowCoverageMenu(false);
                }}
              >
                <Calendar size={14} strokeWidth={2.2} />
                <span>
                  <small>Validity</small>
                  <strong>{validity === 0 ? 'All days' : `${validity} days`}</strong>
                </span>
                <span className="esim-filter-caret">▾</span>
              </button>
            </div>

            <div className="esim-plan-scroll">
              {loadingPlans ? (
                <div className="esim-skeletons" aria-busy="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="esim-skel-row" />
                  ))}
                </div>
              ) : visiblePlans.length === 0 ? (
                <div className="esim-empty">
                  <div className="esim-empty-icon" aria-hidden>
                    !
                  </div>
                  <p>
                    No package for{' '}
                    {validity === 0 ? 'selected filters' : `${validity} days`}
                  </p>
                  <button type="button" className="esim-empty-cta" onClick={() => setValidity(0)}>
                    Show all days
                  </button>
                </div>
              ) : (
                visiblePlans.map((p) => (
                  <article key={p.id} className="esim-plan-card">
                    <div className="esim-plan-left">
                      <span className="esim-sim-icon" aria-hidden>
                        <Smartphone size={18} strokeWidth={2} />
                      </span>
                      <div className="esim-plan-body">
                        <strong>{planTitle(p)}</strong>
                        <span className="esim-plan-carrier">
                          {p.carrier} · {p.days} days
                        </span>
                        <div className="esim-chips">
                          <span className="esim-chip">{dataChip(p)}</span>
                          {p.mins != null ? <span className="esim-chip">{p.mins} mins</span> : null}
                          {p.sms != null ? <span className="esim-chip">{p.sms} SMS</span> : null}
                          {p.topUp ? <span className="esim-chip topup">Top-up</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="esim-plan-right">
                      <strong className="esim-plan-price">{money(p.price)}</strong>
                      <button
                        type="button"
                        className="esim-buy"
                        disabled={buyingId === p.id}
                        onClick={() => handleBuy(p)}
                      >
                        {buyingId === p.id ? '…' : 'Buy'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showValiditySheet ? (
        <div className="esim-valid-root" role="dialog" aria-modal="true" aria-label="Select validity">
          <button
            type="button"
            className="esim-sheet-backdrop"
            onClick={() => setShowValiditySheet(false)}
            aria-label="Close"
          />
          <div className="esim-valid-sheet">
            <div className="esim-valid-head">
              <strong>Select validity</strong>
              <button
                type="button"
                className="esim-icon-btn"
                onClick={() => setShowValiditySheet(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="esim-valid-grid">
              {VALIDITY_OPTIONS.map((d) => {
                const label = d === 0 ? 'All days' : `${d} days`;
                const active = validity === d;
                return (
                  <button
                    key={d}
                    type="button"
                    className={active ? 'esim-valid-opt active' : 'esim-valid-opt'}
                    onClick={() => {
                      setValidity(d);
                      setShowValiditySheet(false);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="esim-toast" role="status">
          <Check size={16} strokeWidth={2.6} /> {toast}
        </div>
      ) : null}
    </div>
  );
}
