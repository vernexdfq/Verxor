'use client';

/**
 * Telegram — Premium & Stars purchase page for Verxor.
 *
 * Screen flow (single page):
 *  - Compact top bar with wallet balance
 *  - Promo strip carousel (same treatment as Rent-for-SMS)
 *  - Segmented Stars / Premium toggle (Premium is the default tab)
 *  - Per-tab title block and honest setup state until selection and
 *    checkout land in the next steps
 */

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Send,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './telegram-page.css';

type Tab = 'premium' | 'stars';

type PromoSlide = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  tab?: Tab;
  image: string;
};

/* Promo strip — photo carousel, same treatment as the rental page. */
export const TELEGRAM_PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'promo-1',
    badge: 'TELEGRAM PREMIUM',
    title: 'Premium for any username',
    subtitle: '3, 6, or 12 months of Telegram Premium, delivered right inside Telegram.',
    ctaText: 'Get Premium',
    tab: 'premium',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-2',
    badge: 'TELEGRAM STARS',
    title: 'Stars in seconds',
    subtitle: 'Top up Stars for yourself or send them to a friend.',
    ctaText: 'Get Stars',
    tab: 'stars',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=85',
  },
  {
    id: 'promo-3',
    badge: 'VERXOR WALLET',
    title: 'Pay straight from your wallet',
    subtitle: 'One tap at checkout. No card details needed.',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=85',
  },
];

const TABS: { id: Tab; label: string; hint: string; icon: typeof Crown }[] = [
  { id: 'premium', label: 'Premium', hint: 'Gift by username', icon: Crown },
  { id: 'stars', label: 'Stars', hint: 'Top up balance', icon: Star },
];

/* ---------------- component ---------------- */

export function TelegramPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session: AuthSession | null;
  onFund: () => void;
}) {
  const [tab, setTab] = useState<Tab>('premium');

  /* promo carousel state */
  const [promoIdx, setPromoIdx] = useState(0);

  /* Auto-advance promo carousel */
  useEffect(() => {
    const t = setInterval(() => {
      setPromoIdx((i) => (i + 1) % TELEGRAM_PROMO_SLIDES.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const activePromo = TELEGRAM_PROMO_SLIDES[promoIdx] || TELEGRAM_PROMO_SLIDES[0];

  const goToPromoSlide = (index: number) => {
    setPromoIdx(index);
  };

  const applyPromo = (slide: PromoSlide) => {
    if (slide.tab) setTab(slide.tab);
  };

  return (
    <div className="tgp-page">
      {/* ----------------- TOPBAR ----------------- */}
      <header className="tgp-topbar">
        <button
          type="button"
          className="tgp-topbar-btn"
          onClick={onBack}
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="tgp-topbar-center">
          <span className="tgp-topbar-title">Telegram</span>
          <span className="tgp-topbar-sub">Premium &amp; Stars, sent to any username</span>
        </div>

        <div className="tgp-topbar-right">
          {session?.balanceNgn !== undefined && (
            <button
              type="button"
              className="tgp-topbar-bal"
              onClick={onFund}
              title="Wallet balance — click to fund"
            >
              <Wallet size={12} />
              <span>{'\u20A6' + Math.round(session.balanceNgn).toLocaleString('en-NG')}</span>
            </button>
          )}
        </div>
      </header>

      {/* ----------------- BODY ----------------- */}
      <main className="tgp-body">
        {/* PROMO STRIP CAROUSEL */}
        <section
          className="tgp-promo-strip"
          data-promo-slide={activePromo.id}
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(7,18,42,.92) 0%, rgba(7,18,42,.72) 58%, rgba(7,18,42,.24) 100%), url("' +
              activePromo.image +
              '")',
          }}
          aria-label="Promotion banner"
        >
          <div className="tgp-promo-content">
            <div className="tgp-promo-badge">
              <Sparkles size={11} />
              <span>{activePromo.badge}</span>
            </div>
            <h2 className="tgp-promo-title">{activePromo.title}</h2>
            <p className="tgp-promo-desc">{activePromo.subtitle}</p>
            {activePromo.ctaText ? (
              <button
                type="button"
                className="tgp-promo-cta"
                onClick={() => applyPromo(activePromo)}
              >
                {activePromo.ctaText} <ArrowRight size={12} />
              </button>
            ) : null}
          </div>
          <div className="tgp-promo-dots">
            {TELEGRAM_PROMO_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === promoIdx ? 'active' : ''}
                onClick={() => goToPromoSlide(i)}
                aria-label={'Show slide ' + (i + 1)}
              />
            ))}
          </div>
        </section>

        {/* SEGMENTED STARS / PREMIUM TOGGLE */}
        <div className="tgp-form-field">
          <label className="tgp-label">PRODUCT</label>
          <div className="tgp-tabs-toggle">
            {TABS.map(({ id, label, hint, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={'tgp-tab' + (tab === id ? ' active' : '')}
                onClick={() => setTab(id)}
              >
                <div className="tgp-tab-head">
                  <Icon size={15} />
                  <strong>{label}</strong>
                </div>
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </div>

        {/* TITLE BLOCK */}
        {tab === 'premium' ? (
          <section className="tgp-title-block">
            <div className="tgp-title-icon">
              <Send size={22} />
            </div>
            <div>
              <h1>Buy Telegram Premium</h1>
              <p>Select the subscription duration for the recipient.</p>
            </div>
          </section>
        ) : (
          <section className="tgp-title-block">
            <div className="tgp-title-icon">
              <Star size={22} />
            </div>
            <div>
              <h1>Buy Telegram Stars</h1>
              <p>Top up Stars for yourself or your friends.</p>
            </div>
          </section>
        )}

        {/* HONEST SETUP STATE (removed as duration + checkout land) */}
        <section className="tgp-setup-card" role="status">
          <span className="tgp-setup-dot" />
          <p>
            {tab === 'premium'
              ? 'Duration selection and checkout are being set up for this page. Live prices arrive with them.'
              : 'Stars amounts and checkout are being set up for this page. Live prices arrive with them.'}
          </p>
        </section>
      </main>
    </div>
  );
}
