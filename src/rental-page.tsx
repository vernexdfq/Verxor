/**
 * Verxor Rent a Line — Call.com-style workspace (wallet-only).
 */
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft, Bell, Check, ChevronDown, ChevronRight, Clock, Copy, Delete,
  Hash, HelpCircle, LogOut, MessageSquare, Phone, PhoneForwarded, Plus,
  Search, Settings as SettingsIcon, Shield, Trash2, Users, Wallet, X,
} from 'lucide-react';
import './rental-page.css';

type MainTab = 'calls' | 'messages' | 'numbers' | 'wallet' | 'settings';
type CallSub = 'history' | 'contacts' | 'keypad';
type NumbersSub = 'phone' | 'esim';
type View =
  | 'main' | 'buy-country' | 'buy-region' | 'buy-numbers' | 'buy-period'
  | 'line-settings' | 'line-renew' | 'line-rename' | 'line-dnd'
  | 'line-voicemail' | 'line-forwarding' | 'line-transfer';

type Country = { code: string; name: string; dial: string; flag: string; type: string; fromPrice: number };
type Region = { id: string; name: string; area: string; city: string };
type AvailNumber = { id: string; e164: string; display: string };
type Period = { id: string; label: string; months: number; priceMul: number; saveLabel?: string };
type Line = {
  id: string; label: string; number: string; flag: string; country: string; countryCode: string;
  type: string; expiresAt: string; dnd: boolean; voicemail: boolean; leaveMessage: boolean;
  smsToEmail: boolean; smsToMobile: boolean; callToPhone: boolean; forwardTarget: string;
};

const KEYS = [
  { digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' }, { digit: '0', letters: '+' }, { digit: '#', letters: '' },
];

const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', type: 'Mobile', fromPrice: 6990 },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', type: 'Mobile', fromPrice: 6490 },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', type: 'Mobile', fromPrice: 7990 },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷', type: 'Mobile', fromPrice: 6990 },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', type: 'Mobile', fromPrice: 4490 },
];

const REGIONS: Record<string, Region[]> = {
  US: [
    { id: 'us-fl-305', name: 'Florida', area: '305', city: 'Miami' },
    { id: 'us-fl-786', name: 'Florida', area: '786', city: 'Miami' },
    { id: 'us-ca-213', name: 'California', area: '213', city: 'Los Angeles' },
    { id: 'us-ca-415', name: 'California', area: '415', city: 'San Francisco' },
    { id: 'us-ny-212', name: 'New York', area: '212', city: 'New York' },
    { id: 'us-tx-214', name: 'Texas', area: '214', city: 'Dallas' },
  ],
  CA: [{ id: 'ca-on-416', name: 'Ontario', area: '416', city: 'Toronto' }],
  GB: [{ id: 'gb-ldn-20', name: 'London', area: '20', city: 'London' }],
  PR: [{ id: 'pr-787', name: 'Puerto Rico', area: '787', city: 'San Juan' }],
  NG: [{ id: 'ng-lag-1', name: 'Lagos', area: '1', city: 'Lagos' }],
};

const PERIODS: Period[] = [
  { id: '1m', label: '1 Month', months: 1, priceMul: 1 },
  { id: '3m', label: '3 Months', months: 3, priceMul: 2.55, saveLabel: 'Save 15%' },
  { id: '12m', label: '12 Months', months: 12, priceMul: 8.4, saveLabel: 'Save 30%' },
];

