/**
 * Verxor Number Rental — entry screen only.
 * The old Call.com-style workspace (calls / messages / wallet / buy flow /
 * line settings) has been removed. Each rental flow will be built as its own
 * page, one by one. Wire pages via the onOpen callback.
 */
'use client';

import {
  ArrowLeft, ChevronRight, Globe, Hash, Phone, Shield, Smartphone,
} from 'lucide-react';
import './rental-page.css';

export type RentalEntryId = 'my-numbers' | 'single' | 'all-platform' | 'two-way-line';

export function RentalPage({
  onBack,
  onOpenEsim,
  onOpen,
}: {
  onBack: () => void;
  onOpenEsim?: () => void;
  onOpen?: (id: RentalEntryId) => void;
}) {
  const open = (id: RentalEntryId) => () => onOpen?.(id);

  return (
    <div className="rl-page">
      <header className="rl-header">
        <button type="button" className="rl-icon" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1>Number Rental</h1>
        <span className="rl-spacer" />
      </header>

      <main className="rl-home">
        <div className="rl-home-intro">
          <span className="rl-home-eyebrow">VERXOR RENTALS</span>
          <h2>Choose your number</h2>
          <p>Simple, secure number access for the way you connect.</p>
        </div>

        <button type="button" className="rl-my-numbers-cta" onClick={open('my-numbers')}>
          <span className="rl-my-numbers-icon"><Hash size={18} /></span>
          <span><strong>My Numbers</strong><small>View your active rentals and messages</small></span>
          <ChevronRight size={19} />
        </button>

        <div className="rl-rental-options">
          <button type="button" className="rl-rental-option" onClick={open('single')}>
            <span className="rl-rental-option-icon"><Smartphone size={21} /></span>
            <span className="rl-rental-option-copy"><strong>Single-Platform Rental</strong><small>Rent a number for one selected platform</small></span>
            <span className="rl-rental-option-action">Get started <ChevronRight size={15} /></span>
          </button>
          <button type="button" className="rl-rental-option" onClick={open('all-platform')}>
            <span className="rl-rental-option-icon"><Globe size={21} /></span>
            <span className="rl-rental-option-copy"><strong>All-Platform OTP Rental</strong><small>One number for multiple supported services</small></span>
            <span className="rl-rental-option-action">Get started <ChevronRight size={15} /></span>
          </button>
          <button type="button" className="rl-rental-option" onClick={open('two-way-line')}>
            <span className="rl-rental-option-icon"><Phone size={21} /></span>
            <span className="rl-rental-option-copy"><strong>Full Two-Way Mobile Line</strong><small>SMS and calling in a dedicated workspace</small></span>
            <span className="rl-rental-option-action">Get started <ChevronRight size={15} /></span>
          </button>
        </div>

        <p className="rl-home-footnote"><Shield size={14} /> Clear pricing. Secure access. Built around your needs.</p>
      </main>
    </div>
  );
}
