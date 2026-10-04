'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  History,
  Lock,
  Search,
  X,
} from 'lucide-react';
import './betting-page.css';

type ProviderId =
  | 'sportybet'
  | 'ilotbet'
  | '1xbet'
  | 'bet9ja'
  | 'bangbet'
  | 'easywin'
  | 'betking'
  | 'msport'
  | 'nairabet'
  | 'betway'
  | 'livescorebet'
  | 'merrybet';

type InputKind = 'phone' | 'account_id' | 'username';

type Provider = {
  id: ProviderId;
  name: string;
  color: string;
  inputKind: InputKind;
  placeholder: string;
  hot?: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: 'sportybet',
    name: 'SportyBet',
    color: '#E30613',
    inputKind: 'phone',
    placeholder: 'Enter SportyBet phone number',
    hot: true,
  },
  {
    id: 'ilotbet',
    name: 'iLOTBet',
    color: '#0B0B0B',
    inputKind: 'phone',
    placeholder: 'Enter iLOT phone number',
    hot: true,
  },
  {
    id: '1xbet',
    name: '1xBET',
    color: '#1A66FF',
    inputKind: 'account_id',
    placeholder: 'Enter 1xBET Account ID',
    hot: true,
  },
  {
    id: 'bet9ja',
    name: 'Bet9ja',
    color: '#00A651',
    inputKind: 'account_id',
    placeholder: 'Enter Bet9ja User ID',
    hot: true,
  },
  {
    id: 'bangbet',
    name: 'BangBet',
    color: '#F5A623',
    inputKind: 'account_id',
    placeholder: 'Enter BangBet Account ID',
    hot: true,
  },
  {
    id: 'easywin',
    name: 'EasyWin',
    color: '#FF6B00',
    inputKind: 'username',
    placeholder: 'Enter EasyWin username',
    hot: true,
  },
  {
    id: 'betking',
    name: 'BetKing',
    color: '#0033A0',
    inputKind: 'account_id',
    placeholder: 'Enter BetKing Account ID',
  },
  {
    id: 'msport',
    name: 'MSport',
    color: '#111111',
    inputKind: 'account_id',
    placeholder: 'Enter MSport Account ID',
  },
  {
    id: 'nairabet',
    name: 'NairaBet',
    color: '#1E90FF',
    inputKind: 'phone',
    placeholder: 'Enter NairaBet phone number',
  },
  {
    id: 'betway',
    name: 'Betway',
    color: '#00A651',
    inputKind: 'account_id',
    placeholder: 'Enter Betway Account ID',
  },
  {
    id: 'livescorebet',
    name: 'Livescorebet',
    color: '#FF6200',
    inputKind: 'account_id',
    placeholder: 'Enter Livescorebet ID',
  },
  {
    id: 'merrybet',
    name: 'MerryBet',
    color: '#7B2D8E',
    inputKind: 'account_id',
    placeholder: 'Enter MerryBet Account ID',
  },
];

const HOT_IDS: ProviderId[] = [
  'sportybet',
  'ilotbet',
  '1xbet',
  'bet9ja',
  'bangbet',
  'easywin',
];

const QUICK_AMOUNTS = [100, 200, 300, 400, 500, 1000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500_000;

type MockHistory = {
  id: string;
  provider: string;
  amount: number;
  status: 'Successful' | 'Pending' | 'Failed';
  when: string;
  account: string;
};

const MOCK_HISTORY: MockHistory[] = [];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

/** Uses each provider website's favicon as its brand mark. */
const PROVIDER_DOMAINS: Record<ProviderId, string> = {
  sportybet: 'sportybet.com',
  ilotbet: 'ilotbet.com',
  '1xbet': '1xbet.com',
  bet9ja: 'bet9ja.com',
  bangbet: 'bangbet.com',
  easywin: 'easywin.com',
  betking: 'betking.com',
  msport: 'msport.com',
  nairabet: 'nairabet.com',
  betway: 'betway.com.ng',
  livescorebet: 'livescorebet.com',
  merrybet: 'merrybet.com',
};

function ProviderLogo({ id, size = 48 }: { id: ProviderId; size?: number }) {
  const [failed, setFailed] = useState(false);
  const provider = PROVIDERS.find((item) => item.id === id);
  const domain = PROVIDER_DOMAINS[id];

  if (!failed) {
    return (
      <img
        src={'https://www.google.com/s2/favicons?domain=' + domain + '&sz=128'}
        alt={(provider?.name ?? id) + ' logo'}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 10, background: '#fff' }}
      />
    );
  }

  return (
    <span
      aria-label={(provider?.name ?? id) + ' logo unavailable'}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: provider?.color ?? '#64748B',
        color: '#fff',
        fontSize: 12,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {(provider?.name ?? id).replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()}
    </span>
  );
}

