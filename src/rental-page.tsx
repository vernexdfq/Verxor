/**
 * Rent a Line — dedicated number rentals.
 * Flow: My Lines | Rent (country → duration → confirm) | Number settings.
 * Wallet-only. Demo inventory until providers are connected.
 */
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Forward,
  Mic,
  MoreVertical,
  Phone,
  PhoneForwarded,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './rental-page.css';

type Country = {
  code: string;
  flag: string;
  name: string;
  dial: string;
  type: 'VoIP' | 'Non-VoIP';
  fromPrice: number;
};

type Duration = {
  id: string;
  label: string;
  days: number;
  priceMultiplier: number;
};

type RentedLine = {
  id: string;
  label: string;
  number: string;
  country: string;
  flag: string;
  type: 'VoIP' | 'Non-VoIP';
  expiresAt: string;
  dnd: boolean;
  forwarding: string | null;
};

type Step = 'home' | 'country' | 'duration' | 'confirm' | 'detail';

const COUNTRIES: Country[] = [
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1', type: 'Non-VoIP', fromPrice: 8500 },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44', type: 'Non-VoIP', fromPrice: 9200 },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1', type: 'VoIP', fromPrice: 7800 },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49', type: 'Non-VoIP', fromPrice: 8800 },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31', type: 'Non-VoIP', fromPrice: 8600 },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61', type: 'VoIP', fromPrice: 9000 },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33', type: 'VoIP', fromPrice: 8400 },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '+91', type: 'VoIP', fromPrice: 4500 },
];

const DURATIONS: Duration[] = [
  { id: '7d', label: '7 days', days: 7, priceMultiplier: 1 },
  { id: '30d', label: '30 days', days: 30, priceMultiplier: 3.2 },
  { id: '90d', label: '90 days', days: 90, priceMultiplier: 8 },
];

const money = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

