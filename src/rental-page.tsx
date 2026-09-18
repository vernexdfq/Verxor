/**
 * Rent a Line — Call.com-style dedicated number workspace.
 * Tabs: Calls | Messages | Numbers | Credit
 * Buy: country → numbers → period → wallet
 * Per-number: Renew, Rename, DND, Voicemail, Forwarding, Transfer, Delete
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
  PhoneForwarded,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
  MicOff,
  Mic,
  BellOff,
  Bell,
} from 'lucide-react';
import './rental-page.css';

type MainTab = 'calls' | 'messages' | 'numbers' | 'credit';
type CallSub = 'history' | 'contacts' | 'keypad';
type View =
  | { kind: 'main' }
  | { kind: 'buy-country' }
  | { kind: 'buy-numbers'; country: Country }
  | { kind: 'buy-period'; country: Country; number: AvailableNumber }
  | { kind: 'line-settings'; lineId: string };

type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  type: 'VoIP' | 'Non-VoIP';
};

type AvailableNumber = {
  id: string;
  number: string;
  area: string;
  monthlyFrom: number;
};

type RentedLine = {
  id: string;
  label: string;
  number: string;
  flag: string;
  country: string;
  type: 'VoIP' | 'Non-VoIP';
  expiresAt: string;
  dnd: boolean;
  voicemail: boolean;
  callForward: string | null;
  smsForward: string | null;
};

type Line = {
  id: string;
  label: string;
  number: string;
  flag: string;
  type: 'rented' | 'sim';
};

const KEYS: { digit: string; letters: string }[] = [
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
];

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Non-VoIP' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'VoIP' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Non-VoIP' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', type: 'Non-VoIP' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', type: 'Non-VoIP' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', type: 'VoIP' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', type: 'VoIP' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', type: 'VoIP' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', type: 'VoIP' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', type: 'VoIP' },
];

/** Demo catalog — replace with live provider inventory. */
function demoNumbers(country: Country): AvailableNumber[] {
  const areas =
    country.code === 'US'
      ? [
          { area: 'New York, NY', prefix: '212' },
          { area: 'Los Angeles, CA', prefix: '213' },
          { area: 'Chicago, IL', prefix: '312' },
          { area: 'Houston, TX', prefix: '713' },
          { area: 'Miami, FL', prefix: '305' },
        ]
      : country.code === 'GB'
        ? [
            { area: 'London', prefix: '20' },
            { area: 'Manchester', prefix: '161' },
          ]
        : [
            { area: 'Capital', prefix: '1' },
            { area: 'Metro', prefix: '2' },
          ];

  return areas.map((a, i) => ({
    id: `${country.code}-${a.prefix}-${i}`,
    number: `${country.dial} ${a.prefix}${String(1000000 + i * 137).slice(0, 7)}`,
    area: a.area,
    monthlyFrom: country.type === 'Non-VoIP' ? 8500 + i * 400 : 5500 + i * 300,
  }));
}

const PERIODS = [
  { id: '7', label: '7 days', days: 7, mult: 0.35 },
  { id: '30', label: '30 days', days: 30, mult: 1 },
  { id: '90', label: '90 days', days: 90, mult: 2.6 },
  { id: '365', label: '12 months', days: 365, mult: 9 },
];

const money = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

