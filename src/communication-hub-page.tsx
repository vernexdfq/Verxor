'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './communication-hub-page.css';

type HubTab = 'numbers' | 'call' | 'messages' | 'history';

type NumberType = 'local' | 'toll-free' | 'mobile';

type HubNumber = {
  id: string;
  e164: string;
  friendly: string;
  country: string;
  status?: string;
  expiresAt?: string;
};

const TABS: { id: HubTab; label: string; icon: typeof Phone }[] = [
  { id: 'numbers', label: 'My Numbers', icon: Phone },
  { id: 'call', label: 'Make a Call', icon: PhoneCall },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'history', label: 'Call History', icon: PhoneForwarded },
];

type CountryOption = { code: string; name: string; flag: string; defaultEnabled?: boolean };

// Fallback until the backend list loads (real list from /api/v1/rent-line/countries).
const DEFAULT_COUNTRIES: CountryOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultEnabled: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultEnabled: true },
];

const NUMBER_TYPES: { id: NumberType; label: string; hint: string }[] = [
  { id: 'local', label: 'Local', hint: 'City / area code numbers' },
  { id: 'toll-free', label: 'Toll-Free', hint: '800 / freephone style' },
  { id: 'mobile', label: 'Mobile', hint: 'Mobile range where available' },
];

