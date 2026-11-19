'use client';

/**
 * Rent-for-SMS (Textverified rentals) — service picker, duration ladder with
 * live prices, wallet checkout, My Numbers with live SMS inbox, and History.
 *
 * PrimeX-style split (Service Rental / General rental) distilled into one
 * clean Verxor flow: pick a service, see the full duration ladder quoted live,
 * rent, then read OTPs from your number.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Clock, Copy, Hash, Inbox, Loader2, MessageSquare, Search, Smartphone, Wallet, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './rental-page.css';

type DurationOption = { id: string; label: string; days: number };

const DURATIONS: DurationOption[] = [
  { id: 'oneDay', label: '1 day', days: 1 },
  { id: 'threeDay', label: '3 days', days: 3 },
  { id: 'sevenDay', label: '7 days', days: 7 },
  { id: 'fifteenDay', label: '15 days', days: 15 },
  { id: 'oneMonth', label: '30 days', days: 30 },
  { id: 'threeMonth', label: '90 days', days: 90 },
  { id: 'sixMonth', label: '180 days', days: 180 },
  { id: 'oneYear', label: '1 year', days: 365 },
];

type Rental = {
  id: string;
  reservationId: string;
  serviceName: string;
  duration: string;
  number: string;
  chargedNgn: number;
  status: string;
  endsAt: string | null;
  createdAt: string;
};

type Sms = { id: string; from: string; text: string; receivedAt: string };

type BuyResult = {
  ref: string;
  reservationId: string;
  number: string;
  endsAt: string | null;
  serviceName: string;
  durationLabel: string;
  totalNgn: number;
};

const ngn = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isActive = (r: Rental) => {
  if (!r.endsAt) return r.status === 'active';
  return new Date(r.endsAt).getTime() > Date.now();
};

export function RentalPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
}) {
  const [tab, setTab] = useState<'rent' | 'numbers' | 'history'>('rent');

  /* ---------- catalog ---------- */
  const [services, setServices] = useState<string[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [query, setQuery] = useState('');

  /* ---------- quote + buy ---------- */
  const [service, setService] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, number | 'na'>>({});
  const [quoting, setQuoting] = useState(false);
  const [duration, setDuration] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [needsFund, setNeedsFund] = useState(false);
  const [result, setResult] = useState<BuyResult | null>(null);

  /* ---------- my numbers + sms ---------- */
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [numbersError, setNumbersError] = useState<string | null>(null);
  const [openRental, setOpenRental] = useState<Rental | null>(null);
  const [messages, setMessages] = useState<Sms[]>([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let accessToken = loadSessionTokens()?.access_token || session?.accessToken || '';
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        const { data: sess } = await sb.auth.getSession();
        accessToken = sess.session?.access_token || accessToken;
      }
    } catch {
      /* optional */
    }
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    else headers['Content-Type'] = 'application/json';
    return headers;
  }, [session]);

  const userId = () => session?.userId || loadSessionProfile()?.userId || '';

  /* ---------- load services ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/v1/rent-sms/services', { cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; services?: string[]; error?: string };
        if (!alive) return;
        if (!res.ok || !data.ok || !data.services) {
          setServicesError(data.error || 'Could not load the service list.');
          setIsSetup(/going live|not configured|setup/i.test(data.error || '') || res.status === 503);
          return;
        }
        setServices(data.services);
      } catch {
        if (alive) setServicesError('Network error while loading the service list.');
      } finally {
        if (alive) setLoadingServices(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- quote ladder when a service is selected ---------- */
  useEffect(() => {
    if (!service) {
      setQuotes({});
      setDuration(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    (async () => {
      const headers = await authHeaders();
      const entries = await Promise.all(
        DURATIONS.map(async (d) => {
          try {
            const res = await fetch('/api/v1/rent-sms/quote', {
              method: 'POST',
              headers,
              body: JSON.stringify({ serviceName: service, duration: d.id }),
            });
            const data = (await res.json()) as { ok?: boolean; priceNgn?: number };
            return [d.id, res.ok && data.ok && data.priceNgn ? data.priceNgn : ('na' as const)] as const;
          } catch {
            return [d.id, 'na' as const] as const;
          }
        }),
      );
      if (!alive) return;
      const map: Record<string, number | 'na'> = {};
      for (const [k, v] of entries) map[k] = v;
      setQuotes(map);
      const first = entries.find(([, v]) => v !== 'na');
      setDuration(first ? first[0] : null);
      setQuoting(false);
    })();
    return () => {
      alive = false;
    };
  }, [service, authHeaders]);

  /* ---------- my numbers ---------- */
  const loadNumbers = useCallback(
    async (silent = false) => {
      if (!silent) setNumbersError(null);
      try {
        const headers = await authHeaders();
        const url = userId()
          ? `/api/v1/rent-sms/numbers?userId=${encodeURIComponent(userId())}`
          : '/api/v1/rent-sms/numbers';
        const res = await fetch(url, { headers, cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; rentals?: Rental[]; error?: string };
        if (!res.ok || !data.ok) {
          if (!silent) setNumbersError(data.error || 'Could not load your numbers.');
          return;
        }
        setRentals(data.rentals || []);
      } catch {
        if (!silent) setNumbersError('Network error while loading your numbers.');
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    if ((tab === 'numbers' || tab === 'history') && rentals.length === 0 && !numbersError) {
      void loadNumbers();
    }
  }, [tab, rentals.length, numbersError, loadNumbers]);

  useEffect(() => {
    if (tab === 'numbers' || tab === 'history') void loadNumbers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ---------- sms inbox for the open rental ---------- */
  const loadSms = useCallback(
    async (rental: Rental) => {
      try {
        const headers = await authHeaders();
        const url = userId()
          ? `/api/v1/rent-sms/numbers?res=${encodeURIComponent(rental.reservationId)}&userId=${encodeURIComponent(userId())}`
          : `/api/v1/rent-sms/numbers?res=${encodeURIComponent(rental.reservationId)}`;
        const res = await fetch(url, { headers, cache: 'no-store' });
        const data = (await res.json()) as { ok?: boolean; messages?: Sms[] };
        if (res.ok && data.ok) setMessages(data.messages || []);
      } catch {
        /* inbox poll is best-effort */
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    if (!openRental) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    setMessages([]);
    setSmsLoading(true);
    void loadSms(openRental).finally(() => setSmsLoading(false));
    pollRef.current = window.setInterval(() => void loadSms(openRental), 10000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [openRental, loadSms]);

  /* ---------- buy ---------- */
  const buy = async () => {
    if (!service || !duration || buying) return;
    setBuying(true);
    setBuyError(null);
    setNeedsFund(false);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/v1/rent-sms/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({ serviceName: service, duration, userId: userId() || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; rental?: BuyResult };
      if (!res.ok || !data.ok || !data.rental) {
        setBuyError(data.error || 'The rental failed. Try again.');
        setNeedsFund(res.status === 402);
        return;
      }
      setResult(data.rental);
      setRentals([]);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    } catch {
      setBuyError('Network error while renting. Check your numbers before retrying.');
    } finally {
      setBuying(false);
    }
  };

  const copyNumber = async () => {
    if (!result?.number) return;
    try {
      await navigator.clipboard.writeText(result.number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  /* ---------- derived ---------- */
  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? services.filter((s) => s.toLowerCase().includes(q)) : services;
  }, [services, query]);

  const activeRentals = useMemo(() => rentals.filter(isActive), [rentals]);
  const pastRentals = useMemo(() => rentals.filter((r) => !isActive(r)), [rentals]);
  const selectedQuote = duration ? quotes[duration] : undefined;

  /* ---------- helpers ---------- */
  const resetBuy = () => {
    setService(null);
    setQuotes({});
    setDuration(null);
    setBuyError(null);
    setResult(null);
    setNeedsFund(false);
  };

  const openInbox = (rental: Rental) => {
    if (!rental.reservationId) return;
    setOpenRental(rental);
    setTab('numbers');
  };

  const renderRentalCard = (rental: Rental, showStatus = true) => (
    <div className="rlp-card" key={rental.id}>
      <button type="button" className="rlp-card-main" onClick={() => openInbox(rental)}>
        <span className="rlp-card-icon">
          <Hash size={16} />
        </span>
        <span className="rlp-card-copy">
          <strong>{rental.number || 'Number pending'}</strong>
          <small>
            {rental.serviceName}
            {rental.endsAt ? ` · until ${fmtDate(rental.endsAt)}` : ''}
          </small>
        </span>
        <span className="rlp-card-meta">
          <span className="rlp-price">{ngn(rental.chargedNgn)}</span>
          {showStatus ? (
            <span className={isActive(rental) ? 'rlp-chip live' : 'rlp-chip ended'}>
              {isActive(rental) ? 'Active' : 'Ended'}
            </span>
          ) : null}
        </span>
      </button>
      {rental.reservationId ? (
        <button type="button" className="rlp-card-sms" onClick={() => openInbox(rental)} aria-label="Open messages">
          <MessageSquare size={15} /> SMS
        </button>
      ) : null}
    </div>
  );

  /* ---------- render ---------- */
  return (
    <div className="rlp-page">
      <header className="rlp-head">
        <button type="button" className="rlp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1>Rent a Number</h1>
          <p>US mobile numbers for SMS verification, rented by the day.</p>
        </div>
        <span className="rlp-head-badge">
          <Smartphone size={16} /> Textverified
        </span>
      </header>

      <nav className="rlp-tabs">
        <button type="button" className={tab === 'rent' ? 'rlp-tab active' : 'rlp-tab'} onClick={() => { setTab('rent'); setOpenRental(null); }}>
          Rent
        </button>
        <button type="button" className={tab === 'numbers' ? 'rlp-tab active' : 'rlp-tab'} onClick={() => { setTab('numbers'); setOpenRental(null); void loadNumbers(); }}>
          My Numbers {activeRentals.length ? <em>{activeRentals.length}</em> : null}
        </button>
        <button type="button" className={tab === 'history' ? 'rlp-tab active' : 'rlp-tab'} onClick={() => { setTab('history'); setOpenRental(null); }}>
          History
        </button>
      </nav>

      {tab === 'rent' ? (
        <main className="rlp-body">
          {result ? (
            <section className="rlp-result" ref={resultRef}>
              <span className="rlp-result-icon">
                <Check size={22} />
              </span>
              <h2>Number rented</h2>
              <p className="rlp-result-service">
                {result.serviceName} · {result.durationLabel}
              </p>
              <button type="button" className="rlp-number" onClick={copyNumber}>
                <span>{result.number}</span>
                <span className="rlp-copy">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}</span>
              </button>
              <p className="rlp-result-row">
                <Wallet size={14} /> Charged {ngn(result.totalNgn)} · Ref {result.ref}
              </p>
              {result.endsAt ? (
                <p className="rlp-result-row">
                  <Clock size={14} /> Active until {fmtDate(result.endsAt)}
                </p>
              ) : null}
              <div className="rlp-result-actions">
                <button type="button" className="rlp-btn ghost" onClick={resetBuy}>
                  Rent another
                </button>
                <button
                  type="button"
                  className="rlp-btn"
                  onClick={() => {
                    setResult(null);
                    resetBuy();
                    setTab('numbers');
                    void loadNumbers();
                  }}
                >
                  <Inbox size={15} /> Open inbox
                </button>
              </div>
            </section>
          ) : !service ? (
            <>
              <section className="rlp-intro">
                <h2>Pick your service</h2>
                <p>Choose the platform you need the number for. US non-VoIP mobile numbers only.</p>
              </section>

              <section className="rlp-search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder={loadingServices ? 'Loading services…' : 'Search WhatsApp, Telegram, Banks…'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loadingServices}
                  aria-label="Search services"
                />
              </section>

              {loadingServices ? (
                <div className="rlp-loading">
                  <Loader2 size={18} /> Loading services…
                </div>
              ) : servicesError ? (
                <div className={isSetup ? 'rlp-error config' : 'rlp-error'}>
                  <AlertCircle size={15} />
                  {isSetup
                    ? 'Rent-for-SMS is going live — provider setup is finishing. Try again shortly.'
                    : servicesError}
                </div>
              ) : (
                <section className="rlp-service-list">
                  {filteredServices.map((s) => (
                    <button type="button" className="rlp-service" key={s} onClick={() => setService(s)}>
                      <span className="rlp-service-icon">
                        <Hash size={15} />
                      </span>
                      <span className="rlp-service-name">{s}</span>
                      <span className="rlp-service-go">Rent</span>
                    </button>
                  ))}
                  {!filteredServices.length ? <p className="rlp-empty">No service matches “{query}”.</p> : null}
                </section>
              )}
            </>
          ) : (
            <section className="rlp-buy">
              <button type="button" className="rlp-change" onClick={resetBuy}>
                <X size={14} /> Change service
              </button>
              <h2 className="rlp-buy-service">{service}</h2>
              <p className="rlp-buy-sub">Pick a rental duration. Prices are live and renewals stay at the day rate.</p>

              {quoting ? (
                <div className="rlp-loading">
                  <Loader2 size={18} /> Getting live prices…
                </div>
              ) : (
                <>
                  <div className="rlp-ladder">
                    {DURATIONS.map((d) => {
                      const q = quotes[d.id];
                      const na = q === undefined || q === 'na';
                      return (
                        <button
                          type="button"
                          className={duration === d.id ? 'rlp-dur active' : 'rlp-dur'}
                          key={d.id}
                          disabled={na}
                          onClick={() => setDuration(d.id)}
                        >
                          <span className="rlp-dur-label">{d.label}</span>
                          <span className={na ? 'rlp-dur-price na' : 'rlp-dur-price'}>{na ? 'N/A' : ngn(q as number)}</span>
                        </button>
                      );
                    })}
                  </div>


                  {buyError ? (
                    <>
                      <div className={isSetup || /going live/i.test(buyError) ? 'rlp-error config' : 'rlp-error'}>
                        <AlertCircle size={15} /> {buyError}
                      </div>
                      {needsFund ? (
                        <button type="button" className="rlp-btn wide" onClick={onFund}>
                          <Wallet size={15} /> Fund your wallet
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  <button
                    type="button"
                    className={duration ? 'rlp-btn wide' : 'rlp-btn wide disabled'}
                    disabled={!duration || buying}
                    onClick={buy}
                  >
                    {buying ? <Loader2 size={16} className="spin" /> : null}
                    {duration && selectedQuote && selectedQuote !== 'na'
                      ? `Rent for ${ngn(selectedQuote as number)}`
                      : 'Rent number'}
                  </button>
                  <p className="rlp-note">
                    Number is reserved instantly and charged from your Verxor wallet. If the provider is out of stock
                    you are refunded automatically.
                  </p>
                </>
              )}
            </section>
          )}
        </main>
      ) : null}

      {tab === 'numbers' ? (
        <main className="rlp-body">
          {openRental ? (
            <section className="rlp-inbox">
              <button type="button" className="rlp-change" onClick={() => setOpenRental(null)}>
                <ArrowLeft size={14} /> All numbers
              </button>
              <div className="rlp-inbox-head">
                <strong>{openRental.number || 'Number pending'}</strong>
                <small>
                  {openRental.serviceName}
                  {openRental.endsAt ? ` · until ${fmtDate(openRental.endsAt)}` : ''}
                </small>
              </div>
              {smsLoading ? (
                <div className="rlp-loading">
                  <Loader2 size={18} /> Loading messages…
                </div>
              ) : messages.length ? (
                <ul className="rlp-msgs">
                  {messages.map((m) => (
                    <li className="rlp-msg" key={m.id || m.text}>
                      <span className="rlp-msg-from">{m.from || 'Unknown'}</span>
                      <p>{m.text}</p>
                      <small>{fmtDate(m.receivedAt)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rlp-empty tall">
                  <Inbox size={20} />
                  <p>No messages yet. Refreshes every 10 seconds — keep this open while you wait for the OTP.</p>
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="rlp-intro">
                <h2>My Numbers</h2>
                <p>Active rentals. Tap a number to read its messages.</p>
              </section>
              {numbersError ? (
                <div className="rlp-error">
                  <AlertCircle size={15} /> {numbersError}
                </div>
              ) : activeRentals.length ? (
                <section className="rlp-list">{activeRentals.map((r) => renderRentalCard(r))}</section>
              ) : (
                <div className="rlp-empty tall">
                  <Smartphone size={20} />
                  <p>No active numbers. Rent one from the Rent tab.</p>
                </div>
              )}
            </>
          )}
        </main>
      ) : null}

      {tab === 'history' ? (
        <main className="rlp-body">
          <section className="rlp-intro">
            <h2>Rental History</h2>
            <p>Everything you have rented, newest first.</p>
          </section>
          {numbersError ? (
            <div className="rlp-error">
              <AlertCircle size={15} /> {numbersError}
            </div>
          ) : pastRentals.length ? (
            <section className="rlp-list">{pastRentals.map((r) => renderRentalCard(r, true))}</section>
          ) : (
            <div className="rlp-empty tall">
              <Clock size={20} />
              <p>No past rentals yet.</p>
            </div>
          )}
        </main>
      ) : null}

      <footer className="rlp-foot">
        <p>
          <AlertCircle size={13} /> US non-VoIP mobile numbers. Some platforms restrict rented numbers — if a service
          is not listed, it is not supported. Verxor policy: misuse for fraud terminates the rental without refund.
        </p>
      </footer>
    </div>
  );
}
