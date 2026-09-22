import { ArrowRight, Clock3, History, Smartphone } from 'lucide-react';
import { Card, SectionHeader } from './components/ui';
import type { ServiceView } from './service-pages';

export function NumbersPage({ openService }: { openService: (view: ServiceView) => void }) {
  return (
    <>
      <section className="page-intro numbers-intro">
        <p className="eyebrow">NUMBERS</p>
        <h1>Choose a number service</h1>
        <p>Use a virtual number for OTPs or rent a line for longer-term access.</p>
      </section>
      <div className="number-choice-list">
        <button className="number-choice" type="button" onClick={() => openService('virtual-numbers')}>
          <span className="number-choice-icon">
            <Smartphone size={22} />
          </span>
          <span>
            <strong>Virtual Numbers</strong>
            <small>OTP verification</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button className="number-choice" type="button" onClick={() => openService('rental')}>
          <span className="number-choice-icon">
            <Clock3 size={22} />
          </span>
          <span>
            <strong>Rent a Line</strong>
            <small>Long-term numbers</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </div>
      <SectionHeader eyebrow="ACTIVITY" title="Number history" />
      <Card className="activity-empty">
        <div className="activity-empty-icon">
          <History size={19} />
        </div>
        <strong>No number activity</strong>
        <p>Your number orders and rentals will appear here.</p>
      </Card>
    </>
  );
}
