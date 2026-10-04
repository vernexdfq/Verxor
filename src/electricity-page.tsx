'use client';

import { useCallback, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Hash,
  Lock,
  ShieldCheck,
  Wallet,
  Zap,
  Building2,
  X,
} from 'lucide-react';
import './electricity-page.css';

type MeterType = 'prepaid' | 'postpaid';

type Disco = {
  id: string;
  label: string;
  short: string;
};

const DISCOS: Disco[] = [
  { id: 'ikeja', label: 'Ikeja Electric', short: 'IE' },
  { id: 'eko', label: 'Eko Electric', short: 'EKEDC' },
  { id: 'ibadan', label: 'Ibadan Electric', short: 'IBEDC' },
  { id: 'abuja', label: 'Abuja Electric', short: 'AEDC' },
  { id: 'kaduna', label: 'Kaduna Electric', short: 'KAEDCO' },
  { id: 'kano', label: 'Kano Electric', short: 'KEDCO' },
  { id: 'jos', label: 'Jos Electric', short: 'JED' },
  { id: 'ph', label: 'Port Harcourt Electric', short: 'PHED' },
  { id: 'enugu', label: 'Enugu Electric', short: 'EEDC' },
  { id: 'benin', label: 'Benin Electric', short: 'BEDC' },
];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];
const MIN_AMOUNT = 1000;
const WALLET_BALANCE = 7570;

function money(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG');
}

