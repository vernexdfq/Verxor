'use client';

import { useEffect, useState } from 'react';

const ECOSYSTEM_SLIDES = [
  'YOUR COMPLETE DIGITAL ECOSYSTEM',
  'CONNECT · VERIFY · GROW',
  'BUILT FOR MODERN USERS',
] as const;

/**
 * Single clean auto-rotating ecosystem pill above the trusted badge.
 * No overlapping absolute text — matches a bold, balanced TNXVERIFY-style hero.
 */
export function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ECOSYSTEM_SLIDES.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mk-hero-rotators" aria-live="polite">
      <div className="mk-eco-rotator" key={ECOSYSTEM_SLIDES[index]}>
        <span className="mk-eco-rotator-item is-active">{ECOSYSTEM_SLIDES[index]}</span>
      </div>
    </div>
  );
}
