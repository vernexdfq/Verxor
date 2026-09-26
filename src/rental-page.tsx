/**
 * Verxor Rent-a-Number — Grade-1 fintech rental hub
 *
 * Architecture (locked):
 * - Lives inside Verxor AppShell (no second bottom nav)
 * - Internal tabs: My Numbers | Messages
 * - Buy flow: Country → Region → Number → Period → Confirm (Wallet)
 * - Periods: 30 / 90 / 365 days with Save 15% / Save 30%
 * - Grace: 7 days after expiry, then auto-release
 * - Mock state isolated in rental-hooks (wipe DEMO seeds for production)
 * - eSIM links to existing service; voice/keypad Phase 2
 */
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BellOff,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Globe2,
  Mail,
  MessageSquare,
  Phone,
  PhoneForwarded,
  Plus,
  Search,
  Shield,
  Smartphone,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react';
import './rental-page.css';
import {
  COUNTRIES,
  GRACE_DAYS,
  PERIODS,
  REGIONS,
  daysLeft,
  formatExp,
  formatNgn,
  makeAvail,
  priceOf,
  type AvailNumber,
  type Country,
  type Period,
  type Region,
  type RentedLine,
  type NumberStatus,
} from './rental-data';
import { useRentedNumbers, useSMSInbox } from './rental-hooks';

type Tab = 'numbers' | 'messages';
type View =
  | 'main'
  | 'buy-country'
  | 'buy-region'
  | 'buy-numbers'
  | 'buy-period'
  | 'buy-confirm'
  | 'line-detail'
  | 'line-renew'
  | 'line-rename'
  | 'line-forwarding';

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