function moneyFull(n: number) {
  return '\u20a6' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ElectricityPage({ onBack }: { onBack: () => void }) {
  const [discoId, setDiscoId] = useState('ikeja');
  const [discoOpen, setDiscoOpen] = useState(false);
  const [meterType, setMeterType] = useState<MeterType>('prepaid');
  const [meterNumber, setMeterNumber] = useState('');
  const [verified, setVerified] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const disco = DISCOS.find((d) => d.id === discoId) ?? DISCOS[0];
  const digits = meterNumber.replace(/\D/g, '');
  const meterOk = digits.length >= 10 && digits.length <= 13;
  const amount = (() => {
    const n = Number(String(amountStr).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const insufficient = amount > 0 && amount > WALLET_BALANCE;
  const amountOk = amount >= MIN_AMOUNT;
  const canPay = verified && amountOk && !insufficient && !paying;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const pickDisco = (id: string) => {
    setDiscoId(id);
    setDiscoOpen(false);
    setVerified(false);
    setCustomerName('');
    setVerifyError(null);
  };

  const onVerify = async () => {
    if (!meterOk || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    await new Promise((r) => setTimeout(r, 900));
    setVerifying(false);
    if (digits.endsWith('0')) {
      setVerified(false);
      setCustomerName('');
      setVerifyError('Meter not found. Check the number and try again.');
      showToast('Verification failed');
      return;
    }
    setVerified(true);
    setCustomerName('Chinedu Okonkwo');
    showToast('Meter verified');
  };

  const handlePay = async () => {
    if (!canPay) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1100));
    setPaying(false);
    showToast(
      meterType === 'prepaid'
        ? `Token sent · ${money(amount)} · ${disco.label}`
        : `Bill paid · ${money(amount)} · ${disco.label}`,
    );
    setMeterNumber('');
    setVerified(false);
    setCustomerName('');
    setAmountStr('');
  };

  return (
    <div className="elec-page">
      <header className="elec-header">
        <button type="button" className="elec-round" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="elec-header-mid">
          <h1>Electricity Bill</h1>
          <p>Prepaid and postpaid meter</p>
        </div>
        <button type="button" className="elec-round elec-round-accent" aria-label="Power">
          <Zap size={17} strokeWidth={2.2} />
        </button>
      </header>

      <section className="elec-banner">
        <div className="elec-banner-text">
          <span className="elec-pill">POWER BILL</span>
          <h2>Electricity Payment</h2>
          <p>Verify meter, confirm details and pay securely.</p>
        </div>
        <div className="elec-banner-art" aria-hidden>
          <Zap size={48} strokeWidth={1.4} />
        </div>
      </section>

      {/* Provider Details */}
      <section className="elec-block">
        <div className="elec-block-head">
          <span className="elec-block-ico">
            <Building2 size={16} strokeWidth={2.2} />
          </span>
          <div>
            <strong>Provider Details</strong>
            <span>Choose electricity company and meter type</span>
          </div>
        </div>

        <div className="elec-select-wrap">
          <button
            type="button"
            className="elec-select"
            onClick={() => setDiscoOpen((v) => !v)}
            aria-expanded={discoOpen}
          >
            <span className="elec-select-left">
              <span className="elec-disco-badge">{disco.short}</span>
              <span>
                <b>{disco.label}</b>
                <small>Electricity company</small>
              </span>
            </span>
            <ChevronDown size={17} className={discoOpen ? 'open' : ''} />
          </button>

          {discoOpen && (
            <div className="elec-sheet" role="dialog" aria-label="Select electricity company">
              <button
                type="button"
                className="elec-sheet-backdrop"
                aria-label="Close"
                onClick={() => setDiscoOpen(false)}
              />
              <div className="elec-sheet-panel">
                <div className="elec-sheet-handle" />
                <h3>Select Electricity Company</h3>
                <ul className="elec-sheet-list" role="listbox">
                  {DISCOS.map((d) => {
                    const on = d.id === discoId;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={on}
                          className={on ? 'on' : ''}
                          onClick={() => pickDisco(d.id)}
                        >
                          <span className="elec-sheet-ico">
                            <Zap size={15} strokeWidth={2.2} />
                          </span>
                          <span className="elec-sheet-name">{d.label}</span>
                          {on && <Check size={16} strokeWidth={2.6} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="elec-toggle" role="group" aria-label="Meter type">
          <button
            type="button"
            className={meterType === 'prepaid' ? 'on' : ''}
            onClick={() => setMeterType('prepaid')}
          >
            Prepaid
          </button>
          <button
            type="button"
            className={meterType === 'postpaid' ? 'on' : ''}
            onClick={() => setMeterType('postpaid')}
          >
            Postpaid
          </button>
        </div>
      </section>

      {/* Meter Verification */}
      <section className="elec-block">
        <div className="elec-block-head">
          <span className="elec-block-ico elec-block-ico-green">
            <ShieldCheck size={16} strokeWidth={2.2} />
          </span>
          <div>
            <strong>Meter Verification</strong>
            <span>Confirm customer details before payment</span>
          </div>
        </div>

        <div className={digits && !meterOk ? 'elec-input err' : 'elec-input'}>
          <Hash size={15} className="ico" aria-hidden />
          <input
            type="text"
            inputMode="numeric"
            placeholder="Meter Number"
            value={meterNumber}
            onChange={(e) => {
              setMeterNumber(e.target.value.replace(/[^\d\s]/g, ''));
              setVerified(false);
              setCustomerName('');
              setVerifyError(null);
            }}
            aria-label="Meter number"
            maxLength={14}
          />
          {meterNumber ? (
            <button
              type="button"
              className="elec-x"
              aria-label="Clear"
              onClick={() => {
                setMeterNumber('');
                setVerified(false);
                setCustomerName('');
                setVerifyError(null);
              }}
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        {verified && customerName && (
          <div className="elec-ok">
            <span>
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <b>{customerName}</b>
              <small>
                {disco.label} · {meterType === 'prepaid' ? 'Prepaid' : 'Postpaid'} · {digits}
              </small>
            </div>
          </div>
        )}

        {verifyError && !verified && (
          <div className="elec-err" role="alert">
            {verifyError}
          </div>
        )}

        <button
          type="button"
          className="elec-btn-verify"
          disabled={!meterOk || verifying}
          onClick={onVerify}
        >
          {verifying ? 'Verifying…' : 'Verify Meter'}
        </button>
      </section>

      {/* Payment Amount */}
      <section className="elec-block">
        <div className="elec-block-head">
          <span className="elec-block-ico">
            <Wallet size={16} strokeWidth={2.2} />
          </span>
          <div>
            <strong>Payment Amount</strong>
            <span>Minimum payment is {money(MIN_AMOUNT)}</span>
          </div>
        </div>

        <div className="elec-input">
          <Wallet size={15} className="ico" aria-hidden />
          <span className="elec-naira" aria-hidden>
            {'\u20a6'}
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^\d.,]/g, ''))}
            aria-label="Amount"
          />
          {amountStr ? (
            <button
              type="button"
              className="elec-x"
              aria-label="Clear amount"
              onClick={() => setAmountStr('')}
            >
              <X size={13} />
            </button>
          ) : null}
        </div>

        <div className="elec-quick">
          {QUICK_AMOUNTS.map((n) => {
            const on = amount === n;
            return (
              <button
                key={n}
                type="button"
                className={on ? 'on' : ''}
                onClick={() => setAmountStr(String(n))}
              >
                {money(n)}
              </button>
            );
          })}
        </div>

        {insufficient && (
          <p className="elec-warn">
            Insufficient balance · Wallet {moneyFull(WALLET_BALANCE)}
          </p>
        )}
      </section>

      <button
        type="button"
        className={canPay ? 'elec-pay' : 'elec-pay locked'}
        disabled={!canPay}
        onClick={handlePay}
      >
        {paying ? (
          'Processing…'
        ) : canPay ? (
          <>
            <Zap size={17} strokeWidth={2.2} />
            Pay {money(amount)}
          </>
        ) : (
          <>
            <Lock size={16} strokeWidth={2.2} />
            Pay Electricity
          </>
        )}
      </button>

      <div className="elec-trust">
        <span className="elec-trust-ico" aria-hidden>
          <Check size={13} strokeWidth={3} />
        </span>
        <div>
          <strong>Instant token delivery</strong>
          <p>
            {meterType === 'prepaid'
              ? 'Prepaid tokens are delivered immediately after payment.'
              : 'Postpaid bills are settled instantly after successful payment.'}
          </p>
        </div>
      </div>

      {toast && (
        <div className="elec-toast" role="status">
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}

export default ElectricityPage;
