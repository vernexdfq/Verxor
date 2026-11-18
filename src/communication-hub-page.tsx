'use client';

import { useMemo, useState } from 'react';
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

const NUMBER_TYPES: { id: NumberType; label: string }[] = [
  { id: 'local', label: 'Local' },
  { id: 'toll-free', label: 'Toll-Free' },
  { id: 'mobile', label: 'Mobile' },
];

export function CommunicationHubPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<HubTab>('numbers');
  const [getOpen, setGetOpen] = useState(false);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [numberType, setNumberType] = useState<NumberType>('local');
  const [countryPicker, setCountryPicker] = useState(false);
  const [typePicker, setTypePicker] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Placeholder — real numbers will come from SignalWire later
  const myNumbers: never[] = [];

  const priceHint = useMemo(() => {
    // Placeholder pricing display until live SignalWire rates are wired
    return '$6.99/month · Voice & SMS included · 30-day billing';
  }, []);

  const openGetNumber = () => {
    setSearchError(null);
    setGetOpen(true);
  };

  const handleSearch = () => {
    setSearching(true);
    setSearchError(null);
    // UI-only for now — SignalWire search will replace this
    window.setTimeout(() => {
      setSearching(false);
      setSearchError(
        `Number search is not connected yet. ${country.name} (${numberType}) will be available once SignalWire is linked.`,
      );
    }, 900);
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
            ) : null}
          </section>
        )}

        {tab === 'call' && (
          <section className="chub-panel" aria-label="Make a Call">
            <div className="chub-panel-head">
              <div>
                <p className="chub-eyebrow">VOICE</p>
                <h2>Make a Call</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">CALL FROM</label>
              <button type="button" className="chub-select" onClick={openGetNumber}>
                <span>Select your number…</span>
                <ChevronDown size={16} />
              </button>
              <p className="chub-hint">
                You need a <button type="button" className="chub-link" onClick={openGetNumber}>communication number</button> first.
              </p>

              <label className="chub-label" style={{ marginTop: 16 }}>
                CALL TO
              </label>
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

              <button type="button" className="chub-call-btn" disabled>
                <PhoneCall size={18} /> Call
              </button>
            </div>
          </section>
        )}

        {tab === 'messages' && (
          <section className="chub-panel" aria-label="Messages">
            <div className="chub-panel-head">
              <div>
                <p className="chub-eyebrow">INBOX</p>
                <h2>Messages</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">NUMBER</label>
              <button type="button" className="chub-select" onClick={openGetNumber}>
                <span>Select your number…</span>
                <ChevronDown size={16} />
              </button>
              <button type="button" className="chub-secondary" disabled>
                <Plus size={16} /> New Message
              </button>
            </div>

            <div className="chub-empty compact">
              <div className="chub-empty-icon soft">
                <MessageSquare size={26} strokeWidth={1.7} />
              </div>
              <strong>No conversations yet</strong>
              <p>Select one of your numbers to see conversations.</p>
            </div>
          </section>
        )}

        {tab === 'history' && (
          <section className="chub-panel" aria-label="Call History">
            <div className="chub-panel-head">
              <div>
                <p className="chub-eyebrow">RECENT</p>
                <h2>Call History</h2>
              </div>
            </div>

            <div className="chub-form-card">
              <label className="chub-label">NUMBER</label>
              <button type="button" className="chub-select" onClick={openGetNumber}>
                <span>Select a number…</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="chub-empty compact">
              <div className="chub-empty-icon soft">
                <PhoneForwarded size={26} strokeWidth={1.7} />
              </div>
              <strong>No call history</strong>
              <p>Select a number to view call history.</p>
            </div>
          </section>
        )}
      </main>

      {/* Get a Phone Number sheet */}
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
              <button type="button" className="chub-sheet-close" onClick={() => setGetOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="chub-sheet-grid">
              <div>
                <label className="chub-label">COUNTRY</label>
                <button type="button" className="chub-select" onClick={() => setCountryPicker(true)}>
                  <span>
                    {country.flag} {country.name}
                  </span>
                  <ChevronDown size={16} />
                </button>
              </div>
              <div>
                <label className="chub-label">TYPE</label>
                <button type="button" className="chub-select" onClick={() => setTypePicker(true)}>
                  <span>{NUMBER_TYPES.find((t) => t.id === numberType)?.label}</span>
                  <ChevronDown size={16} />
                </button>
              </div>
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

      {/* Country picker */}
      {countryPicker && (
        <div className="chub-sheet-backdrop" onClick={() => setCountryPicker(false)}>
          <div className="chub-sheet list" onClick={(e) => e.stopPropagation()}>
            <div className="chub-sheet-head">
              <h3>Select country</h3>
              <button type="button" className="chub-sheet-close" onClick={() => setCountryPicker(false)} aria-label="Close">
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

      {/* Type picker */}
      {typePicker && (
        <div className="chub-sheet-backdrop" onClick={() => setTypePicker(false)}>
          <div className="chub-sheet list" onClick={(e) => e.stopPropagation()}>
            <div className="chub-sheet-head">
              <h3>Number type</h3>
              <button type="button" className="chub-sheet-close" onClick={() => setTypePicker(false)} aria-label="Close">
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
                    <span>{t.label}</span>
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
