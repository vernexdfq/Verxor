import { useEffect, useRef, useState } from 'react';
export type PromoBanner = {
  id: string;
  title: string;
  image: string;
  destination: string;
  action: string;
};

type PromoCarouselProps = {
  items: PromoBanner[];
  onSelect: (item: PromoBanner) => void;
  label?: string;
  autoPlayMs?: number;
};

export function PromoCarousel({
  items,
  onSelect,
  label = 'Featured',
  autoPlayMs = 5000,
}: PromoCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const pauseUntil = useRef(0);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return;
      const next = (active + 1) % items.length;
      railRef.current?.children[next]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      setActive(next);
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [active, autoPlayMs, items.length]);

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const first = rail.firstElementChild as HTMLElement | null;
    if (!first) return;
    const width = first.getBoundingClientRect().width + 12;
    const next = Math.max(0, Math.min(items.length - 1, Math.round(rail.scrollLeft / width)));
    setActive(next);
  };

  if (!items.length) return null;

  return (
    <section className="promo-carousel" aria-label={label}>
      <div
        className="promo-carousel-rail"
        ref={railRef}
        onScroll={handleScroll}
        onTouchStart={() => {
          pauseUntil.current = Date.now() + 9000;
        }}
      >
        {items.map((item) => (
          <button
            className="promo-carousel-slide"
            type="button"
            key={item.id}
            onClick={() => onSelect(item)}
            aria-label={item.title}
          >
            <img src={item.image} alt="" width="1200" height="480" loading="lazy" />
            <img className="promo-carousel-logo" src="/brand/verxor-logo.svg" alt="Verxor" width="34" height="34" />
          </button>
        ))}
      </div>

      {items.length > 1 ? (
        <div className="promo-carousel-dots" aria-label="Carousel position">
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={index === active ? 'is-active' : ''}
              aria-label={'Go to ' + item.title}
              onClick={() => {
                pauseUntil.current = Date.now() + 9000;
                railRef.current?.children[index]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                  inline: 'start',
                });
                setActive(index);
              }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