export function BettingPage({
  onBack,
  onOpenHistory,
}: {
  onBack: () => void;
  onOpenHistory?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<ProviderId>('sportybet');
  const [accountId, setAccountId] = useState('');
  const [verified, setVerified] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [beneficiariesOpen, setBeneficiariesOpen] = useState(false);

  const provider = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedId) ?? PROVIDERS[0],
    [selectedId],
  );

  const amount = useMemo(() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const idReady = accountId.trim().length >= 4;
  const amountReady = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && verified;
  const canPay = verified && amountReady && !paying;

  const hotProviders = useMemo(
    () => PROVIDERS.filter((p) => HOT_IDS.includes(p.id)),
    [],
  );

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PROVIDERS;
    return PROVIDERS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [search]);

  const toastMsg = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const pickProvider = (id: ProviderId) => {
    setSelectedId(id);
    setAccountId('');
    setVerified(false);
    setCustomerName('');
    setAmountStr('');
    setMoreOpen(false);
    setSearch('');
  };

  const onVerify = async () => {
    if (!idReady || verifying) return;
    // Do not show a fake verified customer. Connect this to the provider API first.
    toastMsg('Live account verification is not connected yet.');
  };

  const openPay = () => {
    if (!canPay) return;
    setPin('');
    setPinOpen(true);
  };

  const submitPin = async (fullPin: string) => {
    if (fullPin.length !== 4 || paying) return;
    // A delay is not a payment confirmation; the server/provider integration is required.
    setPinOpen(false);
    setPin('');
    toastMsg('Betting-wallet funding is not connected yet.');
  };

  const onPinDigit = (d: string) => {
    if (pin.length >= 4 || paying) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) void submitPin(next);
  };

  const onPinBack = () => setPin((p) => p.slice(0, -1));

  const recentHistory = MOCK_HISTORY.slice(0, 3);

  return (
    <div className="bet-page">
      <header className="bet-topbar">
        <button type="button" className="bet-round" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="bet-top-mid">
          <h1>Betting</h1>
          <p>Fund betting wallets instantly</p>
        </div>
        <button type="button" className="bet-history-link" onClick={() => onOpenHistory?.()}>
          <History size={15} strokeWidth={2.2} />
          History
        </button>
      </header>

      <div className="bet-scroll">
        <section className="bet-section">
          <div className="bet-section-head">
            <strong>Select Provider</strong>
            <span>Popular books first</span>
          </div>
          <div className="bet-provider-row">
            {hotProviders.map((p) => {
              const on = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={on ? 'bet-prov on' : 'bet-prov'}
                  onClick={() => pickProvider(p.id)}
                  aria-pressed={on}
                >
                  <span className="bet-logo-wrap">
                    <ProviderLogo id={p.id} size={48} />
                  </span>
                  <span className="bet-prov-name">{p.name}</span>
                </button>
              );
            })}
            <button type="button" className="bet-prov bet-more" onClick={() => setMoreOpen(true)}>
              <span className="bet-more-dot" aria-hidden>
                ···
              </span>
              <span className="bet-prov-name">More</span>
            </button>
          </div>
        </section>

        <section className="bet-card">
          <div className="bet-card-head">
            <div>
              <strong>{provider.inputKind === 'phone' ? 'Phone Number' : provider.inputKind === 'username' ? 'Username' : 'Account ID'}</strong>
              <span>Enter the identifier registered with {provider.name}</span>
            </div>
            <button type="button" className="bet-beneficiaries" onClick={() => setBeneficiariesOpen(true)}>
              Beneficiaries <ChevronRight size={14} />
            </button>
          </div>

          <div className={accountId && !idReady ? 'bet-input err' : 'bet-input'}>
            <span className="bet-hash" aria-hidden>
              #
            </span>
            <input
              type="text"
              inputMode={provider.inputKind === 'phone' ? 'tel' : 'text'}
              placeholder={provider.placeholder}
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setVerified(false);
                setCustomerName('');
              }}
              aria-label={provider.inputKind === 'phone' ? 'Betting account phone number' : provider.inputKind === 'username' ? 'Betting account username' : 'Betting account ID'}
            />
            {accountId ? (
              <button
                type="button"
                className="bet-x"
                aria-label="Clear"
                onClick={() => {
                  setAccountId('');
                  setVerified(false);
                  setCustomerName('');
                }}
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {verified && customerName && (
            <div className="bet-ok">
              <span>
                <Check size={13} strokeWidth={3} />
              </span>
              <div>
                <b>{customerName}</b>
                <small>
                  {provider.name} · {accountId.trim()} · Active
                </small>
              </div>
            </div>
          )}

          <button
            type="button"
            className="bet-verify"
            disabled={!idReady || verifying || verified}
            onClick={onVerify}
          >
            {verifying ? 'Verifying…' : verified ? 'Verified' : 'Verify Account'}
          </button>
        </section>

        <section className={`bet-card ${!verified ? 'bet-locked' : ''}`}>
          <div className="bet-section-head">
            <strong>Select Amount</strong>
            <span>
              {verified
                ? `Min ${money(MIN_AMOUNT)} · Max ${money(MAX_AMOUNT)}`
                : 'Verify account first'}
            </span>
          </div>

          <div className="bet-quick">
            {QUICK_AMOUNTS.map((n) => {
              const active = amount === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={active ? 'bet-chip on' : 'bet-chip'}
                  disabled={!verified}
                  onClick={() => setAmountStr(String(n))}
                >
                  <em>{money(n)}</em>
                  <small>Pay {money(n)}</small>
                </button>
              );
            })}
          </div>

          <div className="bet-amount-row">
            <div className="bet-input bet-amount-input">
              <span className="bet-naira" aria-hidden>
                {'\u20a6'}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder={`${MIN_AMOUNT.toLocaleString()}–${MAX_AMOUNT.toLocaleString()}`}
                value={amountStr}
                disabled={!verified}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d]/g, ''))}
                aria-label="Custom amount"
              />
            </div>
          </div>
        </section>

        <section className="bet-history-block">
          <div className="bet-history-head">
            <strong>Recent</strong>
            <button type="button" onClick={() => onOpenHistory?.()}>
              View all
            </button>
          </div>
          {recentHistory.length === 0 ? (
            <div className="bet-history-empty">
              <p>No betting transactions yet.</p>
            </div>
          ) : (
            <ul className="bet-history-list">
              {recentHistory.map((h) => (
                <li key={h.id}>
                  <div>
                    <strong>{h.provider}</strong>
                    <small>
                      {h.when} · {h.account}
                    </small>
                  </div>
                  <div className="bet-history-right">
                    <em>-{money(h.amount)}</em>
                    <span className="ok">{h.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="bet-foot">
        <button type="button" className="bet-pay" disabled={!canPay} onClick={openPay}>
          <Lock size={16} strokeWidth={2.4} />
          {paying ? 'Processing…' : amount > 0 ? `Pay ${money(amount)}` : 'Pay'}
        </button>
      </div>

      {moreOpen && (
        <div className="bet-sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="bet-sheet-backdrop"
            aria-label="Close"
            onClick={() => {
              setMoreOpen(false);
              setSearch('');
            }}
          />
          <div className="bet-sheet">
            <div className="bet-sheet-handle" />
            <div className="bet-sheet-search">
              <Search size={16} className="ico" aria-hidden />
              <input
                type="search"
                placeholder="Search Provider"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              {search ? (
                <button type="button" className="bet-x" aria-label="Clear search" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              ) : null}
            </div>

            {!search && <div className="bet-hot-label">Hot</div>}
            {!search && (
              <div className="bet-hot-grid">
                {hotProviders.map((p) => (
                  <button key={p.id} type="button" className="bet-hot-item" onClick={() => pickProvider(p.id)}>
                    <ProviderLogo id={p.id} size={48} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            <ul className="bet-all-list">
              {filteredProviders.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pickProvider(p.id)}>
                    <ProviderLogo id={p.id} size={40} />
                    <span className="bet-all-name">{p.name}</span>
                    {p.hot && <span className="bet-hot-badge">HOT</span>}
                    <ChevronRight size={16} className="chev" />
                  </button>
                </li>
              ))}
              {filteredProviders.length === 0 && (
                <li className="bet-all-empty">No providers match “{search}”</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {beneficiariesOpen && (
        <div className="bet-sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="bet-sheet-backdrop"
            aria-label="Close"
            onClick={() => setBeneficiariesOpen(false)}
          />
          <div className="bet-sheet bet-sheet-sm">
            <div className="bet-sheet-handle" />
            <div className="bet-sheet-title-row">
              <button type="button" className="bet-round" onClick={() => setBeneficiariesOpen(false)} aria-label="Back">
                <ArrowLeft size={16} />
              </button>
              <h2>Beneficiaries</h2>
              <span className="bet-spacer" />
            </div>
            <div className="bet-benef-empty">
              <p>No saved betting accounts yet.</p>
              <small>Verified accounts will appear here for one-tap reuse.</small>
            </div>
          </div>
        </div>
      )}

      {pinOpen && (
        <div className="bet-pin-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="bet-sheet-backdrop"
            aria-label="Close PIN"
            onClick={() => {
              if (!paying) {
                setPinOpen(false);
                setPin('');
              }
            }}
          />
          <div className="bet-pin-sheet">
            <div className="bet-sheet-handle" />
            <h2>Enter Transaction PIN</h2>
            <p>
              Confirm {money(amount)} to {provider.name}
            </p>
            <div className="bet-pin-dots" aria-label="PIN digits">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={pin.length > i ? 'filled' : ''} />
              ))}
            </div>
            <div className="bet-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, idx) => {
                if (k === '') return <span key={idx} className="bet-key empty" />;
                if (k === '⌫') {
                  return (
                    <button key={idx} type="button" className="bet-key" onClick={onPinBack} disabled={paying}>
                      ⌫
                    </button>
                  );
                }
                return (
                  <button key={idx} type="button" className="bet-key" onClick={() => onPinDigit(k)} disabled={paying}>
                    {k}
                  </button>
                );
              })}
            </div>
            {paying && <p className="bet-pin-busy">Processing…</p>}
          </div>
        </div>
      )}

      {toast && (
        <div className="bet-toast" role="status">
          <Check size={14} strokeWidth={2.5} /> {toast}
        </div>
      )}
    </div>
  );
}
