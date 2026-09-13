import { useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronDown, Clock, Delete, Filter, Grid3X3, Hash,
  Loader2, MessageSquare, MoreVertical, Phone, PhoneMissed, PhoneOutgoing,
  Plus, Search, User, Users, Wallet, X,
} from 'lucide-react';
import './rental-page.css';

type Tab = 'calls' | 'messages' | 'numbers' | 'credit';
type CallTab = 'history' | 'contacts' | 'keypad';
type Line = { id: string; label: string; number: string; flag: string; type: 'rented' | 'sim' };
type Country = { code: string; name: string; dial: string; flag: string };

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

function Empty({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <section className="rental-content">
      <div className="rental-section-heading"><div><span className="eyebrow">MESSAGES</span><h2>{title}</h2></div></div>
      <div className="rental-empty">{icon}<strong>{title === 'SMS inbox' ? 'No messages yet' : title}</strong><p>{text}</p></div>
    </section>
  );
}

function CountrySheet({ open, browse, search, setSearch, country, onClose, onSelect }: {
  open: boolean; browse: boolean; search: string; setSearch: (v: string) => void; country: Country; onClose: () => void; onSelect: (c: Country) => void;
}) {
  if (!open) return null;
  const filtered = COUNTRIES.filter(c => {
    const q = search.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q);
  });
  return (
    <div className="sheet-layer">
      <button className="sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className="sheet country-sheet">
        <div className="sheet-head"><h2>{browse ? 'Rent a number' : 'Select country'}</h2><button onClick={onClose} aria-label="Close"><X size={20}/></button></div>
        <div className="sheet-search"><Search size={16}/><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search country" /></div>
        <div className="sheet-list">
          {filtered.length === 0 ? <div className="sheet-empty">No countries match</div> : filtered.map(c => (
            <button className="sheet-row" key={c.code} onClick={() => onSelect(c)}>
              <span className="country-flag">{c.flag}</span><div><strong>{c.name}</strong>{browse && <small>Provider inventory will determine availability</small>}</div><span className="country-dial">{c.dial}</span>{!browse && country.code === c.code && <Check size={18}/>} 
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FromSheet({ open, lines, selected, onClose, onSelect }: { open: boolean; lines: Line[]; selected: Line; onClose: () => void; onSelect: (l: Line) => void }) {
  if (!open) return null;
  return <div className="sheet-layer"><button className="sheet-backdrop" onClick={onClose} aria-label="Close"/><div className="sheet">
    <div className="sheet-head"><h2>Call from</h2><button onClick={onClose} aria-label="Close"><X size={20}/></button></div>
    {lines.map(line => <button className="sheet-row" key={line.id} onClick={() => onSelect(line)}><span className="line-icon">{line.type === 'sim' ? '▮' : line.flag}</span><div><strong>{line.label}</strong><small>{line.number}</small></div>{selected.id === line.id && <Check size={18}/>}</button>)}
  </div></div>;
}

function Catalog({ country, onBack }: { country: Country; onBack: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [plan, setPlan] = useState('1 Month');
  const plans = ['1 Week', '1 Month', '1 Year'];
  return <div className="catalog-page">
    <header className="catalog-head"><button onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button><div><strong>{country.flag} {country.name}</strong><small>{country.dial} · available numbers from connected providers</small></div></header>
    <div className="catalog-body">
      <div className="catalog-empty"><Hash size={36}/><strong>No numbers available right now</strong><p>Available numbers will appear here when a connected provider returns inventory for this country.</p></div>
    </div>
    {picked && <div className="catalog-checkout"><strong>{picked}</strong><div className="plan-row">{plans.map(p => <button className={plan === p ? 'selected' : ''} key={p} onClick={() => setPlan(p)}>{p}</button>)}</div><strong className="catalog-price">Price supplied by provider</strong><button className="rent-submit">Rent this number</button></div>}
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

  if (catalog) return <Catalog country={catalog} onBack={() => setCatalog(null)} />;

  const openBrowse = () => { setBrowse(true); setShowCountry(true); };
  const openDialCountry = () => { setBrowse(false); setShowCountry(true); };
  const selectCountry = (c: Country) => { setCountry(c); setCountrySearch(''); setShowCountry(false); if (browse) setCatalog(c); setBrowse(false); setDial(''); };

  return <div className="rental-page">
    <header className="rental-header">
      <button className="rental-icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={20}/></button>
      <div className="rental-title"><span className="eyebrow">DEDICATED LINE</span><h1>Rent a Line</h1></div>
      <button className="rental-icon-button primary" onClick={openBrowse} aria-label="Rent number"><Plus size={22}/></button>
    </header>

    {tab === 'calls' && <>
      <div className="rental-call-head"><h2>Calls</h2><div><button onClick={() => setCallTab('history')} className={callTab === 'history' ? 'mini-active' : ''}>History</button><button onClick={() => setCallTab('contacts')} className={callTab === 'contacts' ? 'mini-active' : ''}>Contacts</button><button onClick={() => setCallTab('keypad')} className={callTab === 'keypad' ? 'mini-active' : ''}>Keypad</button></div></div>
      {callTab === 'history' && <section className="rental-content">
        <h3>Favorites</h3>{hint && <div className="favorite-hint"><span>☆</span><p>Adding contacts as favorite will make them appear here — <u>learn more</u></p><button onClick={() => setHint(false)}>×</button></div>}
        <div className="recent-head"><h3>Recents</h3><div><button aria-label="Filter"><Filter size={18}/></button><button aria-label="More"><MoreVertical size={18}/></button></div></div>
        <div className="rental-empty"><Clock size={40}/><strong>No call history</strong><p>Rent a number with + then calls appear here.</p><button className="blue-pill" onClick={openBrowse}>Rent a number</button></div>
      </section>}
      {callTab === 'contacts' && <section className="rental-content">
        <div className="contact-search"><Search size={16}/><input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts"/></div>
        <div className="rental-empty"><Users size={40}/><strong>No contacts yet</strong><p>Contacts from rented lines show up here.</p></div>
      </section>}
      {callTab === 'keypad' && <section className="keypad-section">
        <button className="from-pill" onClick={() => setShowFrom(true)}>{fromLine.label}<ChevronDown size={14}/></button>
        <div className="dial-display"><button onClick={openDialCountry}>{country.flag}<ChevronDown size={14}/></button><span>{dial || country.dial}</span></div>
        <div className="dial-grid">{KEYS.map(([digit, letters]) => <button key={digit} onClick={() => setDial(d => d.length >= 18 ? d : d + digit)}><strong>{digit}</strong>{letters ? <small>{letters}</small> : digit === '0' ? <small>+</small> : <small>&nbsp;</small>}</button>)}</div>
        <div className="dial-actions"><div/><button className="call-button" onClick={() => { if (!dial) return; }} aria-label="Call"><Phone size={27} fill="white" strokeWidth={0}/></button><button className="delete-button" onClick={() => setDial(d => d.slice(0, -1))} aria-label="Delete"><Delete size={17}/></button></div>
        <button className="browse-pill" onClick={openBrowse}><Hash size={14}/> Browse & rent numbers</button>
      </section>}
    </>}

    {tab === 'messages' && <><div className="simple-page-head"><h2>Messages</h2><button aria-label="New message"><MessageSquare size={20}/></button></div><div className="contact-search"><Search size={16}/><input placeholder="Search"/></div><Empty title="SMS inbox" text="SMS from your rented numbers will show up here." icon={<MessageSquare size={48} strokeWidth={1.25}/>} /></>}

    {tab === 'numbers' && <section className="rental-content"><div className="section-row"><div><span className="eyebrow">NUMBERS</span><h2>Your rented lines</h2></div><button className="text-action" onClick={openBrowse}><Plus size={18}/> Add</button></div><div className="rental-empty"><Hash size={42}/><strong>No numbers yet</strong><p>Rent a virtual number for calls and SMS. Your active numbers, expiry dates, capabilities and status will appear here.</p><button className="blue-pill" onClick={openBrowse}>Rent a number</button></div></section>}

    {tab === 'credit' && <section className="rental-content"><div className="section-row"><div><span className="eyebrow">CREDIT</span><h2>Credit</h2></div></div><div className="credit-card"><div><small>AVAILABLE CREDIT</small><strong>₦0.00</strong><span>Top up your wallet to pay for rentals.</span></div><Wallet size={24}/></div><h3>Top-up packages</h3>{['₦5,000','₦10,000','₦20,000','₦50,000'].map(v => <button className="package-row" key={v}><div><strong>{v}</strong><small>Wallet credit</small></div><span>{v} ›</span></button>)}</section>}

    <nav className="rental-tabs" aria-label="Rental navigation">
      {([['calls','Calls',Phone],['messages','Messages',MessageSquare],['numbers','Numbers',Hash],['credit','Credit',Wallet]] as const).map(([id,label,Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span></button>)}
    </nav>

    <FromSheet open={showFrom} lines={lines} selected={fromLine} onClose={() => setShowFrom(false)} onSelect={l => { setFromLine(l); setShowFrom(false); }}/>
    <CountrySheet open={showCountry} browse={browse} search={countrySearch} setSearch={setCountrySearch} country={country} onClose={() => { setShowCountry(false); setCountrySearch(''); setBrowse(false); }} onSelect={selectCountry}/>
  </div>;
}
