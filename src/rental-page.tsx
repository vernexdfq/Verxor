/**
 * Rent a Line — Full Call.com-style workspace (Verxor brand, wallet-only).
 * Bottom tabs: Calls · Messages · Numbers · Wallet · Settings
 * Buy: Country → Region → Number → Period → Confirm
 * Number settings: Renew · Rename · DND · Voicemail · Forwarding · Transfer · Delete
 * Travel Data / eSIM: deep-link via onOpenEsim
 * Locked: 30/90/365 days, NGN wallet pricing
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
type Period = { id: string; label: string; months: number; days?: number; priceMul: number; saveLabel?: string };

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
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Non-VoIP', fromPrice: 6990 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'VoIP', fromPrice: 6490 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Non-VoIP', fromPrice: 7990 },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷', type: 'Non-VoIP', fromPrice: 6990 },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', type: 'VoIP', fromPrice: 7490 },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', type: 'Non-VoIP', fromPrice: 8490 },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', type: 'Non-VoIP', fromPrice: 7990 },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', type: 'VoIP', fromPrice: 8990 },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', type: 'VoIP', fromPrice: 7990 },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', type: 'VoIP', fromPrice: 3990 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', type: 'VoIP', fromPrice: 4490 },
];

const REGIONS: Record<string, Region[]> = {
  US: [
    { id: 'us-ny-212', name: 'New York', area: '212', city: 'New York' },
    { id: 'us-ca-415', name: 'California', area: '415', city: 'San Francisco' },
    { id: 'us-ca-213', name: 'California', area: '213', city: 'Los Angeles' },
    { id: 'us-tx-214', name: 'Texas', area: '214', city: 'Dallas' },
    { id: 'us-fl-305', name: 'Florida', area: '305', city: 'Miami' },
    { id: 'us-il-312', name: 'Illinois', area: '312', city: 'Chicago' },
  ],
  CA: [
    { id: 'ca-on-416', name: 'Ontario', area: '416', city: 'Toronto' },
    { id: 'ca-qc-514', name: 'Quebec', area: '514', city: 'Montreal' },
    { id: 'ca-bc-604', name: 'British Columbia', area: '604', city: 'Vancouver' },
  ],
  GB: [
    { id: 'gb-ldn-20', name: 'London', area: '20', city: 'London' },
    { id: 'gb-man-161', name: 'Manchester', area: '161', city: 'Manchester' },
  ],
  PR: [{ id: 'pr-787', name: 'Puerto Rico', area: '787', city: 'San Juan' }],
};

const PERIODS: Period[] = [
  { id: '1m', label: '1 Month', months: 1, days: 30, priceMul: 1 },
  { id: '3m', label: '3 Months', months: 3, days: 90, priceMul: 2.55, saveLabel: 'Save 15%' },
  { id: '12m', label: '12 Months', months: 12, days: 365, priceMul: 8.4, saveLabel: 'Save 30%' },
];

/** Mock call log — visual parity with Call.com until SignalWire/Telnyx webhooks are wired. Wipe / replace with API. */
type CallKind = 'vm' | 'out' | 'in' | 'missed' | 'inactive';
type CallRow = {
  id: string;
  name: string;
  sub: string;
  date: string;
  kind: CallKind;
  avatar: 'purple' | 'grey' | 'green' | 'pink' | 'red';
  inactive?: boolean;
};

const DEMO_CALL_HISTORY: CallRow[] = [
  { id: '1', name: '+18607242481', sub: 'Voicemail · Adonu', date: '15/07/26', kind: 'vm', avatar: 'purple' },
  { id: '2', name: '+1 8607242481', sub: 'Adonu → United States', date: '15/07/26', kind: 'out', avatar: 'grey' },
  { id: '3', name: '+1 8607242481', sub: 'Adonu → United States', date: '08/07/26', kind: 'out', avatar: 'grey' },
  { id: '4', name: 'Dennykay', sub: 'Adonu → Nigeria', date: '08/07/26', kind: 'out', avatar: 'green' },
  { id: '5', name: 'Jalese', sub: 'Inactive number → United States', date: '02/07/26', kind: 'inactive', avatar: 'pink', inactive: true },
  { id: '6', name: '+1 8607994903', sub: 'Inactive number → United States', date: '28/06/26', kind: 'inactive', avatar: 'grey', inactive: true },
  { id: '7', name: '+1 8607994903', sub: 'Inactive number → United States', date: '26/06/26', kind: 'inactive', avatar: 'grey', inactive: true },
];

