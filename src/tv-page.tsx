'use client';

import { ArrowLeft, Monitor, Tv } from 'lucide-react';
import './tv-page.css';

export function TvPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="tv-page">
      <header className="tv-topbar">
        <button type="button" className="tv-icon-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="tv-title-wrap">
          <h1>TV Subscription</h1>
          <p>DSTV, GOtv and StarTimes</p>
        </div>
        <button type="button" className="tv-icon-btn tv-icon-accent" aria-label="TV">
          <Monitor size={18} strokeWidth={2.1} />
        </button>
      </header>

      <div className="tv-coming-soon">
        <div className="tv-coming-icon" aria-hidden>
          <Tv size={28} strokeWidth={1.8} />
        </div>
        <h2>Coming soon</h2>
        <p>Cable TV subscriptions for DSTV, GOtv and StarTimes will be available here shortly.</p>
      </div>
    </div>
  );
}

export default TvPage;
