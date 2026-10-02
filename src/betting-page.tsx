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
  short: string;
  color: string;
  inputKind: InputKind;
  placeholder: string;
  hot?: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: 'sportybet',
    name: 'SportyBet',
    short: 'S',
    color: '#E11D2E',
    inputKind: 'phone',
    placeholder: 'Enter SportyBet phone number',
    hot: true,
  },
  {
    id: 'ilotbet',
    name: 'iLOTBet',
    short: 'iL',
    color: '#0F172A',
    inputKind: 'phone',
    placeholder: 'Enter iLOT phone number',
    hot: true,
  },
  {
    id: '1xbet',
    name: '1xBET',
    short: '1x',
    color: '#1D4ED8',
    inputKind: 'account_id',
    placeholder: 'Enter 1xBET Account ID',
    hot: true,
  },
  {
    id: 'bet9ja',
    name: 'Bet9ja',
    short: '9ja',
    color: '#16A34A',
    inputKind: 'account_id',
    placeholder: 'Enter Bet9ja User ID',
    hot: true,
  },
  {
    id: 'bangbet',
    name: 'BangBet',
    short: 'BB',
    color: '#EAB308',
    inputKind: 'account_id',
    placeholder: 'Enter BangBet Account ID',
    hot: true,
  },
  {
    id: 'easywin',
    name: 'EasyWin',
    short: 'EW',
    color: '#EA580C',
    inputKind: 'username',
    placeholder: 'Enter EasyWin username',
    hot: true,
  },
  {
    id: 'betking',
    name: 'BetKing',
    short: 'K',
    color: '#1E3A8A',
    inputKind: 'account_id',
    placeholder: 'Enter BetKing Account ID',
  },
  {
    id: 'msport',
    name: 'MSport',
    short: 'M',
    color: '#0F172A',
    inputKind: 'account_id',
    placeholder: 'Enter MSport Account ID',
  },
  {
    id: 'nairabet',
    name: 'NairaBet',
    short: 'NB',
    color: '#2563EB',
    inputKind: 'phone',
    placeholder: 'Enter NairaBet phone number',
  },
  {
    id: 'betway',
    name: 'Betway',
    short: 'BW',
    color: '#0F172A',
    inputKind: 'account_id',
    placeholder: 'Enter Betway Account ID',
  },
  {
    id: 'livescorebet',
    name: 'Livescorebet',
    short: 'LS',
    color: '#F97316',
    inputKind: 'account_id',
    placeholder: 'Enter Livescorebet ID',
  },
  {
    id: 'merrybet',
    name: 'MerryBet',
    short: 'MB',
    color: '#7C3AED',
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

/** Empty until real transactions exist — shows structure only when needed */
const MOCK_HISTORY: MockHistory[] = [];

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function ProviderLogo({
  provider,
  size = 40,
}: {
  provider: Provider;
  size?: number;
}) {
  return (
    <span
      className="bet-logo"
      style={{
        width: size,
        height: size,
        background: provider.color,
        fontSize: size > 36 ? 13 : 11,
      }}
      aria-hidden
    >
      {provider.short}
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
  const amountReady =
    amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && verified;
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
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 900));
    setVerifying(false);
    setVerified(true);
    // Mock customer name — later from betting API
    setCustomerName('Verified Customer');
    toastMsg('Account verified');
  };

  const openPay = () => {
    if (!canPay) return;
    setPin('');
    setPinOpen(true);
  };

  const submitPin = async (fullPin: string) => {
    if (fullPin.length !== 4 || paying) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1000));
    setPaying(false);
    setPinOpen(false);
    setPin('');
    setAccountId('');
    setVerified(false);
    setCustomerName('');
    setAmountStr('');
    toastMsg(`${provider.name} funded · ${money(amount)}`);
  };

  const onPinDigit = (d: string) => {
    if (pin.length >= 4 || paying) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      void submitPin(next);
    }
  };

  const onPinBack = () => {
    setPin((p) => p.slice(0, -1));
  };

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
        <button
          type="button"
          className="bet-history-link"
          onClick={() => onOpenHistory?.()}
        >
          <History size={15} strokeWidth={2.2} />
          History
        </button>
      </header>

      <div className="bet-scroll">
        {/* Provider row */}
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
                  <ProviderLogo provider={p} size={40} />
                  <span>{p.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="bet-prov bet-more"
              onClick={() => setMoreOpen(true)}
            >
              <span className="bet-more-dot" aria-hidden>
                ···
              </span>
              <span>More</span>
            </button>
          </div>
        </section>

        {/* Account ID */}
        <section className="bet-card">
          <div className="bet-card-head">
            <div>
              <strong>User ID</strong>
              <span>Verify account before payment</span>
            </div>
            <button
              type="button"
              className="bet-beneficiaries"
              onClick={() => setBeneficiariesOpen(true)}
            >
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
              aria-label="Betting account ID"
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

        {/* Amount — locked until verified */}
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
                onChange={(e) =>
                  setAmountStr(e.target.value.replace(/[^\d]/g, ''))
                }
                aria-label="Custom amount"
              />
            </div>
          </div>
        </section>

        {/* Recent history */}
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

      {/* Sticky pay bar */}
      <div className="bet-foot">
        <button
          type="button"
          className="bet-pay"
          disabled={!canPay}
          onClick={openPay}
        >
          <Lock size={16} strokeWidth={2.4} />
          {paying
            ? 'Processing…'
            : amount > 0
              ? `Pay ${money(amount)}`
              : 'Pay'}
        </button>
      </div>

      {/* More providers sheet */}
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
                <button
                  type="button"
                  className="bet-x"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            {!search && (
              <div className="bet-hot-label">Hot</div>
            )}
            {!search && (
              <div className="bet-hot-grid">
                {hotProviders.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="bet-hot-item"
                    onClick={() => pickProvider(p.id)}
                  >
                    <ProviderLogo provider={p} size={44} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            <ul className="bet-all-list">
              {filteredProviders.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => pickProvider(p.id)}>
                    <ProviderLogo provider={p} size={36} />
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

      {/* Beneficiaries sheet (empty state) */}
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
              <button
                type="button"
                className="bet-round"
                onClick={() => setBeneficiariesOpen(false)}
                aria-label="Back"
              >
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

      {/* PIN modal */}
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
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(
                (k, idx) => {
                  if (k === '') return <span key={idx} className="bet-key empty" />;
                  if (k === '⌫') {
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="bet-key"
                        onClick={onPinBack}
                        disabled={paying}
                      >
                        ⌫
                      </button>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      className="bet-key"
                      onClick={() => onPinDigit(k)}
                      disabled={paying}
                    >
                      {k}
                    </button>
                  );
                },
              )}
            </div>
            {paying && <p className="bet-pin-busy">Processing…</p>}
          </div>
        </div>
      )}

      {toast && (
        <div className="bet-toast" role="status">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export default BettingPage;
