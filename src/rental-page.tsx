/**
 * Rent a Line — Call.com-style workspace for dedicated numbers.
 * Tabs: Calls (History | Contacts | Keypad) · Messages · Numbers · Wallet
 * Number detail: Renew, Rename, DND, Voicemail, Forwarding, Release
 * Buy: country → period → confirm (wallet). Demo until provider connected.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Delete,
  Filter,
  Grid3X3,
  Hash,
  MessageSquare,
  Mic,
  MoreVertical,
  Phone,
  PhoneForwarded,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import './rental-page.css';

type MainTab = 'calls' | 'messages' | 'numbers' | 'wallet';
type CallSub = 'history' | 'contacts' | 'keypad';
type View = 'main' | 'buy-country' | 'buy-duration' | 'buy-confirm' | 'line-detail';

type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  type: 'VoIP' | 'Non-VoIP';
  fromPrice: number;
};

type Duration = { id: string; label: string; days: number; multiplier: number };

type Line = {
  id: string;
  label: string;
  number: string;
  flag: string;
  country: string;
  type: 'VoIP' | 'Non-VoIP';
  expiresAt: string;
  dnd: boolean;
  callForward: string | null;
  smsForward: string | null;
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
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Non-VoIP', fromPrice: 8500 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Non-VoIP', fromPrice: 9200 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'VoIP', fromPrice: 7800 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', type: 'Non-VoIP', fromPrice: 8800 },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', type: 'Non-VoIP', fromPrice: 8600 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', type: 'VoIP', fromPrice: 9000 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', type: 'VoIP', fromPrice: 8400 },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', type: 'VoIP', fromPrice: 4500 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', type: 'VoIP', fromPrice: 5000 },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', type: 'VoIP', fromPrice: 4800 },
];

const DURATIONS: Duration[] = [
  { id: '7d', label: '7 days', days: 7, multiplier: 1 },
  { id: '30d', label: '30 days', days: 30, multiplier: 3.2 },
  { id: '90d', label: '90 days', days: 90, multiplier: 8 },
  { id: '365d', label: '12 months', days: 365, multiplier: 28 },
];

const money = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

function formatExp(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rl-empty">
      {icon}
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function RentalPage({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<View>('main');
  const [tab, setTab] = useState<MainTab>('numbers');
  const [callSub, setCallSub] = useState<CallSub>('history');
  const [lines, setLines] = useState<Line[]>([]);
  const [activeLine, setActiveLine] = useState<Line | null>(null);
  const [fromLine, setFromLine] = useState<Line | null>(null);

  const [dial, setDial] = useState('');
  const [dialCountry, setDialCountry] = useState<Country>(COUNTRIES[0]);
  const [contactQ, setContactQ] = useState('');
  const [msgQ, setMsgQ] = useState('');

  const [buyCountry, setBuyCountry] = useState<Country | null>(null);
  const [buyDuration, setBuyDuration] = useState<Duration | null>(null);
  const [countryQ, setCountryQ] = useState('');
  const [showDialCountry, setShowDialCountry] = useState(false);
  const [showFromSheet, setShowFromSheet] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [copied, setCopied] = useState(false);
  const [favHint, setFavHint] = useState(true);

  const filteredCountries = useMemo(() => {
    const q = countryQ.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countryQ]);

  const contacts = useMemo(() => {
    const q = contactQ.trim().toLowerCase();
    return lines.filter(
      (l) =>
        !q ||
        l.label.toLowerCase().includes(q) ||
        l.number.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    );
  }, [lines, contactQ]);

  const priceOf = (c: Country, d: Duration) => c.fromPrice * d.multiplier;

  const openBuy = () => {
    setBuyCountry(null);
    setBuyDuration(null);
    setCountryQ('');
    setView('buy-country');
  };

  const confirmBuy = () => {
    if (!buyCountry || !buyDuration) return;
    const exp = new Date();
    exp.setDate(exp.getDate() + buyDuration.days);
    const line: Line = {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      label: `${buyCountry.name} line`,
      number: `${buyCountry.dial} ${Math.floor(2000000000 + Math.random() * 7000000000)}`,
      flag: buyCountry.flag,
      country: buyCountry.name,
      type: buyCountry.type,
      expiresAt: exp.toISOString(),
      dnd: false,
      callForward: null,
      smsForward: null,
    };
    setLines((p) => [line, ...p]);
    setActiveLine(line);
    setFromLine(line);
    setTab('numbers');
    setView('line-detail');
  };

  const openLine = (line: Line) => {
    setActiveLine(line);
    setRenameVal(line.label);
    setShowRename(false);
    setView('line-detail');
  };

  const patchLine = (patch: Partial<Line>) => {
    if (!activeLine) return;
    const next = { ...activeLine, ...patch };
    setActiveLine(next);
    setLines((p) => p.map((l) => (l.id === next.id ? next : l)));
    if (fromLine?.id === next.id) setFromLine(next);
  };

  const renew = (d: Duration) => {
    if (!activeLine) return;
    const base = new Date(activeLine.expiresAt);
    const from = base.getTime() > Date.now() ? base : new Date();
    from.setDate(from.getDate() + d.days);
    patchLine({ expiresAt: from.toISOString() });
  };

  const release = () => {
    if (!activeLine) return;
    setLines((p) => p.filter((l) => l.id !== activeLine.id));
    if (fromLine?.id === activeLine.id) setFromLine(null);
    setActiveLine(null);
    setView('main');
    setTab('numbers');
  };

  const copyNum = async () => {
    if (!activeLine) return;
    try {
      await navigator.clipboard.writeText(activeLine.number.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const headerBack = () => {
    if (view === 'main') onBack();
    else if (view === 'buy-country') setView('main');
    else if (view === 'buy-duration') setView('buy-country');
    else if (view === 'buy-confirm') setView('buy-duration');
    else if (view === 'line-detail') {
      setView('main');
      setTab('numbers');
    }
  };

  const title =
    view === 'main'
      ? tab === 'calls'
        ? 'Calls'
        : tab === 'messages'
          ? 'Messages'
          : tab === 'numbers'
            ? 'Phone Numbers'
            : 'Wallet'
      : view === 'buy-country'
        ? 'Rent a number'
        : view === 'buy-duration'
          ? 'Rental period'
          : view === 'buy-confirm'
            ? 'Confirm'
            : 'Number settings';

  return (
    <div className="rl-page">
      <header className="rl-header">
        <button type="button" className="rl-icon" onClick={headerBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1>{title}</h1>
        <div className="rl-header-right">
          {view === 'main' && (tab === 'calls' || tab === 'numbers') && (
            <button type="button" className="rl-icon primary" onClick={openBuy} aria-label="Rent number">
              <Plus size={22} strokeWidth={2.2} />
            </button>
          )}
          {view === 'main' && tab === 'messages' && (
            <button type="button" className="rl-icon primary" aria-label="New message">
              <MessageSquare size={20} />
            </button>
          )}
          {view !== 'main' && <span className="rl-spacer" />}
        </div>
      </header>

      {/* ——— MAIN WORKSPACE ——— */}
      {view === 'main' && (
        <>
          {tab === 'calls' && (
            <>
              {callSub === 'history' && (
                <section className="rl-body">
                  <h3 className="rl-section-title">Favorites</h3>
                  {favHint && (
                    <div className="rl-hint-card">
                      <span>☆</span>
                      <p>Star contacts to see them here for faster calling.</p>
                      <button type="button" onClick={() => setFavHint(false)} aria-label="Dismiss">
                        ×
                      </button>
                    </div>
                  )}
                  <div className="rl-row-head">
                    <h3 className="rl-section-title">Recents</h3>
                    <div className="rl-row-actions">
                      <button type="button" aria-label="Filter">
                        <Filter size={18} />
                      </button>
                      <button type="button" aria-label="More">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                  <Empty
                    icon={<Clock size={40} strokeWidth={1.25} />}
                    title="No call history"
                    text="Rent a number, then outbound and inbound calls appear here."
                    action={
                      <button type="button" className="rl-pill" onClick={openBuy}>
                        Rent a number
                      </button>
                    }
                  />
                </section>
              )}

              {callSub === 'contacts' && (
                <section className="rl-body">
                  <div className="rl-search">
                    <Search size={16} />
                    <input
                      value={contactQ}
                      onChange={(e) => setContactQ(e.target.value)}
                      placeholder="Search contacts"
                    />
                  </div>
                  {contacts.length === 0 ? (
                    <Empty
                      icon={<Users size={40} strokeWidth={1.25} />}
                      title="No contacts yet"
                      text="Your rented lines and synced contacts will show here."
                    />
                  ) : (
                    <ul className="rl-contact-list">
                      {contacts.map((l) => (
                        <li key={l.id}>
                          <div className="rl-avatar">{l.label.charAt(0).toUpperCase()}</div>
                          <div>
                            <strong>{l.label}</strong>
                            <small>{l.number}</small>
                          </div>
                          <button
                            type="button"
                            className="rl-call-mini"
                            onClick={() => {
                              setFromLine(l);
                              setCallSub('keypad');
                            }}
                            aria-label={`Call ${l.label}`}
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
                <section className="rl-keypad">
                  <button type="button" className="rl-from-pill" onClick={() => setShowFromSheet(true)}>
                    {fromLine ? fromLine.label : 'Select line'}
                    <ChevronDown size={14} />
                  </button>
                  <div className="rl-dial-display">
                    <button type="button" onClick={() => setShowDialCountry(true)}>
                      {dialCountry.flag}
                      <ChevronDown size={14} />
                    </button>
                    <span>{dial || dialCountry.dial}</span>
                  </div>
                  <div className="rl-dial-grid">
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
                  <div className="rl-dial-actions">
                    <div />
                    <button type="button" className="rl-call-btn" aria-label="Call">
                      <Phone size={26} fill="#fff" strokeWidth={0} />
                    </button>
                    <button
                      type="button"
                      className="rl-del-btn"
                      onClick={() => setDial((d) => d.slice(0, -1))}
                      aria-label="Delete"
                    >
                      <Delete size={17} />
                    </button>
                  </div>
                  <button type="button" className="rl-browse" onClick={openBuy}>
                    <Hash size={14} /> Browse & rent numbers
                  </button>
                </section>
              )}

              <div className="rl-call-subnav">
                {(
                  [
                    { id: 'history' as const, label: 'History', Icon: Clock },
                    { id: 'contacts' as const, label: 'Contacts', Icon: Users },
                    { id: 'keypad' as const, label: 'Keypad', Icon: Grid3X3 },
                  ] as const
                ).map(({ id, label, Icon }) => (
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
            <section className="rl-body">
              <div className="rl-search">
                <Search size={16} />
                <input value={msgQ} onChange={(e) => setMsgQ(e.target.value)} placeholder="Search" />
              </div>
              <Empty
                icon={<MessageSquare size={48} strokeWidth={1.25} />}
                title="No messages yet"
                text="SMS to and from your rented numbers will appear here."
              />
            </section>
          )}

          {tab === 'numbers' && (
            <section className="rl-body">
              <div className="rl-notice">
                <ShieldAlert size={15} />
                <span>
                  VoIP may be blocked on strict apps. Non-VoIP is usually more compatible. Voice + SMS where the
                  provider supports them.
                </span>
              </div>
              {lines.length === 0 ? (
                <Empty
                  icon={<Hash size={48} strokeWidth={1.25} />}
                  title="No numbers yet"
                  text="Rent a virtual number for calls and SMS. Active numbers, expiry and status show here."
                  action={
                    <button type="button" className="rl-pill" onClick={openBuy}>
                      Rent a number
                    </button>
                  }
                />
              ) : (
                <ul className="rl-number-list">
                  {lines.map((l) => (
                    <li key={l.id}>
                      <button type="button" className="rl-number-row" onClick={() => openLine(l)}>
                        <span className="rl-flag">{l.flag}</span>
                        <span>
                          <strong>{l.label}</strong>
                          <small>{l.number}</small>
                          <small className="rl-exp">
                            Exp. {formatExp(l.expiresAt)} ·{' '}
                            <em className={l.type === 'Non-VoIP' ? 'good' : 'warn'}>{l.type}</em>
                          </small>
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === 'wallet' && (
            <section className="rl-body rl-wallet">
              <div className="rl-wallet-card">
                <small>Available balance</small>
                <strong>$0.00</strong>
                <button type="button" className="rl-wallet-fund" onClick={onBack}>
                  <Wallet size={14} /> Fund wallet in Verxor
                </button>
              </div>
              <p className="rl-wallet-note">
                Rentals are paid from your Verxor wallet. There is no separate call-credit balance.
              </p>
            </section>
          )}

          <nav className="rl-tabs" aria-label="Rental navigation">
            {(
              [
                ['calls', 'Calls', Phone],
                ['messages', 'Messages', MessageSquare],
                ['numbers', 'Numbers', Hash],
                ['wallet', 'Wallet', Wallet],
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
        </>
      )}

      {/* ——— BUY: COUNTRY ——— */}
      {view === 'buy-country' && (
        <section className="rl-body">
          <p className="rl-lead">Choose a country for your dedicated line.</p>
          <div className="rl-search">
            <Search size={16} />
            <input
              value={countryQ}
              onChange={(e) => setCountryQ(e.target.value)}
              placeholder="Search country"
              autoFocus
            />
          </div>
          <div className="rl-country-list">
            {filteredCountries.map((c) => (
              <button
                type="button"
                key={c.code}
                className="rl-country-row"
                onClick={() => {
                  setBuyCountry(c);
                  setBuyDuration(null);
                  setView('buy-duration');
                }}
              >
                <span className="rl-flag">{c.flag}</span>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.dial} · <em className={c.type === 'Non-VoIP' ? 'good' : 'warn'}>{c.type}</em> · from{' '}
                    {money(c.fromPrice)}/7d
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!filteredCountries.length && <div className="rl-sheet-empty">No countries match</div>}
          </div>
        </section>
      )}

      {/* ——— BUY: DURATION ——— */}
      {view === 'buy-duration' && buyCountry && (
        <section className="rl-body">
          <p className="rl-lead">
            {buyCountry.flag} {buyCountry.name} · {buyCountry.type}
          </p>
          <div className="rl-duration-list">
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d.id}
                className="rl-duration-row"
                onClick={() => {
                  setBuyDuration(d);
                  setView('buy-confirm');
                }}
              >
                <span>
                  <strong>{d.label}</strong>
                  <small>Voice + SMS where supported</small>
                </span>
                <span className="rl-price">
                  {money(priceOf(buyCountry, d))}
                  <ChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ——— BUY: CONFIRM ——— */}
      {view === 'buy-confirm' && buyCountry && buyDuration && (
        <section className="rl-body">
          <div className="rl-confirm-card">
            <div>
              <span>Country</span>
              <strong>
                {buyCountry.flag} {buyCountry.name}
              </strong>
            </div>
            <div>
              <span>Type</span>
              <strong className={buyCountry.type === 'Non-VoIP' ? 'good' : 'warn'}>{buyCountry.type}</strong>
            </div>
            <div>
              <span>Period</span>
              <strong>{buyDuration.label}</strong>
            </div>
            <div className="total">
              <span>Total</span>
              <strong>{money(priceOf(buyCountry, buyDuration))}</strong>
            </div>
          </div>
          <button type="button" className="rl-pill full" onClick={confirmBuy}>
            Confirm & rent (demo)
          </button>
          <p className="rl-foot">Demo only. Live rent debits wallet and assigns a provider number.</p>
        </section>
      )}

      {/* ——— LINE DETAIL / SETTINGS ——— */}
      {view === 'line-detail' && activeLine && (
        <section className="rl-body rl-detail">
          <div className="rl-detail-head">
            <span className="rl-detail-flag">{activeLine.flag}</span>
            <strong>{activeLine.label}</strong>
            <p>{activeLine.number}</p>
            <button type="button" className="rl-copy" onClick={copyNum}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <small>
              Exp. {formatExp(activeLine.expiresAt)} ·{' '}
              <em className={activeLine.type === 'Non-VoIP' ? 'good' : 'warn'}>{activeLine.type}</em>
            </small>
          </div>

          <h3 className="rl-section-title">Settings</h3>
          <div className="rl-settings">
            <button
              type="button"
              className="rl-set-row"
              onClick={() => {
                setRenameVal(activeLine.label);
                setShowRename(true);
              }}
            >
              <UserRound size={18} />
              <span>
                <strong>Rename</strong>
                <small>{activeLine.label}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => patchLine({ dnd: !activeLine.dnd })}>
              <Phone size={18} />
              <span>
                <strong>Do not disturb</strong>
                <small>{activeLine.dnd ? 'On' : 'Off'}</small>
              </span>
              <span className={`rl-switch ${activeLine.dnd ? 'on' : ''}`} />
            </button>
            <button
              type="button"
              className="rl-set-row"
              onClick={() =>
                patchLine({
                  callForward: activeLine.callForward ? null : 'Set when provider is live',
                })
              }
            >
              <PhoneForwarded size={18} />
              <span>
                <strong>Call forwarding</strong>
                <small>{activeLine.callForward ?? 'Off'}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <div className="rl-set-row static">
              <Mic size={18} />
              <span>
                <strong>Voicemail</strong>
                <small>Greeting & message leaving — provider dependent</small>
              </span>
            </div>
            <div className="rl-set-row static">
              <MessageSquare size={18} />
              <span>
                <strong>SMS forwarding</strong>
                <small>Email / webhook when supported</small>
              </span>
            </div>
          </div>

          <h3 className="rl-section-title">Renew</h3>
          <div className="rl-renew">
            {DURATIONS.map((d) => (
              <button type="button" key={d.id} className="rl-renew-chip" onClick={() => renew(d)}>
                +{d.label}
              </button>
            ))}
          </div>

          <button type="button" className="rl-danger" onClick={release}>
            <Trash2 size={17} /> Delete / release number
          </button>
        </section>
      )}

      {/* Sheets */}
      {showFromSheet && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowFromSheet(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head">
              <h2>Call from</h2>
              <button type="button" onClick={() => setShowFromSheet(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {lines.length === 0 ? (
              <div className="rl-sheet-empty">Rent a number first</div>
            ) : (
              lines.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className="rl-sheet-row"
                  onClick={() => {
                    setFromLine(l);
                    setShowFromSheet(false);
                  }}
                >
                  <span className="rl-flag">{l.flag}</span>
                  <span>
                    <strong>{l.label}</strong>
                    <small>{l.number}</small>
                  </span>
                  {fromLine?.id === l.id && <Check size={18} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showDialCountry && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowDialCountry(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head">
              <h2>Select country</h2>
              <button type="button" onClick={() => setShowDialCountry(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="rl-sheet-scroll">
              {COUNTRIES.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  className="rl-sheet-row"
                  onClick={() => {
                    setDialCountry(c);
                    setDial('');
                    setShowDialCountry(false);
                  }}
                >
                  <span className="rl-flag">{c.flag}</span>
                  <span>
                    <strong>{c.name}</strong>
                  </span>
                  <span className="rl-dial-code">{c.dial}</span>
                  {dialCountry.code === c.code && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRename && activeLine && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowRename(false)} aria-label="Close" />
          <div className="rl-sheet rl-sheet-compact">
            <div className="rl-sheet-head">
              <h2>Rename</h2>
              <button type="button" onClick={() => setShowRename(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <input
              className="rl-rename-input"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              maxLength={40}
              autoFocus
            />
            <button
              type="button"
              className="rl-pill full"
              onClick={() => {
                if (renameVal.trim()) patchLine({ label: renameVal.trim() });
                setShowRename(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
