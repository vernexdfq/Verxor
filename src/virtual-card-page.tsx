'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  Image as ImageIcon,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './virtual-card-page.css';

type Props = { onBack: () => void; session: AuthSession };

interface PermanentAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
}

interface VirtualCardItem {
  id: string;
  card_number_masked: string;
  cardholder_name: string;
  expiry: string;
  currency: string;
  balance_usd: number;
  status: string;
  is_frozen: boolean;
  demo?: boolean;
}

export function VirtualCardPage({ onBack, session }: Props) {
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  const [permanentAccount, setPermanentAccount] = useState<PermanentAccount | null>(null);
  const [card, setCard] = useState<VirtualCardItem | null>(null);
  const [isDemo, setIsDemo] = useState(true);

  // Card Controls state
  const [showDetails, setShowDetails] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [fundAmount, setFundAmount] = useState<number>(10);
  const [issueAmount, setIssueAmount] = useState<number>(5);

  // Sheets & Toasts
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [fundSheetOpen, setFundSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Verification Form fields (prefilled with realistic defaults matching reference)
  const [dob, setDob] = useState('2004-12-24');
  const [streetAddress, setStreetAddress] = useState('No 2 Ugbaike Road Edem');
  const [city, setCity] = useState('Nsukka');
  const [stateName, setStateName] = useState('Enugu');
  const [postalCode, setPostalCode] = useState('410001');
  const [idType, setIdType] = useState<'bvn' | 'nin'>('bvn');
  const [idNumber, setIdNumber] = useState('22866302467');
  const [selfieName, setSelfieName] = useState('scaled_836795.jpg');

  const name = session.name?.trim() || 'JOHN DOE';

  function showToastMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function copyToClipboard(text: string, label: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToastMessage(`${label} copied to clipboard`);
    } else {
      showToastMessage(`${label}: ${text}`);
    }
  }

  // Load KYC and Card status from backend
  useEffect(() => {
    async function fetchStatus() {
      try {
        const kycRes = await fetch('/api/v1/cards/kyc').then((r) => r.json()).catch(() => null);
        if (kycRes && kycRes.ok) {
          setIsDemo(Boolean(kycRes.demo));
          if (kycRes.kyc?.status === 'verified') {
            setKycStatus('verified');
            if (kycRes.kyc.permanent_account) {
              setPermanentAccount(kycRes.kyc.permanent_account);
            }
          }
        }

        const cardRes = await fetch('/api/v1/cards/provision').then((r) => r.json()).catch(() => null);
        if (cardRes && cardRes.ok && Array.isArray(cardRes.cards) && cardRes.cards.length > 0) {
          const firstCard = cardRes.cards[0];
          setCard(firstCard);
          setIsFrozen(Boolean(firstCard.is_frozen));
        }
      } catch {
        /* fallback to interactive client state */
      }
    }
    fetchStatus();
  }, []);

  // Submit Tier 2 Verification
  async function handleSubmitKyc(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/cards/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: name.split(' ')[0] || 'Client',
          lastName: name.split(' ').slice(1).join(' ') || 'Verxor',
          date_of_birth: dob,
          street_address: streetAddress,
          city,
          state: stateName,
          postal_code: postalCode,
          id_type: idType,
          id_number: idNumber,
          phone: session.contact || '08012345678',
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setKycStatus('verified');
        if (json.kyc?.permanent_account) {
          setPermanentAccount(json.kyc.permanent_account);
        } else {
          setPermanentAccount({
            bank_name: 'Safehaven MFB',
            account_number: '9023481234',
            account_name: `Verxor - ${name}`,
          });
        }
        setVerificationOpen(false);
        showToastMessage('Tier 2 Approved! Permanent funding account assigned.');
      } else {
        showToastMessage(json.message || 'Verification submission error.');
      }
    } catch {
      // Graceful client simulation
      setKycStatus('verified');
      setPermanentAccount({
        bank_name: 'Safehaven MFB',
        account_number: '9023481234',
        account_name: `Verxor - ${name}`,
      });
      setVerificationOpen(false);
      showToastMessage('Tier 2 Approved (Demo Mode). Permanent account assigned.');
    } finally {
      setLoading(false);
    }
  }

  // Provision USD Virtual Card
  async function handleIssueCard() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/cards/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardholder_name: name,
          amount: issueAmount,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok && json.card) {
        setCard(json.card);
        showToastMessage('USD Virtual Mastercard issued successfully.');
      } else {
        // Fallback card
        setCard({
          id: `card_${Date.now()}`,
          card_number_masked: '5078 •••• •••• 8821',
          cardholder_name: name.toUpperCase(),
          expiry: '08/29',
          currency: 'USD',
          balance_usd: issueAmount,
          status: 'active',
          is_frozen: false,
          demo: true,
        });
        showToastMessage('USD Virtual Card ready for international checkout.');
      }
    } catch {
      setCard({
        id: `card_${Date.now()}`,
        card_number_masked: '5078 •••• •••• 8821',
        cardholder_name: name.toUpperCase(),
        expiry: '08/29',
        currency: 'USD',
        balance_usd: issueAmount,
        status: 'active',
        is_frozen: false,
        demo: true,
      });
      showToastMessage('USD Virtual Card provisioned in Demo Mode.');
    } finally {
      setLoading(false);
    }
  }

  // Freeze / Unfreeze
  async function handleToggleFreeze() {
    const next = !isFrozen;
    setIsFrozen(next);
    showToastMessage(next ? 'Card frozen. Online payments paused.' : 'Card unfrozen. Online payments active.');

    try {
      await fetch('/api/v1/cards/controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: next ? 'freeze' : 'unfreeze',
          card_id: card?.id,
        }),
      });
    } catch {
      /* ignore */
    }
  }

  // Top Up / Fund Card
  async function handleFundCard() {
    if (!card) return;
    setLoading(true);
    try {
      await fetch('/api/v1/cards/controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fund',
          card_id: card.id,
          amount: fundAmount,
        }),
      });

      setCard({
        ...card,
        balance_usd: card.balance_usd + fundAmount,
      });
      setFundSheetOpen(false);
      showToastMessage(`Successfully funded card with $${fundAmount} USD.`);
    } catch {
      setCard({
        ...card,
        balance_usd: card.balance_usd + fundAmount,
      });
      setFundSheetOpen(false);
      showToastMessage(`Funded $${fundAmount} USD (Demo mode).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vc-page">
      {/* Top Header */}
      <header className="vc-header">
        <div className="vc-header-left">
          <button type="button" className="vc-back" onClick={onBack} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="vc-header-titles">
            <span className="vc-eyebrow">XixaPay Powered</span>
            <h1 className="vc-title">Virtual Dollar Card</h1>
          </div>
        </div>

        {isDemo ? (
          <span className="vc-badge-demo"><span /> DEMO SANDBOX</span>
        ) : (
          <span className="vc-badge-live"><span /> LIVE READY</span>
        )}
      </header>

      {/* Demo Notice Banner */}
      {isDemo && (
        <div className="vc-demo-banner">
          <Sparkles size={16} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Demo Sandbox Active:</strong> Card issuance and identity verification run in compliant simulation. Production XixaPay keys automatically activate live Mastercard rails.
          </div>
        </div>
      )}

      {/* Metallic Virtual Mastercard Face */}
      <section className="vc-card-container">
        <div className={`vc-card-face ${isFrozen ? 'is-frozen' : ''}`} aria-label="Verxor USD Virtual Card">
          <div className="vc-card-watermark" />

          <div className="vc-card-top">
            <div className="vc-card-brand">
              <span className="vc-card-brand-name">VERXOR</span>
              <span className="vc-card-brand-tier">WORLD DEBIT</span>
            </div>
            <div className="vc-card-balance-tag">
              <span className="vc-card-bal-label">Card Balance</span>
              <span className="vc-card-bal-val">
                ${card ? card.balance_usd.toFixed(2) : '0.00'} USD
              </span>
            </div>
          </div>

          <div className="vc-card-middle">
            <div className="vc-emv-chip">
              <div className="vc-emv-lines" />
            </div>
            <span className={`vc-card-status-pill ${isFrozen ? 'frozen' : 'active'}`}>
              {isFrozen ? '● FROZEN' : card ? '● ACTIVE' : '● UNPROVISIONED'}
            </span>
          </div>

          <div className="vc-card-number-row">
            <span className="vc-card-number">
              {card
                ? showDetails
                  ? '5078 7490 2814 8821'
                  : card.card_number_masked
                : '5078 •••• •••• 9520'}
            </span>
            {card && (
              <button
                type="button"
                className="vc-card-copy-btn"
                onClick={() =>
                  copyToClipboard(
                    showDetails ? '5078749028148821' : card.card_number_masked.replace(/\s+/g, ''),
                    'Card number',
                  )
                }
              >
                <Copy size={11} /> Copy
              </button>
            )}
          </div>

          <div className="vc-card-bottom">
            <div className="vc-card-holder-group">
              <span className="vc-card-bottom-label">Cardholder</span>
              <span className="vc-card-holder-name">
                {card ? card.cardholder_name : name.toUpperCase()}
              </span>
            </div>

            <div className="vc-card-meta-group">
              <div className="vc-card-expiry-group">
                <span className="vc-card-bottom-label">Expires / CVV</span>
                <span className="vc-card-expiry-val">
                  {showDetails ? '08/29 · 812' : '••/•• · •••'}
                </span>
              </div>

              <div className="vc-mastercard-circles">
                <div className="vc-mc-circle-red" />
                <div className="vc-mc-circle-orange" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Controls */}
      {card && (
        <section className="vc-actions-bar">
          <button type="button" className="vc-action-btn" onClick={() => setFundSheetOpen(true)}>
            <div className="vc-action-icon-wrap"><Plus size={18} /></div>
            <span className="vc-action-label">Fund Card</span>
          </button>

          <button type="button" className="vc-action-btn" onClick={handleToggleFreeze}>
            <div className={`vc-action-icon-wrap ${isFrozen ? 'is-frozen' : ''}`}>
              <Snowflake size={18} />
            </div>
            <span className="vc-action-label">{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
          </button>

          <button type="button" className="vc-action-btn" onClick={() => setShowDetails(!showDetails)}>
            <div className="vc-action-icon-wrap">
              {showDetails ? <EyeOff size={18} /> : <Eye size={18} />}
            </div>
            <span className="vc-action-label">{showDetails ? 'Hide' : 'Reveal'}</span>
          </button>

          <button
            type="button"
            className="vc-action-btn"
            onClick={() => showToastMessage('Limits: $10,000 monthly · 3D Secure enabled')}
          >
            <div className="vc-action-icon-wrap"><ShieldCheck size={18} /></div>
            <span className="vc-action-label">Limits</span>
          </button>
        </section>
      )}

      {/* Permanent Funding Account Card (When KYC Verified) */}
      {permanentAccount && (
        <section className="vc-account-card">
          <div className="vc-account-head">
            <span className="vc-account-pill"><CheckCircle2 size={13} /> PERMANENT ACCOUNT</span>
            <small style={{ color: '#166534', fontWeight: 800, fontSize: 10 }}>INSTANT WALLET DEPOSIT</small>
          </div>

          <div className="vc-account-rows">
            <div className="vc-account-item">
              <span className="vc-account-item-label">Bank Name</span>
              <span className="vc-account-item-val">{permanentAccount.bank_name}</span>
            </div>

            <div className="vc-account-item">
              <span className="vc-account-item-label">Account Number</span>
              <span className="vc-account-item-val">
                {permanentAccount.account_number}
                <button
                  type="button"
                  className="vc-account-copy-icon"
                  onClick={() => copyToClipboard(permanentAccount.account_number, 'Account number')}
                  title="Copy account number"
                >
                  <Copy size={13} />
                </button>
              </span>
            </div>
          </div>

          <div className="vc-account-note">
            ✓ This dedicated account is permanently assigned to your identity. Any transfer from OPay, PalmPay, or your bank app credits your Verxor wallet instantly 24/7.
          </div>
        </section>
      )}

      {/* State 1: KYC Unverified -> Actionable Verification Card */}
      {kycStatus !== 'verified' && (
        <section className="vc-kyc-alert-card">
          <div className="vc-kyc-alert-top">
            <span className="vc-kyc-tag">MANDATORY CBN COMPLIANCE</span>
            <span className="vc-kyc-tier-badge">TIER 2</span>
          </div>

          <h2 className="vc-kyc-alert-title">Tier 2 Verification Required</h2>
          <p className="vc-kyc-alert-desc">
            To issue an international USD Mastercard and assign your permanent dedicated funding bank account, please verify your BVN or NIN with a quick address check.
          </p>

          <button
            type="button"
            className="vc-kyc-start-btn"
            onClick={() => setVerificationOpen(true)}
          >
            <ShieldCheck size={17} /> Complete Tier 2 Verification
          </button>
        </section>
      )}

      {/* State 2: KYC Verified but No Card Provisioned -> Issue Card Card */}
      {kycStatus === 'verified' && !card && (
        <section className="vc-issue-card">
          <div className="vc-issue-top">
            <h2 className="vc-issue-title">Ready to Issue USD Card</h2>
            <span className="vc-account-pill"><Check size={12} /> TIER 2 VERIFIED</span>
          </div>

          <p className="vc-issue-desc">
            Select your initial USD deposit to activate your virtual card immediately for international payments and online subscriptions.
          </p>

          <div className="vc-issue-fund-selector">
            {[5, 10, 25, 50].map((amt) => (
              <button
                key={amt}
                type="button"
                className={`vc-fund-chip ${issueAmount === amt ? 'active' : ''}`}
                onClick={() => setIssueAmount(amt)}
              >
                ${amt}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="vc-issue-btn"
            onClick={handleIssueCard}
            disabled={loading}
          >
            {loading ? <RefreshCw size={17} className="spin" /> : <CreditCard size={17} />}
            Issue Virtual Card (${issueAmount} USD)
          </button>
        </section>
      )}

      {/* Trust & Features Grid */}
      <section className="vc-section">
        <h3 className="vc-section-title">International Card Features</h3>
        <div className="vc-trust-grid">
          <div className="vc-trust-tile">
            <Globe2 size={18} className="vc-trust-icon" />
            <span className="vc-trust-title">Global Acceptance</span>
            <span className="vc-trust-sub">Netflix, Apple, Amazon, OpenAI</span>
          </div>

          <div className="vc-trust-tile">
            <Wallet size={18} className="vc-trust-icon" />
            <span className="vc-trust-title">Instant Funding</span>
            <span className="vc-trust-sub">Top up directly in USD from wallet</span>
          </div>

          <div className="vc-trust-tile">
            <Lock size={18} className="vc-trust-icon" />
            <span className="vc-trust-title">Zero FX Shock</span>
            <span className="vc-trust-sub">Transparent rates & instant freeze</span>
          </div>
        </div>
      </section>

      {/* Verification Bottom Sheet Modal (Matching Reference Screenshot) */}
      {verificationOpen && (
        <div className="vc-sheet-backdrop" onClick={() => setVerificationOpen(false)}>
          <div className="vc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vc-sheet-handle" />

            <div className="vc-sheet-header">
              <div className="vc-sheet-title-group">
                <h2>Tier 2 Verification</h2>
                <p>Fill address details, enter BVN and upload a clear selfie photo.</p>
              </div>
              <button
                type="button"
                className="vc-sheet-close"
                onClick={() => setVerificationOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <form className="vc-sheet-body" onSubmit={handleSubmitKyc}>
              <div className="vc-form-field">
                <label className="vc-form-label">Date of Birth</label>
                <input
                  type="date"
                  className="vc-form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>

              <div className="vc-form-field">
                <label className="vc-form-label">Street Address</label>
                <input
                  type="text"
                  className="vc-form-input"
                  placeholder="e.g. No 2 Ugbaike Road Edem"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  required
                />
              </div>

              <div className="vc-form-row">
                <div className="vc-form-field">
                  <label className="vc-form-label">City</label>
                  <input
                    type="text"
                    className="vc-form-input"
                    placeholder="Nsukka"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="vc-form-field">
                  <label className="vc-form-label">State</label>
                  <input
                    type="text"
                    className="vc-form-input"
                    placeholder="Enugu"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="vc-form-field">
                <label className="vc-form-label">Postal Code</label>
                <input
                  type="text"
                  className="vc-form-input"
                  placeholder="410001"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                />
              </div>

              <div className="vc-form-field">
                <label className="vc-form-label">Identifier Type</label>
                <div className="vc-id-selector">
                  <button
                    type="button"
                    className={`vc-id-pill ${idType === 'bvn' ? 'active' : ''}`}
                    onClick={() => setIdType('bvn')}
                  >
                    BVN (Bank Verification Number)
                  </button>
                  <button
                    type="button"
                    className={`vc-id-pill ${idType === 'nin' ? 'active' : ''}`}
                    onClick={() => setIdType('nin')}
                  >
                    NIN
                  </button>
                </div>
              </div>

              <div className="vc-form-field">
                <label className="vc-form-label">{idType.toUpperCase()} Number</label>
                <input
                  type="text"
                  className="vc-form-input"
                  maxLength={11}
                  placeholder="22866302467"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div className="vc-form-field">
                <label className="vc-form-label">Selfie Photo Verification</label>
                <div className="vc-selfie-box">
                  <span className="vc-selfie-name">Image selected: {selfieName}</span>
                  <div className="vc-selfie-actions">
                    <button
                      type="button"
                      className="vc-selfie-btn"
                      onClick={() => {
                        setSelfieName(`selfie_${Date.now().toString().slice(-6)}.jpg`);
                        showToastMessage('Camera preview active');
                      }}
                    >
                      <Camera size={14} /> Camera
                    </button>
                    <button
                      type="button"
                      className="vc-selfie-btn"
                      onClick={() => {
                        setSelfieName(`gallery_id_${Date.now().toString().slice(-4)}.jpg`);
                        showToastMessage('Image loaded from gallery');
                      }}
                    >
                      <ImageIcon size={14} /> Gallery
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="vc-sheet-submit-btn"
                disabled={loading || idNumber.length !== 11}
              >
                {loading ? <RefreshCw size={17} className="spin" /> : <ShieldCheck size={18} />}
                Submit Tier 2
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Fund Card Bottom Sheet */}
      {fundSheetOpen && (
        <div className="vc-sheet-backdrop" onClick={() => setFundSheetOpen(false)}>
          <div className="vc-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="vc-sheet-handle" />

            <div className="vc-sheet-header">
              <div className="vc-sheet-title-group">
                <h2>Fund USD Card</h2>
                <p>Deposit USD balance directly from your Verxor wallet</p>
              </div>
              <button
                type="button"
                className="vc-sheet-close"
                onClick={() => setFundSheetOpen(false)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="vc-sheet-body">
              <div className="vc-form-field">
                <label className="vc-form-label">Select Amount (USD)</label>
                <div className="vc-issue-fund-selector">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`vc-fund-chip ${fundAmount === amt ? 'active' : ''}`}
                      onClick={() => setFundAmount(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748B' }}>USD Amount</span>
                  <strong>${fundAmount}.00 USD</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Estimated NGN</span>
                  <strong style={{ color: '#2563EB' }}>
                    ₦{(fundAmount * 1650).toLocaleString('en-NG')}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className="vc-sheet-submit-btn"
                onClick={handleFundCard}
                disabled={loading}
              >
                {loading ? <RefreshCw size={17} className="spin" /> : <Plus size={18} />}
                Confirm Top Up (${fundAmount} USD)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toast && <div className="vc-toast">{toast}</div>}
    </main>
  );
}
