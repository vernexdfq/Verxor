'use client';

import { useEffect, useState } from 'react';

const SLIDES = ['Connect', 'Verify', 'Grow'] as const;

/** Tiny auto-rotating horizontal slide above the trusted badge. */
export function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mk-hero-rotator" aria-live="polite">
      <span className="mk-hero-rotator-dot" aria-hidden="true" />
      <div className="mk-hero-rotator-track">
        {SLIDES.map((label, i) => (
          <span
            key={label}
            className={'mk-hero-rotator-item' + (i === index ? ' is-active' : '')}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