export function RentalPage({
  onBack,
  onOpenEsim,
  walletBalance = 7570,
}: {
  onBack: () => void;
  onOpenEsim?: () => void;
  walletBalance?: number;
}) {
  const { active, grace, add, patch, remove } = useRentedNumbers();
  const { forLine, markRead } = useSMSInbox();

  const [tab, setTab] = useState<Tab>('numbers');
  const [view, setView] = useState<View>('main');
  const [activeLine, setActiveLine] = useState<RentedLine | null>(null);
  const [selectedThread, setSelectedThread] = useState<import('./rental-data').SmsThread | null>(null);
  const [msgFilter, setMsgFilter] = useState<string>('all');

  const [buyCountry, setBuyCountry] = useState<Country | null>(null);
  const [buyRegion, setBuyRegion] = useState<Region | null>(null);
  const [buyNumber, setBuyNumber] = useState<AvailNumber | null>(null);
  const [buyPeriod, setBuyPeriod] = useState<Period | null>(null);
  const [countryQ, setCountryQ] = useState('');
  const [regionQ, setRegionQ] = useState('');
  const [renameVal, setRenameVal] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

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
    const list =
      REGIONS[buyCountry.code] ??
      [
        {
          id: `${buyCountry.code}-main`,
          name: buyCountry.name,
          area: buyCountry.dial.replace('+', ''),
          city: 'National',
        },
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
    exp.setDate(exp.getDate() + buyPeriod.days);
    const line: RentedLine = {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      label: `${buyCountry.name} line`,
      e164: buyNumber.e164,
      display: buyNumber.display,
      flag: buyCountry.flag,
      country: buyCountry.name,
      countryCode: buyCountry.code,
      type: buyCountry.type,
      provider: 'signalwire',
      expiresAt: exp.toISOString(),
      status: 'active',
      dnd: false,
      smsToEmail: false,
      smsToMobile: false,
      forwardEmail: '',
      forwardMobile: '',
    };
    add(line);
    setActiveLine(line);
    setTab('numbers');
    setView('line-detail');
    showToast('Number rented successfully');
  };

  const openLine = (line: RentedLine) => {
    setActiveLine(line);
    setRenameVal(line.label);
    setView('line-detail');
  };

  const renewLine = (p: Period) => {
    if (!activeLine) return;
    const base = new Date(activeLine.expiresAt);
    const from = base.getTime() > Date.now() ? base : new Date();
    from.setDate(from.getDate() + p.days);
    const next = { expiresAt: from.toISOString(), status: 'active' as NumberStatus };
    patch(activeLine.id, next);
    setActiveLine({ ...activeLine, ...next });
    setView('line-detail');
    showToast(`Renewed for ${p.label}`);
  };

  const releaseLine = () => {
    if (!activeLine) return;
    remove(activeLine.id);
    setActiveLine(null);
    setView('main');
    setTab('numbers');
    showToast('Number released');
  };

  const copyNum = async () => {
    if (!activeLine) return;
    try {
      await navigator.clipboard.writeText(activeLine.e164);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const headerBack = () => {
    if (view === 'main') {
      if (selectedThread) {
        setSelectedThread(null);
        return;
      }
      onBack();
      return;
    }
    if (view === 'buy-country') setView('main');
    else if (view === 'buy-region') setView('buy-country');
    else if (view === 'buy-numbers') setView('buy-region');
    else if (view === 'buy-period') setView('buy-numbers');
    else if (view === 'buy-confirm') setView('buy-period');
    else if (view === 'line-detail') {
      setActiveLine(null);
      setView('main');
      setTab('numbers');
    } else if (view === 'line-renew' || view === 'line-rename' || view === 'line-forwarding') {
      setView('line-detail');
    }
  };

  const title =
    view === 'main'
      ? selectedThread
        ? selectedThread.from
        : tab === 'messages'
          ? 'Messages'
          : 'My Numbers'
      : view === 'buy-country'
        ? 'Select country'
        : view === 'buy-region'
          ? 'Choose area'
          : view === 'buy-numbers'
            ? 'Choose a number'
            : view === 'buy-period'
              ? 'Rental period'
              : view === 'buy-confirm'
                ? 'Confirm rental'
                : view === 'line-detail'
                  ? 'Line settings'
                  : view === 'line-renew'
                    ? 'Renew'
                    : view === 'line-rename'
                      ? 'Rename'
                      : view === 'line-forwarding'
                        ? 'Forwarding'
                        : 'Rent a Number';

  const msgThreads = forLine(msgFilter);

  return (
    <div className="rl-page">
      <header className="rl-header">
        <button type="button" className="rl-icon" onClick={headerBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1>{title}</h1>
        <div className="rl-header-right">
          {view === 'main' && !selectedThread && (
            <button type="button" className="rl-balance" aria-label="Wallet">
              <WalletCards size={14} />
              <span>{formatNgn(walletBalance)}</span>
            </button>
          )}
          {view !== 'main' && <span className="rl-spacer" />}
        </div>
      </header>

      {view === 'main' && !selectedThread && (
        <>
          <div className="rl-seg" role="tablist">
            <button type="button" role="tab" className={tab === 'numbers' ? 'active' : ''} onClick={() => setTab('numbers')}>
              My Numbers
            </button>
            <button type="button" role="tab" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>
              Messages
              {msgThreads.some((t) => t.unread) ? <span className="rl-badge" /> : null}
            </button>
          </div>

          {tab === 'numbers' && (
            <section className="rl-body">
              <button type="button" className="rl-esim-banner" onClick={() => onOpenEsim?.()}>
                <Globe2 size={18} />
                <div>
                  <strong>Travel Data · eSIM</strong>
                  <small>Buy data plans — opens Verxor eSIM</small>
                </div>
                <ChevronRight size={18} />
              </button>

              <div className="rl-row-head">
                <h3 className="rl-section-title">Active lines</h3>
                <button type="button" className="rl-pill-sm" onClick={openBuy}>
                  <Plus size={16} strokeWidth={2.4} /> Rent new
                </button>
              </div>

              {active.length === 0 && grace.length === 0 ? (
                <Empty
                  icon={<Smartphone size={40} strokeWidth={1.25} />}
                  title="No rented numbers yet"
                  text="Rent a dedicated line for long-term SMS. Pay with your Verxor wallet."
                  action={
                    <button type="button" className="rl-pill" onClick={openBuy}>
                      Rent a number
                    </button>
                  }
                />
              ) : (
                <ul className="rl-number-cards">
                  {active.map((line) => {
                    const d = daysLeft(line.expiresAt);
                    return (
                      <li key={line.id}>
                        <button type="button" className="rl-number-card" onClick={() => openLine(line)}>
                          <div className="rl-number-card-top">
                            <span className="rl-exp-badge good">{d > 0 ? `Expires in ${d}d` : 'Expires today'}</span>
                            <ChevronRight size={16} />
                          </div>
                          <div className="rl-number-card-main">
                            <span className="rl-flag">{line.flag}</span>
                            <div>
                              <strong>{line.display}</strong>
                              <small>{line.label} · {line.type}</small>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {grace.length > 0 && (
                <>
                  <h3 className="rl-section-title" style={{ marginTop: 8 }}>Expired · Grace period</h3>
                  <p className="rl-lead">You have {GRACE_DAYS} days after expiry to renew before the number is released.</p>
                  <ul className="rl-number-cards">
                    {grace.map((line) => (
                      <li key={line.id}>
                        <button type="button" className="rl-number-card grace" onClick={() => openLine(line)}>
                          <div className="rl-number-card-top">
                            <span className="rl-exp-badge warn">Grace · renew now</span>
                            <ChevronRight size={16} />
                          </div>
                          <div className="rl-number-card-main">
                            <span className="rl-flag">{line.flag}</span>
                            <div>
                              <strong>{line.display}</strong>
                              <small>Expired {formatExp(line.expiresAt)} · {line.label}</small>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="rl-notice">
                <Shield size={14} />
                <span>Phase 1: inbound SMS + forwarding. Live voice calling arrives in a later release after provider verification.</span>
              </div>
            </section>
          )}

          {tab === 'messages' && (
            <section className="rl-body">
              <div className="rl-filter-row">
                <select className="rl-select" value={msgFilter} onChange={(e) => setMsgFilter(e.target.value)} aria-label="Filter by number">
                  <option value="all">All numbers</option>
                  {[...active, ...grace].map((l) => (
                    <option key={l.id} value={l.id}>{l.display}</option>
                  ))}
                </select>
              </div>
              {msgThreads.length === 0 ? (
                <Empty icon={<MessageSquare size={40} strokeWidth={1.25} />} title="No messages yet" text="Inbound SMS to your rented lines will appear here automatically." />
              ) : (
                <ul className="rl-msg-list">
                  {msgThreads.map((t) => (
                    <li key={t.id}>
                      <button type="button" className={`rl-msg-row ${t.unread ? 'unread' : ''}`} onClick={() => { markRead(t.id); setSelectedThread(t); }}>
                        <div className="rl-avatar soft">{t.from.charAt(0)}</div>
                        <div className="rl-msg-body">
                          <strong>{t.from}</strong>
                          <small>{t.preview}</small>
                        </div>
                        <span className="rl-msg-time">{new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {view === 'main' && selectedThread && (
        <section className="rl-body rl-thread">
          <div className="rl-bubble-wrap">
            <div className="rl-bubble">
              <p>{selectedThread.body}</p>
              <small>{new Date(selectedThread.at).toLocaleString()}</small>
            </div>
          </div>
          <button type="button" className="rl-pill full" onClick={async () => {
            const code = selectedThread.body.match(/\b\d{3}[-\s]?\d{3}\b|\b\d{4,8}\b/)?.[0];
            if (code) {
              try { await navigator.clipboard.writeText(code.replace(/\s|-/g, '')); showToast('Code copied'); }
              catch { showToast('Could not copy'); }
            } else showToast('No code found in message');
          }}>
            <Copy size={16} /> Copy verification code
          </button>
          <p className="rl-foot">Outbound SMS reply comes in a later phase when provider billing is ready.</p>
        </section>
      )}

      {view === 'buy-country' && (
        <section className="rl-body">
          <p className="rl-lead">Pick a country. Availability and type (VoIP / Non-VoIP) depend on live inventory.</p>
          <div className="rl-search">
            <Search size={16} />
            <input value={countryQ} onChange={(e) => setCountryQ(e.target.value)} placeholder="Search country" autoComplete="off" />
            {countryQ ? (<button type="button" className="rl-clear" onClick={() => setCountryQ('')} aria-label="Clear"><X size={14} /></button>) : null}
          </div>
          <div className="rl-country-list">
            {filteredCountries.map((c) => (
              <button key={c.code} type="button" className="rl-country-row" onClick={() => { setBuyCountry(c); setBuyRegion(null); setRegionQ(''); setView('buy-region'); }}>
                <span className="rl-flag">{c.flag}</span>
                <div><strong>{c.name}</strong><small>{c.dial} · {c.type}</small></div>
                <span className="rl-price">From {formatNgn(c.fromNgn)}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-region' && buyCountry && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyCountry.name}</strong><small>{buyCountry.type}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-country')}>Change</button>
          </div>
          <div className="rl-search">
            <Search size={16} />
            <input value={regionQ} onChange={(e) => setRegionQ(e.target.value)} placeholder="Search city or area code" autoComplete="off" />
          </div>
          <div className="rl-country-list">
            {regionsForBuy.map((r) => (
              <button key={r.id} type="button" className="rl-country-row" onClick={() => { setBuyRegion(r); setBuyNumber(null); setView('buy-numbers'); }}>
                <div className="rl-region-meta"><strong>{r.city}, {r.name}</strong><small>Area {r.area}</small></div>
                <span className="rl-area-code">{r.area}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-numbers' && buyCountry && buyRegion && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyRegion.city} · {buyRegion.area}</strong><small>{buyCountry.name}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-region')}>Change</button>
          </div>
          <p className="rl-lead">Select an available number. Tags reflect provider capabilities.</p>
          <div className="rl-country-list">
            {availNumbers.map((n) => (
              <button key={n.id} type="button" className="rl-num-pick" onClick={() => { setBuyNumber(n); setView('buy-period'); }}>
                <strong>{n.display}</strong>
                <Check size={18} className="rl-check-faint" />
              </button>
            ))}
          </div>
        </section>
      )}

      {view === 'buy-period' && buyCountry && buyNumber && (
        <section className="rl-body">
          <div className="rl-buy-context">
            <span className="rl-flag">{buyCountry.flag}</span>
            <div><strong>{buyNumber.display}</strong><small>{buyCountry.name}</small></div>
            <button type="button" className="rl-change" onClick={() => setView('buy-numbers')}>Change</button>
          </div>
          <p className="rl-lead">Longer periods unlock discounts. All payments use your Verxor wallet.</p>
          <div className="rl-duration-list">
            {PERIODS.map((p) => {
              const total = priceOf(buyCountry, p);
              return (
                <button key={p.id} type="button" className={`rl-duration-row ${buyPeriod?.id === p.id ? 'selected' : ''}`} onClick={() => setBuyPeriod(p)}>
                  <div><strong>{p.label}</strong><small>{p.days} days{p.saveLabel ? ` · ${p.saveLabel}` : ''}</small></div>
                  <span className="rl-price">{formatNgn(total)}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="rl-pill full" disabled={!buyPeriod} onClick={() => buyPeriod && setView('buy-confirm')}>Continue</button>
        </section>
      )}

      {view === 'buy-confirm' && buyCountry && buyNumber && buyPeriod && (
        <section className="rl-body">
          <div className="rl-confirm-card">
            <div><span>Number</span><strong>{buyNumber.display}</strong></div>
            <div><span>Country</span><strong>{buyCountry.flag} {buyCountry.name}</strong></div>
            <div><span>Type</span><strong>{buyCountry.type}</strong></div>
            <div><span>Period</span><strong>{buyPeriod.label}{buyPeriod.saveLabel ? ` (${buyPeriod.saveLabel})` : ''}</strong></div>
            <div className="total"><span>Total</span><strong>{formatNgn(priceOf(buyCountry, buyPeriod))}</strong></div>
          </div>
          <ul className="rl-checklist">
            <li><Check size={14} /> Inbound SMS included</li>
            <li><Check size={14} /> SMS → email / mobile forwarding</li>
            <li><Check size={14} /> {GRACE_DAYS}-day grace period after expiry</li>
            <li><Check size={14} /> Paid from Verxor wallet</li>
          </ul>
          <button type="button" className="rl-pill full" onClick={confirmBuy}>Pay {formatNgn(priceOf(buyCountry, buyPeriod))} with Wallet</button>
          <p className="rl-foot">Instant provisioning. Number appears under My Numbers right away.</p>
        </section>
      )}

      {view === 'line-detail' && activeLine && (
        <section className="rl-body">
          <div className="rl-detail-head">
            <span className="rl-flag lg">{activeLine.flag}</span>
            <strong>{activeLine.display}</strong>
            <p>{activeLine.label} · {activeLine.type}</p>
            <button type="button" className="rl-copy" onClick={copyNum}><Copy size={14} />{copied ? 'Copied' : 'Copy number'}</button>
          </div>
          <div className="rl-status-row">
            <span className={`rl-status-pill ${activeLine.status}`}>
              {activeLine.status === 'active'
                ? `Active · expires ${formatExp(activeLine.expiresAt)}`
                : activeLine.status === 'grace'
                  ? `Grace · expired ${formatExp(activeLine.expiresAt)}`
                  : 'Expired'}
            </span>
          </div>
          <div className="rl-settings-menu">
            <button type="button" className="rl-set-row" onClick={() => setView('line-renew')}>
              <Clock3 size={18} /><div><strong>Renew</strong><small>Extend 1, 3 or 12 months</small></div><ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row" onClick={() => { setRenameVal(activeLine.label); setView('line-rename'); }}>
              <Phone size={18} /><div><strong>Rename</strong><small>{activeLine.label}</small></div><ChevronRight size={16} />
            </button>
            <div className="rl-set-row static">
              <BellOff size={18} />
              <div><strong>Do not disturb</strong><small>Mute alerts for this line</small></div>
              <button type="button" className={`rl-switch ${activeLine.dnd ? 'on' : ''}`} aria-label="Toggle DND" onClick={() => {
                const next = !activeLine.dnd;
                patch(activeLine.id, { dnd: next });
                setActiveLine({ ...activeLine, dnd: next });
              }} />
            </div>
            <button type="button" className="rl-set-row" onClick={() => setView('line-forwarding')}>
              <PhoneForwarded size={18} /><div><strong>Forwarding</strong><small>SMS → email or mobile</small></div><ChevronRight size={16} />
            </button>
            <button type="button" className="rl-set-row danger" onClick={releaseLine}>
              <Trash2 size={18} /><div><strong>Release number</strong><small>Ends rental. Grace rules still apply if already expired.</small></div>
            </button>
          </div>
        </section>
      )}

      {view === 'line-renew' && activeLine && (
        <section className="rl-body">
          <p className="rl-lead">Current expiry: {formatExp(activeLine.expiresAt)}. Renewal extends from the later of now or current expiry.</p>
          <div className="rl-duration-list">
            {PERIODS.map((p) => {
              const country = COUNTRIES.find((c) => c.code === activeLine.countryCode);
              const total = country ? priceOf(country, p) : 0;
              return (
                <button key={p.id} type="button" className="rl-duration-row" onClick={() => renewLine(p)}>
                  <div><strong>{p.label}</strong><small>{p.days} days{p.saveLabel ? ` · ${p.saveLabel}` : ''}</small></div>
                  <span className="rl-price">{formatNgn(total)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === 'line-rename' && activeLine && (
        <section className="rl-body">
          <label className="rl-field-label" htmlFor="rl-rename">Profile label</label>
          <input id="rl-rename" className="rl-rename-input" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} placeholder="e.g. WhatsApp Business" maxLength={40} />
          <button type="button" className="rl-pill full" onClick={() => {
            const label = renameVal.trim() || activeLine.label;
            patch(activeLine.id, { label });
            setActiveLine({ ...activeLine, label });
            setView('line-detail');
            showToast('Label updated');
          }}>Save</button>
        </section>
      )}

      {view === 'line-forwarding' && activeLine && (
        <section className="rl-body">
          <div className="rl-toggle-card">
            <div className="rl-fwd-label"><Mail size={16} /><span>SMS → Email</span></div>
            <button type="button" className={`rl-switch ${activeLine.smsToEmail ? 'on' : ''}`} onClick={() => {
              const next = !activeLine.smsToEmail;
              patch(activeLine.id, { smsToEmail: next });
              setActiveLine({ ...activeLine, smsToEmail: next });
            }} />
          </div>
          {activeLine.smsToEmail && (
            <input className="rl-rename-input" type="email" placeholder="you@email.com" value={activeLine.forwardEmail} onChange={(e) => {
              const forwardEmail = e.target.value;
              patch(activeLine.id, { forwardEmail });
              setActiveLine({ ...activeLine, forwardEmail });
            }} />
          )}
          <div className="rl-toggle-card">
            <div className="rl-fwd-label"><Smartphone size={16} /><span>SMS → Mobile</span></div>
            <button type="button" className={`rl-switch ${activeLine.smsToMobile ? 'on' : ''}`} onClick={() => {
              const next = !activeLine.smsToMobile;
              patch(activeLine.id, { smsToMobile: next });
              setActiveLine({ ...activeLine, smsToMobile: next });
            }} />
          </div>
          {activeLine.smsToMobile && (
            <input className="rl-rename-input" type="tel" placeholder="+234..." value={activeLine.forwardMobile} onChange={(e) => {
              const forwardMobile = e.target.value;
              patch(activeLine.id, { forwardMobile });
              setActiveLine({ ...activeLine, forwardMobile });
            }} />
          )}
          <p className="rl-foot">Call forwarding and outbound SMS arrive when voice phase is enabled.</p>
          <button type="button" className="rl-pill full" onClick={() => setView('line-detail')}>Done</button>
        </section>
      )}

      {toast && (<div className="rl-toast" role="status">{toast}</div>)}
    </div>
  );
}