function formatExp(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

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

export function RentalPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<MainTab>('numbers');
  const [callSub, setCallSub] = useState<CallSub>('history');
  const [view, setView] = useState<View>({ kind: 'main' });
  const [dial, setDial] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [numberSearch, setNumberSearch] = useState('');
  const [dialCountry, setDialCountry] = useState<Country>(COUNTRIES[0]);
  const [showDialCountry, setShowDialCountry] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [hint, setHint] = useState(true);
  const [lines, setLines] = useState<RentedLine[]>([]);
  const [fromLine, setFromLine] = useState<Line>({
    id: 'sim',
    label: 'Device SIM',
    number: 'Not linked',
    flag: '📱',
    type: 'sim',
  });
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renewOpen, setRenewOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState<'call' | 'sms' | null>(null);
  const [forwardValue, setForwardValue] = useState('');

  const fromOptions = useMemo<Line[]>(() => {
    const rented: Line[] = lines.map((l) => ({
      id: l.id,
      label: l.label,
      number: l.number,
      flag: l.flag,
      type: 'rented' as const,
    }));
    return [{ id: 'sim', label: 'Device SIM', number: 'Not linked', flag: '📱', type: 'sim' as const }, ...rented];
  }, [lines]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  const activeLine =
    view.kind === 'line-settings' ? lines.find((l) => l.id === view.lineId) ?? null : null;

  const updateLine = (id: string, patch: Partial<RentedLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const startBuy = () => {
    setCountrySearch('');
    setView({ kind: 'buy-country' });
  };

  const selectBuyCountry = (c: Country) => {
    setNumberSearch('');
    setView({ kind: 'buy-numbers', country: c });
  };

  const selectNumber = (country: Country, num: AvailableNumber) => {
    setView({ kind: 'buy-period', country, number: num });
  };

  const confirmRent = (country: Country, num: AvailableNumber, days: number) => {
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    const line: RentedLine = {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      label: `${country.name} line`,
      number: num.number,
      flag: country.flag,
      country: country.name,
      type: country.type,
      expiresAt: exp.toISOString(),
      dnd: false,
      voicemail: true,
      callForward: null,
      smsForward: null,
    };
    setLines((prev) => [line, ...prev]);
    setTab('numbers');
    setView({ kind: 'line-settings', lineId: line.id });
  };

  const releaseLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
    setView({ kind: 'main' });
    setTab('numbers');
  };

  const handleHeaderBack = () => {
    if (view.kind === 'main') onBack();
    else if (view.kind === 'buy-country') setView({ kind: 'main' });
    else if (view.kind === 'buy-numbers') setView({ kind: 'buy-country' });
    else if (view.kind === 'buy-period') setView({ kind: 'buy-numbers', country: view.country });
    else if (view.kind === 'line-settings') setView({ kind: 'main' });
  };

  const headerTitle =
    view.kind === 'main'
      ? tab === 'calls'
        ? 'Calls'
        : tab === 'messages'
          ? 'Messages'
          : tab === 'numbers'
            ? 'Numbers'
            : 'Credit'
      : view.kind === 'buy-country'
        ? 'Rent a number'
        : view.kind === 'buy-numbers'
          ? view.country.name
          : view.kind === 'buy-period'
            ? 'Choose period'
            : 'Number settings';

  /* ——— Buy: country ——— */
  if (view.kind === 'buy-country') {
    return (
      <div className="rental-page">
        <header className="rental-header">
          <button type="button" className="rental-icon-button" onClick={handleHeaderBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="rental-page-title">{headerTitle}</h1>
          <span className="rental-head-spacer" />
        </header>
        <div className="rental-content">
          <div className="contact-search">
            <Search size={16} />
            <input
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search country"
              autoFocus
            />
          </div>
          <p className="rental-hint-inline">
            <ShieldAlert size={14} /> VoIP may be restricted on some apps. Non-VoIP usually works better.
          </p>
          <div className="sheet-list inline-list">
            {filteredCountries.map((c) => (
              <button type="button" className="sheet-row" key={c.code} onClick={() => selectBuyCountry(c)}>
                <span className="country-flag">{c.flag}</span>
                <div>
                  <strong>{c.name}</strong>
                  <small>
                    <span className={c.type === 'Non-VoIP' ? 'type-good' : 'type-warn'}>{c.type}</span>
                    {' · '}Voice + SMS where supported
                  </small>
                </div>
                <span className="country-dial">{c.dial}</span>
              </button>
            ))}
            {!filteredCountries.length && <div className="sheet-empty">No countries match</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ——— Buy: numbers for country ——— */
  if (view.kind === 'buy-numbers') {
    const nums = demoNumbers(view.country).filter(
      (n) =>
        !numberSearch.trim() ||
        n.number.includes(numberSearch.trim()) ||
        n.area.toLowerCase().includes(numberSearch.trim().toLowerCase()),
    );
    return (
      <div className="rental-page">
        <header className="rental-header">
          <button type="button" className="rental-icon-button" onClick={handleHeaderBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="rental-page-title">
            {view.country.flag} {view.country.name}
          </h1>
          <span className="rental-head-spacer" />
        </header>
        <div className="rental-content">
          <div className="contact-search">
            <Search size={16} />
            <input
              value={numberSearch}
              onChange={(e) => setNumberSearch(e.target.value)}
              placeholder="Search area or number"
            />
          </div>
          <div className="sheet-list inline-list">
            {nums.map((n) => (
              <button
                type="button"
                className="sheet-row"
                key={n.id}
                onClick={() => selectNumber(view.country, n)}
              >
                <span className="line-icon">{view.country.flag}</span>
                <div>
                  <strong>{n.number}</strong>
                  <small>
                    {n.area} · from {money(n.monthlyFrom)}/mo
                  </small>
                </div>
                <span className="row-chevron">›</span>
              </button>
            ))}
            {!nums.length && (
              <div className="sheet-empty">No numbers match. Live inventory appears when a provider is connected.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ——— Buy: period ——— */
  if (view.kind === 'buy-period') {
    return (
      <div className="rental-page">
        <header className="rental-header">
          <button type="button" className="rental-icon-button" onClick={handleHeaderBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="rental-page-title">Choose period</h1>
          <span className="rental-head-spacer" />
        </header>
        <div className="rental-content">
          <div className="period-number-card">
            <strong>{view.number.number}</strong>
            <small>
              {view.country.flag} {view.country.name} · {view.number.area} · {view.country.type}
            </small>
          </div>
          <ul className="package-list">
            {PERIODS.map((p) => {
              const price = view.number.monthlyFrom * p.mult;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="package-row"
                    onClick={() => confirmRent(view.country, view.number, p.days)}
                  >
                    <div>
                      <strong>{p.label}</strong>
                      <small>Wallet debit · demo assign</small>
                    </div>
                    <span>{money(price)} ›</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="rental-footnote">
            Demo only. Live rent will charge your Verxor wallet and provision via the rental provider.
          </p>
        </div>
      </div>
    );
  }

  /* ——— Line settings (Call.com number settings) ——— */
  if (view.kind === 'line-settings' && activeLine) {
    return (
      <div className="rental-page">
        <header className="rental-header">
          <button type="button" className="rental-icon-button" onClick={handleHeaderBack} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="rental-page-title">Settings</h1>
          <span className="rental-head-spacer" />
        </header>

        <div className="line-settings-hero">
          <span className="line-settings-flag">{activeLine.flag}</span>
          <strong>{activeLine.label}</strong>
          <p>{activeLine.number}</p>
          <small>
            Exp. {formatExp(activeLine.expiresAt)} · {activeLine.type}
          </small>
        </div>

        <div className="settings-group">
          <button
            type="button"
            className="settings-row"
            onClick={() => {
              setRenewOpen(true);
            }}
          >
            <Clock size={18} />
            <div>
              <strong>Renew</strong>
              <small>Extend this number</small>
            </div>
            <span className="row-chevron">›</span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => {
              setRenameValue(activeLine.label);
              setRenameOpen(true);
            }}
          >
            <UserRound size={18} />
            <div>
              <strong>Rename</strong>
              <small>{activeLine.label}</small>
            </div>
            <span className="row-chevron">›</span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => updateLine(activeLine.id, { dnd: !activeLine.dnd })}
          >
            {activeLine.dnd ? <BellOff size={18} /> : <Bell size={18} />}
            <div>
              <strong>Do not disturb</strong>
              <small>{activeLine.dnd ? 'On' : 'Off'}</small>
            </div>
            <span className={`toggle-pill ${activeLine.dnd ? 'on' : ''}`} />
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => updateLine(activeLine.id, { voicemail: !activeLine.voicemail })}
          >
            {activeLine.voicemail ? <Mic size={18} /> : <MicOff size={18} />}
            <div>
              <strong>Voicemail</strong>
              <small>{activeLine.voicemail ? 'Enabled' : 'Off'} · greeting when provider supports it</small>
            </div>
            <span className={`toggle-pill ${activeLine.voicemail ? 'on' : ''}`} />
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => {
              setForwardValue(activeLine.callForward ?? '');
              setForwardOpen('call');
            }}
          >
            <PhoneForwarded size={18} />
            <div>
              <strong>Call forwarding</strong>
              <small>{activeLine.callForward ?? 'Off'}</small>
            </div>
            <span className="row-chevron">›</span>
          </button>

          <button
            type="button"
            className="settings-row"
            onClick={() => {
              setForwardValue(activeLine.smsForward ?? '');
              setForwardOpen('sms');
            }}
          >
            <MessageSquare size={18} />
            <div>
              <strong>SMS forwarding</strong>
              <small>{activeLine.smsForward ?? 'Off · email or mobile'}</small>
            </div>
            <span className="row-chevron">›</span>
          </button>

          <button type="button" className="settings-row" disabled>
            <Settings2 size={18} />
            <div>
              <strong>Transfer number</strong>
              <small>Move to another account · coming with live API</small>
            </div>
          </button>
        </div>

        <button type="button" className="delete-line-btn" onClick={() => releaseLine(activeLine.id)}>
          <Trash2 size={17} />
          Delete / release number
        </button>

        {/* Renew sheet */}
        {renewOpen && (
          <div className="sheet-layer">
            <button type="button" className="sheet-backdrop" onClick={() => setRenewOpen(false)} aria-label="Close" />
            <div className="sheet">
              <div className="sheet-head">
                <h2>Renew</h2>
                <button type="button" onClick={() => setRenewOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <ul className="package-list sheet-packages">
                {PERIODS.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="package-row"
                      onClick={() => {
                        const base = new Date(activeLine.expiresAt);
                        const from = base.getTime() > Date.now() ? base : new Date();
                        from.setDate(from.getDate() + p.days);
                        updateLine(activeLine.id, { expiresAt: from.toISOString() });
                        setRenewOpen(false);
                      }}
                    >
                      <div>
                        <strong>+{p.label}</strong>
                        <small>Extend from current expiry</small>
                      </div>
                      <span>Apply ›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Rename sheet */}
        {renameOpen && (
          <div className="sheet-layer">
            <button type="button" className="sheet-backdrop" onClick={() => setRenameOpen(false)} aria-label="Close" />
            <div className="sheet">
              <div className="sheet-head">
                <h2>Rename</h2>
                <button type="button" onClick={() => setRenameOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="sheet-form">
                <input
                  className="sheet-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
                <button
                  type="button"
                  className="blue-pill full"
                  onClick={() => {
                    if (renameValue.trim()) updateLine(activeLine.id, { label: renameValue.trim() });
                    setRenameOpen(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forward sheet */}
        {forwardOpen && (
          <div className="sheet-layer">
            <button type="button" className="sheet-backdrop" onClick={() => setForwardOpen(null)} aria-label="Close" />
            <div className="sheet">
              <div className="sheet-head">
                <h2>{forwardOpen === 'call' ? 'Call forwarding' : 'SMS forwarding'}</h2>
                <button type="button" onClick={() => setForwardOpen(null)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="sheet-form">
                <input
                  className="sheet-input"
                  value={forwardValue}
                  onChange={(e) => setForwardValue(e.target.value)}
                  placeholder={forwardOpen === 'call' ? 'Forward to phone number' : 'Email or mobile'}
                  autoFocus
                />
                <button
                  type="button"
                  className="blue-pill full"
                  onClick={() => {
                    const v = forwardValue.trim() || null;
                    if (forwardOpen === 'call') updateLine(activeLine.id, { callForward: v });
                    else updateLine(activeLine.id, { smsForward: v });
                    setForwardOpen(null);
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-clear"
                  onClick={() => {
                    if (forwardOpen === 'call') updateLine(activeLine.id, { callForward: null });
                    else updateLine(activeLine.id, { smsForward: null });
                    setForwardOpen(null);
                  }}
                >
                  Turn off
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ——— Main workspace (Call.com tabs) ——— */
  return (
    <div className="rental-page">
      <header className="rental-header">
        <button type="button" className="rental-icon-button" onClick={onBack} aria-label="Back to Verxor">
          <ArrowLeft size={20} />
        </button>
        <h1 className="rental-page-title">{headerTitle}</h1>
        <div className="rental-head-actions">
          {(tab === 'calls' || tab === 'numbers') && (
            <button type="button" className="rental-icon-button primary" onClick={startBuy} aria-label="Rent number">
              <Plus size={22} strokeWidth={2.2} />
            </button>
          )}
          {tab === 'messages' && (
            <button type="button" className="rental-icon-button primary" aria-label="New message">
              <MessageSquare size={20} />
            </button>
          )}
          {tab === 'credit' && <span className="rental-head-spacer" />}
        </div>
      </header>

      {tab === 'calls' && (
        <>
          {callSub === 'history' && (
            <section className="rental-content">
              <h3>Favorites</h3>
              {hint && (
                <div className="favorite-hint">
                  <span>☆</span>
                  <p>Star contacts to show them here for quick dial.</p>
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
                text="Rent a number, then outbound and inbound calls appear here."
                icon={<Clock size={40} />}
                action={
                  <button type="button" className="blue-pill" onClick={startBuy}>
                    Rent a number
                  </button>
                }
              />
            </section>
          )}

          {callSub === 'contacts' && (
            <section className="rental-content">
              <div className="contact-search">
                <Search size={16} />
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts"
                />
              </div>
              {lines.length === 0 ? (
                <EmptyState
                  title="No contacts yet"
                  text="Import device contacts or add people after you rent a line."
                  icon={<Users size={40} />}
                />
              ) : (
                <ul className="contact-list">
                  {lines
                    .filter(
                      (l) =>
                        !contactSearch.trim() ||
                        l.label.toLowerCase().includes(contactSearch.toLowerCase()) ||
                        l.number.replace(/\s/g, '').includes(contactSearch.replace(/\s/g, '')),
                    )
                    .map((l) => (
                      <li key={l.id}>
                        <div className="contact-avatar">{l.label.charAt(0)}</div>
                        <div>
                          <strong>{l.label}</strong>
                          <small>{l.number}</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFromLine({
                              id: l.id,
                              label: l.label,
                              number: l.number,
                              flag: l.flag,
                              type: 'rented',
                            });
                            setCallSub('keypad');
                          }}
                          aria-label={`Call from ${l.label}`}
                        >
                          <Phone size={18} />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </section>
          )}

          {callSub === 'keypad' && (
            <section className="keypad-section">
              <button type="button" className="from-pill" onClick={() => setShowFrom(true)}>
                {fromLine.label}
                <ChevronDown size={14} />
              </button>
              <div className="dial-display">
                <button type="button" onClick={() => setShowDialCountry(true)}>
                  {dialCountry.flag}
                  <ChevronDown size={14} />
                </button>
                <span>{dial || dialCountry.dial}</span>
              </div>
              <div className="dial-grid">
                {KEYS.map(({ digit, letters }) => (
                  <button
                    type="button"
                    key={digit}
                    onClick={() => setDial((d) => (d.length >= 18 ? d : d + digit))}
                  >
                    <strong>{digit}</strong>
                    <small>{letters || '\u00A0'}</small>
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
              <button type="button" className="browse-pill" onClick={startBuy}>
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
                className={callSub === id ? 'active' : ''}
                onClick={() => setCallSub(id)}
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
            <input placeholder="Search messages" />
          </div>
          <EmptyState
            title="No messages yet"
            text="SMS on your rented numbers appear here. Tap + after you have a line."
            icon={<MessageSquare size={48} strokeWidth={1.25} />}
            action={
              lines.length === 0 ? (
                <button type="button" className="blue-pill" onClick={startBuy}>
                  Rent a number
                </button>
              ) : undefined
            }
          />
        </section>
      )}

      {tab === 'numbers' && (
        <section className="rental-content">
          <div className="numbers-section-title">
            <h3>Phone numbers</h3>
            <button type="button" className="rental-icon-button primary" onClick={startBuy} aria-label="Add number">
              <Plus size={20} />
            </button>
          </div>
          {lines.length === 0 ? (
            <EmptyState
              title="No numbers yet"
              text="Rent a virtual number for calls and SMS. Active numbers, expiry and settings appear here."
              icon={<Hash size={48} strokeWidth={1.25} />}
              action={
                <button type="button" className="blue-pill" onClick={startBuy}>
                  Rent a number
                </button>
              }
            />
          ) : (
            <ul className="number-owned-list">
              {lines.map((l) => (
                <li key={l.id}>
                  <button type="button" className="number-owned-row" onClick={() => setView({ kind: 'line-settings', lineId: l.id })}>
                    <span className="country-flag">{l.flag}</span>
                    <div>
                      <strong>{l.label}</strong>
                      <small>{l.number}</small>
                      <small className="exp-line">Exp. {formatExp(l.expiresAt)}</small>
                    </div>
                    <span className="row-chevron">›</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'credit' && (
        <section className="rental-content credit-section">
          <div className="credit-hero">
            <small>Wallet balance</small>
            <strong>$0.00</strong>
            <button type="button" className="credit-topup" onClick={onBack}>
              <Wallet size={14} /> Fund Verxor wallet
            </button>
          </div>
          <p className="credit-note">
            Rentals and renewals are paid from your main Verxor wallet — no separate call-credit packs.
          </p>
          <h3>How billing works</h3>
          <ul className="credit-bullets">
            <li>Choose country and number</li>
            <li>Pick 7 days, 30 days, 90 days or 12 months</li>
            <li>Wallet is debited when the provider confirms</li>
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
            onClick={() => {
              setTab(id);
              setView({ kind: 'main' });
            }}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.3 : 1.75} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* From line sheet */}
      {showFrom && (
        <div className="sheet-layer">
          <button type="button" className="sheet-backdrop" onClick={() => setShowFrom(false)} aria-label="Close" />
          <div className="sheet">
            <div className="sheet-head">
              <h2>Call from</h2>
              <button type="button" onClick={() => setShowFrom(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {fromOptions.map((line) => (
              <button
                type="button"
                className="sheet-row"
                key={line.id}
                onClick={() => {
                  setFromLine(line);
                  setShowFrom(false);
                }}
              >
                <span className="line-icon">{line.type === 'sim' ? '▮' : line.flag}</span>
                <div>
                  <strong>{line.label}</strong>
                  <small>{line.number}</small>
                </div>
                {fromLine.id === line.id && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dial country sheet */}
      {showDialCountry && (
        <div className="sheet-layer">
          <button type="button" className="sheet-backdrop" onClick={() => setShowDialCountry(false)} aria-label="Close" />
          <div className="sheet country-sheet">
            <div className="sheet-head">
              <h2>Select country</h2>
              <button type="button" onClick={() => setShowDialCountry(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="sheet-search">
              <Search size={16} />
              <input
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country"
                autoFocus
              />
            </div>
            <div className="sheet-list">
              {filteredCountries.map((c) => (
                <button
                  type="button"
                  className="sheet-row"
                  key={c.code}
                  onClick={() => {
                    setDialCountry(c);
                    setDial('');
                    setShowDialCountry(false);
                    setCountrySearch('');
                  }}
                >
                  <span className="country-flag">{c.flag}</span>
                  <div>
                    <strong>{c.name}</strong>
                  </div>
                  <span className="country-dial">{c.dial}</span>
                  {dialCountry.code === c.code && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
