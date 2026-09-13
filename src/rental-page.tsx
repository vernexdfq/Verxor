import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft, Check, ChevronDown, Clock, Delete, Filter, Grid3X3, Hash,
  MessageSquare, MoreVertical, Phone, PhoneMissed, PhoneOutgoing, Plus,
  Search, User, Users, Wallet, X,
} from 'lucide-react';
import './rental-page.css';

type Tab = 'calls' | 'messages' | 'numbers' | 'credit';
type CallTab = 'history' | 'contacts' | 'keypad';
type Line = { id: string; label: string; number: string; flag: string; type: 'rented' | 'sim' };
type Country = { code: string; name: string; dial: string; flag: string };
type Recent = { id: string; number: string; label: string; inactive: boolean; date: string; direction: 'missed' | 'outbound' };

type RentalPageProps = { onBack: () => void };

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', ''],
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

function EmptyState({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return <div className="rental-empty">{icon}<strong>{title}</strong><p>{text}</p></div>;
}

function CountrySheet({ open, browse, search, setSearch, country, onClose, onSelect }: {
  open: boolean; browse: boolean; search: string; setSearch: (v: string) => void;
  country: Country; onClose: () => void; onSelect: (c: Country) => void;
}) {
  if (!open) return null;
  const q = search.trim().toLowerCase();
  const filtered = COUNTRIES.filter(c => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q));
  return <div className="sheet-layer">
    <button className="sheet-backdrop" onClick={onClose} aria-label="Close" />
    <div className="sheet country-sheet">
      <div className="sheet-head"><h2>{browse ? 'Rent a number' : 'Select country'}</h2><button onClick={onClose} aria-label="Close"><X size={20}/></button></div>
      <div className="sheet-search"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country" /></div>
      <div className="sheet-list">
        {filtered.length === 0 ? <div className="sheet-empty">No countries match</div> : filtered.map(c => <button className="sheet-row" key={c.code} onClick={() => onSelect(c)}>
          <span className="country-flag">{c.flag}</span>
          <div><strong>{c.name}</strong>{browse && <small>Provider inventory will determine availability</small>}</div>
          <span className="country-dial">{c.dial}</span>{!browse && country.code === c.code && <Check size={18}/>} 
        </button>)}
      </div>
    </div>
  </div>;
}

function FromSheet({ open, lines, selected, onClose, onSelect }: { open: boolean; lines: Line[]; selected: Line; onClose: () => void; onSelect: (l: Line) => void }) {
  if (!open) return null;
  return <div className="sheet-layer"><button className="sheet-backdrop" onClick={onClose} aria-label="Close"/><div className="sheet">
    <div className="sheet-head"><h2>Call from</h2><button onClick={onClose} aria-label="Close"><X size={20}/></button></div>
    {lines.map(line => <button className="sheet-row" key={line.id} onClick={() => onSelect(line)}>
      <span className="line-icon">{line.type === 'sim' ? '▮' : line.flag}</span><div><strong>{line.label}</strong><small>{line.number}</small></div>{selected.id === line.id && <Check size={18}/>} 
    </button>)}
  </div></div>;
}

