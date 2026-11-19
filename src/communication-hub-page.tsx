'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Plus,
  Search,
  X,
} from 'lucide-react';
import './communication-hub-page.css';

type HubTab = 'numbers' | 'call' | 'messages' | 'history';

type NumberType = 'local' | 'toll-free' | 'mobile';

type HubNumber = {
  id: string;
  e164: string;
  friendly: string;
  country: string;
};

const TABS: { id: HubTab; label: string; icon: typeof Phone }[] = [
  { id: 'numbers', label: 'My Numbers', icon: Phone },
  { id: 'call', label: 'Make a Call', icon: PhoneCall },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'history', label: 'Call History', icon: PhoneForwarded },
];

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
];

const NUMBER_TYPES: { id: NumberType; label: string; hint: string }[] = [
  { id: 'local', label: 'Local', hint: 'City / area code numbers' },
  { id: 'toll-free', label: 'Toll-Free', hint: '800 / freephone style' },
  { id: 'mobile', label: 'Mobile', hint: 'Mobile range where available' },
];

export function CommunicationHubPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<HubTab>('numbers');
  const [getOpen, setGetOpen] = useState(false);
  const [dropdownFor, setDropdownFor] = useState<'call' | 'messages' | 'history' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [numberType, setNumberType] = useState<NumberType>('local');
  const [countryPicker, setCountryPicker] = useState(false);
  const [typePicker, setTypePicker] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Placeholder — real numbers will come from SignalWire / our API later
  const myNumbers: HubNumber[] = [];

  const selected = useMemo(
    () => myNumbers.find((n) => n.id === selectedId) ?? null,
    [myNumbers, selectedId],
  );

  const priceHint = useMemo(
    () => '$6.99/month · Voice & SMS included · 30-day billing',
    [],
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

  const handleSearch = () => {
    setSearching(true);
    setSearchError(null);
    window.setTimeout(() => {
      setSearching(false);
      setSearchError(
        `Number search is not connected yet. ${country.name} (${numberType}) will be available once SignalWire is linked.`,
      );
    }, 900);
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

            {myNumbers.length === 0 ? (
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
                        <small>{n.country}</small>
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

            <div className="chub-price-banner">{priceHint}</div>

            {searchError ? <div className="chub-alert">{searchError}</div> : null}

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
              {COUNTRIES.map((c) => (
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
    </div>
  );
}
