'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { HomePage, FundPage, HistoryPage, ProfilePage } from './pages';
import { ServicePage, ServicesPage, type ServiceView } from './service-pages';
import { RentalPage } from './rental-page';
import { AccountsPage } from './product-pages';
import { BoostPage } from './boost-page';
import { AirtimePage } from './airtime-page';
import { DataPage } from './data-page';
import { GiftCardPage } from './giftcard-page';
import { TvPage } from './tv-page';
import { EsimPage } from './esim-page';
import { VirtualNumbersPage } from './virtual-numbers-page';
import { BettingPage } from './betting-page';
import { EditProfilePage } from './edit-profile-page';
import { ReferralPage } from './referral-page';
import { AdminPage } from './admin-page';
import { AuthFlow, type AuthSession } from './auth/AuthFlow';
import { canOpenService, NG_ONLY_MESSAGE } from './lib/service-access';
import type { Page } from './types';

const STORAGE_KEY = 'verxor-auth-session';

type NavState = { page: Page; service: ServiceView | null };

function readNavState(raw: unknown): NavState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.page !== 'string') return null;
  return {
    page: o.page as Page,
    service: (o.service as ServiceView | null) ?? null,
  };
}

export function VerxorApp() {
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);
  const [admin, setAdmin] = useState(false);
  /** Session is in-memory only — never restored from localStorage as authenticated */
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [serviceBlocked, setServiceBlocked] = useState<string | null>(null);

  /** Skip pushState when restoring from popstate */
  const skipPushRef = useRef(false);
  const pageRef = useRef(page);
  const serviceRef = useRef(service);
  pageRef.current = page;
  serviceRef.current = service;

  const pushNav = useCallback((next: NavState) => {
    if (typeof window === 'undefined') return;
    if (skipPushRef.current) {
      skipPushRef.current = false;
      return;
    }
    try {
      window.history.pushState(next, '', window.location.pathname + window.location.search);
    } catch {
      /* ignore */
    }
  }, []);

  const openService = useCallback(
    (next: ServiceView) => {
      // Nigerian-only VTU services: block non-NG accounts (still show tiles)
      const eligible = auth?.vtuEligible;
      if (!canOpenService(next, eligible)) {
        setServiceBlocked(NG_ONLY_MESSAGE);
        return;
      }
      setServiceBlocked(null);
      setService(next);
      pushNav({ page: pageRef.current, service: next });
    },
    [pushNav, auth?.vtuEligible],
  );

  const navigatePage = useCallback(
    (next: Page) => {
      setService(null);
      setPage(next);
      pushNav({ page: next, service: null });
    },
    [pushNav],
  );

  /** UI Back on service screens — go one step in browser history when possible */
  const closeService = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.service) {
      window.history.back();
      return;
    }
    setService(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setAdmin(true);
    }
    // Capture inbound referral for signup attribution
    const ref = params.get('ref');
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
      try {
        localStorage.setItem('verxor-inbound-ref', ref.toUpperCase());
      } catch {
        /* ignore */
      }
    }
    // Do NOT load authenticated=true from storage.
    // Always present AuthFlow (PIN gate) on every open.
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = (e: PopStateEvent) => {
      skipPushRef.current = true;
      const restored = readNavState(e.state);
      if (restored) {
        setPage(restored.page);
        setService(restored.service);
      } else {
        setPage('home');
        setService(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist session fields (not authenticated flag) for PIN/login remember
  useEffect(() => {
    if (!auth) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthSession;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...parsed, ...auth, authenticated: false }),
        );
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...auth, authenticated: false }),
        );
      }
    } catch {
      /* ignore */
    }
  }, [auth]);

  const handleLogout = useCallback(() => {
    setAuth(null);
    setService(null);
    setPage('home');
  }, []);

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#F8FAFC',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #E2E8F0',
            borderTopColor: '#2563EB',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // PIN gate — always shown until PIN succeeds in this tab session
  if (!auth) {
    return (
      <AuthFlow
        onAuthenticated={(session) => {
          setAuth(session);
          setPage('home');
        }}
      />
    );
  }

  const blockedBanner = serviceBlocked ? (
    <div
      role="alertdialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
      onClick={() => setServiceBlocked(null)}
    >
      <div
        style={{
          maxWidth: 340,
          width: '100%',
          background: '#fff',
          borderRadius: 16,
          padding: '22px 20px',
          boxShadow: '0 20px 40px rgba(15,23,42,0.18)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 17, color: '#0F172A' }}>
          Not available
        </p>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, color: '#475569' }}>
          {serviceBlocked}
        </p>
        <button
          type="button"
          onClick={() => setServiceBlocked(null)}
          style={{
            width: '100%',
            minHeight: 48,
            border: 0,
            borderRadius: 12,
            background: '#2563EB',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          OK
        </button>
      </div>
    </div>
  ) : null;

  const deepService = service !== null;
  const userName = auth.name || 'User';

  const content =
    service === 'services' ? (
      <ServicesPage
        open={openService}
        onBack={() => navigatePage('home')}
      />
    ) : service === 'rental' ? (
      <RentalPage onBack={closeService} onOpenEsim={() => openService('esim')} />
    ) : service === 'virtual-numbers' ? (
      <VirtualNumbersPage
        onBack={closeService}
        onOpenNotifications={() => openService('alerts')}
      />
    ) : service === 'accounts' ? (
      <AccountsPage onBack={closeService} />
    ) : service === 'boost' ? (
      <BoostPage onBack={closeService} />
    ) : service === 'airtime' ? (
      <AirtimePage onBack={closeService} />
    ) : service === 'data' ? (
      <DataPage onBack={closeService} />
    ) : service === 'gift-card' ? (
      <GiftCardPage onBack={closeService} />
    ) : service === 'tv-cable' ? (
      <TvPage onBack={closeService} />
    ) : service === 'esim' ? (
      <EsimPage onBack={closeService} />
    ) : service === 'bet-wallet' ? (
      <BettingPage
        onBack={closeService}
        onOpenHistory={() => navigatePage('history')}
      />
    ) : service === 'edit-profile' ? (
      <EditProfilePage
        onBack={closeService}
        session={auth}
        onSaved={(patch) => {
          setAuth((prev) => (prev ? { ...prev, name: patch.name } : prev));
        }}
      />
    ) : service === 'referral' ? (
      <ReferralPage onBack={closeService} session={auth} />
    ) : service ? (
      <ServicePage view={service} onBack={closeService} />
    ) : page === 'history' ? (
      <HistoryPage />
    ) : page === 'services' ? (
      <ServicesPage open={openService} onBack={() => navigatePage('home')} />
    ) : (
      {
        home: <HomePage go={navigatePage} openService={openService} />,
        fund: <FundPage />,
        services: <ServicesPage open={openService} onBack={() => navigatePage('home')} />,
        profile: <ProfilePage openService={openService} />,
      }[page]
    );

  return (
    <>
      {blockedBanner}
      <AppShell
        dark={dark}
        page={page}
        deepService={deepService}
        userName={userName}
        onNavigate={navigatePage}
        onToggleTheme={() => setDark((v) => !v)}
        onOpenService={openService}
        onLogout={handleLogout}
      >
        {content}
      </AppShell>
    </>
  );
}
