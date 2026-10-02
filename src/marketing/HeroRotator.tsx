'use client';

import { useEffect, useState } from 'react';

const ECOSYSTEM_SLIDES = [
  'YOUR COMPLETE DIGITAL ECOSYSTEM',
  'CONNECT · VERIFY · GROW',
  'BUILT FOR MODERN USERS',
] as const;

const WORD_SLIDES = ['Connect', 'Verify', 'Grow'] as const;

/**
 * Two tiny auto-rotating lines above the trusted badge:
 * 1) Ecosystem phrase (horizontal slide)
 * 2) Connect / Verify / Grow with active dot
 */
export function HeroRotator() {
  const [ecoIndex, setEcoIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const ecoId = window.setInterval(() => {
      setEcoIndex((current) => (current + 1) % ECOSYSTEM_SLIDES.length);
    }, 3200);
    const wordId = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % WORD_SLIDES.length);
    }, 2400);
    return () => {
      window.clearInterval(ecoId);
      window.clearInterval(wordId);
    };
  }, []);

  return (
    <div className="mk-hero-rotators" aria-live="polite">
      <div className="mk-eco-rotator">
        {ECOSYSTEM_SLIDES.map((label, i) => (
          <span
            key={label}
            className={'mk-eco-rotator-item' + (i === ecoIndex ? ' is-active' : '')}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mk-hero-rotator">
        <span className="mk-hero-rotator-dot" aria-hidden="true" />
        <div className="mk-hero-rotator-track">
          {WORD_SLIDES.map((label, i) => (
            <span
              key={label}
              className={'mk-hero-rotator-item' + (i === wordIndex ? ' is-active' : '')}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
