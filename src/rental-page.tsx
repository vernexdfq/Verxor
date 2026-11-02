import { ArrowLeft, ChevronRight, Globe, Hash, Phone, Shield, Smartphone } from 'lucide-react';
import './rental-page.css';

export function RentalPage({ onBack, onOpenEsim }: { onBack: () => void; onOpenEsim?: () => void }) {
  return (
    <div className="rlp">
      <header className="rlp-header">
        <button type="button" className="rlp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className="rlp-title">Number Rental</span>
        <span className="rlp-headspace" />
      </header>

      <main className="rlp-body">
        <section className="rlp-intro">
          <span className="rlp-eyebrow">VERXOR RENTALS</span>
          <h2>Choose your number</h2>
          <p>Simple, secure number access for the way you connect.</p>
        </section>

        {/* My Numbers — bold CTA */}
        <button type="button" className="rlp-cta">
          <span className="rlp-cta-icon"><Hash size={20} /></span>
          <span className="rlp-cta-copy">
            <strong>My Numbers</strong>
            <small>View your active rentals and messages</small>
          </span>
          <ChevronRight size={20} />
        </button>

        <section className="rlp-options">
          <button type="button" className="rlp-option">
            <span className="rlp-option-icon"><Smartphone size={20} /></span>
            <span className="rlp-option-copy">
              <strong>Single-Platform Rental</strong>
              <small>Rent a number for one selected platform</small>
            </span>
            <span className="rlp-option-action">Get started <ChevronRight size={15} /></span>
          </button>

          <button type="button" className="rlp-option">
            <span className="rlp-option-icon"><Globe size={20} /></span>
            <span className="rlp-option-copy">
              <strong>All-Platform OTP Rental</strong>
              <small>One number for multiple supported services</small>
            </span>
            <span className="rlp-option-action">Get started <ChevronRight size={15} /></span>
          </button>

          <button type="button" className="rlp-option">
            <span className="rlp-option-icon"><Phone size={20} /></span>
            <span className="rlp-option-copy">
              <strong>Full Two-Way Mobile Line</strong>
              <small>Talk and text on a dedicated line</small>
            </span>
            <span className="rlp-option-action">Get started <ChevronRight size={15} /></span>
          </button>
        </section>

        <p className="rlp-footnote">
          <Shield size={14} />
          Clear pricing. Secure access. Built around your needs.
        </p>
      </main>
    </div>
  );
}
