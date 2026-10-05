'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
import { ElectricityPage } from './electricity-page';
import { EsimPage } from './esim-page';
import { VirtualNumbersPage } from './virtual-numbers-page';
import { BettingPage } from './betting-page';
import { ExamPinPage } from './exam-pin-page';
import { EditProfilePage } from './edit-profile-page';
import { ReferralPage } from './referral-page';
import { PrivacyPolicyPage } from './privacy-policy-page';
import { FeedbackPage } from './feedback-page';
import { FaqPage } from './faq-page';
import { SupportCenterPage } from './support-center-page';
import { SecurityPage } from './security-page';
import { AdminPage } from './admin-page';
import { AuthFlow, type AuthSession } from './auth/AuthFlow';
import type { Page } from './types';

type NavState = {
  page: Page;
  service: ServiceView | null;
};

function readNavState(raw: unknown): NavState | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const page = o.page;
  const service = o.service;
  if (typeof page !== 'string') return null;
  return {
    page: page as Page,
    service: (service as ServiceView | null | undefined) ?? null,
  };
}

function isFaqService(s: ServiceView | null): s is 'faq' | 'help' {
  return s === 'faq' || s === 'help';
}

/**
 * IMPORTANT (fintech rule):
 * Cookies/localStorage may remember contact, method, name, and PIN hash,
 * but they must NEVER auto-admit the user into the dashboard.
 * Every open of /workspace requires a successful 4-digit PIN entry.
 * Authentication lives only in React state for the current tab session.
 */
export function VerxorApp() {
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);
  const [admin, setAdmin] = useState(false);
  /** Session is in-memory only — never restored from localStorage as authenticated */
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);

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
      setService(next);
      pushNav({ page: pageRef.current, service: next });
    },
    [pushNav],
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
    const ref = params.get('ref');
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
      try {
        sessionStorage.setItem('verxor-inbound-ref', ref.trim().toUpperCase());
      } catch {
        /* ignore */
      }
    }
    setAuthReady(true);
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const restored = readNavState(e.state);
      skipPushRef.current = true;
      if (restored) {
        setPage(restored.page);
        setService(restored.service);
      } else {
        setService(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleAuth = useCallback((s: AuthSession) => {
    setAuth({
      ...s,
      balanceNgn: s.balanceNgn ?? 0,
      balanceUsd: s.balanceUsd ?? 0,
    });
  }, []);

  const handleLogout = useCallback(() => {
    try {
      sessionStorage.setItem('verxor-force-signin', '1');
    } catch {
      /* ignore */
    }
    setAuth(null);
    setService(null);
    setPage('home');
  }, []);

  if (!authReady) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#F8FAFC' }}>
        <span style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading…</span>
      </div>
    );
  }

  if (!auth) {
    return <AuthFlow onAuthenticated={handleAuth} />;
  }

  if (admin) {
    return <AdminPage onBack={() => setAdmin(false)} />;
  }

  const userName = auth.name || 'User';
  const deepService = Boolean(service);

  let content: ReactNode;
  if (service === 'services') {
    content = <ServicesPage open={openService} onBack={closeService} />;
  } else if (service === 'rental') {
    content = <RentalPage onBack={closeService} onOpenEsim={() => openService('esim')} />;
  } else if (service === 'virtual-numbers') {
    content = (
      <VirtualNumbersPage
        onBack={closeService}
        onOpenNotifications={() => openService('alerts')}
      />
    );
  } else if (service === 'accounts') {
    content = <AccountsPage onBack={closeService} />;
  } else if (service === 'boost') {
    content = <BoostPage onBack={closeService} />;
  } else if (service === 'airtime') {
    content = <AirtimePage onBack={closeService} />;
  } else if (service === 'data') {
    content = <DataPage onBack={closeService} />;
  } else if (service === 'gift-card') {
    content = <GiftCardPage onBack={closeService} />;
  } else if (service === 'tv-cable') {
    content = <TvPage onBack={closeService} />;
  } else if (service === 'electricity') {
    content = <ElectricityPage onBack={closeService} />;
  } else if (service === 'esim') {
    content = <EsimPage onBack={closeService} />;
  } else if (service === 'bet-wallet') {
    content = (
      <BettingPage
        onBack={closeService}
        onOpenHistory={() => navigatePage('history')}
      />
    );
  } else if (service === 'exam-pin') {
    content = <ExamPinPage onBack={closeService} />;
  } else if (service === 'edit-profile') {
    content = (
      <EditProfilePage
        onBack={closeService}
        session={auth}
        onSaved={(patch) => {
          setAuth((prev) => (prev ? { ...prev, name: patch.name } : prev));
        }}
      />
    );
  } else if (service === 'referral') {
    content = <ReferralPage onBack={closeService} session={auth} />;
  } else if (service === 'privacy') {
    content = <PrivacyPolicyPage onBack={closeService} />;
  } else if (service === 'feedback') {
    content = <FeedbackPage onBack={closeService} session={auth} />;
  } else if (service === 'support-center') {
    content = (
      <SupportCenterPage
        onBack={closeService}
        onOpenFaq={() => openService('faq')}
      />
    );
  } else if (service === 'security') {
    content = <SecurityPage onBack={closeService} session={auth} />;
  } else if (isFaqService(service)) {
    content = <FaqPage onBack={closeService} />;
  } else if (service) {
    content = <ServicePage view={service} onBack={closeService} />;
  } else if (page === 'history') {
    content = <HistoryPage />;
  } else if (page === 'services') {
    content = <ServicesPage open={openService} onBack={() => navigatePage('home')} />;
  } else {
    content = {
      home: <HomePage go={navigatePage} openService={openService} session={auth} />,
      fund: <FundPage session={auth} />,
      services: <ServicesPage open={openService} onBack={() => navigatePage('home')} />,
      profile: <ProfilePage openService={openService} session={auth} onLogout={handleLogout} />,
    }[page];
  }

  return (
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
  );
}
