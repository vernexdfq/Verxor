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
  Lock,
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

/* Demo pricing — remove this block (and the Demo chip tag) when a real
   provider is wired in. These are placeholder amounts, not live quotes. */
const NAIRA = '\u20A6';
const DEMO_PRICING: Record<string, string> = {
  '3m': NAIRA + '23,885',
  '6m': NAIRA + '30,185',
  '12m': NAIRA + '50,660',
};

const PREMIUM_DURATIONS: { id: string; label: string; price: string | null }[] = [
  { id: '3m', label: '3 Months', price: DEMO_PRICING['3m'] },
  { id: '6m', label: '6 Months', price: DEMO_PRICING['6m'] },
  { id: '12m', label: '12 Months', price: DEMO_PRICING['12m'] },
];

/* Demo Stars rate (Naira per Star) — remove with the demo pricing above
   when a real provider is wired in. */
const DEMO_STARS_RATE = 22;
const STARS_PRESETS = [50, 100, 250, 500, 1000, 5000];

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
  const [recipient, setRecipient] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<string>('3m');
  const [selectedStars, setSelectedStars] = useState<number | null>(50);
  const [starsCustom, setStarsCustom] = useState('');

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

        {/* RECIPIENT USERNAME */}
        <div className="tgp-form-field">
          <label className="tgp-label" htmlFor="tgp-recipient">
            RECIPIENT USERNAME
          </label>
          <div className="tgp-input-wrap">
            <span className="tgp-input-at">@</span>
            <input
              id="tgp-recipient"
              className="tgp-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="username"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.replace(/^@+/, ''))}
            />
          </div>
          <small className="tgp-helper">
            Enter a public Telegram username. The @ symbol is optional.
          </small>
        </div>

        {/* DURATION CHIPS (PREMIUM TAB ONLY) */}
        {tab === 'premium' ? (
          <div className="tgp-form-field">
            <label className="tgp-label">DURATION</label>
            <div className="tgp-durations">
              {PREMIUM_DURATIONS.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  className={'tgp-dur' + (selectedDuration === d.id ? ' active' : '')}
                  onClick={() => setSelectedDuration(d.id)}
                >
                  <strong>{d.label}</strong>
                  <small>
                    {d.price !== null ? (
                      <>
                        {d.price}
                        <span className="tgp-dur-demo">Demo</span>
                      </>
                    ) : (
                      'Setup finishing'
                    )}
                  </small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* STARS AMOUNT CHIPS + CUSTOM (STARS TAB ONLY) */}
        {tab === 'stars' ? (
          <div className="tgp-form-field">
            <label className="tgp-label">AMOUNT</label>
            <div className="tgp-star-chips">
              {STARS_PRESETS.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={
                    'tgp-star-chip' + (selectedStars === s && starsCustom === '' ? ' active' : '')
                  }
                  onClick={() => {
                    setSelectedStars(s);
                    setStarsCustom('');
                  }}
                >
                  <strong>{s.toLocaleString('en-NG')}</strong>
                  <small>
                    {NAIRA + (s * DEMO_STARS_RATE).toLocaleString('en-NG')}
                    <span className="tgp-dur-demo">Demo</span>
                  </small>
                </button>
              ))}
            </div>
            <div className="tgp-input-wrap tgp-input-wrap-stars">
              <span className="tgp-input-at">Custom</span>
              <input
                className="tgp-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter amount (50 - 10,000)"
                value={starsCustom}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                  setStarsCustom(digits);
                  setSelectedStars(null);
                }}
              />
            </div>
            {starsCustom !== '' ? (
              <small className="tgp-helper">
                {Number(starsCustom).toLocaleString('en-NG')} Stars ·{' '}
                {NAIRA + (Number(starsCustom) * DEMO_STARS_RATE).toLocaleString('en-NG')} demo
                price
              </small>
            ) : null}
          </div>
        ) : null}

        {/* VERIFICATION INFO BOX */}
        <section className="tgp-info-box">
          <div className="tgp-info-row">
            <span className="tgp-info-icon">
              <Lock size={13} />
            </span>
            <p>
              {tab === 'premium'
                ? 'We verify the username before checkout. Premium is a one-time purchase and does not renew automatically.'
                : 'We verify the username before checkout. Stars land straight in the recipient’s Telegram balance.'}
            </p>
          </div>
          <div className="tgp-info-row">
            <span className="tgp-info-icon">
              <Wallet size={13} />
            </span>
            <p>Paid from your Verxor wallet. Refunds return to the wallet.</p>
          </div>
        </section>

        {/* CHECKOUT CTA (honest disabled state until checkout is wired) */}
        <button type="button" className="tgp-pay-btn" disabled title="Checkout is being set up">
          <Lock size={15} />
          <span>Continue to confirmation</span>
        </button>

        {/* HONEST SETUP STATE (checkout lands with the real provider) */}
        <section className="tgp-setup-card" role="status">
          <span className="tgp-setup-dot" />
          <p>
            {tab === 'premium'
              ? 'Checkout is being set up for this page. The duration prices above are demo amounts until a live provider is wired in.'
              : 'Checkout is being set up for this page. The Stars prices above are demo amounts until a live provider is wired in.'}
          </p>
        </section>
        {/* RECENT ORDERS (empty until the real provider lands) */}
        <section className="tgp-orders">
          <h3 className="tgp-orders-title">
            {tab === 'premium' ? 'Recent Premium orders' : 'Recent Stars orders'}
          </h3>
          <div className="tgp-orders-empty">
            <Send size={18} />
            <p>
              {tab === 'premium' ? 'No Telegram Premium orders yet.' : 'No Telegram Stars orders yet.'}
            </p>
            <small>Orders you place appear here. Paid from your Verxor wallet, refunds return to it.</small>
          </div>
        </section>
      </main>
    </div>
  );
}