function Catalog({ country, onBack }: { country: Country; onBack: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [plan, setPlan] = useState('1 Month');
  const plans = ['1 Week', '1 Month', '1 Year'];
  const demoNumbers = ['+1 202 555 0148', '+1 202 555 0196', '+1 202 555 0117'];
  return <div className="catalog-page">
    <header className="catalog-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button><div><strong>{country.flag} {country.name}</strong><small>{country.dial} · available numbers from connected providers</small></div></header>
    <div className="catalog-body">
      {demoNumbers.map(number => <button key={number} className={`catalog-number ${picked === number ? 'selected' : ''}`} onClick={() => setPicked(number)}><span>{number}</span><strong>Provider price</strong></button>)}
      <p className="catalog-note">These are display-only demo entries until a rental provider is connected. No number is actually rented from this screen yet.</p>
    </div>
    {picked && <div className="catalog-checkout"><strong>{picked}</strong><div className="plan-row">{plans.map(p => <button className={plan === p ? 'selected' : ''} key={p} onClick={() => setPlan(p)}>{p}</button>)}</div><strong className="catalog-price">Provider price · {plan}</strong><button className="rent-submit" onClick={() => setPicked(null)}>Rent this number</button></div>}
  </div>;
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
  const [fromLine, setFromLine] = useState<Line>({ id: 'sim', label: 'SIM Number', number: '+234 —', flag: '🇳🇬', type: 'sim' });
  const [catalog, setCatalog] = useState<Country | null>(null);
  const [hint, setHint] = useState(true);

  const lines = useMemo<Line[]>(() => [fromLine], [fromLine]);
  const recents = useMemo<Recent[]>(() => [], []);
  const rentedContacts = useMemo(() => lines.filter(line => line.type === 'rented' && (line.label.toLowerCase().includes(contactSearch.toLowerCase()) || line.number.replace(/\s/g, '').includes(contactSearch.replace(/\s/g, '')))), [lines, contactSearch]);

  if (catalog) return <Catalog country={catalog} onBack={() => setCatalog(null)} />;

  const openBrowse = () => { setBrowse(true); setShowCountry(true); };
  const openDialCountry = () => { setBrowse(false); setShowCountry(true); };
  const selectCountry = (c: Country) => { setCountry(c); setCountrySearch(''); setShowCountry(false); if (browse) setCatalog(c); setBrowse(false); setDial(''); };

  return <div className="rental-page">
    <header className="rental-header">
      <button className="rental-icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button>
      <div className="rental-title"><span className="eyebrow">DEDICATED LINE</span><h1>Rent a Line</h1></div>
      <div className="rental-head-actions"><button className="rental-icon-button" onClick={() => setTab('calls')} aria-label="Profile"><User size={20}/></button><button className="rental-icon-button primary" onClick={openBrowse} aria-label="Rent number"><Plus size={22}/></button></div>
    </header>

    {tab === 'calls' && <>
      <div className="rental-call-head"><h2>Calls</h2><div><button onClick={() => setCallTab('history')} className={callTab === 'history' ? 'mini-active' : ''}>History</button><button onClick={() => setCallTab('contacts')} className={callTab === 'contacts' ? 'mini-active' : ''}>Contacts</button><button onClick={() => setCallTab('keypad')} className={callTab === 'keypad' ? 'mini-active' : ''}>Keypad</button></div></div>
      {callTab === 'history' && <section className="rental-content">
        <h3>Favorites</h3>{hint && <div className="favorite-hint"><span>☆</span><p>Adding contacts as favorite will make them appear here — <u>learn more</u></p><button onClick={() => setHint(false)}>×</button></div>}
        <div className="recent-head"><h3>Recents</h3><div><button aria-label="Filter"><Filter size={18}/></button><button aria-label="More"><MoreVertical size={18}/></button></div></div>
        {recents.length === 0 ? <div className="rental-empty"><Clock size={40}/><strong>No call history</strong><p>Rent a number with + then calls appear here.</p><button className="blue-pill" onClick={openBrowse}>Rent a number</button></div> : <ul className="recent-list">{recents.map(c => <li key={c.id}><div className={`recent-avatar ${c.inactive ? 'inactive' : ''}`}>{c.inactive ? <User size={20}/> : c.number.slice(-1)}</div><div className="recent-main"><strong className={c.inactive ? 'inactive-text' : ''}>{c.number}</strong><span>{c.inactive ? <PhoneMissed size={13}/> : <PhoneOutgoing size={13}/>} {c.label}</span></div><small>{c.date}</small></li>)}</ul>}
      </section>}
      {callTab === 'contacts' && <section className="rental-content">
        <div className="contact-search"><Search size={16}/><input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts"/></div>
        {rentedContacts.length === 0 ? <EmptyState title="No contacts yet" text="Contacts from rented lines show up here." icon={<Users size={40}/>} /> : <ul className="contact-list">{rentedContacts.map(line => <li key={line.id}><div className="contact-avatar">{line.label.charAt(0)}</div><div><strong>{line.label}</strong><small>{line.number}</small></div><button onClick={() => { setFromLine(line); setCallTab('keypad'); }} aria-label={`Call ${line.label}`}><Phone size={18}/></button></li>)}</ul>}
      </section>}
      {callTab === 'keypad' && <section className="keypad-section">
        <button className="from-pill" onClick={() => setShowFrom(true)}>{fromLine.label}<ChevronDown size={14}/></button>
        <div className="dial-display"><button onClick={openDialCountry}>{country.flag}<ChevronDown size={14}/></button><span>{dial || country.dial}</span></div>
        <div className="dial-grid">{KEYS.map(([digit, letters]) => <button key={digit} onClick={() => setDial(d => d.length >= 18 ? d : d + digit)}><strong>{digit}</strong>{letters ? <small>{letters}</small> : digit === '0' ? <small>+</small> : <small>&nbsp;</small>}</button>)}</div>
        <div className="dial-actions"><div className="dial-spacer"/><button className="call-button" onClick={() => setDial(d => d)} aria-label="Call"><Phone size={27} fill="white" strokeWidth={0}/></button><button className="delete-button" onClick={() => setDial(d => d.slice(0, -1))} aria-label="Delete"><Delete size={17}/></button></div>
        <button className="browse-pill" onClick={openBrowse}><Hash size={14}/> Browse & rent numbers</button>
      </section>}
    </>}

    {tab === 'messages' && <section className="rental-content"><div className="simple-page-head"><h2>Messages</h2><button aria-label="New message"><MessageSquare size={20}/></button></div><div className="contact-search"><Search size={16}/><input placeholder="Search"/></div><EmptyState title="No messages yet" text="SMS from your rented numbers will show up here." icon={<MessageSquare size={48} strokeWidth={1.25}/>} /></section>}

    {tab === 'numbers' && <section className="rental-content"><div className="section-row"><div><span className="eyebrow">NUMBERS</span><h2>Your rented lines</h2></div><button className="text-action" onClick={openBrowse}><Plus size={18}/> Add</button></div><EmptyState title="No numbers yet" text="Rent a virtual number for calls and SMS. Your active numbers, expiry dates, capabilities and status will appear here." icon={<Hash size={42}/>} /><div className="numbers-actions"><button className="blue-pill" onClick={openBrowse}>Rent a number</button></div></section>}

    {tab === 'credit' && <section className="rental-content"><div className="section-row"><div><span className="eyebrow">CREDIT</span><h2>Credit</h2></div></div><div className="credit-card"><div><small>AVAILABLE CREDIT</small><strong>₦0.00</strong><span>Top up your wallet to pay for rentals.</span></div><Wallet size={24}/></div><h3>Top-up packages</h3>{['₦5,000','₦10,000','₦20,000','₦50,000'].map(v => <button className="package-row" key={v} onClick={() => setTab('credit')}><div><strong>{v}</strong><small>Wallet credit</small></div><span>{v} ›</span></button>)}</section>}

    <nav className="rental-tabs" aria-label="Rental navigation">
      {([['calls','Calls',Phone],['messages','Messages',MessageSquare],['numbers','Numbers',Hash],['credit','Credit',Wallet]] as const).map(([id,label,Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span></button>)}
    </nav>

    <FromSheet open={showFrom} lines={lines} selected={fromLine} onClose={() => setShowFrom(false)} onSelect={l => { setFromLine(l); setShowFrom(false); }}/>
    <CountrySheet open={showCountry} browse={browse} search={countrySearch} setSearch={setCountrySearch} country={country} onClose={() => { setShowCountry(false); setCountrySearch(''); setBrowse(false); }} onSelect={selectCountry}/>
  </div>;
}