function formatExpiry(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function RentalPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('home');
  const [lines, setLines] = useState<RentedLine[]>([]);
  const [selectedLine, setSelectedLine] = useState<RentedLine | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showRename, setShowRename] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q),
    );
  }, [countryQuery]);

  const priceFor = (country: Country, duration: Duration) =>
    country.fromPrice * duration.priceMultiplier;

  const startRent = () => {
    setSelectedCountry(null);
    setSelectedDuration(null);
    setCountryQuery('');
    setStep('country');
  };

  const pickCountry = (c: Country) => {
    setSelectedCountry(c);
    setSelectedDuration(null);
    setStep('duration');
  };

  const pickDuration = (d: Duration) => {
    setSelectedDuration(d);
    setStep('confirm');
  };

  const confirmRent = () => {
    if (!selectedCountry || !selectedDuration) return;
    const exp = new Date();
    exp.setDate(exp.getDate() + selectedDuration.days);
    const line: RentedLine = {
      id: `RL-${Date.now().toString(36).toUpperCase()}`,
      label: `${selectedCountry.name} line`,
      number: `${selectedCountry.dial} ${Math.floor(2000000000 + Math.random() * 7000000000)}`,
      country: selectedCountry.name,
      flag: selectedCountry.flag,
      type: selectedCountry.type,
      expiresAt: exp.toISOString(),
      dnd: false,
      forwarding: null,
    };
    setLines((prev) => [line, ...prev]);
    setSelectedLine(line);
    setStep('detail');
  };

  const openDetail = (line: RentedLine) => {
    setSelectedLine(line);
    setRenameValue(line.label);
    setShowRename(false);
    setStep('detail');
  };

  const updateLine = (patch: Partial<RentedLine>) => {
    if (!selectedLine) return;
    const next = { ...selectedLine, ...patch };
    setSelectedLine(next);
    setLines((prev) => prev.map((l) => (l.id === next.id ? next : l)));
  };

  const deleteLine = () => {
    if (!selectedLine) return;
    setLines((prev) => prev.filter((l) => l.id !== selectedLine.id));
    setSelectedLine(null);
    setStep('home');
  };

  const renewLine = (duration: Duration) => {
    if (!selectedLine) return;
    const base = new Date(selectedLine.expiresAt);
    const from = base.getTime() > Date.now() ? base : new Date();
    from.setDate(from.getDate() + duration.days);
    updateLine({ expiresAt: from.toISOString() });
  };

  const copyNumber = async () => {
    if (!selectedLine) return;
    try {
      await navigator.clipboard.writeText(selectedLine.number.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleBack = () => {
    if (step === 'home') onBack();
    else if (step === 'country') setStep('home');
    else if (step === 'duration') setStep('country');
    else if (step === 'confirm') setStep('duration');
    else if (step === 'detail') setStep('home');
  };

  return (
    <div className="rent-page">
      <header className="rent-topbar">
        <button type="button" className="rent-icon-btn" onClick={handleBack} aria-label="Back">
          <ArrowLeft size={19} />
        </button>
        <h1>
          {step === 'home' && 'Rent a Line'}
          {step === 'country' && 'Choose country'}
          {step === 'duration' && 'Rental period'}
          {step === 'confirm' && 'Confirm rental'}
          {step === 'detail' && 'Line settings'}
        </h1>
        <div className="rent-top-actions">
          <button type="button" className="rent-wallet" aria-label="Wallet">
            <WalletCards size={15} />
            <span>$0.00</span>
          </button>
          <button type="button" className="rent-icon-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {step === 'home' && (
        <>
          <section className="rent-intro">
            <h2>Dedicated numbers</h2>
            <p>Rent a private line for calls and SMS for a fixed period. Pay from your wallet.</p>
          </section>

          <div className="rent-notice">
            <ShieldAlert size={16} />
            <span>
              Some platforms restrict VoIP. Non-VoIP lines usually work better on strict apps. Voice +
              SMS where the provider supports them. Access is not guaranteed forever.
            </span>
          </div>

          <button type="button" className="rent-cta" onClick={startRent}>
            <Plus size={18} />
            Rent a new line
          </button>

          <div className="rent-section-head">
            <span className="rent-label">My lines</span>
            <span className="rent-count">{lines.length}</span>
          </div>

          {lines.length === 0 ? (
            <Card className="rent-empty">
              <Phone size={22} />
              <strong>No active lines</strong>
              <p>Rent a number to receive calls and SMS on a dedicated line.</p>
            </Card>
          ) : (
            <div className="rent-line-list">
              {lines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className="rent-line-card"
                  onClick={() => openDetail(line)}
                >
                  <span className="rent-line-flag">{line.flag}</span>
                  <span className="rent-line-copy">
                    <strong>{line.label}</strong>
                    <small>{line.number}</small>
                    <small className="rent-line-meta">
                      Exp. {formatExpiry(line.expiresAt)} · {daysLeft(line.expiresAt)}d left ·{' '}
                      <span className={line.type === 'Non-VoIP' ? 'good' : 'warn'}>{line.type}</span>
                    </small>
                  </span>
                  <ChevronRight size={17} className="rent-chevron" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'country' && (
        <>
          <section className="rent-intro compact">
            <p className="rent-eyebrow">NEW RENTAL</p>
            <h2>Choose a country</h2>
            <p>Pick where the number should be based.</p>
          </section>

          <div className="rent-search-wrap">
            <div className="rent-search">
              <Search size={17} />
              <input
                value={countryQuery}
                onChange={(e) => setCountryQuery(e.target.value)}
                placeholder="Search country"
                aria-label="Search country"
              />
              {countryQuery ? (
                <button type="button" className="rent-clear" onClick={() => setCountryQuery('')} aria-label="Clear">
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="rent-list">
            {filteredCountries.map((c) => (
              <button key={c.code} type="button" className="rent-row" onClick={() => pickCountry(c)}>
                <span className="rent-row-icon">{c.flag}</span>
                <span className="rent-row-copy">
                  <strong>
                    {c.name} · {c.dial}
                  </strong>
                  <small>
                    <span className={c.type === 'Non-VoIP' ? 'good' : 'warn'}>{c.type}</span>
                    {' · '}
                    from {money(c.fromPrice)} / 7 days
                  </small>
                </span>
                <ChevronRight size={17} className="rent-chevron" />
              </button>
            ))}
            {!filteredCountries.length && (
              <Card className="rent-empty compact">
                <Search size={18} />
                <strong>No countries found</strong>
              </Card>
            )}
          </div>
        </>
      )}

      {step === 'duration' && selectedCountry && (
        <>
          <section className="rent-intro compact">
            <p className="rent-eyebrow">
              {selectedCountry.flag} {selectedCountry.name}
            </p>
            <h2>Rental period</h2>
            <p>Longer periods cost less per day. Paid from your wallet.</p>
          </section>

          <div className="rent-list">
            {DURATIONS.map((d) => {
              const price = priceFor(selectedCountry, d);
              return (
                <button key={d.id} type="button" className="rent-duration-card" onClick={() => pickDuration(d)}>
                  <div>
                    <strong>{d.label}</strong>
                    <small>{d.days} days · Voice + SMS where supported</small>
                  </div>
                  <div className="rent-duration-price">
                    <strong>{money(price)}</strong>
                    <ChevronRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 'confirm' && selectedCountry && selectedDuration && (
        <>
          <section className="rent-intro compact">
            <p className="rent-eyebrow">CONFIRM</p>
            <h2>Review rental</h2>
            <p>Demo purchase — live flow will debit wallet and assign a real number.</p>
          </section>

          <Card className="rent-summary">
            <div className="rent-summary-row">
              <span>Country</span>
              <strong>
                {selectedCountry.flag} {selectedCountry.name}
              </strong>
            </div>
            <div className="rent-summary-row">
              <span>Type</span>
              <strong className={selectedCountry.type === 'Non-VoIP' ? 'good' : 'warn'}>
                {selectedCountry.type}
              </strong>
            </div>
            <div className="rent-summary-row">
              <span>Period</span>
              <strong>{selectedDuration.label}</strong>
            </div>
            <div className="rent-summary-row total">
              <span>Total</span>
              <strong>{money(priceFor(selectedCountry, selectedDuration))}</strong>
            </div>
          </Card>

          <div className="rent-confirm-actions">
            <PrimaryButton onClick={confirmRent}>Confirm & rent (demo)</PrimaryButton>
            <button type="button" className="rent-text-btn" onClick={() => setStep('duration')}>
              Change period
            </button>
          </div>
        </>
      )}

      {step === 'detail' && selectedLine && (
        <>
          <section className="rent-detail-hero">
            <span className="rent-detail-flag">{selectedLine.flag}</span>
            <strong className="rent-detail-label">{selectedLine.label}</strong>
            <p className="rent-detail-number">{selectedLine.number}</p>
            <button type="button" className="rent-copy" onClick={copyNumber}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy number'}
            </button>
            <div className="rent-detail-meta">
              <span>
                Exp. {formatExpiry(selectedLine.expiresAt)} · {daysLeft(selectedLine.expiresAt)} days left
              </span>
              <span className={selectedLine.type === 'Non-VoIP' ? 'good' : 'warn'}>{selectedLine.type}</span>
            </div>
          </section>

          <div className="rent-label pad">Manage</div>
          <Card className="rent-settings-list">
            <button
              type="button"
              className="rent-setting-row"
              onClick={() => {
                setRenameValue(selectedLine.label);
                setShowRename(true);
              }}
            >
              <UserRound size={18} />
              <span>
                <strong>Rename</strong>
                <small>{selectedLine.label}</small>
              </span>
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="rent-setting-row"
              onClick={() => updateLine({ dnd: !selectedLine.dnd })}
            >
              <Bell size={18} />
              <span>
                <strong>Do not disturb</strong>
                <small>{selectedLine.dnd ? 'On — incoming calls silenced' : 'Off'}</small>
              </span>
              <span className={`rent-toggle ${selectedLine.dnd ? 'on' : ''}`} aria-hidden />
            </button>

            <button
              type="button"
              className="rent-setting-row"
              onClick={() =>
                updateLine({
                  forwarding: selectedLine.forwarding ? null : '+234 — set in live app',
                })
              }
            >
              <PhoneForwarded size={18} />
              <span>
                <strong>Call forwarding</strong>
                <small>{selectedLine.forwarding ?? 'Off'}</small>
              </span>
              <ChevronRight size={16} />
            </button>

            <div className="rent-setting-row static">
              <Mic size={18} />
              <span>
                <strong>Voicemail</strong>
                <small>Provider-dependent · configure when live</small>
              </span>
            </div>

            <div className="rent-setting-row static">
              <Forward size={18} />
              <span>
                <strong>SMS forward</strong>
                <small>Email / webhook when provider supports it</small>
              </span>
            </div>
          </Card>

          <div className="rent-label pad">Renew</div>
          <div className="rent-renew-row">
            {DURATIONS.map((d) => (
              <button key={d.id} type="button" className="rent-renew-chip" onClick={() => renewLine(d)}>
                +{d.label}
              </button>
            ))}
          </div>

          <button type="button" className="rent-danger" onClick={deleteLine}>
            <Trash2 size={17} />
            Release this line
          </button>

          <p className="rent-footnote">
            Settings that need a live provider (voicemail audio, real forwarding targets) activate when SignalWire
            or your rental API is connected.
          </p>

          {showRename && (
            <div className="rent-modal">
              <button type="button" className="rent-modal-backdrop" onClick={() => setShowRename(false)} aria-label="Close" />
              <div className="rent-modal-sheet">
                <div className="rent-modal-head">
                  <strong>Rename line</strong>
                  <button type="button" onClick={() => setShowRename(false)} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>
                <input
                  className="rent-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
                <PrimaryButton
                  onClick={() => {
                    if (renameValue.trim()) updateLine({ label: renameValue.trim() });
                    setShowRename(false);
                  }}
                >
                  Save name
                </PrimaryButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
