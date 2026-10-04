'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Wallet,
  X,
} from 'lucide-react';
import './exam-pin-page.css';

type ExamProduct = {
  id: string;
  name: string;
  board: 'JAMB' | 'WAEC' | 'NECO';
  tag: string;
  price: number;
  available: number;
};

/** Mock catalog — replaced by API when wired */
const MOCK_PRODUCTS: ExamProduct[] = [
  { id: 'jamb-de', name: 'JAMB DE', board: 'JAMB', tag: 'Educational Voucher', price: 7345, available: 20 },
  { id: 'jamb-utme-mock', name: 'JAMB UTME MOCK', board: 'JAMB', tag: 'Educational Voucher', price: 11245, available: 20 },
  { id: 'jamb-utme', name: 'JAMB UTME', board: 'JAMB', tag: 'Educational Voucher', price: 9295, available: 19 },
  { id: 'neco-checker', name: 'NECO Result Checker', board: 'NECO', tag: 'Educational Voucher', price: 1625, available: 92 },
  { id: 'waec-checker', name: 'WAEC Result Checker', board: 'WAEC', tag: 'Educational Voucher', price: 4810, available: 12 },
];

function BoardMark({ board }: { board: ExamProduct['board'] }) {
  const cls =
    board === 'JAMB' ? 'exam-mark jamb' : board === 'WAEC' ? 'exam-mark waec' : 'exam-mark neco';
  return (
    <span className={cls} aria-hidden>
      {board === 'JAMB' ? 'JB' : board === 'WAEC' ? 'WC' : 'NC'}
    </span>
  );
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString('en-NG')}`;
}

type Props = {
  onBack: () => void;
};

export function ExamPinPage({ onBack }: Props) {
  const [products] = useState(MOCK_PRODUCTS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_PRODUCTS[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? products[0],
    [products, selectedId],
  );

  const total = (selected?.price ?? 0) * qty;
  const maxQty = Math.min(10, selected?.available ?? 1);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function openConfirm() {
    if (!selected) return;
    if (selected.available < 1) {
      flash('This voucher is currently out of stock.');
      return;
    }
    setConfirmOpen(true);
  }

  function goToPin() {
    setConfirmOpen(false);
    setPin('');
    setPinOpen(true);
  }

  function handlePinDigit(d: string) {
    if (pin.length >= 4 || busy) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      window.setTimeout(() => void submitPurchase(next), 120);
    }
  }

  function handlePinDelete() {
    setPin((p) => p.slice(0, -1));
  }

  async function submitPurchase(_enteredPin: string) {
    setBusy(true);
    // Mock fulfillment — wire to API later
    await new Promise((r) => setTimeout(r, 900));
    setBusy(false);
    setPinOpen(false);
    setPin('');
    // Demo: always show insufficient for now (empty wallet)
    flash('Insufficient wallet balance.');
  }

  return (
    <div className="exam-page">
      <header className="exam-header">
        <button type="button" className="exam-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2.2} />
        </button>
        <div className="exam-header-text">
          <h1>Exam PIN</h1>
          <p>WAEC · NECO · JAMB vouchers</p>
        </div>
        <button
          type="button"
          className="exam-icon-btn"
          onClick={() => flash('Catalog refreshed')}
          aria-label="Refresh"
        >
          <RefreshCw size={18} strokeWidth={2.2} />
        </button>
      </header>

      <div className="exam-scroll">
        <div className="exam-hero">
          <span className="exam-hero-badge">VERXOR Exam PIN</span>
          <strong>Buy exam vouchers instantly</strong>
          <p>WAEC, NECO and JAMB result checkers & registration PINs.</p>
        </div>

        <div className="exam-section-head">
          <h2>Choose Exam PIN</h2>
          <span>Tap to select</span>
        </div>

        <div className="exam-list">
          {products.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                className={`exam-card ${active ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(p.id);
                  setQty(1);
                }}
              >
                <BoardMark board={p.board} />
                <span className="exam-card-body">
                  <strong>{p.name}</strong>
                  <small>{p.tag}</small>
                  <em className={p.available > 0 ? 'in-stock' : 'out'}>
                    {p.available > 0 ? `${p.available} available` : 'Out of stock'}
                  </em>
                </span>
                <span className="exam-card-price">{formatNaira(p.price)}</span>
                <span className={`exam-radio ${active ? 'on' : ''}`} aria-hidden>
                  {active ? <span className="exam-radio-dot" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="exam-footer">
        <div className="exam-qty">
          <ShoppingBag size={16} strokeWidth={2} />
          <div className="exam-qty-copy">
            <strong>Quantity</strong>
            <small>How many PINs</small>
          </div>
          <div className="exam-stepper">
            <button
              type="button"
              className="exam-step"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
            <span className="exam-step-val">{qty}</span>
            <button
              type="button"
              className="exam-step"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="Increase quantity"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="exam-pay-row">
          <div className="exam-total">
            <small>Total payment</small>
            <strong>{formatNaira(total)}</strong>
          </div>
          <button type="button" className="exam-cta" onClick={openConfirm} disabled={!selected}>
            Buy Exam PIN
          </button>
        </div>
      </div>

      {confirmOpen && selected ? (
        <div className="exam-modal-backdrop" role="dialog" aria-modal="true">
          <div className="exam-modal">
            <button type="button" className="exam-modal-close" onClick={() => setConfirmOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <h2>Confirm Purchase</h2>

            <div className="exam-confirm-hero">
              <GraduationCap size={28} strokeWidth={1.8} />
              <p>You are buying</p>
              <strong>{selected.name}</strong>
              <span>Quantity: {qty}</span>
            </div>

            <div className="exam-confirm-rows">
              <div className="exam-confirm-row">
                <span>
                  <GraduationCap size={14} /> Exam PIN
                </span>
                <strong>{selected.name}</strong>
              </div>
              <div className="exam-confirm-row">
                <span>
                  <ShoppingBag size={14} /> Quantity
                </span>
                <strong>{qty}</strong>
              </div>
              <div className="exam-confirm-row">
                <span>
                  <Wallet size={14} /> Total Amount
                </span>
                <strong>{formatNaira(total)}</strong>
              </div>
            </div>

            <div className="exam-warn">
              Your wallet will be debited immediately. If fulfillment fails, your money is refunded automatically.
            </div>

            <div className="exam-modal-actions">
              <button type="button" className="exam-btn-ghost" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="exam-btn-pay" onClick={goToPin}>
                Pay {formatNaira(total)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pinOpen ? (
        <div className="exam-modal-backdrop" role="dialog" aria-modal="true">
          <div className="exam-modal exam-pin-modal">
            <button
              type="button"
              className="exam-modal-close"
              onClick={() => {
                if (!busy) {
                  setPinOpen(false);
                  setPin('');
                }
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h2>Enter Transaction PIN</h2>
            <p className="exam-pin-sub">Confirm payment of {formatNaira(total)}</p>

            <div className="exam-pin-boxes" aria-label="PIN digits">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`exam-pin-box ${pin.length > i ? 'filled' : ''} ${pin.length === i ? 'active' : ''}`}>
                  {pin.length > i ? <span className="exam-pin-dot" /> : null}
                </div>
              ))}
            </div>

            {busy ? (
              <div className="exam-processing">Processing…</div>
            ) : (
              <div className="exam-keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button key={d} type="button" className="exam-key" onClick={() => handlePinDigit(d)}>
                    {d}
                  </button>
                ))}
                <div aria-hidden />
                <button type="button" className="exam-key" onClick={() => handlePinDigit('0')}>
                  0
                </button>
                <button type="button" className="exam-key delete" onClick={handlePinDelete} aria-label="Delete">
                  ⌫
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="exam-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