export function CommunicationHubPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session?: AuthSession | null;
}) {
  const [tab, setTab] = useState<HubTab>('numbers');
  const [getOpen, setGetOpen] = useState(false);
  const [dropdownFor, setDropdownFor] = useState<'call' | 'messages' | 'history' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [country, setCountry] = useState(DEFAULT_COUNTRIES[0]);
  const [numberType, setNumberType] = useState<NumberType>('local');
  const [countryPicker, setCountryPicker] = useState(false);
  const [typePicker, setTypePicker] = useState(false);
  const [areaPicker, setAreaPicker] = useState(false);
  const [areaCode, setAreaCode] = useState<string | null>(null);
  const [areaCodes, setAreaCodes] = useState<Array<{ code: string; label: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Real lines from the backend (honest empty state until SignalWire buys happen).
  const [myNumbers, setMyNumbers] = useState<HubNumber[]>([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [countries, setCountries] = useState<CountryOption[]>(DEFAULT_COUNTRIES);

  const userKey = session?.userId || '';

  // Fix the reload loop: depend on the stable user id, not the session object.
  const vxHeaders = useCallback((json = true): Record<string, string> => {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    if (userKey) h['x-vx-user'] = userKey;
    return h;
  }, [userKey]);

  const loadLines = useCallback(async () => {
    setLinesLoading(true);
    try {
      const res = await fetch('/api/v1/rent-line/lines', { headers: vxHeaders(false), cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        lines?: Array<{
          id: string; e164: string; friendly: string; country: string; status: string; expiresAt: string;
        }>;
      };
      if (data.ok && Array.isArray(data.lines)) {
        setMyNumbers(
          data.lines.map((l) => ({
            id: l.id,
            e164: l.e164,
            friendly: l.friendly || l.e164,
            country: l.country,
            status: l.status,
            expiresAt: l.expiresAt,
          })),
        );
      }
    } catch {
      /* keep previous lines; next visit retries */
    } finally {
      setLinesLoading(false);
    }
  }, [vxHeaders]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  // Country list from the backend (SignalWire-supported countries only).
  useEffect(() => {
    let alive = true;
    fetch('/api/v1/rent-line/countries', { cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})))
      .then((d: { ok?: boolean; countries?: CountryOption[] }) => {
        if (alive && d.ok && Array.isArray(d.countries) && d.countries.length) {
          setCountries(d.countries);
        }
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);

  // Area codes for the selected country (resets the choice on change).
  useEffect(() => {
    let alive = true;
    setAreaCode(null);
    fetch(`/api/v1/rent-line/area-codes?country=${encodeURIComponent(country.code)}`, { cache: 'no-store' })
      .then((r) => r.json().catch(() => ({})))
      .then((d: { ok?: boolean; areaCodes?: Array<{ code: string; label: string }> }) => {
        if (alive && d.ok && Array.isArray(d.areaCodes)) setAreaCodes(d.areaCodes);
      })
      .catch(() => null);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.code]);

  const selected = useMemo(
    () => myNumbers.find((n) => n.id === selectedId) ?? null,
    [myNumbers, selectedId],
  );


  useEffect(() => {
    if (!dropdownFor) return;
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownFor(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [dropdownFor]);

  useEffect(() => {
    setDropdownFor(null);
  }, [tab]);

  const openGetNumber = () => {
    setSearchError(null);
    setDropdownFor(null);
    setGetOpen(true);
  };

  const toggleDropdown = (which: 'call' | 'messages' | 'history') => {
    setDropdownFor((prev) => (prev === which ? null : which));
  };

  const pickNumber = (id: string) => {
    setSelectedId(id);
    setDropdownFor(null);
  };

  const [results, setResults] = useState<HubNumber[]>([]);
  const [pickedE164, setPickedE164] = useState<string | null>(null);
  const [period, setPeriod] = useState<'30d' | '90d' | '180d' | '365d'>('30d');
  const [buying, setBuying] = useState(false);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  // Retail display prices (server always re-prices from the master tier table).
  const PERIOD_OPTIONS: Array<{ id: typeof period; label: string; retailNgn: number }> = [
    { id: '30d', label: '1 Month', retailNgn: 5500 },
    { id: '90d', label: '3 Months', retailNgn: 13800 },
    { id: '180d', label: '6 Months', retailNgn: 23500 },
    { id: '365d', label: '12 Months', retailNgn: 34450 },
  ];

  const priceHint = useMemo(() => {
    const opt = PERIOD_OPTIONS.find((p) => p.id === period);
    const ngn = (n: number) => `₦${n.toLocaleString('en-NG')}`;
    return `${opt ? `${opt.label} — ${ngn(opt.retailNgn)} line rental` : 'From ₦5,500 · 1 month'} · Calls (₦150/min) & SMS (₦70) charged per use from your wallet`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const handleSearch = async () => {
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setPickedE164(null);
    setBuyMsg(null);
    try {
      const res = await fetch(
        `/api/v1/rent-line/search?country=${encodeURIComponent(country.code)}&type=${encodeURIComponent(numberType)}` +
          (areaCode ? `&areaCode=${encodeURIComponent(areaCode)}` : ''),
        { headers: vxHeaders(false), cache: 'no-store' },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        numbers?: Array<{ e164: string; friendly: string }>;
      };
      if (!res.ok || !data.ok || !Array.isArray(data.numbers)) {
        setSearchError(data.error || 'Search failed. Try again.');
      } else if (!data.numbers.length) {
        setSearchError(`No ${numberType === 'local' ? 'local' : numberType} numbers are available for ${country.name} right now. Try another type or country.`);
      } else {
        setResults(data.numbers.map((n) => ({ id: n.e164, e164: n.e164, friendly: n.friendly, country: country.name })));
      }
    } catch {
      setSearchError('Network error while searching. Try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleBuy = async () => {
    if (!pickedE164 || buying) return;
    setBuying(true);
    setBuyMsg(null);
    try {
      const res = await fetch('/api/v1/rent-line/purchase', {
        method: 'POST',
        headers: vxHeaders(),
        body: JSON.stringify({
          e164: pickedE164,
          country: country.code,
          type: numberType,
          period,
          userId: session?.userId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBuyMsg(data.error || 'The purchase failed. Try again.');
        return;
      }
      setGetOpen(false);
      await loadLines();
    } catch {
      setBuyMsg('Network error while purchasing. If you were charged, contact support.');
    } finally {
      setBuying(false);
    }
  };

  const selectLabel = selected?.friendly ?? 'Select your number…';
  const selectHistoryLabel = selected?.friendly ?? 'Select a number…';

  const renderNumberDropdown = (which: 'call' | 'messages' | 'history') => {
    if (dropdownFor !== which) return null;
    return (
      <div className="chub-dropdown" role="listbox">
        {myNumbers.length === 0 ? (
          <div className="chub-dropdown-empty">
            <p>No rented numbers yet</p>
            <button type="button" className="chub-dropdown-cta" onClick={openGetNumber}>
              Get a Number
            </button>
          </div>
        ) : (
          myNumbers.map((n) => (
            <button
              key={n.id}
              type="button"
              role="option"
              aria-selected={selectedId === n.id}
              className={selectedId === n.id ? 'chub-dropdown-item active' : 'chub-dropdown-item'}
              onClick={() => pickNumber(n.id)}
            >
              <span className="chub-dropdown-main">{n.friendly}</span>
              <span className="chub-dropdown-sub">{n.country}</span>
            </button>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="chub">
      <header className="chub-header">
        <button type="button" className="chub-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="chub-header-copy">
          <span className="chub-title">Rent for SMS/Calls</span>
          <span className="chub-sub">Communication Hub</span>
        </div>
        <span className="chub-headspace" />
      </header>

      <div className="chub-tabs" role="tablist" aria-label="Communication sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'chub-tab active' : 'chub-tab'}
            onClick={() => setTab(id)}
          >
            <Icon size={16} strokeWidth={2.1} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <main className="chub-body">
        {tab === 'numbers' && (
          <section className="chub-panel" aria-label="My Numbers">
            <div className="chub-panel-head">
              <div>
                <p className="chub-eyebrow">YOUR LINES</p>
                <h2>My Numbers</h2>
                <p className="chub-count">{myNumbers.length} numbers</p>
              </div>
              <button type="button" className="chub-get-btn" onClick={openGetNumber}>
                <Plus size={16} strokeWidth={2.5} /> Get a Number
              </button>
            </div>

            {linesLoading ? (
              <div className="chub-empty">
                <div className="chub-empty-icon">
                  <Loader2 size={28} className="chub-spin" />
                </div>
                <strong>Loading your lines…</strong>
              </div>
            ) : myNumbers.length === 0 ? (
              <div className="chub-empty">
                <div className="chub-empty-icon">
                  <Phone size={28} strokeWidth={1.7} />
                </div>
                <strong>No numbers yet</strong>
                <p>Get a real phone number to make calls and receive SMS.</p>
                <button type="button" className="chub-primary" onClick={openGetNumber}>
                  Get your first number
                </button>
              </div>
            ) : (
              <ul className="chub-number-list">
                {myNumbers.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={selectedId === n.id ? 'chub-number-card active' : 'chub-number-card'}
                      onClick={() => setSelectedId(n.id)}
                    >
                      <span className="chub-number-icon">
                        <Phone size={18} />
                      </span>
                      <span className="chub-number-copy">
                        <strong>{n.friendly}</strong>
                        <small>
                          {n.country}
                          {n.status === 'active' && n.expiresAt
                            ? ` · renews/expires ${new Date(n.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`
                            : n.status === 'expired'
                              ? ' · expired'
                              : n.status === 'released'
                                ? ' · released'
                                : ''}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'call' && (
          <section className="chub-panel" aria-label="Make a Call">
            <div className="chub-panel-head single">
              <div>
                <p className="chub-eyebrow">VOICE</p>
                <h2>Make a Call</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">CALL FROM</label>
              <div className="chub-select-wrap" ref={dropdownFor === 'call' ? dropdownRef : undefined}>
                <button
                  type="button"
                  className={dropdownFor === 'call' ? 'chub-select open' : 'chub-select'}
                  onClick={() => toggleDropdown('call')}
                  aria-expanded={dropdownFor === 'call'}
                  aria-haspopup="listbox"
                >
                  <span className={selected ? '' : 'chub-placeholder'}>{selectLabel}</span>
                  <ChevronDown size={16} className={dropdownFor === 'call' ? 'chub-chevron up' : 'chub-chevron'} />
                </button>
                {renderNumberDropdown('call')}
              </div>
              {myNumbers.length === 0 ? (
                <p className="chub-hint">
                  You need a{' '}
                  <button type="button" className="chub-link" onClick={openGetNumber}>
                    communication number
                  </button>{' '}
                  first.
                </p>
              ) : null}

              <label className="chub-label chub-label-spaced">CALL TO</label>
              <input
                className="chub-input"
                type="tel"
                placeholder="+1 555 000 0000"
                inputMode="tel"
              />

              <div className="chub-price-row">
                <span>Pricing</span>
                <strong>$0.10 per minute</strong>
              </div>

              <button type="button" className="chub-call-btn" disabled={!selected}>
                <PhoneCall size={18} /> Call
              </button>
            </div>
          </section>
        )}

        {tab === 'messages' && (
          <section className="chub-panel" aria-label="Messages">
            <div className="chub-panel-head single">
              <div>
                <p className="chub-eyebrow">INBOX</p>
                <h2>Messages</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">NUMBER</label>
              <div className="chub-select-wrap" ref={dropdownFor === 'messages' ? dropdownRef : undefined}>
                <button
                  type="button"
                  className={dropdownFor === 'messages' ? 'chub-select open' : 'chub-select'}
                  onClick={() => toggleDropdown('messages')}
                  aria-expanded={dropdownFor === 'messages'}
                  aria-haspopup="listbox"
                >
                  <span className={selected ? '' : 'chub-placeholder'}>{selectLabel}</span>
                  <ChevronDown size={16} className={dropdownFor === 'messages' ? 'chub-chevron up' : 'chub-chevron'} />
                </button>
                {renderNumberDropdown('messages')}
              </div>

              {/* Always visible; muted until a number is rented/selected — like AfriNum */}
              <button
                type="button"
                className={selected ? 'chub-msg-cta' : 'chub-msg-cta muted'}
                disabled={!selected}
              >
                <Plus size={16} strokeWidth={2.4} /> New Message
              </button>
            </div>

            <div className="chub-empty compact">
              <div className="chub-empty-icon soft">
                <MessageSquare size={26} strokeWidth={1.7} />
              </div>
              <strong>No conversations yet</strong>
              <p>
                {selected
                  ? 'Messages for this number will appear here.'
                  : 'Select one of your numbers to see conversations.'}
              </p>
            </div>
          </section>
        )}

        {tab === 'history' && (
          <section className="chub-panel" aria-label="Call History">
            <div className="chub-panel-head single">
              <div>
                <p className="chub-eyebrow">RECENT</p>
                <h2>Call History</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">NUMBER</label>
              <div className="chub-select-wrap" ref={dropdownFor === 'history' ? dropdownRef : undefined}>
                <button
                  type="button"
                  className={dropdownFor === 'history' ? 'chub-select open' : 'chub-select'}
                  onClick={() => toggleDropdown('history')}
                  aria-expanded={dropdownFor === 'history'}
                  aria-haspopup="listbox"
                >
                  <span className={selected ? '' : 'chub-placeholder'}>{selectHistoryLabel}</span>
                  <ChevronDown size={16} className={dropdownFor === 'history' ? 'chub-chevron up' : 'chub-chevron'} />
                </button>
                {renderNumberDropdown('history')}
              </div>
            </div>

            <div className="chub-empty compact">
              <div className="chub-empty-icon soft">
                <PhoneForwarded size={26} strokeWidth={1.7} />
              </div>
              <strong>No call history</strong>
              <p>
                {selected
                  ? 'Outbound and inbound calls for this number will show here.'
                  : 'Select a number to view call history.'}
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Get a Phone Number sheet — purchase only */}
      {getOpen && (
        <div className="chub-sheet-backdrop" onClick={() => setGetOpen(false)}>
          <div
            className="chub-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chub-get-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chub-sheet-head">
              <h3 id="chub-get-title">Get a Phone Number</h3>
              <button
                type="button"
                className="chub-sheet-close"
                onClick={() => setGetOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="chub-field">
              <label className="chub-label">COUNTRY</label>
              <button type="button" className="chub-select" onClick={() => setCountryPicker(true)}>
                <span>
                  {country.flag} {country.name}
                </span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="chub-field">
              <label className="chub-label">NUMBER TYPE</label>
              <button type="button" className="chub-select" onClick={() => setTypePicker(true)}>
                <span>
                  {NUMBER_TYPES.find((t) => t.id === numberType)?.label}
                  <span className="chub-select-hint">
                    {' · '}{NUMBER_TYPES.find((t) => t.id === numberType)?.hint}
                  </span>
                </span>
                <ChevronDown size={16} />
              </button>
            </div>

            {areaCodes.length ? (
              <div className="chub-field">
                <label className="chub-label">AREA CODE</label>
                <button type="button" className="chub-select" onClick={() => setAreaPicker(true)}>
                  <span>
                    {areaCode
                      ? `${areaCode} · ${areaCodes.find((a) => a.code === areaCode)?.label || ''}`
                      : 'Any (all areas)'}
                  </span>
                  <ChevronDown size={16} />
                </button>
              </div>
            ) : null}

            <div className="chub-price-banner">{priceHint}</div>

            {searchError ? <div className="chub-alert">{searchError}</div> : null}
            {buyMsg ? <div className="chub-alert">{buyMsg}</div> : null}

            {/* Search results — pick a number, then a period, then buy */}
            {results.length ? (
              <div className="chub-field">
                <label className="chub-label">PICK A NUMBER</label>
                <ul className="chub-list">
                  {results.slice(0, 12).map((n) => (
                    <li key={n.e164}>
                      <button
                        type="button"
                        className={pickedE164 === n.e164 ? 'chub-list-item active' : 'chub-list-item'}
                        onClick={() => setPickedE164(n.e164)}
                      >
                        <span>{n.friendly}</span>
                        {pickedE164 === n.e164 ? <span className="chub-check">✓</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {pickedE164 ? (
              <div className="chub-field">
                <label className="chub-label">RENTAL PERIOD</label>
                <div className="chub-tabs" role="tablist" aria-label="Rental period">
                  {PERIOD_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={period === p.id}
                      className={period === p.id ? 'chub-tab active' : 'chub-tab'}
                      onClick={() => setPeriod(p.id)}
                    >
                      <span>{p.label}</span>
                      <small className="chub-select-hint">₦{p.retailNgn.toLocaleString('en-NG')}</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className="chub-primary full"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? (
                'Searching…'
              ) : (
                <>
                  <Search size={16} /> Search Numbers
                </>
              )}
            </button>

            {pickedE164 ? (
              <button
                type="button"
                className="chub-primary full"
                onClick={handleBuy}
                disabled={buying}
              >
                {buying ? (
                  <>
                    <Loader2 size={16} className="chub-spin" /> Renting…
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Rent this number
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {countryPicker && (
        <div className="chub-sheet-backdrop" onClick={() => setCountryPicker(false)}>
          <div className="chub-sheet list" onClick={(e) => e.stopPropagation()}>
            <div className="chub-sheet-head">
              <h3>Select country</h3>
              <button
                type="button"
                className="chub-sheet-close"
                onClick={() => setCountryPicker(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="chub-list">
              {countries.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    className={country.code === c.code ? 'chub-list-item active' : 'chub-list-item'}
                    onClick={() => {
                      setCountry(c);
                      setCountryPicker(false);
                    }}
                  >
                    <span>
                      {c.flag} {c.name}
                    </span>
                    {country.code === c.code ? <span className="chub-check">✓</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {typePicker && (
        <div className="chub-sheet-backdrop" onClick={() => setTypePicker(false)}>
          <div className="chub-sheet list" onClick={(e) => e.stopPropagation()}>
            <div className="chub-sheet-head">
              <h3>Number type</h3>
              <button
                type="button"
                className="chub-sheet-close"
                onClick={() => setTypePicker(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="chub-list">
              {NUMBER_TYPES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={numberType === t.id ? 'chub-list-item active' : 'chub-list-item'}
                    onClick={() => {
                      setNumberType(t.id);
                      setTypePicker(false);
                    }}
                  >
                    <span>
                      <strong style={{ display: 'block' }}>{t.label}</strong>
                      <small style={{ color: '#64748B' }}>{t.hint}</small>
                    </span>
                    {numberType === t.id ? <span className="chub-check">✓</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {areaPicker && (
        <div className="chub-sheet-backdrop" onClick={() => setAreaPicker(false)}>
          <div className="chub-sheet list" onClick={(e) => e.stopPropagation()}>
            <div className="chub-sheet-head">
              <h3>Area code · {country.name}</h3>
              <button
                type="button"
                className="chub-sheet-close"
                onClick={() => setAreaPicker(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="chub-list">
              <li>
                <button
                  type="button"
                  className={!areaCode ? 'chub-list-item active' : 'chub-list-item'}
                  onClick={() => {
                    setAreaCode(null);
                    setAreaPicker(false);
                  }}
                >
                  <span>Any (all areas)</span>
                  {!areaCode ? <span className="chub-check">✓</span> : null}
                </button>
              </li>
              {areaCodes.map((a) => (
                <li key={a.code}>
                  <button
                    type="button"
                    className={areaCode === a.code ? 'chub-list-item active' : 'chub-list-item'}
                    onClick={() => {
                      setAreaCode(a.code);
                      setAreaPicker(false);
                    }}
                  >
                    <span>
                      <strong style={{ display: 'block' }}>{a.code}</strong>
                      <small style={{ color: '#64748B' }}>{a.label}</small>
                    </span>
                    {areaCode === a.code ? <span className="chub-check">✓</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
