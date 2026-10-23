'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Lock,
  Phone,
  Radio,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  AlertCircle,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
import './airtime-page.css';

type NetworkId = 'mtn' | 'airtel' | 'glo' | '9mobile';

interface NetworkOption {
  id: NetworkId;
  label: string;
}

const MY_NUMBER = '08141620644';

const NETWORKS: NetworkOption[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'airtel', label: 'Airtel' },
  { id: 'glo', label: 'Glo' },
  { id: '9mobile', label: '9mobile' },
];

/** Quick amount chips: exactly 2 rows of 4 chips (8 total) */
const QUICK_AMOUNTS_ROW_1 = [100, 200, 500, 1000];
const QUICK_AMOUNTS_ROW_2 = [2000, 5000, 10000, 20000];

const RECENT_KEY = 'verxor_airtime_recent_recipients_v1';
const DATA_RECENT_KEY = 'verxor_data_recent_recipients_v1';

interface RecentRecipient {
  phone: string;
  networkId?: NetworkId;
  lastUsed: number;
}

/** Nigerian phone prefix detection */
function detectNetwork(phone: string): NetworkId | null {
  const clean = phone.replace(/\D/g, '');
  let pfx = '';
  if (clean.startsWith('234') && clean.length >= 6) {
    pfx = '0' + clean.slice(3, 8);
  } else if (clean.startsWith('0') && clean.length >= 4) {
    pfx = clean.slice(0, 5);
  }
  if (!pfx) return null;

  // MTN prefixes
  const mtn = [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814',
    '0903', '0906', '0913', '0916', '07025', '07026', '0704',
  ];
  if (mtn.some((p) => pfx.startsWith(p))) return 'mtn';

  // Airtel prefixes
  const airtel = [
    '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904',
    '0907', '0912', '0911',
  ];
  if (airtel.some((p) => pfx.startsWith(p))) return 'airtel';

  // Glo prefixes
  const glo = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
  if (glo.some((p) => pfx.startsWith(p))) return 'glo';

  // 9mobile prefixes
  const etisalat = ['0809', '0817', '0818', '0909', '0908'];
  if (etisalat.some((p) => pfx.startsWith(p))) return '9mobile';

  return null;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  return digits;
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

function money(n: number): string {
  return `\u20a6${n.toLocaleString('en-NG')}`;
}

function moneyFull(n: number): string {
  return `\u20a6${n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNaira(n: number): string {
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function NetworkLogo({ id, size = 48 }: { id: NetworkId; size?: number }) {
  const assets: Record<NetworkId, { src: string; alt: string }> = {
    mtn: { src: '/brand/networks/mtn.svg', alt: 'MTN' },
    airtel: { src: '/brand/networks/airtel.svg', alt: 'Airtel' },
    glo: { src: '/brand/networks/glo.svg', alt: 'Glo' },
    '9mobile': { src: '/brand/networks/9mobile.svg', alt: '9mobile' },
  };
  const asset = assets[id];

  return (
    <span
      className={`air-network-logo air-network-logo-${id}`}
      style={{ width: size, height: size }}
    >
      <img
        src={asset.src}
        alt={asset.alt}
        width={size}
        height={size}
        draggable={false}
      />
    </span>
  );
}

export function AirtimePage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session?: AuthSession | null;
  onFund: () => void;
}) {
  const walletBalance = session?.balanceNgn ?? 0;
  const [networkId, setNetworkId] = useState<NetworkId | ''>('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<RecentRecipient[]>([]);

  const accountPhone = useMemo(() => {
    if (session?.contact) {
      const clean = normalizePhone(session.contact);
      if (clean.length === 11) return clean;
    }
    if (typeof window !== 'undefined') {
      try {
        const profile = loadSessionProfile();
        if (profile?.contact) {
          const clean = normalizePhone(profile.contact);
          if (clean.length === 11) return clean;
        }
      } catch {
        /* noop */
      }
      try {
        const raw = localStorage.getItem('verxor-last-phone');
        if (raw) {
          const parsed = JSON.parse(raw) as { national?: string };
          if (parsed?.national) {
            const clean = normalizePhone(parsed.national);
            if (clean.length === 11) return clean;
          }
        }
      } catch {
        /* noop */
      }
      try {
        const userRaw = localStorage.getItem('verxor-user');
        if (userRaw) {
          const u = JSON.parse(userRaw) as { phone?: string; contact?: string };
          const c = u?.phone || u?.contact;
          if (c) {
            const clean = normalizePhone(c);
            if (clean.length === 11) return clean;
          }
        }
      } catch {
        /* noop */
      }
    }
    return MY_NUMBER;
  }, [session]);

  useEffect(() => {
    try {
      const rawAir = localStorage.getItem(RECENT_KEY);
      const rawData = localStorage.getItem(DATA_RECENT_KEY);
      const airList: RecentRecipient[] = rawAir ? JSON.parse(rawAir) : [];
      const dataList: RecentRecipient[] = rawData ? JSON.parse(rawData) : [];
      const combined = [
        ...(Array.isArray(airList) ? airList : []),
        ...(Array.isArray(dataList) ? dataList : []),
      ];
      const seen = new Set<string>();
      const deduped: RecentRecipient[] = [];
      for (const item of combined) {
        if (item?.phone && !seen.has(item.phone)) {
          seen.add(item.phone);
          deduped.push(item);
        }
      }
      setRecentRecipients(deduped.slice(0, 5));
    } catch {
      /* noop */
    }
  }, []);

  const saveRecentRecipient = useCallback((phoneToSave: string, netId?: NetworkId) => {
    try {
      const clean = normalizePhone(phoneToSave);
      if (clean.length !== 11) return;
      const detected = netId || detectNetwork(clean) || undefined;
      const updated: RecentRecipient[] = [
        { phone: clean, networkId: detected, lastUsed: Date.now() },
        ...recentRecipients.filter((r) => r.phone !== clean),
      ].slice(0, 5);
      setRecentRecipients(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
        localStorage.setItem(DATA_RECENT_KEY, JSON.stringify(updated));
      }
    } catch {
      /* noop */
    }
  }, [recentRecipients]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleFund = useCallback(() => onFund(), [onFund]);

  const phoneDigits = useMemo(() => normalizePhone(phone), [phone]);
  const phoneValid = phoneDigits.length === 11 && phoneDigits.startsWith('0');
  const amount = useMemo(() => {
    const parsed = parseFloat(amountStr.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [amountStr]);

  const insufficient = amount > 0 && amount > walletBalance;
  const formReady = Boolean(networkId && phoneValid && amount >= 100 && amount <= 50000);

  const applyPhone = (val: string) => {
    const clean = normalizePhone(val);
    setPhone(clean);
    const detected = detectNetwork(clean);
    if (detected) {
      setNetworkId(detected);
      setAutoDetected(true);
    }
  };

  const handlePhoneChange = (v: string) => {
    applyPhone(v);
  };

  const handleUseMyNumber = () => {
    if (accountPhone) {
      applyPhone(accountPhone);
      showToast(`Account number applied (${formatPhoneDisplay(accountPhone)})`);
      return;
    }
    if (recentRecipients.length > 0) {
      setPickerOpen(true);
      return;
    }
    showToast('No registered phone number found on account');
  };

  const handleSelectRecipient = (selectedPhone: string, netId?: NetworkId) => {
    applyPhone(selectedPhone);
    if (netId) {
      setNetworkId(netId);
      setAutoDetected(true);
    }
    setPickerOpen(false);
  };

  const handleQuickAmount = (n: number) => {
    setAmountStr(String(n));
  };

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^\d.,]/g, '');
    setAmountStr(cleaned);
  };

  const handleBuy = async () => {
    if (!formReady || insufficient || submitting || !networkId) return;
    setSubmitting(true);
    try {
      let accessToken = loadSessionTokens()?.access_token || '';
      let userId = loadSessionProfile()?.userId || '';
      try {
        const { getSupabaseBrowser } = await import('../lib/supabase/client');
        const sb = getSupabaseBrowser();
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          if (sess.session?.access_token) accessToken = sess.session.access_token;
          if (sess.session?.user?.id) userId = sess.session.user.id;
        }
      } catch {
        /* optional */
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch('/api/v1/airtime', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          network: networkId,
          phone: phoneDigits,
          amount,
          userId: userId || undefined,
        }),
      });
      const data = await res
        .json()
        .catch(
          () =>
            ({} as {
              ok?: boolean;
              error?: string;
              order?: { message?: string; title?: string };
            }),
        );

      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          showToast('Sign in required to buy airtime');
        } else if (res.status === 402) {
          showToast(data.error || 'Insufficient balance — fund your wallet');
        } else {
          const rawErr = data.error || 'Airtime purchase failed';
          const cleanErr = rawErr.replace(/^(api247|clubkonnect):\s*/i, '');
          showToast(cleanErr);
        }
        return;
      }

      saveRecentRecipient(phoneDigits, networkId);

      setPhone('');
      setAmountStr('');
      setNetworkId('');
      setAutoDetected(false);
      const netLabel =
        networkId === 'mtn'
          ? 'MTN'
          : networkId === 'glo'
            ? 'Glo'
            : networkId === 'airtel'
              ? 'Airtel'
              : '9mobile';
      const successMsg =
        data.order?.message ||
        data.order?.title ||
        `${netLabel} airtime purchase of \u20a6${amount.toLocaleString('en-NG')} was successful`;
      showToast(successMsg);
    } catch {
      showToast('Network error — try again');
    } finally {
      setSubmitting(false);
    }
  };

  let ctaLabel = 'Buy Airtime';
  let ctaAction: () => void | Promise<void> = handleBuy;
  let ctaClass = 'air-cta';
  let ctaDisabled = submitting || !formReady;

  if (insufficient && formReady) {
    ctaLabel = 'Fund Wallet';
    ctaAction = handleFund;
    ctaClass = 'air-cta air-cta-fund';
    ctaDisabled = false;
  } else if (!networkId) {
    ctaLabel = 'Select a network';
  } else if (!phoneDigits) {
    ctaLabel = 'Enter phone number';
  } else if (!phoneValid) {
    ctaLabel = 'Enter a valid number';
  } else if (amount <= 0) {
    ctaLabel = 'Enter amount';
  } else if (amount < 100) {
    ctaLabel = 'Minimum is \u20a6100';
  } else if (amount > 50000) {
    ctaLabel = 'Maximum is \u20a650,000';
  } else if (submitting) {
    ctaLabel = 'Processing...';
  }

  return (
    <div className="air-page">
      <header className="air-topbar">
        <button type="button" className="air-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>
        <div className="air-title-wrap">
          <h1 className="air-title">Buy Airtime</h1>
          <p className="air-subtitle">Instant mobile top-up</p>
        </div>
        <button
          type="button"
          className="air-wallet-btn"
          aria-label="Fund Wallet"
          title="Fund Wallet"
          onClick={handleFund}
        >
          <Wallet size={15} strokeWidth={2.2} />
          <span className="air-wallet-val">₦{formatNaira(walletBalance)}</span>
          <span className="air-wallet-plus">+</span>
        </button>
      </header>

      <section className="air-section">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Radio size={18} strokeWidth={2.2} />
          </div>
          <div className="air-head-text">
            <h2>Select Network</h2>
            <p>
              {autoDetected && networkId
                ? 'Network detected from recipient number'
                : 'Auto-detect works when you type number'}
            </p>
          </div>
        </div>

        <div className="air-networks" role="listbox" aria-label="Mobile networks">
          {NETWORKS.map((net) => {
            const selected = networkId === net.id;
            return (
              <button
                key={net.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`air-net${selected ? ' selected' : ''}`}
                onClick={() => {
                  setNetworkId(net.id);
                  setAutoDetected(false);
                }}
              >
                {selected && (
                  <span className="air-net-badge" aria-hidden>
                    <Check size={11} strokeWidth={3.5} />
                  </span>
                )}
                <div className="air-net-logo-wrap">
                  <NetworkLogo id={net.id} size={48} />
                </div>
                <span className="air-net-label">{net.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="air-section air-details">
        <div className="air-section-head">
          <div className="air-head-badge" aria-hidden>
            <Receipt size={18} strokeWidth={2.2} />
          </div>
          <div className="air-head-text">
            <h2>Recharge Details</h2>
            <p>Enter recipient and amount</p>
          </div>
        </div>

        <div className="air-field">
          <div className="air-field-header">
            <span className="air-field-label">Phone Number</span>
            <div className="air-field-actions">
              <button
                type="button"
                className="air-use-mine-pill"
                onClick={handleUseMyNumber}
                title="Use your registered account number"
              >
                <Sparkles size={11} className="air-use-mine-ico" />
                <span>Use My Number</span>
              </button>
              <button
                type="button"
                className="air-recent-pill"
                title="Choose from recent recharges"
                aria-label="Choose from recent recharges"
                onClick={() => setPickerOpen(true)}
              >
                <Clock size={11} />
                <span>Recent</span>
              </button>
            </div>
          </div>
          <div className={phoneDigits && !phoneValid ? 'air-input-wrap is-error' : 'air-input-wrap'}>
            <div className="air-input-lead-icon">
              <Phone size={17} strokeWidth={2.2} />
            </div>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              aria-label="Phone number"
            />
            {phone ? (
              <button
                type="button"
                className="air-clear"
                aria-label="Clear phone number"
                title="Clear phone number"
                onClick={() => {
                  setPhone('');
                  setAutoDetected(false);
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
          {phoneDigits && !phoneValid && (
            <p className="air-field-error" role="alert">
              Enter a valid 11-digit Nigerian number
            </p>
          )}
        </div>

        <div className="air-field">
          <div className="air-field-header">
            <span className="air-field-label">Amount</span>
            <span className="air-field-hint">₦100 - ₦50,000</span>
          </div>
          <div className="air-input-wrap">
            <div className="air-input-lead-icon">
              <Wallet size={17} strokeWidth={2.2} />
            </div>
            <span className="air-naira" aria-hidden>
              {'₦'}
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              aria-label="Amount"
            />
            {amountStr ? (
              <button
                type="button"
                className="air-clear"
                aria-label="Clear amount"
                title="Clear amount"
                onClick={() => setAmountStr('')}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="air-quick">
          <span className="air-quick-label">Quick Amounts</span>
          <div className="air-quick-grid">
            {QUICK_AMOUNTS_ROW_1.map((n) => {
              const active = amount === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={active ? 'air-chip active' : 'air-chip'}
                  onClick={() => handleQuickAmount(n)}
                >
                  {money(n)}
                </button>
              );
            })}
            {QUICK_AMOUNTS_ROW_2.map((n) => {
              const active = amount === n;
              return (
                <button
                  key={n}
                  type="button"
                  className={active ? 'air-chip active' : 'air-chip'}
                  onClick={() => handleQuickAmount(n)}
                >
                  {money(n)}
                </button>
              );
            })}
          </div>
        </div>

        {amount > 0 && (
          <div className="air-summary">
            <div className="air-summary-row">
              <span>You pay</span>
              <strong>{moneyFull(amount)}</strong>
            </div>
            {insufficient && (
              <div className="air-summary-warn">
                <div className="air-warn-text">
                  <AlertCircle size={15} />
                  <span>Insufficient balance · Need {moneyFull(amount - walletBalance)} more</span>
                </div>
                <button type="button" className="air-warn-fund" onClick={handleFund}>
                  Fund Wallet
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={ctaClass}
          disabled={ctaDisabled}
          onClick={() => void ctaAction()}
        >
          {ctaLabel}
        </button>
      </section>

      {/* ── Instant Delivery Trust Card ── */}
      <div className="air-trust">
        <div className="air-trust-icon">
          <ShieldCheck size={20} />
        </div>
        <div className="air-trust-body">
          <strong>Instant Delivery</strong>
          <p>Airtime is delivered immediately after successful payment.</p>
        </div>
      </div>

      {/* ── Recipient Picker Modal (matching Data page) ── */}
      {pickerOpen && (
        <div className="air-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="air-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Choose recipient"
          >
            <div className="air-modal-header">
              <div className="air-modal-title-wrap">
                <h3>Choose Recipient</h3>
                <p>Your number or recent recharges</p>
              </div>
              <button
                type="button"
                className="air-modal-close"
                aria-label="Close"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="air-modal-list">
              {accountPhone && (
                <button
                  type="button"
                  className="air-modal-item"
                  onClick={() => {
                    applyPhone(accountPhone);
                    setPickerOpen(false);
                    showToast(`Account number applied (${formatPhoneDisplay(accountPhone)})`);
                  }}
                >
                  <div className="air-modal-item-icon account">
                    <Sparkles size={16} />
                  </div>
                  <div className="air-modal-item-info">
                    <div className="air-modal-item-top">
                      <strong>{formatPhoneDisplay(accountPhone)}</strong>
                      <span className="air-tag primary">My number</span>
                    </div>
                    <span className="air-modal-item-sub">Registered on your account</span>
                  </div>
                </button>
              )}
              {recentRecipients.map((r) => (
                <button
                  key={r.phone}
                  type="button"
                  className="air-modal-item"
                  onClick={() => {
                    handleSelectRecipient(r.phone, r.networkId);
                    showToast(`Selected ${formatPhoneDisplay(r.phone)}`);
                  }}
                >
                  <div className="air-modal-item-icon recent">
                    <Clock size={16} />
                  </div>
                  <div className="air-modal-item-info">
                    <div className="air-modal-item-top">
                      <strong>{formatPhoneDisplay(r.phone)}</strong>
                      {r.networkId && (
                        <span className={`air-tag net-${r.networkId}`}>{r.networkId}</span>
                      )}
                    </div>
                    <span className="air-modal-item-sub">Recent recharge</span>
                  </div>
                </button>
              ))}
              {!accountPhone && recentRecipients.length === 0 && (
                <div className="air-modal-empty">
                  <p>No saved numbers yet</p>
                  <span>Recharge a number or save your profile phone to see it here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="air-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