const money = (ngn: number) => `₦${Math.round(ngn).toLocaleString('en-NG')}`;
function formatExp(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
}
function makeAvail(country: Country, region: Region): AvailNumber[] {
  const base = region.area.replace(/\D/g, '').slice(0, 3) || '555';
  return [0, 1, 2, 3, 4].map((i) => {
    const last = String(1000 + i * 137).slice(-4);
    return { id: `${region.id}-${i}`, e164: `${country.dial}${base}${last}`, display: `${country.dial} ${base} ${last.slice(0, 3)} ${last.slice(3)}` };
  });
}
function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rl-empty">
      <div className="rl-empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function RentalPage({ onBack, onOpenEsim }: { onBack: () => void; onOpenEsim?: () => void }) {
  const [tab, setTab] = useState<MainTab>('numbers');
  const [callSub, setCallSub] = useState<CallSub>('history');
  const [numSub, setNumSub] = useState<NumbersSub>('phone');
  const [view, setView] = useState<View>('main');
  const [lines, setLines] = useState<Line[]>([]);
  const [active, setActive] = useState<Line | null>(null);
  const [fromLine, setFromLine] = useState<Line | null>(null);
  const [buyCountry, setBuyCountry] = useState<Country | null>(null);
  const [buyRegion, setBuyRegion] = useState<Region | null>(null);
  const [buyNumber, setBuyNumber] = useState<AvailNumber | null>(null);
  const [buyPeriod, setBuyPeriod] = useState<Period | null>(null);
  const [countryQ, setCountryQ] = useState('');
  const [regionQ, setRegionQ] = useState('');
  const [msgQ, setMsgQ] = useState('');
  const [dial, setDial] = useState('');
  const [dialCountry, setDialCountry] = useState(COUNTRIES[0]);
  const [renameVal, setRenameVal] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFromSheet, setShowFromSheet] = useState(false);
  const [showDialCountry, setShowDialCountry] = useState(false);
  const [holdSecs, setHoldSecs] = useState(300);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    if (view !== 'buy-period' || holdSecs <= 0) return;
    const t = window.setInterval(() => setHoldSecs((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [view, holdSecs]);

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
    setBuyCountry(null); setBuyRegion(null); setBuyNumber(null); setBuyPeriod(null);
    setCountryQ(''); setRegionQ(''); setView('buy-country');
  };

  const confirmBuy = () => {
    if (!buyCountry || !buyNumber || !buyPeriod || holdSecs <= 0) return;
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

  const openLine = (line: Line) => { setActive(line); setRenameVal(line.label); setView('line-settings'); };

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
    try { await navigator.clipboard.writeText(active.number.replace(/\s/g, '')); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
    catch { setCopied(false); }
  };

  const headerBack = () => {
    if (view === 'main') onBack();
    else if (view === 'buy-country') setView('main');
    else if (view === 'buy-region') setView('buy-country');
    else if (view === 'buy-numbers') setView('buy-region');
    else if (view === 'buy-period') setView('buy-numbers');
    else if (view === 'line-settings') { setView('main'); setTab('numbers'); }
    else setView('line-settings');
  };

  const holdLabel = holdSecs > 0
    ? `${Math.floor(holdSecs / 60)}:${String(holdSecs % 60).padStart(2, '0')}`
    : 'Expired';

  const title =
    view === 'main'
      ? tab === 'calls' ? 'Calls' : tab === 'messages' ? 'Messages' : tab === 'numbers' ? 'Phone numbers' : tab === 'wallet' ? 'Wallet' : 'Settings'
      : view === 'buy-country' ? 'Select country'
      : view === 'buy-region' || view === 'buy-numbers' ? 'Choose a number'
      : view === 'buy-period' ? 'Get your Number'
      : view === 'line-settings' ? 'Settings'
      : view === 'line-renew' ? 'Renew'
      : view === 'line-rename' ? 'Rename'
      : view === 'line-dnd' ? 'Do not disturb'
      : view === 'line-voicemail' ? 'Voicemail'
      : view === 'line-forwarding' ? 'Forwarding'
      : view === 'line-transfer' ? 'Transfer' : 'Rent a Line';

  return (
    <div className="rl-page">
      <header className="rl-header">
        <button type="button" className="rl-icon" onClick={headerBack} aria-label="Back"><ArrowLeft size={20} /></button>
        <h1>{title}</h1>
        <div className="rl-header-right">
          {view === 'main' && (tab === 'calls' || tab === 'numbers') && (
            <button type="button" className="rl-icon primary" onClick={openBuy} aria-label="Rent number"><Plus size={22} strokeWidth={2.2} /></button>
          )}
          {(view === 'line-dnd' || view === 'line-voicemail') && (
            <button type="button" className="rl-text-btn" onClick={() => setView('line-settings')}>Save</button>
          )}
          {view !== 'main' && view !== 'line-dnd' && view !== 'line-voicemail' && <span className="rl-spacer" />}
        </div>
      </header>

      {view === 'main' && (
        <>
          {tab === 'calls' && (
            <section className="rl-body">
              <div className="rl-seg">
                <button type="button" className={callSub === 'history' ? 'active' : ''} onClick={() => setCallSub('history')}>Recents</button>
                <button type="button" className={callSub === 'contacts' ? 'active' : ''} onClick={() => setCallSub('contacts')}>Contacts</button>
                <button type="button" className={callSub === 'keypad' ? 'active' : ''} onClick={() => setCallSub('keypad')}>Keypad</button>
              </div>
              {callSub === 'history' && (
                <Empty icon={<Phone size={40} strokeWidth={1.25} />} title="No recent calls" text="Outbound and inbound calls on your rented lines will appear here." />
              )}
              {callSub === 'contacts' && (
                <Empty icon={<Users size={40} strokeWidth={1.25} />} title="No contacts" text="Sync device contacts or add a new one." action={<button type="button" className="rl-pill">Add contact</button>} />
              )}
              {callSub === 'keypad' && (
                <section className="rl-keypad">
                  <button type="button" className="rl-from-pill" onClick={() => setShowFromSheet(true)}>
                    {fromLine ? fromLine.number : 'Select line'} <ChevronDown size={14} />
                  </button>
                  <div className="rl-dial-display">
                    <button type="button" onClick={() => setShowDialCountry(true)}>{dialCountry.flag} {dialCountry.dial} <ChevronDown size={14} /></button>
                    <span>{dial || ' '}</span>
                  </div>
                  <div className="rl-dial-grid">
                    {KEYS.map((k) => (
                      <button key={k.digit} type="button" onClick={() => setDial((d) => d + k.digit)}>
                        <strong>{k.digit}</strong>
                        {k.letters && <small>{k.letters}</small>}
                      </button>
                    ))}
                  </div>
                  <div className="rl-dial-actions">
                    <button type="button" className="rl-call-btn" aria-label="Call"><Phone size={22} /></button>
                    <button type="button" className="rl-icon" onClick={() => setDial((d) => d.slice(0, -1))} aria-label="Delete"><Delete size={20} /></button>
                  </div>
                </section>
              )}
            </section>
          )}

          {tab === 'messages' && (
            <section className="rl-body">
              <div className="rl-search"><Search size={16} /><input value={msgQ} onChange={(e) => setMsgQ(e.target.value)} placeholder="Search messages" /></div>
              <Empty icon={<MessageSquare size={40} strokeWidth={1.25} />} title="No messages" text="Inbound SMS to your rented lines will appear here." action={<button type="button" className="rl-pill" onClick={openBuy}>Rent a number</button>} />
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
            <button type="button" className={tab === 'calls' ? 'active' : ''} onClick={() => { setTab('calls'); setCallSub('history'); }}><Phone size={20} /><span>Calls</span></button>
            <button type="button" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}><MessageSquare size={20} /><span>Messages</span></button>
            <button type="button" className={tab === 'numbers' ? 'active' : ''} onClick={() => setTab('numbers')}><Hash size={20} /><span>Numbers</span></button>
            <button type="button" className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}><Wallet size={20} /><span>Wallet</span></button>
            <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}><SettingsIcon size={20} /><span>Settings</span></button>
          </nav>
        </>
      )}

      {view === 'buy-country' && (
        <section className="rl-body">
          <div className="rl-search"><Search size={16} /><input value={countryQ} onChange={(e) => setCountryQ(e.target.value)} placeholder="Search country" autoFocus /></div>
          <div className="rl-country-list">
            {filteredCountries.map((c) => (
              <button key={c.code} type="button" className="rl-country-row" onClick={() => { setBuyCountry(c); setRegionQ(''); setView('buy-region'); }}>
                <span className="rl-flag">{c.flag}</span>
                <div><strong>{c.name}</strong><small>{c.dial} · {c.type} · from {money(c.fromPrice)}</small></div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-region' && buyCountry && (
        <section className="rl-body">
          <div className="rl-pick-card">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyCountry.name}</strong><small>{buyCountry.type}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-country')}>Change</button>
          </div>
          <p className="rl-label-caps">SELECT AREA CODE</p>
          <div className="rl-search"><Search size={16} /><input value={regionQ} onChange={(e) => setRegionQ(e.target.value)} placeholder="Area code, city, state…" /></div>
          <div className="rl-region-list">
            {regionsForBuy.map((r) => (
              <button key={r.id} type="button" className="rl-region-row" onClick={() => { setBuyRegion(r); setView('buy-numbers'); }}>
                <div><strong>{r.name}</strong><small>{r.city} ({r.area})</small></div>
                <span className="rl-area">{r.area} <ChevronRight size={16} /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-numbers' && buyCountry && buyRegion && (
        <section className="rl-body">
          <div className="rl-pick-card">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyCountry.name}</strong><small>{buyCountry.type}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-country')}>Change</button>
          </div>
          <div className="rl-pick-card">
            <span className="rl-pin">📍</span>
            <div><strong>{buyRegion.name} – {buyRegion.area}</strong><small>{buyRegion.city}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-region')}>Change</button>
          </div>
          <p className="rl-label-caps">AVAILABLE NUMBERS</p>
          {availNumbers.map((n) => (
            <button key={n.id} type="button" className="rl-num-pick" onClick={() => { setBuyNumber(n); setBuyPeriod(PERIODS[0]); setHoldSecs(300); setView('buy-period'); }}>
              <strong>{n.display}</strong>
              <Check size={18} className="rl-check-faint" />
            </button>
          ))}
        </section>
      )}

      {view === 'buy-period' && buyCountry && buyNumber && (
        <section className="rl-body rl-get-number">
          <div className={'rl-number-hold' + (holdSecs <= 0 ? ' expired' : '')}>
            <span className="rl-flag lg">{buyCountry.flag}</span>
            <div className="rl-hold-meta">
              <strong className="rl-hold-num">{buyNumber.display}</strong>
              <span className="rl-hold-hint">{holdSecs > 0 ? 'Number held while you decide' : 'Hold expired — pick another number'}</span>
            </div>
            <span className="rl-hold-timer">{holdLabel}</span>
          </div>

          <div className="rl-feature-card">
            <div className="rl-feat-row">
              <span className="rl-feat-icon">∞</span>
              <div><strong>Unlimited · 5.0¢/SMS · Included</strong><small>Inbound SMS · National SMS · Voicemail</small></div>
            </div>
            <div className="rl-feat-row">
              <span className="rl-feat-icon">📞</span>
              <div><strong>Inbound & outbound calls</strong><small>Where supported by the number type</small></div>
            </div>
            <button type="button" className="rl-link" onClick={() => setShowFeatures(true)}>See all features</button>
          </div>

          <div className="rl-plan-pills">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" className={'rl-plan-pill' + (buyPeriod?.id === p.id ? ' active' : '')} onClick={() => setBuyPeriod(p)}>
                <span>{p.label}</span>
                {p.saveLabel && <span className="rl-save-badge">{p.saveLabel}</span>}
              </button>
            ))}
          </div>

          {buyPeriod && (
            <div className="rl-price-block">
              <span className="rl-month-price">{money(priceOf(buyCountry, buyPeriod))}</span>
              <p className="rl-year-price">for {buyPeriod.label.toLowerCase()} · debited from wallet</p>
            </div>
          )}

          <button type="button" className="rl-pill full" disabled={!buyPeriod || holdSecs <= 0} onClick={confirmBuy}>
            {holdSecs <= 0 ? 'Hold expired' : buyPeriod ? `Confirm · ${money(priceOf(buyCountry, buyPeriod))}` : 'Select a plan'}
          </button>
          <p className="rl-foot">Debits your Verxor wallet. Number held for 5 minutes while you decide.</p>
        </section>
      )}

      {view === 'line-settings' && active && (
        <section className="rl-body">
          <div className="rl-detail-head">
            <strong>{active.number}</strong>
            <p>{active.label} · Expires {formatExp(active.expiresAt)}</p>
            <button type="button" className="rl-copy" onClick={copyNum}><Copy size={14} />{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="rl-settings">
            <button type="button" className="rl-set-row" onClick={() => setView('line-renew')}><Clock size={18} /><div><strong>Renew</strong><small>Extend this number</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => { setRenameVal(active.label); setView('line-rename'); }}><Hash size={18} /><div><strong>Rename</strong><small>{active.label}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-dnd')}><Bell size={18} /><div><strong>Do not disturb</strong><small>{active.dnd ? 'On' : 'Off'}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-voicemail')}><MessageSquare size={18} /><div><strong>Voicemail</strong><small>{active.voicemail ? 'On' : 'Off'}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row" onClick={() => setView('line-forwarding')}><PhoneForwarded size={18} /><div><strong>Forwarding</strong><small>{active.forwardTarget || 'Off'}</small></div><ChevronRight size={18} /></button>
            <button type="button" className="rl-set-row danger" onClick={release}><Trash2 size={18} /><div><strong>Release number</strong><small>Cannot be undone</small></div><ChevronRight size={18} /></button>
          </div>
        </section>
      )}

      {view === 'line-renew' && active && (
        <section className="rl-body">
          <p className="rl-muted">Current expiry: {formatExp(active.expiresAt)}</p>
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className="rl-country-row" onClick={() => renew(p)}>
              <div><strong>{p.label}</strong><small>{p.saveLabel || 'Standard rate'}</small></div>
              <span className="rl-price">{money(priceOf(COUNTRIES.find((c) => c.code === active.countryCode) || COUNTRIES[0], p))}</span>
            </button>
          ))}
        </section>
      )}

      {view === 'line-rename' && active && (
        <section className="rl-body">
          <input className="rl-rename-input" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} placeholder="e.g. Work line" />
          <button type="button" className="rl-pill full" onClick={() => { patchLine({ label: renameVal.trim() || active.label }); setView('line-settings'); }}>Save</button>
        </section>
      )}

      {view === 'line-dnd' && active && (
        <section className="rl-body">
          <button type="button" className="rl-switch-row" onClick={() => patchLine({ dnd: !active.dnd })}>
            <div><strong>Do not disturb</strong><small>Silence calls and SMS alerts</small></div>
            <span className={'rl-switch' + (active.dnd ? ' on' : '')} />
          </button>
        </section>
      )}

      {view === 'line-voicemail' && active && (
        <section className="rl-body">
          <button type="button" className="rl-switch-row" onClick={() => patchLine({ voicemail: !active.voicemail })}>
            <div><strong>Voicemail</strong><small>Send unanswered calls to voicemail</small></div>
            <span className={'rl-switch' + (active.voicemail ? ' on' : '')} />
          </button>
          <button type="button" className="rl-switch-row" onClick={() => patchLine({ leaveMessage: !active.leaveMessage })}>
            <div><strong>Leave a message</strong><small>Allow callers to leave a recording</small></div>
            <span className={'rl-switch' + (active.leaveMessage ? ' on' : '')} />
          </button>
        </section>
      )}

      {view === 'line-forwarding' && active && (
        <section className="rl-body">
          <button type="button" className="rl-switch-row" onClick={() => patchLine({ callToPhone: !active.callToPhone })}>
            <div><strong>Forward calls</strong><small>Route to another number or email</small></div>
            <span className={'rl-switch' + (active.callToPhone ? ' on' : '')} />
          </button>
          <input className="rl-rename-input" value={active.forwardTarget} onChange={(e) => patchLine({ forwardTarget: e.target.value })} placeholder="Email or +phone" />
        </section>
      )}

      {showFeatures && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowFeatures(false)} aria-label="Close" />
          <div className="rl-sheet rl-features-sheet">
            <div className="rl-sheet-head"><strong>Features</strong><button type="button" onClick={() => setShowFeatures(false)}><X size={20} /></button></div>
            <div className="rl-body rl-features-body">
              <h4>Included</h4>
              <p>Inbound SMS, national SMS, voicemail, number hold while you choose a plan.</p>
              <h4>Calls</h4>
              <p>Make and receive calls where the number type supports it. Rates debit your wallet.</p>
              <h4>Controls</h4>
              <p>DND, forwarding, rename, renew, and release from number settings.</p>
            </div>
          </div>
        </div>
      )}

      {showFromSheet && (
        <div className="rl-sheet-layer">
          <button type="button" className="rl-sheet-bg" onClick={() => setShowFromSheet(false)} aria-label="Close" />
          <div className="rl-sheet">
            <div className="rl-sheet-head"><strong>Select line</strong><button type="button" onClick={() => setShowFromSheet(false)}><X size={20} /></button></div>
            <div className="rl-body">
              {lines.length === 0 ? <p className="rl-muted">Rent a number first to place calls.</p> : lines.map((l) => (
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
            <div className="rl-sheet-head"><strong>Country code</strong><button type="button" onClick={() => setShowDialCountry(false)}><X size={20} /></button></div>
            <div className="rl-body">
              {COUNTRIES.map((c) => (
                <button key={c.code} type="button" className={'rl-country-row' + (dialCountry.code === c.code ? ' selected' : '')} onClick={() => { setDialCountry(c); setShowDialCountry(false); }}>
                  <span className="rl-flag">{c.flag}</span>
                  <div><strong>{c.name}</strong><small>{c.dial}</small></div>
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
