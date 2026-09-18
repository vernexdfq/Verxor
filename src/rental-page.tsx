/**
 * Rent a Line — Call.com-structure workspace (Vernex brand, wallet-only).
 * Tabs: Calls · Messages · Numbers · Wallet · Settings
 * Buy: Country → Region → Number → Period → Confirm
 * Number settings: Renew · Rename · DND · Voicemail · Forwarding · Transfer · Delete
 * Travel Data / eSIM: Coming soon
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Delete,
  Filter,
  Grid3X3,
  Hash,
  HelpCircle,
  LogOut,
  MessageSquare,
  Mic,
  MoreVertical,
  Phone,
  PhoneForwarded,
  Plus,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import './rental-page.css';

type MainTab = 'calls' | 'messages' | 'numbers' | 'wallet' | 'settings';
type CallSub = 'history' | 'contacts' | 'keypad';
type NumbersSub = 'phone' | 'esim';
type View =
  | 'main'
  | 'buy-country'
  | 'buy-region'
  | 'buy-numbers'
  | 'buy-period'
  | 'buy-confirm'
  | 'line-settings'
  | 'line-renew'
  | 'line-rename'
  | 'line-dnd'
  | 'line-voicemail'
  | 'line-forwarding'
  | 'line-transfer';

type Country = {
  code: string;
  name: string;
  dial: string;
  flag: string;
  type: 'VoIP' | 'Non-VoIP';
  fromPrice: number;
};

type Region = { id: string; name: string; area: string; city: string };

type AvailNumber = { id: string; e164: string; display: string };

type Period = { id: string; label: string; months: number; priceMul: number };

type Line = {
  id: string;
  label: string;
  number: string;
  flag: string;
  country: string;
  countryCode: string;
  type: 'VoIP' | 'Non-VoIP';
  expiresAt: string;
  dnd: boolean;
  voicemail: boolean;
  leaveMessage: boolean;
  smsToEmail: boolean;
  smsToMobile: boolean;
  callToPhone: boolean;
  forwardTarget: string;
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
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Non-VoIP', fromPrice: 699 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'VoIP', fromPrice: 649 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Non-VoIP', fromPrice: 799 },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷', type: 'Non-VoIP', fromPrice: 699 },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', type: 'VoIP', fromPrice: 749 },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱', type: 'VoIP', fromPrice: 899 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', type: 'Non-VoIP', fromPrice: 849 },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', type: 'Non-VoIP', fromPrice: 799 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', type: 'VoIP', fromPrice: 899 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', type: 'VoIP', fromPrice: 799 },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', type: 'VoIP', fromPrice: 399 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', type: 'VoIP', fromPrice: 449 },
];

const REGIONS: Record<string, Region[]> = {
  US: [
    { id: 'us-al-256', name: 'Alabama', area: '256', city: 'Huntsville' },
    { id: 'us-al-251', name: 'Alabama', area: '251', city: 'Mobile' },
    { id: 'us-al-334', name: 'Alabama', area: '334', city: 'Montgomery' },
    { id: 'us-az-520', name: 'Arizona', area: '520', city: 'Phoenix' },
    { id: 'us-az-623', name: 'Arizona', area: '623', city: 'Phoenix' },
    { id: 'us-ca-213', name: 'California', area: '213', city: 'Los Angeles' },
    { id: 'us-ca-415', name: 'California', area: '415', city: 'San Francisco' },
    { id: 'us-ny-212', name: 'New York', area: '212', city: 'New York' },
    { id: 'us-tx-214', name: 'Texas', area: '214', city: 'Dallas' },
    { id: 'us-fl-305', name: 'Florida', area: '305', city: 'Miami' },
  ],
  CA: [
    { id: 'ca-on-416', name: 'Ontario', area: '416', city: 'Toronto' },
    { id: 'ca-on-647', name: 'Ontario', area: '647', city: 'Toronto' },
    { id: 'ca-on-613', name: 'Ontario', area: '613', city: 'Ottawa' },
    { id: 'ca-qc-514', name: 'Quebec', area: '514', city: 'Montreal' },
    { id: 'ca-bc-604', name: 'British Columbia', area: '604', city: 'Vancouver' },
    { id: 'ca-bc-236', name: 'British Columbia', area: '236', city: '150 Mile House' },
  ],
  GB: [
    { id: 'gb-ldn-20', name: 'London', area: '20', city: 'London' },
    { id: 'gb-man-161', name: 'Manchester', area: '161', city: 'Manchester' },
    { id: 'gb-bir-121', name: 'Birmingham', area: '121', city: 'Birmingham' },
  ],
  PR: [
    { id: 'pr-787', name: 'Puerto Rico', area: '787', city: 'San Juan' },
    { id: 'pr-939', name: 'Puerto Rico', area: '939', city: 'San Juan' },
  ],
};

const PERIODS: Period[] = [
  { id: '1m', label: '1 Month', months: 1, priceMul: 1 },
  { id: '3m', label: '3 Months', months: 3, priceMul: 2.4 },
  { id: '12m', label: '12 Months', months: 12, priceMul: 7.2 },
];

const DEMO_HISTORY = [
  { id: '1', name: '+1 860 724 2481', sub: 'Voicemail · Line', date: '15/07/26', kind: 'vm' as const },
  { id: '2', name: '+1 860 724 2481', sub: 'Outgoing · United States', date: '15/07/26', kind: 'out' as const },
  { id: '3', name: 'Dennykay', sub: 'Outgoing · Nigeria', date: '08/07/26', kind: 'out' as const },
];

const money = (cents: number) => {
  const n = cents / 100;
  return n >= 10 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
};

function formatExp(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function makeAvail(country: Country, region: Region): AvailNumber[] {
  const base = Number(region.area) || 200;
  return Array.from({ length: 12 }, (_, i) => {
    const mid = String(100 + ((base * 7 + i * 13) % 900)).padStart(3, '0');
    const last = String(1000 + ((base * 11 + i * 17) % 9000)).padStart(4, '0');
    const local = `${region.area}${mid}${last}`;
    const e164 = `${country.dial}${local}`;
    return {
      id: `${region.id}-${i}`,
      e164,
      display: `${country.dial} ${region.area} ${mid} ${last}`,
    };
  });
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
  const [numSub, setNumSub] = useState<NumbersSub>('phone');
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<Line | null>(null);
  const [fromLine, setFromLine] = useState<Line | null>(null);

  const [dial, setDial] = useState('');
  const [dialCountry, setDialCountry] = useState<Country>(COUNTRIES[0]);
  const [contactQ, setContactQ] = useState('');
  const [msgQ, setMsgQ] = useState('');
  const [favHint, setFavHint] = useState(true);

  const [buyCountry, setBuyCountry] = useState<Country | null>(null);
  const [buyRegion, setBuyRegion] = useState<Region | null>(null);
  const [buyNumber, setBuyNumber] = useState<AvailNumber | null>(null);
  const [buyPeriod, setBuyPeriod] = useState<Period | null>(null);
  const [countryQ, setCountryQ] = useState('');
  const [regionQ, setRegionQ] = useState('');

  const [renameVal, setRenameVal] = useState('');
  const [transferVal, setTransferVal] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFromSheet, setShowFromSheet] = useState(false);
  const [showDialCountry, setShowDialCountry] = useState(false);

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

  const regionsForBuy = useMemo(() => {
    if (!buyCountry) return [];
    const list = REGIONS[buyCountry.code] ?? [
      { id: `${buyCountry.code}-main`, name: buyCountry.name, area: buyCountry.dial.replace('+', ''), city: 'National' },
    ];
    const q = regionQ.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.area.includes(q),
    );
  }, [buyCountry, regionQ]);

  const availNumbers = useMemo(() => {
    if (!buyCountry || !buyRegion) return [];
    return makeAvail(buyCountry, buyRegion);
  }, [buyCountry, buyRegion]);

  const contacts = useMemo(() => {
    const q = contactQ.trim().toLowerCase();
    return lines.filter(
      (l) =>
        !q ||
        l.label.toLowerCase().includes(q) ||
        l.number.replace(/\s/g, '').includes(q.replace(/\s/g, '')),
    );
  }, [lines, contactQ]);

  const priceOf = (c: Country, p: Period) => Math.round(c.fromPrice * p.priceMul);

  const openBuy = () => {
    setBuyCountry(null);
    setBuyRegion(null);
    setBuyNumber(null);
    setBuyPeriod(null);
    setCountryQ('');
    setRegionQ('');
    setView('buy-country');
  };

  const confirmBuy = () => {
    if (!buyCountry || !buyNumber || !buyPeriod) return;
    const exp = new Date();
    exp.setMonth(exp.getMonth() + buyPeriod.months);
    const line: Line = {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      label: `${buyCountry.name} line`,
      number: buyNumber.display,
      flag: buyCountry.flag,
      country: buyCountry.name,
      countryCode: buyCountry.code,
      type: buyCountry.type,
      expiresAt: exp.toISOString(),
      dnd: false,
      voicemail: true,
      leaveMessage: true,
      smsToEmail: false,
      smsToMobile: false,
      callToPhone: false,
      forwardTarget: '',
    };
    setLines((p) => [line, ...p]);
    setActive(line);
    setFromLine(line);
    setTab('numbers');
    setNumSub('phone');
    setView('line-settings');
  };

  const openLine = (line: Line) => {
    setActive(line);
    setRenameVal(line.label);
    setTransferVal(line.forwardTarget);
    setView('line-settings');
  };

  const patchLine = (patch: Partial<Line>) => {
    if (!active) return;
    const next = { ...active, ...patch };
    setActive(next);
    setLines((p) => p.map((l) => (l.id === next.id ? next : l)));
    if (fromLine?.id === next.id) setFromLine(next);
  };

  const renew = (p: Period) => {
    if (!active) return;
    const base = new Date(active.expiresAt);
    const from = base.getTime() > Date.now() ? base : new Date();
    from.setMonth(from.getMonth() + p.months);
    patchLine({ expiresAt: from.toISOString() });
    setView('line-settings');
  };

  const release = () => {
    if (!active) return;
    setLines((p) => p.filter((l) => l.id !== active.id));
    if (fromLine?.id === active.id) setFromLine(null);
    setActive(null);
    setView('main');
    setTab('numbers');
  };

  const copyNum = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.number.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const headerBack = () => {
    if (view === 'main') onBack();
    else if (view === 'buy-country') setView('main');
    else if (view === 'buy-region') setView('buy-country');
    else if (view === 'buy-numbers') setView('buy-region');
    else if (view === 'buy-period') setView('buy-numbers');
    else if (view === 'buy-confirm') setView('buy-period');
    else if (view === 'line-settings') {
      setView('main');
      setTab('numbers');
    } else if (
      view === 'line-renew' ||
      view === 'line-rename' ||
      view === 'line-dnd' ||
      view === 'line-voicemail' ||
      view === 'line-forwarding' ||
      view === 'line-transfer'
    ) {
      setView('line-settings');
    }
  };

  const title =
    view === 'main'
      ? tab === 'calls'
        ? 'Calls'
        : tab === 'messages'
          ? 'Messages'
          : tab === 'numbers'
            ? 'Phone numbers'
            : tab === 'wallet'
              ? 'Wallet'
              : 'Settings'
      : view === 'buy-country'
        ? 'Select country'
        : view === 'buy-region'
          ? 'Choose a number'
          : view === 'buy-numbers'
            ? 'Choose a number'
            : view === 'buy-period'
              ? 'Rental period'
              : view === 'buy-confirm'
                ? 'Confirm'
                : view === 'line-settings'
                  ? 'Settings'
                  : view === 'line-renew'
                    ? 'Renew'
                    : view === 'line-rename'
                      ? 'Rename profile'
                      : view === 'line-dnd'
                        ? 'Do not disturb'
                        : view === 'line-voicemail'
                          ? 'Voicemail settings'
                          : view === 'line-forwarding'
                            ? 'Forwarding'
                            : view === 'line-transfer'
                              ? 'Transfer number'
                              : 'Rent a Line';

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
          {(view === 'line-dnd' || view === 'line-voicemail') && (
            <button type="button" className="rl-text-btn" onClick={() => setView('line-settings')}>
              Save
            </button>
          )}
          {view !== 'main' && view !== 'line-dnd' && view !== 'line-voicemail' && <span className="rl-spacer" />}
        </div>
      </header>

      {/* ——— MAIN ——— */}
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
                      <p>
                        Adding contacts as favorite will make them appear here.{' '}
                        <button type="button" className="rl-link">
                          learn more
                        </button>
                      </p>
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
                  {lines.length === 0 ? (
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
                  ) : (
                    <ul className="rl-history-list">
                      {DEMO_HISTORY.map((h) => (
                        <li key={h.id}>
                          <div className="rl-avatar soft">{h.name.charAt(0)}</div>
                          <div className="rl-hist-body">
                            <strong>{h.name}</strong>
                            <small>
                              {h.kind === 'vm' ? '∞ ' : '↗ '}{h.sub}
                            </small>
                          </div>
                          <span className="rl-hist-date">{h.date}</span>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  <div className="rl-seg">
                    <button type="button" className="active">
                      All contacts
                    </button>
                    <button type="button">Verxor</button>
                  </div>
                  {contacts.length === 0 ? (
                    <Empty
                      icon={<Users size={40} strokeWidth={1.25} />}
                      title="No contacts yet"
                      text="Your rented lines appear here. Device contact sync comes with provider integration."
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
                text="SMS to and from your rented numbers will appear here once a telephony provider is connected."
              />
            </section>
          )}

          {tab === 'numbers' && (
            <section className="rl-body">
              <div className="rl-seg">
                <button
                  type="button"
                  className={numSub === 'phone' ? 'active' : ''}
                  onClick={() => setNumSub('phone')}
                >
                  Phone Numbers
                </button>
                <button
                  type="button"
                  className={numSub === 'esim' ? 'active' : ''}
                  onClick={() => setNumSub('esim')}
                >
                  Travel Data
                </button>
              </div>

              {numSub === 'esim' && (
                <Empty
                  icon={<Hash size={48} strokeWidth={1.25} />}
                  title="eSIM coming soon"
                  text="We don't offer eSIM travel data in the app yet. Once we do, the service will appear here."
                />
              )}

              {numSub === 'phone' && (
                <>
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
                    <ul className="rl-number-cards">
                      {lines.map((l) => (
                        <li key={l.id}>
                          <button type="button" className="rl-number-card" onClick={() => openLine(l)}>
                            <div className="rl-number-card-top">
                              <span className="rl-exp-badge">Expires {formatExp(l.expiresAt)}</span>
                              <ChevronRight size={18} />
                            </div>
                            <div className="rl-number-card-main">
                              <span className="rl-flag">{l.flag}</span>
                              <div>
                                <strong>{l.number}</strong>
                                <small>
                                  {l.label} ·{' '}
                                  <em className={l.type === 'Non-VoIP' ? 'good' : 'warn'}>{l.type}</em>
                                </small>
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="rl-biz-block">
                    <h4>BUSINESS NUMBERS</h4>
                    <div className="rl-biz-empty">
                      <span>🏢</span>
                      <p>No business number assigned</p>
                    </div>
                  </div>
                </>
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
                Rentals and call usage are paid from your Verxor wallet. There is no separate call-credit balance.
              </p>
              <h3 className="rl-section-title">Recent charges</h3>
              <p className="rl-muted-center">No history yet</p>
            </section>
          )}

          {tab === 'settings' && (
            <section className="rl-body">
              <div className="rl-settings-menu">
                <button type="button" className="rl-set-row" onClick={onBack}>
                  <UserRound size={18} />
                  <span>
                    <strong>Account</strong>
                    <small>Profile & security in main app</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <button type="button" className="rl-set-row">
                  <Bell size={18} />
                  <span>
                    <strong>Notifications</strong>
                    <small>Call & SMS alerts</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <button type="button" className="rl-set-row">
                  <Shield size={18} />
                  <span>
                    <strong>Blocked numbers</strong>
                    <small>Manage blocked list</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <button type="button" className="rl-set-row">
                  <HelpCircle size={18} />
                  <span>
                    <strong>Help & FAQ</strong>
                    <small>How rentals work</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                <a
                  className="rl-set-row"
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageSquare size={18} />
                  <span>
                    <strong>Contact support</strong>
                    <small>WhatsApp / Telegram</small>
                  </span>
                  <ChevronRight size={16} />
                </a>
                <button type="button" className="rl-set-row danger" onClick={onBack}>
                  <LogOut size={18} />
                  <span>
                    <strong>Back to Verxor</strong>
                    <small>Leave Rent a Line</small>
                  </span>
                </button>
              </div>
              <p className="rl-version">Verxor Rent · demo</p>
            </section>
          )}

          <nav className="rl-tabs" aria-label="Rental navigation">
            {(
              [
                ['calls', 'Calls', Phone],
                ['messages', 'Messages', MessageSquare],
                ['numbers', 'Numbers', Hash],
                ['wallet', 'Wallet', Wallet],
                ['settings', 'Settings', SettingsIcon],
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

      {/* BUY: COUNTRY */}
      {view === 'buy-country' && (
        <section className="rl-body">
          <div className="rl-search">
            <Search size={16} />
            <input
              value={countryQ}
              onChange={(e) => setCountryQ(e.target.value)}
              placeholder="Search"
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
                  setBuyRegion(null);
                  setBuyNumber(null);
                  setRegionQ('');
                  setView('buy-region');
                }}
              >
                <span className="rl-flag">{c.flag}</span>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    Mobile · <em className={c.type === 'Non-VoIP' ? 'good' : 'warn'}>{c.type}</em>
                  </small>
                </span>
                <span className="rl-dial-code">{c.dial}</span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!filteredCountries.length && <div className="rl-sheet-empty">No countries match</div>}
          </div>
        </section>
      )}

      {/* BUY: REGION */}
      {view === 'buy-region' && buyCountry && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div>
              <strong>{buyCountry.name}</strong>
              <small>Mobile</small>
            </div>
            <button type="button" className="rl-change" onClick={() => setView('buy-country')}>
              Change
            </button>
          </div>
          <p className="rl-label">SELECT AREA CODE</p>
          <div className="rl-search">
            <Search size={16} />
            <input
              value={regionQ}
              onChange={(e) => setRegionQ(e.target.value)}
              placeholder="Area code, state, city…"
            />
          </div>
          <div className="rl-country-list">
            {regionsForBuy.map((r) => (
              <button
                type="button"
                key={r.id}
                className="rl-country-row"
                onClick={() => {
                  setBuyRegion(r);
                  setBuyNumber(null);
                  setView('buy-numbers');
                }}
              >
                <span className="rl-region-meta">
                  <strong>
                    {r.name}
                  </strong>
                  <small>
                    {r.city} ({r.area})
                  </small>
                </span>
                <span className="rl-area-code">{r.area}</span>
                <ChevronRight size={18} />
              </button>
            ))}
            {!regionsForBuy.length && <div className="rl-sheet-empty">No regions match</div>}
          </div>
        </section>
      )}

      {/* BUY: NUMBERS */}
      {view === 'buy-numbers' && buyCountry && buyRegion && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div>
              <strong>{buyCountry.name}</strong>
              <small>
                {buyRegion.city} ({buyRegion.area})
              </small>
            </div>
            <button type="button" className="rl-change" onClick={() => setView('buy-region')}>
              Change
            </button>
          </div>
          <div className="rl-country-list">
            {availNumbers.map((n) => (
              <button
                type="button"
                key={n.id}
                className="rl-num-pick"
                onClick={() => {
                  setBuyNumber(n);
                  setView('buy-period');
                }}
              >
                <strong>{n.display}</strong>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <p className="rl-foot">Demo inventory. Live stock comes from the connected provider.</p>
        </section>
      )}

      {/* BUY: PERIOD */}
      {view === 'buy-period' && buyCountry && buyNumber && (
        <section className="rl-body">
          <p className="rl-lead">
            {buyCountry.flag} {buyNumber.display} · {buyCountry.type}
          </p>
          <div className="rl-duration-list">
            {PERIODS.map((p) => (
              <button
                type="button"
                key={p.id}
                className="rl-duration-row"
                onClick={() => {
                  setBuyPeriod(p);
                  setView('buy-confirm');
                }}
              >
                <span>
                  <strong>{p.label}</strong>
                  <small>Voice + SMS where supported</small>
                </span>
                <span className="rl-price">
                  {money(priceOf(buyCountry, p))}
                  <ChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* BUY: CONFIRM */}
      {view === 'buy-confirm' && buyCountry && buyNumber && buyPeriod && (
        <section className="rl-body">
          <div className="rl-confirm-card">
            <div>
              <span>Number</span>
              <strong>{buyNumber.display}</strong>
            </div>
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
              <strong>{buyPeriod.label}</strong>
            </div>
            <div className="total">
              <span>Total</span>
              <strong>{money(priceOf(buyCountry, buyPeriod))}</strong>
            </div>
          </div>
          <button type="button" className="rl-pill full" onClick={confirmBuy}>
            Confirm & rent (demo)
          </button>
          <p className="rl-foot">Demo only. Live rent debits wallet and assigns a provider number.</p>
        </section>
      )}

      {/* LINE SETTINGS MENU */}
      {view === 'line-settings' && active && (
        <section className="rl-body rl-detail">
          <div className="rl-detail-head">
            <strong>{active.number}</strong>
            <p>
              {active.flag} {active.label}
            </p>
            <button type="button" className="rl-copy" onClick={copyNum}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="rl-settings">
            <button type="button" className="rl-set-row" onClick={() => setView('line-renew')}>
              <Clock size={18} />
              <span>
                <strong>Renew</strong>
                <small>Exp. {formatExp(active.expiresAt)}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="rl-set-row"
              onClick={() => {
                setRenameVal(active.label);
                setView('line-rename');
              }}
            >
              <UserRound size={18} />
              <span>
                <strong>Rename profile</strong>
                <small>{active.label}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-dnd')}>
              <Phone size={18} />
              <span>
                <strong>Do not disturb</strong>
                <small>{active.dnd ? 'On' : 'Off'}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-voicemail')}>
              <Mic size={18} />
              <span>
                <strong>Voicemail settings</strong>
                <small>{active.voicemail ? 'On' : 'Off'}</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-forwarding')}>
              <PhoneForwarded size={18} />
              <span>
                <strong>Forwarding</strong>
                <small>SMS & calls</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-transfer')}>
              <ArrowRightLeft size={18} />
              <span>
                <strong>Transfer phone number</strong>
                <small>Move to another account</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row danger" onClick={release}>
              <Trash2 size={18} />
              <span>
                <strong>Delete phone number</strong>
                <small>Release this line</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* RENEW */}
      {view === 'line-renew' && active && (
        <section className="rl-body">
          <p className="rl-lead">How long do you want to keep this number?</p>
          <div className="rl-duration-list">
            {PERIODS.map((p) => {
              const c = COUNTRIES.find((x) => x.code === active.countryCode) ?? COUNTRIES[0];
              return (
                <button type="button" key={p.id} className="rl-duration-row" onClick={() => renew(p)}>
                  <span>
                    <strong>{p.label}</strong>
                  </span>
                  <span className="rl-price">
                    {money(priceOf(c, p))}
                    <Check size={16} className="rl-check-faint" />
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" className="rl-pill full" onClick={() => setView('line-settings')}>
            Done
          </button>
        </section>
      )}

      {/* RENAME */}
      {view === 'line-rename' && active && (
        <section className="rl-body">
          <label className="rl-field-label">Profile name</label>
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
              setView('line-settings');
            }}
          >
            Save
          </button>
        </section>
      )}

      {/* DND */}
      {view === 'line-dnd' && active && (
        <section className="rl-body">
          <div className="rl-toggle-card">
            <span>Do not disturb</span>
            <button
              type="button"
              className={`rl-switch ${active.dnd ? 'on' : ''}`}
              onClick={() => patchLine({ dnd: !active.dnd })}
              aria-label="Toggle DND"
            />
          </div>
          <p className="rl-help">When on, inbound calls and SMS alerts are silenced for this number.</p>
        </section>
      )}

      {/* VOICEMAIL */}
      {view === 'line-voicemail' && active && (
        <section className="rl-body">
          <div className="rl-toggle-card">
            <span>Voicemail</span>
            <button
              type="button"
              className={`rl-switch ${active.voicemail ? 'on' : ''}`}
              onClick={() => patchLine({ voicemail: !active.voicemail })}
              aria-label="Toggle voicemail"
            />
          </div>
          <div className="rl-settings">
            <div className="rl-set-row static">
              <span>
                <strong>Greeting</strong>
                <small>Default</small>
              </span>
              <ChevronRight size={16} />
            </div>
            <div className="rl-toggle-card inset">
              <span>Callers can leave a voice message</span>
              <button
                type="button"
                className={`rl-switch ${active.leaveMessage ? 'on' : ''}`}
                onClick={() => patchLine({ leaveMessage: !active.leaveMessage })}
                aria-label="Toggle leave message"
              />
            </div>
          </div>
        </section>
      )}

      {/* FORWARDING */}
      {view === 'line-forwarding' && active && (
        <section className="rl-body">
          <div className="rl-settings">
            <div className="rl-toggle-card inset">
              <span>SMS to e-mail</span>
              <button
                type="button"
                className={`rl-switch ${active.smsToEmail ? 'on' : ''}`}
                onClick={() => patchLine({ smsToEmail: !active.smsToEmail })}
              />
            </div>
            <div className="rl-toggle-card inset">
              <span>SMS to mobile number</span>
              <button
                type="button"
                className={`rl-switch ${active.smsToMobile ? 'on' : ''}`}
                onClick={() => patchLine({ smsToMobile: !active.smsToMobile })}
              />
            </div>
            <div className="rl-toggle-card inset">
              <span>Call to phone number</span>
              <button
                type="button"
                className={`rl-switch ${active.callToPhone ? 'on' : ''}`}
                onClick={() => patchLine({ callToPhone: !active.callToPhone })}
              />
            </div>
          </div>
          <p className="rl-help">Forwarded calls and SMS will be charged at normal rates when the provider is live.</p>
          <button type="button" className="rl-pill full" onClick={() => setView('line-settings')}>
            Done
          </button>
        </section>
      )}

      {/* TRANSFER */}
      {view === 'line-transfer' && active && (
        <section className="rl-body">
          <p className="rl-lead">Enter the destination account email or user ID. Transfer is available when the provider supports it.</p>
          <input
            className="rl-rename-input"
            value={transferVal}
            onChange={(e) => setTransferVal(e.target.value)}
            placeholder="email or user id"
          />
          <button
            type="button"
            className="rl-pill full"
            onClick={() => {
              patchLine({ forwardTarget: transferVal.trim() });
              setView('line-settings');
            }}
          >
            Request transfer (demo)
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
    </div>
  );
}