/** Demo messages — visual parity with Call.com conversation list */
type MsgRow = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread?: number;
  avatar: 'purple' | 'grey' | 'green' | 'pink' | 'blue' | 'orange';
};
const DEMO_MESSAGES: MsgRow[] = [
  { id: 'm1', name: 'Adonu', preview: 'Hey, did you get the code?', time: '10:42', unread: 2, avatar: 'purple' },
  { id: 'm2', name: '+1 818 278 4538', preview: 'Your verification code is 48291', time: 'Yesterday', avatar: 'grey' },
  { id: 'm3', name: 'Dennykay', preview: 'Call me when free', time: 'Mon', avatar: 'green' },
  { id: 'm4', name: 'Jalese', preview: 'Thanks!', time: '15/07', avatar: 'pink' },
  { id: 'm5', name: 'WhatsApp Business', preview: 'Your OTP is 33910. Do not share.', time: '14/07', avatar: 'blue' },
];

/** Demo contacts — Call.com style with labels */
type ContactRow = {
  id: string;
  name: string;
  number: string;
  label: string;
  favorite?: boolean;
  avatar: 'purple' | 'grey' | 'green' | 'pink' | 'blue' | 'orange';
};
const DEMO_CONTACTS: ContactRow[] = [
  { id: 'c1', name: 'Adonu', number: '+1 860 724 2481', label: 'mobile', favorite: true, avatar: 'purple' },
  { id: 'c2', name: 'Dennykay', number: '+234 801 234 5678', label: 'mobile', favorite: true, avatar: 'green' },
  { id: 'c3', name: 'Jalese', number: '+1 860 799 4903', label: 'work', avatar: 'pink' },
  { id: 'c4', name: 'Support Line', number: '+1 818 278 4538', label: 'work', avatar: 'blue' },
  { id: 'c5', name: 'Home', number: '+234 803 111 2233', label: 'home', avatar: 'orange' },
];

