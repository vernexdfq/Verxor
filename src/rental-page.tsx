/**
 * Rental workspace — Vernex UI structure, Verxor Vite SPA (no TanStack/Supabase).
 * Local state + empty inventory until providers are connected.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Delete,
  Filter,
  Grid3X3,
  Hash,
  MessageSquare,
  MoreVertical,
  Phone,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import './rental-page.css';

type Tab = 'calls' | 'messages' | 'numbers' | 'credit';
type CallTab = 'history' | 'contacts' | 'keypad';
type Line = { id: string; label: string; number: string; flag: string; type: 'rented' | 'sim' };
type Country = { code: string; name: string; dial: string; flag: string };

type RentalPageProps = { onBack: () => void };

const KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
] as const;

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
];

const PACKAGES = ['₦5,000', '₦10,000', '₦20,000', '₦50,000'];

function EmptyState({
  title,
  text,
  icon,
  action,
}: {
  title: string;
  text: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rental-empty">
      {icon}
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

function CountrySheet({
  open,
  browse,
  search,
  setSearch,
  country,
  onClose,
  onSelect,
}: {
  open: boolean;
  browse: boolean;
  search: string;
  setSearch: (v: string) => void;
  country: Country;
  onClose: () => void;
  onSelect: (c: Country) => void;
}) {
  if (!open) return null;
  const q = search.trim().toLowerCase();
  const filtered = COUNTRIES.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q),
  );
  return (
    <div className="sheet-layer">
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="sheet country-sheet">
        <div className="sheet-head">
          <h2>{browse ? 'Rent a number' : 'Select country'}</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="sheet-search">
          <Search size={16} />
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search country" />
        </div>
        <div className="sheet-list">
          {filtered.length === 0 ? (
            <div className="sheet-empty">No countries match</div>
          ) : (
            filtered.map((c) => (
              <button type="button" className="sheet-row" key={c.code} onClick={() => onSelect(c)}>
                <span className="country-flag">{c.flag}</span>
                <div>
                  <strong>{c.name}</strong>
                  {browse && <small>Provider inventory will determine availability</small>}
                </div>
                <span className="country-dial">{c.dial}</span>
                {!browse && country.code === c.code && <Check size={18} />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FromSheet({
  open,
  lines,
  selected,
  onClose,
  onSelect,
}: {
  open: boolean;
  lines: Line[];
  selected: Line;
  onClose: () => void;
  onSelect: (l: Line) => void;
}) {
  if (!open) return null;
  return (
    <div className="sheet-layer">
      <button type="button" className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="sheet">
        <div className="sheet-head">
          <h2>Call from</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {lines.map((line) => (
          <button type="button" className="sheet-row" key={line.id} onClick={() => onSelect(line)}>
            <span className="line-icon">{line.type === 'sim' ? '▮' : line.flag}</span>
            <div>
              <strong>{line.label}</strong>
              <small>{line.number}</small>
            </div>
            {selected.id === line.id && <Check size={18} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Catalog({ country, onBack }: { country: Country; onBack: () => void }) {
  const [plan, setPlan] = useState('1 Month');
  const plans = ['1 Week', '1 Month', '1 Year'];

  return (
    <div className="catalog-page">
      <header className="catalog-head">
        <button type="button" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <strong>
            {country.flag} {country.name}
          </strong>
          <small>{country.dial} · available numbers from connected providers</small>
        </div>
      </header>
      <div className="catalog-body">
        <div className="catalog-empty-state">
          <Hash size={40} strokeWidth={1.25} />
          <strong>No live inventory yet</strong>
          <p>
            Number catalog will load from the rental provider once SignalWire / DIDWW (or another
            provider) is connected. No demo numbers are shown as real inventory.
          </p>
        </div>
      </div>
    </div>
  );
}

export function RentalPage({ onBack }: RentalPageProps) {
  const [tab, setTab] = useState<Tab>('calls');
  const [callTab, setCallTab] = useState<CallTab>('history');
  const [dial, setDial] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountry, setShowCountry] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [fromLine, setFromLine] = useState<Line>({
    id: 'sim',
    label: 'SIM Number',
    number: '+234 —',
    flag: '🇳🇬',
    type: 'sim',
  });
  const [catalog, setCatalog] = useState<Country | null>(null);
  const [hint, setHint] = useState(true);

  const lines = useMemo<Line[]>(() => [fromLine], [fromLine]);
  const rentedContacts = useMemo(
    () =>
      lines.filter(
        (line) =>
          line.type === 'rented' &&
          (line.label.toLowerCase().includes(contactSearch.toLowerCase()) ||
            line.number.replace(/\s/g, '').includes(contactSearch.replace(/\s/g, ''))),
      ),
    [lines, contactSearch],
  );

  if (catalog) return <Catalog country={catalog} onBack={() => setCatalog(null)} />;

  const openBrowse = () => {
    setBrowse(true);
    setShowCountry(true);
  };
  const openDialCountry = () => {
    setBrowse(false);
    setShowCountry(true);
  };
  const selectCountry = (c: Country) => {
    setCountry(c);
    setCountrySearch('');
    setShowCountry(false);
    if (browse) setCatalog(c);
    setBrowse(false);
    setDial('');
  };

  const tabTitle =
    tab === 'calls' ? 'Calls' : tab === 'messages' ? 'Messages' : tab === 'numbers' ? 'Numbers' : 'Credit';

  return (
    <div className="rental-page">
      <header className="rental-header">
        <button type="button" className="rental-icon-button" onClick={onBack} aria-label="Back to Verxor">
          <ArrowLeft size={20} />
        </button>
        <h1 className="rental-page-title">{tabTitle}</h1>
        <div className="rental-head-actions">
          {tab === 'calls' || tab === 'numbers' ? (
            <button type="button" className="rental-icon-button primary" onClick={openBrowse} aria-label="Rent number">
              <Plus size={22} strokeWidth={2.2} />
            </button>
          ) : tab === 'messages' ? (
            <button type="button" className="rental-icon-button primary" aria-label="New message">
              <MessageSquare size={20} />
            </button>
          ) : (
            <span className="rental-head-spacer" />
          )}
        </div>
      </header>

      {tab === 'calls' && (
        <>
          {callTab === 'history' && (
            <section className="rental-content">
              <h3>Favorites</h3>
              {hint && (
                <div className="favorite-hint">
                  <span>☆</span>
                  <p>
                    Adding contacts as favorite will make them appear here — <u>learn more</u>
                  </p>
                  <button type="button" onClick={() => setHint(false)} aria-label="Dismiss">
                    ×
                  </button>
                </div>
              )}
              <div className="recent-head">
                <h3>Recents</h3>
                <div>
                  <button type="button" aria-label="Filter">
                    <Filter size={18} />
                  </button>
                  <button type="button" aria-label="More">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
              <EmptyState
                title="No call history"
                text="Rent a number with + then calls appear here."
                icon={<Clock size={40} />}
                action={
                  <button type="button" className="blue-pill" onClick={openBrowse}>
                    Rent a number
                  </button>
                }
              />
            </section>
          )}

          {callTab === 'contacts' && (
            <section className="rental-content">
              <div className="contact-search">
                <Search size={16} />
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts"
                />
              </div>
              {rentedContacts.length === 0 ? (
                <EmptyState
                  title="No contacts yet"
                  text="Contacts from rented lines show up here."
                  icon={<Users size={40} />}
                />
              ) : (
                <ul className="contact-list">
                  {rentedContacts.map((line) => (
                    <li key={line.id}>
                      <div className="contact-avatar">{line.label.charAt(0)}</div>
                      <div>
                        <strong>{line.label}</strong>
                        <small>{line.number}</small>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFromLine(line);
                          setCallTab('keypad');
                        }}
                        aria-label={`Call ${line.label}`}
                      >
                        <Phone size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {callTab === 'keypad' && (
            <section className="keypad-section">
              <button type="button" className="from-pill" onClick={() => setShowFrom(true)}>
                {fromLine.label}
                <ChevronDown size={14} />
              </button>
              <div className="dial-display">
                <button type="button" onClick={openDialCountry}>
                  {country.flag}
                  <ChevronDown size={14} />
                </button>
                <span>{dial || country.dial}</span>
              </div>
              <div className="dial-grid">
                {KEYS.map(({ digit, letters }) => (
                  <button
                    type="button"
                    key={digit}
                    onClick={() => setDial((d) => (d.length >= 18 ? d : d + digit))}
                  >
                    <strong>{digit}</strong>
                    {letters ? <small>{letters}</small> : digit === '0' ? <small>+</small> : <small>&nbsp;</small>}
                  </button>
                ))}
              </div>
              <div className="dial-actions">
                <div className="dial-spacer" />
                <button type="button" className="call-button" aria-label="Call">
                  <Phone size={27} fill="white" strokeWidth={0} />
                </button>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => setDial((d) => d.slice(0, -1))}
                  aria-label="Delete"
                >
                  <Delete size={17} />
                </button>
              </div>
              <button type="button" className="browse-pill" onClick={openBrowse}>
                <Hash size={14} /> Browse & rent numbers
              </button>
            </section>
          )}

          <div className="calls-subnav">
            {(
              [
                { id: 'history' as const, label: 'History', icon: Clock },
                { id: 'contacts' as const, label: 'Contacts', icon: Users },
                { id: 'keypad' as const, label: 'Keypad', icon: Grid3X3 },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={callTab === id ? 'active' : ''}
                onClick={() => setCallTab(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'messages' && (
        <section className="rental-content">
          <div className="contact-search">
            <Search size={16} />
            <input placeholder="Search" />
          </div>
          <EmptyState
            title="No messages yet"
            text="SMS from your rented numbers will show up here."
            icon={<MessageSquare size={48} strokeWidth={1.25} />}
          />
        </section>
      )}

      {tab === 'numbers' && (
        <section className="rental-content">
          <EmptyState
            title="No numbers yet"
            text="Rent a virtual number for calls and SMS. Your active numbers, expiry dates and status will appear here."
            icon={<Hash size={48} strokeWidth={1.25} />}
            action={
              <button type="button" className="blue-pill" onClick={openBrowse}>
                Rent a number
              </button>
            }
          />
        </section>
      )}

      {tab === 'credit' && (
        <section className="rental-content credit-section">
          <div className="credit-hero">
            <small>Available credit</small>
            <strong>₦0.00</strong>
            <button type="button" className="credit-topup" onClick={onBack}>
              <Wallet size={14} /> Top up wallet
            </button>
          </div>
          <h3>Top-up packages</h3>
          <ul className="package-list">
            {PACKAGES.map((v) => (
              <li key={v}>
                <button type="button" className="package-row" onClick={onBack}>
                  <div>
                    <strong>{v}</strong>
                    <small>Wallet credit</small>
                  </div>
                  <span>{v} ›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="rental-tabs" aria-label="Rental navigation">
        {(
          [
            ['calls', 'Calls', Phone],
            ['messages', 'Messages', MessageSquare],
            ['numbers', 'Numbers', Hash],
            ['credit', 'Credit', Wallet],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.3 : 1.75} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <FromSheet
        open={showFrom}
        lines={lines}
        selected={fromLine}
        onClose={() => setShowFrom(false)}
        onSelect={(l) => {
          setFromLine(l);
          setShowFrom(false);
        }}
      />
      <CountrySheet
        open={showCountry}
        browse={browse}
        search={countrySearch}
        setSearch={setCountrySearch}
        country={country}
        onClose={() => {
          setShowCountry(false);
          setCountrySearch('');
          setBrowse(false);
        }}
        onSelect={selectCountry}
      />
    </div>
  );
}
