'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './virtual-card-page.css';

type Props = { onBack: () => void; session: AuthSession };

export function VirtualCardPage({ onBack, session }: Props) {
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const name = session.name?.trim() || 'YOUR NAME';

  return (
    <main className="vc-page">
      <header className="vc-header">
        <button type="button" className="vc-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={19} />
        </button>
        <div>
          <span className="vc-eyebrow">VERXOR CARDS</span>
          <h1>Virtual card</h1>
        </div>
        <span className="vc-header-icon"><CreditCard size={20} /></span>
      </header>

      <section className="vc-hero">
        <div className="vc-hero-copy">
          <span className="vc-status"><span /> USD · INTERNATIONAL</span>
          <h2>Pay globally.<br />Stay in control.</h2>
          <p>A USD virtual Mastercard for online subscriptions, apps, and international checkout.</p>
        </div>
        <div className="vc-card" aria-label="Illustrative virtual Mastercard preview">
          <div className="vc-card-top"><span>VERXOR</span><span className="vc-chip"><i /></span></div>
          <div className="vc-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; 2048</div>
          <div className="vc-card-bottom"><div><small>CARDHOLDER</small><strong>{name.toUpperCase()}</strong></div><span className="vc-mastercard"><i /><i /></span></div>
          <span className="vc-card-preview-label">ILLUSTRATIVE PREVIEW</span>
        </div>
        <div className="vc-hero-foot"><ShieldCheck size={15} /> Card issuance and live controls connect after verification setup.</div>
      </section>

      <section className="vc-kyc-card">
        <div className="vc-kyc-icon"><LockKeyhole size={20} /></div>
        <div className="vc-kyc-content">
          <div className="vc-kyc-top"><span className="vc-required">VERIFICATION REQUIRED</span><span className="vc-tier">TIER 3</span></div>
          <h2>Verify your identity to get a card</h2>
          <p>Complete Tier 3 KYC before a USD card can be issued. Your verification status will appear here once it’s connected.</p>
          <button className="vc-secondary-button" type="button" onClick={() => setRequirementsOpen(!requirementsOpen)} aria-expanded={requirementsOpen}>
            {requirementsOpen ? 'Hide requirements' : 'View requirements'} <ChevronDown size={16} className={requirementsOpen ? 'vc-chevron-open' : ''} />
          </button>
          {requirementsOpen && (
            <div className="vc-requirements">
              <div><Check size={15} /><span>Complete the required identity verification.</span></div>
              <div><Check size={15} /><span>Wait for your verification status to be confirmed.</span></div>
              <div><Check size={15} /><span>After approval, card setup and USD funding options can be enabled.</span></div>
              <p>This front-end preview does not collect or submit identity documents or personal ID numbers.</p>
            </div>
          )}
        </div>
      </section>

      <section className="vc-section">
        <div className="vc-section-heading"><div><span className="vc-eyebrow">READY WHEN YOU ARE</span><h2>Built for online payments</h2></div><Globe2 size={19} /></div>
        <div className="vc-benefit-list">
          <article><span className="vc-benefit-icon"><Globe2 size={18} /></span><div><strong>International checkout</strong><small>Use your card for eligible online merchants worldwide.</small></div><ArrowRight size={16} /></article>
          <article><span className="vc-benefit-icon"><Wallet size={18} /></span><div><strong>Fund in USD</strong><small>Review the funding amount and conversion details before confirming.</small></div><ArrowRight size={16} /></article>
          <article><span className="vc-benefit-icon"><ShieldCheck size={18} /></span><div><strong>Controls in your hands</strong><small>Card details, freeze controls, and activity after issuance.</small></div><ArrowRight size={16} /></article>
        </div>
      </section>

      <section className="vc-preview-panel">
        <div className="vc-preview-heading"><span className="vc-preview-icon"><Sparkles size={17} /></span><div><strong>Card controls preview</strong><small>Illustrative only · no live card is connected</small></div></div>
        <button type="button" className="vc-preview-action" onClick={() => setPreviewOpen(!previewOpen)} aria-expanded={previewOpen}>
          {previewOpen ? 'Close preview' : 'Explore controls'} <ArrowRight size={16} />
        </button>
        {previewOpen && <div className="vc-controls-preview">
          <div className="vc-control-row"><div><strong>Card details</strong><small>{showDetails ? '•••• •••• •••• ••••' : 'Hidden until a card is issued'}</small></div><button type="button" className="vc-eye-button" onClick={() => setShowDetails(!showDetails)} aria-label={showDetails ? 'Hide preview details' : 'Show preview details'}>{showDetails ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <div className="vc-control-row"><div><strong>Freeze card</strong><small>Available after card issuance</small></div><span className="vc-disabled-toggle" aria-hidden="true"><i /></span></div>
          <div className="vc-control-note"><LockKeyhole size={14} /> Preview controls don’t reveal real card data or change an account.</div>
        </div>}
      </section>

      <footer className="vc-footer-note">Fees, exchange rate, and funding total will be shown before you confirm setup. No card has been issued in this preview.</footer>
    </main>
  );
}