const money = (ngn: number) => `₦${Math.round(ngn).toLocaleString('en-NG')}`;

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
    return { id: `${region.id}-${i}`, e164, display: `${country.dial} ${region.area} ${mid} ${last}` };
  });
}

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rl-empty">
      {icon}
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function RentalPage({ onBack, onOpenEsim }: { onBack: () => void; onOpenEsim?: () => void }) {
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
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterExpired, setFilterExpired] = useState(false);

  const filteredCountries = useMemo(() => {
    const q = countryQ.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q));
  }, [countryQ]);

  const regionsForBuy = useMemo(() => {
    if (!buyCountry) return [];
    const list = REGIONS[buyCountry.code] ?? [{ id: `${buyCountry.code}-main`, name: buyCountry.name, area: buyCountry.dial.replace('+', ''), city: 'National' }];
    const q = regionQ.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.area.includes(q));
  }, [buyCountry, regionQ]);

  const availNumbers = useMemo(() => {
    if (!buyCountry || !buyRegion) return [];
    return makeAvail(buyCountry, buyRegion);
  }, [buyCountry, buyRegion]);

  const priceOf = (c: Country, p: Period) => Math.round(c.fromPrice * p.priceMul);

  const openBuy = () => {
    setBuyCountry(null); setBuyRegion(null); setBuyNumber(null); setBuyPeriod(null); setCountryQ(''); setRegionQ(''); setView('buy-country');
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
      dnd: false, voicemail: true, leaveMessage: true,
      smsToEmail: false, smsToMobile: false, callToPhone: false, forwardTarget: '',
    };
    setLines((p) => [line, ...p]);
    setActive(line); setFromLine(line); setTab('numbers'); setNumSub('phone'); setView('line-settings');
  };

  const openLine = (line: Line) => { setActive(line); setRenameVal(line.label); setTransferVal(line.forwardTarget); setView('line-settings'); };

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
    setActive(null); setView('main'); setTab('numbers');
  };

  const copyNum = async () => {
    if (!active) return;
    try { await navigator.clipboard.writeText(active.number.replace(/\s/g, '')); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };

  const headerBack = () => {
    if (view === 'main') onBack();
    else if (view === 'buy-country') setView('main');
    else if (view === 'buy-region') setView('buy-country');
    else if (view === 'buy-numbers') setView('buy-region');
    else if (view === 'buy-period') setView('buy-numbers');
    else if (view === 'buy-confirm') setView('buy-period');
    else if (view === 'line-settings') { setView('main'); setTab('numbers'); }
    else if (view === 'line-renew' || view === 'line-rename' || view === 'line-dnd' || view === 'line-voicemail' || view === 'line-forwarding' || view === 'line-transfer') setView('line-settings');
  };

  const title =
    view === 'main'
      ? tab === 'calls' ? 'Calls' : tab === 'messages' ? 'Messages' : tab === 'numbers' ? 'Phone numbers' : tab === 'wallet' ? 'Wallet' : 'Settings'
      : view === 'buy-country' ? 'Select country'
      : view === 'buy-region' || view === 'buy-numbers' ? 'Choose a number'
      : view === 'buy-period' ? 'Rental period'
      : view === 'buy-confirm' ? 'Confirm'
      : view === 'line-settings' ? 'Settings'
      : view === 'line-renew' ? 'Renew'
      : view === 'line-rename' ? 'Rename profile'
      : view === 'line-dnd' ? 'Do not disturb'
      : view === 'line-voicemail' ? 'Voicemail settings'
      : view === 'line-forwarding' ? 'Forwarding'
      : view === 'line-transfer' ? 'Transfer number'
      : 'Rent a Line';

  return (
    <div className="rl-page">
      <header className="rl-header">
        <button type="button" className="rl-icon" onClick={headerBack} aria-label="Back"><ArrowLeft size={20} /></button>
        <h1>{title}</h1>
        <div className="rl-header-right">
          {view === 'main' && (tab === 'calls' || tab === 'numbers') && (
            <button type="button" className="rl-icon primary" onClick={openBuy} aria-label="Rent number"><Plus size={22} strokeWidth={2.2} /></button>
          )}
          {view === 'main' && tab === 'messages' && (
            <button type="button" className="rl-icon primary" aria-label="New message"><MessageSquare size={20} /></button>
          )}
          {(view === 'line-dnd' || view === 'line-voicemail') && (
            <button type="button" className="rl-text-btn" onClick={() => setView('line-settings')}>Save</button>
          )}
          {view !== 'main' && view !== 'line-dnd' && view !== 'line-voicemail' && <span className="rl-spacer" />}
        </div>
      </header>

      {view === 'main' && (
        <>
          {tab === 'calls' && callSub === 'history' && (
            <section className="rl-body rl-body-calls">
              <div className="rl-row-head">
                <h3 className="rl-section-title">Recents</h3>
                <div className="rl-row-actions">
                  <button type="button" aria-label="Filter" onClick={() => setShowFilterSheet(true)}><Filter size={18} /></button>
                  <button type="button" aria-label="More"><MoreVertical size={18} /></button>
                </div>
              </div>
              <ul className="rl-history-list">
                {(filterExpired ? DEMO_CALL_HISTORY.filter((h) => h.inactive) : DEMO_CALL_HISTORY).map((h) => {
                  const initial = h.name.replace(/[^A-Za-z0-9]/g, '').charAt(0) || '#';
                  const kindIcon = h.kind === 'vm' ? '∞ ' : h.kind === 'out' ? '↗ ' : h.kind === 'in' ? '↙ ' : '↗ ';
                  return (
                    <li key={h.id} className={h.inactive ? 'inactive' : ''}>
                      <div className={`rl-avatar av-${h.avatar}`}>
                        {/[A-Za-z]/.test(initial) ? initial.toUpperCase() : <UserRound size={18} />}
                      </div>
                      <div className="rl-hist-body">
                        <strong className={h.inactive ? 'missed' : ''}>{h.name}</strong>
                        <small><span className="rl-kind">{kindIcon}</span>{h.sub}</small>
                      </div>
                      <span className="rl-hist-date">{h.date}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {tab === 'calls' && callSub === 'contacts' && (
            <section className="rl-body">
              <div className="rl-search">
                <Search size={16} />
                <input value={contactQ} onChange={(e) => setContactQ(e.target.value)} placeholder="Search contacts" />
              </div>
              {(() => {
                const q = contactQ.trim().toLowerCase();
                const list = DEMO_CONTACTS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.number.replace(/\s/g, '').includes(q.replace(/\s/g, '')));
                if (list.length === 0) return <Empty icon={<Users size={40} strokeWidth={1.25} />} title="No contacts" text="Sync device contacts or add a new one." action={<button type="button" className="rl-pill">Add contact</button>} />;
                return (
                  <ul className="rl-contact-list">
                    {list.map((c) => (
                      <li key={c.id}>
                        <div className={`rl-avatar av-${c.avatar}`}>{c.name.charAt(0).toUpperCase()}</div>
                        <div className="rl-hist-body" style={{ flex: 1 }}>
                          <strong>{c.name}{c.favorite && <span className="rl-fav">★</span>}</strong>
                          <small>{c.label} · {c.number}</small>
                        </div>
                        <button type="button" className="rl-call-mini" aria-label="Call"><Phone size={18} /></button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </section>
          )}

          {tab === 'calls' && callSub === 'keypad' && (
            <section className="rl-keypad">
              <button type="button" className="rl-from-pill" onClick={() => setShowFromSheet(true)}>
                {fromLine ? fromLine.number : 'Select line'} <ChevronDown size={14} />
              </button>
              <div className="rl-dial-display">
                <button type="button" onClick={() => setShowDialCountry(true)}>
                  {dialCountry.flag} {dialCountry.dial} <ChevronDown size={14} />
                </button>
                <span>{dial || ' '}</span>
              </div>
              <div className="rl-dial-grid">
                {KEYS.map((k) => (
                  <button key={k.digit} type="button" onClick={() => setDial((d) => d + k.digit)}>
                    <strong>{k.digit}</strong><small>{k.letters}</small>
                  </button>
                ))}
              </div>
              <div className="rl-dial-actions">
                <span />
                <button type="button" className="rl-call-btn" aria-label="Call"><Phone size={28} /></button>
                <button type="button" className="rl-del-btn" aria-label="Delete" onClick={() => setDial((d) => d.slice(0, -1))}><Delete size={22} /></button>
              </div>
              <button type="button" className="rl-browse" onClick={openBuy}><Hash size={16} /> Get a number</button>
            </section>
          )}

          {tab === 'calls' && (
            <div className="rl-call-subnav">
              <button type="button" className={callSub === 'history' ? 'active' : ''} onClick={() => setCallSub('history')}><Clock size={16} /> History</button>
              <button type="button" className={callSub === 'contacts' ? 'active' : ''} onClick={() => setCallSub('contacts')}><Users size={16} /> Contacts</button>
              <button type="button" className={callSub === 'keypad' ? 'active' : ''} onClick={() => setCallSub('keypad')}><Grid3X3 size={16} /> Keypad</button>
            </div>
          )}

          {tab === 'messages' && (
            <section className="rl-body">
              <div className="rl-search">
                <Search size={16} />
                <input value={msgQ} onChange={(e) => setMsgQ(e.target.value)} placeholder="Search messages" />
              </div>
              {(() => {
                const q = msgQ.trim().toLowerCase();
                const list = DEMO_MESSAGES.filter((m) => !q || m.name.toLowerCase().includes(q) || m.preview.toLowerCase().includes(q));
                if (list.length === 0) return <Empty icon={<MessageSquare size={40} strokeWidth={1.25} />} title="No messages" text="Inbound SMS to your rented lines will appear here." action={<button type="button" className="rl-pill" onClick={openBuy}>Rent a number</button>} />;
                return (
                  <ul className="rl-msg-list">
                    {list.map((m) => (
                      <li key={m.id}>
                        <div className={`rl-avatar av-${m.avatar}`}>{m.name.charAt(0).toUpperCase()}</div>
                        <div className="rl-msg-body">
                          <div className="rl-msg-top"><strong>{m.name}</strong><span className="rl-msg-time">{m.time}</span></div>
                          <small className={m.unread ? 'unread' : ''}>{m.preview}</small>
                        </div>
                        {m.unread ? <span className="rl-badge">{m.unread}</span> : null}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </section>
          )}

          {tab === 'numbers' && (
            <section className="rl-body">
              <div className="rl-seg">
                <button type="button" className={numSub === 'phone' ? 'active' : ''} onClick={() => setNumSub('phone')}>Phone numbers</button>
                <button type="button" className={numSub === 'esim' ? 'active' : ''} onClick={() => setNumSub('esim')}>Travel Data</button>
              </div>
              {numSub === 'phone' && (
                lines.length === 0 ? (
                  <Empty icon={<Phone size={40} strokeWidth={1.25} />} title="No numbers yet" text="Rent a dedicated line for SMS and calls where supported." action={<button type="button" className="rl-pill" onClick={openBuy}>Rent a number</button>} />
                ) : (
                  <ul className="rl-number-cards">
                    {lines.map((l) => (
                      <li key={l.id}>
                        <button type="button" className="rl-number-card" onClick={() => openLine(l)}>
                          <div className="rl-number-card-top"><span className="rl-exp-badge">Expires {formatExp(l.expiresAt)}</span><ChevronRight size={18} /></div>
                          <div className="rl-number-card-main">
                            <span className="rl-flag">{l.flag}</span>
                            <div><strong>{l.number}</strong><small>{l.label} · {l.type}</small></div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
              {numSub === 'esim' && (
                <Empty icon={<Hash size={40} strokeWidth={1.25} />} title="Travel Data" text="eSIM / travel data plans." action={onOpenEsim ? <button type="button" className="rl-pill" onClick={onOpenEsim}>Browse eSIM</button> : undefined} />
              )}
              <div className="rl-biz-block">
                <h4>BUSINESS NUMBERS</h4>
                <div className="rl-biz-empty"><Users size={18} /><p>Assign lines to team members (coming soon).</p></div>
              </div>
            </section>
          )}

          {tab === 'wallet' && (
            <section className="rl-body">
              <div className="rl-wallet-card">
                <small>Available balance</small>
                <strong>₦7,570.00</strong>
                <button type="button" className="rl-wallet-fund">+ Fund Wallet</button>
              </div>
              <p className="rl-wallet-note">Rental charges debit your Verxor wallet. No external card on this screen.</p>
            </section>
          )}

          {tab === 'settings' && (
            <section className="rl-body">
              <div className="rl-settings-menu">
                <button type="button" className="rl-set-row"><HelpCircle size={18} /><div><strong>Help & FAQ</strong><small>How rentals work</small></div><ChevronRight size={18} /></button>
                <button type="button" className="rl-set-row"><Bell size={18} /><div><strong>Notifications</strong><small>SMS & call alerts</small></div><ChevronRight size={18} /></button>
                <button type="button" className="rl-set-row"><Shield size={18} /><div><strong>Privacy</strong><small>Data & security</small></div><ChevronRight size={18} /></button>
                <button type="button" className="rl-set-row danger" onClick={onBack}><LogOut size={18} /><div><strong>Exit rental</strong><small>Back to Verxor home</small></div><ChevronRight size={18} /></button>
              </div>
              <p className="rl-version">Verxor Rent a Line · Call.com-style</p>
            </section>
          )}

          <nav className="rl-tabs">
            <button type="button" className={tab === 'calls' ? 'active' : ''} onClick={() => setTab('calls')}><Phone size={20} />Calls</button>
            <button type="button" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}><MessageSquare size={20} />Messages</button>
            <button type="button" className={tab === 'numbers' ? 'active' : ''} onClick={() => setTab('numbers')}><Hash size={20} />Numbers</button>
            <button type="button" className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}><Wallet size={20} />Wallet</button>
            <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><SettingsIcon size={20} />Settings</button>
          </nav>
        </>
      )}

      {view === 'buy-country' && (
        <section className="rl-body">
          <div className="rl-search"><Search size={16} /><input value={countryQ} onChange={(e) => setCountryQ(e.target.value)} placeholder="Search country" /></div>
          <div className="rl-country-list">
            {filteredCountries.map((c) => (
              <button key={c.code} type="button" className="rl-country-row" onClick={() => { setBuyCountry(c); setView('buy-region'); }}>
                <span className="rl-flag">{c.flag}</span>
                <div><strong>{c.name}</strong><small>{c.type}</small></div>
                <span className="rl-dial-code">{c.dial}</span>
                <span className="rl-price">from {money(c.fromPrice)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-region' && buyCountry && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyCountry.name}</strong><small>{buyCountry.dial}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-country')}>Change</button>
          </div>
          <div className="rl-search"><Search size={16} /><input value={regionQ} onChange={(e) => setRegionQ(e.target.value)} placeholder="Search area / city" /></div>
          {regionsForBuy.map((r) => (
            <button key={r.id} type="button" className="rl-country-row" onClick={() => { setBuyRegion(r); setView('buy-numbers'); }}>
              <div className="rl-region-meta"><strong>{r.city}</strong><small>{r.name}</small></div>
              <span className="rl-area-code">{r.area}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </section>
      )}

      {view === 'buy-numbers' && buyCountry && buyRegion && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyRegion.city}</strong><small>Area {buyRegion.area}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-region')}>Change</button>
          </div>
          {availNumbers.map((n) => (
            <button key={n.id} type="button" className="rl-num-pick" onClick={() => { setBuyNumber(n); setView('buy-period'); }}>
              <strong>{n.display}</strong>
              <Check size={18} className="rl-check-faint" />
            </button>
          ))}
        </section>
      )}

      {view === 'buy-period' && buyCountry && buyNumber && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyNumber.display}</strong><small>{buyCountry.name}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-numbers')}>Change</button>
          </div>
          <div className="rl-duration-list">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" className="rl-duration-row" onClick={() => { setBuyPeriod(p); setView('buy-confirm'); }}>
                <div><strong>{p.label}</strong>{p.saveLabel && <small className="good">{p.saveLabel}</small>}</div>
                <span className="rl-price">{money(priceOf(buyCountry, p))}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-confirm' && buyCountry && buyNumber && buyPeriod && (
        <section className="rl-body">
          <div className="rl-confirm-card">
            <div><span>Number</span><strong>{buyNumber.display}</strong></div>
            <div><span>Country</span><strong>{buyCountry.name}</strong></div>
            <div><span>Period</span><strong>{buyPeriod.label}</strong></div>
            <div className="total"><span>Total</span><strong>{money(priceOf(buyCountry, buyPeriod))}</strong></div>
          </div>
          <button type="button" className="rl-pill full" onClick={confirmBuy}>Pay from wallet</button>
          <p className="rl-foot">Debits your Verxor wallet balance. Mock purchase until provider API is wired.</p>
        </section>
      )}

      {view === 'line-settings' && active && (
        <section className="rl-body">
          <div className="rl-detail-head">
            <strong>{active.number}</strong>
            <p>{active.label} · expires {formatExp(active.expiresAt)}</p>
            <button type="button" className="rl-copy" onClick={copyNum}><Copy size={14} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="rl-settings">
            <button type="button" className="rl-set-row" onClick={() => setView('line-renew')}><Clock size={18} /><div><strong>Renew</strong><small>Extend rental period</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-rename')}><UserRound size={18} /><div><strong>Rename</strong><small>{active.label}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-dnd')}><Bell size={18} /><div><strong>Do not disturb</strong><small>{active.dnd ? 'On' : 'Off'}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-voicemail')}><Mic size={18} /><div><strong>Voicemail</strong><small>{active.voicemail ? 'On' : 'Off'}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-forwarding')}><PhoneForwarded size={18} /><div><strong>Forwarding</strong><small>SMS & calls</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-transfer')}><ArrowRightLeft size={18} /><div><strong>Transfer</strong><small>To another user</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row danger" onClick={release}><Trash2 size={18} /><div><strong>Delete number</strong><small>Release this line</small></div><ChevronRight size={18} /></button>
          </div>
        </section>
      )}

      {view === 'line-renew' && active && (
        <section className="rl-body">
          <p className="rl-lead">Extend {active.number}</p>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className="rl-duration-row" onClick={() => renew(p)}>
              <div><strong>{p.label}</strong>{p.saveLabel && <small className="good">{p.saveLabel}</small>}</div>
              <span className="rl-price">{money(Math.round(6990 * p.priceMul))}</span>
            </button>
          ))}
        </section>
      )}

      {view === 'line-rename' && active && (
        <section className="rl-body">
          <label className="rl-field-label">Profile name</label>
          <input className="rl-rename-input" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} />
          <button type="button" className="rl-pill full" onClick={() => { patchLine({ label: renameVal || active.label }); setView('line-settings'); }}>Save</button>
        </section>
      )}

      {view === 'line-dnd' && active && (
        <section className="rl-body">
          <div className="rl-toggle-card"><span>Do not disturb</span><button type="button" className={`rl-switch ${active.dnd ? 'on' : ''}`} onClick={() => patchLine({ dnd: !active.dnd })} /></div>
          <p className="rl-lead">When on, inbound calls are silenced. SMS still delivered.</p>
        </section>
      )}

      {view === 'line-voicemail' && active && (
        <section className="rl-body">
          <div className="rl-toggle-card"><span>Voicemail</span><button type="button" className={`rl-switch ${active.voicemail ? 'on' : ''}`} onClick={() => patchLine({ voicemail: !active.voicemail })} /></div>
          <div className="rl-toggle-card"><span>Leave a message</span><button type="button" className={`rl-switch ${active.leaveMessage ? 'on' : ''}`} onClick={() => patchLine({ leaveMessage: !active.leaveMessage })} /></div>
        </section>
      )}

      {view === 'line-forwarding' && active && (
        <section className="rl-body">
          <div className="rl-toggle-card"><span>SMS → Email</span><button type="button" className={`rl-switch ${active.smsToEmail ? 'on' : ''}`} onClick={() => patchLine({ smsToEmail: !active.smsToEmail })} /></div>
          <div className="rl-toggle-card"><span>SMS → Mobile</span><button type="button" className={`rl-switch ${active.smsToMobile ? 'on' : ''}`} onClick={() => patchLine({ smsToMobile: !active.smsToMobile })} /></div>
          <div className="rl-toggle-card"><span>Call → Phone</span><button type="button" className={`rl-switch ${active.callToPhone ? 'on' : ''}`} onClick={() => patchLine({ callToPhone: !active.callToPhone })} /></div>
          <label className="rl-field-label">Forward target</label>
          <input className="rl-rename-input" value={active.forwardTarget} onChange={(e) => patchLine({ forwardTarget: e.target.value })} placeholder="Email or +phone" />
          <button type="button" className="rl-pill full" onClick={() => setView('line-settings')}>Done</button>
        </section>
      )}

      {view === 'line-transfer' && active && (
        <section className="rl-body">
          <p className="rl-lead">Transfer this number to another Verxor user ID.</p>
          <label className="rl-field-label">Recipient user ID</label>
          <input className="rl-rename-input" value={transferVal} onChange={(e) => setTransferVal(e.target.value)} placeholder="user_…" />
          <button type="button" className="rl-pill full" onClick={() => setView('line-settings')}>Request transfer</button>
          <p className="rl-foot">Provider must support ownership transfer.</p>
        </section>
      )}

      {showFromSheet && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowFromSheet(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head"><strong>Call from</strong><button type="button" onClick={() => setShowFromSheet(false)}><X size={18} /></button></div>
            <div className="rl-body">
              {lines.length === 0 ? <p className="rl-muted-center">Rent a number first</p> : lines.map((l) => (
                <button key={l.id} type="button" className="rl-country-row" onClick={() => { setFromLine(l); setShowFromSheet(false); }}>
                  <span className="rl-flag">{l.flag}</span>
                  <div><strong>{l.number}</strong><small>{l.label}</small></div>
                  {fromLine?.id === l.id && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDialCountry && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowDialCountry(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head"><strong>Country code</strong><button type="button" onClick={() => setShowDialCountry(false)}><X size={18} /></button></div>
            <div className="rl-body" style={{ maxHeight: '50vh', overflow: 'auto' }}>
              {COUNTRIES.map((c) => (
                <button key={c.code} type="button" className="rl-country-row" onClick={() => { setDialCountry(c); setShowDialCountry(false); }}>
                  <span className="rl-flag">{c.flag}</span>
                  <div><strong>{c.name}</strong><small>{c.dial}</small></div>
                  {dialCountry.code === c.code && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFilterSheet && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowFilterSheet(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head"><strong>Filter</strong><button type="button" onClick={() => setShowFilterSheet(false)}><X size={18} /></button></div>
            <div className="rl-body">
              <button type="button" className="rl-country-row" onClick={() => { setFilterExpired(false); setShowFilterSheet(false); }}>
                <div><strong>All calls</strong><small>Show full history</small></div>
                {!filterExpired && <Check size={18} />}
              </button>
              <button type="button" className="rl-country-row" onClick={() => { setFilterExpired(true); setShowFilterSheet(false); }}>
                <div><strong>Expired numbers</strong><small>Only inactive / expired lines</small></div>
                {filterExpired && <Check size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
