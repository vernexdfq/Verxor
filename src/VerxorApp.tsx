'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthSession } from './auth/AuthFlow';
import { AuthFlow } from './auth/AuthFlow';
import { signOutAuth, supabaseAuthEnabled } from '../lib/supabase/auth';
import { AppShell } from './components/AppShell';
import { HomePage } from './page-home';
import { ProfilePage } from './page-profile';
import { FundPage } from './page-fund';
import { HistoryPage } from './page-history';
import { NotificationsPage } from './notifications-page';
import { FaqPage } from './faq-page';
import { FeedbackPage } from './feedback-page';
import { EditProfilePage } from './edit-profile-page';
import { RentalPage } from './rental-page';
import { EsimPage } from './esim-page';
import { VirtualNumbersPage } from './virtual-numbers-page';
import { AccountsPage } from './product-pages';
import { BoostPage } from './boost-page';
import { AirtimePage } from './airtime-page';
import { DataPage } from './data-page';
import { ElectricityPage } from './electricity-page';
import { BettingPage } from './betting-page';
import { ExamPinPage } from './exam-pin-page';
import { GiftCardPage } from './giftcard-page';
import { ActivityLogsPage } from './activity-logs';
import { ServicesPage, type ServiceView as CatalogServiceView } from './service-pages';
import type { Page } from './types';

/** Local app service keys (subset used by this shell). */
type AppService =
  | null
  | 'fund'
  | 'history'
  | 'alerts'
  | 'faq'
  | 'feedback'
  | 'edit-profile'
  | 'rental'
  | 'esim'
  | 'virtual-numbers'
  | 'accounts'
  | 'boost'
  | 'airtime'
  | 'data'
  | 'electricity'
  | 'betting'
  | 'exam-pin'
  | 'gift-card'
  | 'activity'
  | 'referral'
  | 'security'
  | 'settings'
  | 'privacy'
  | 'support-center'
  | 'notifications-prefs'
  | 'child-panel'
  | 'api-keys'
  | 'tv-cable'
  | 'services';

const STORAGE_KEY = 'verxor-auth-session';

function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.contact) return null;
    return { ...parsed, authenticated: false };
  } catch {
    return null;
  }
}

function mapCatalogService(view: CatalogServiceView): AppService {
  if (view === 'gift-card') return 'gift-card';
  if (view === 'bet-wallet') return 'betting';
  if (view === 'help') return 'faq';
  if (view === 'services') return 'services';
  return view as AppService;
}

export default function VerxorApp() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [forceSignin, setForceSignin] = useState(false);
  const [service, setService] = useState<AppService>(null);
  const [page, setPage] = useState<Page>('home');
  const [dark, setDark] = useState(false);
  const boot = useRef(false);

  useEffect(() => {
    if (boot.current) return;
    boot.current = true;
    try {
      if (sessionStorage.getItem('verxor-force-signin') === '1') {
        sessionStorage.removeItem('verxor-force-signin');
        setForceSignin(true);
        setHydrated(true);
        return;
      }
    } catch {
      /* ignore */
    }
    const s = loadSession();
    if (s?.contact && s.pin) {
      setAuth({ ...s, authenticated: true });
    }
    setHydrated(true);
  }, []);

  const handleAuthenticated = useCallback((s: AuthSession) => {
    setAuth({
      ...s,
      authenticated: true,
      balanceNgn: s.balanceNgn ?? 0,
      balanceUsd: s.balanceUsd ?? 0,
    });
    setForceSignin(false);
    setPage('home');
    setService(null);
  }, []);

  const handleLogout = useCallback(() => {
    setAuth(null);
    setService(null);
    setPage('home');
    try {
      sessionStorage.setItem('verxor-force-signin', '1');
    } catch {
      /* ignore */
    }
    if (supabaseAuthEnabled()) {
      void signOutAuth();
    }
    setForceSignin(true);
  }, []);

  const openService = useCallback((view: CatalogServiceView | AppService) => {
    if (view === 'fund') {
      setService(null);
      setPage('fund');
      return;
    }
    if (view === 'history') {
      setService(null);
      setPage('history');
      return;
    }
    if (view === 'services') {
      setService(null);
      setPage('services');
      return;
    }
    setService(mapCatalogService(view as CatalogServiceView));
  }, []);

  const closeService = useCallback(() => setService(null), []);

  const navigatePage = useCallback((next: Page) => {
    setService(null);
    setPage(next);
  }, []);

  const go = useCallback(
    (p: Page) => {
      navigatePage(p);
    },
    [navigatePage],
  );

  if (!hydrated) {
    return <div className="vx-boot" aria-busy="true" />;
  }

  if (!auth?.authenticated || forceSignin) {
    return <AuthFlow onAuthenticated={handleAuthenticated} />;
  }

  let content: ReactNode = null;

  if (service === 'alerts' || service === 'notifications-prefs') {
    content = <NotificationsPage onBack={closeService} />;
  } else if (service === 'faq') {
    content = <FaqPage onBack={closeService} />;
  } else if (service === 'feedback') {
    content = <FeedbackPage onBack={closeService} session={auth} />;
  } else if (service === 'edit-profile') {
    content = <EditProfilePage onBack={closeService} session={auth} />;
  } else if (service === 'rental') {
    content = <RentalPage onBack={closeService} onOpenEsim={() => openService('esim')} />;
  } else if (service === 'virtual-numbers') {
    content = (
      <VirtualNumbersPage
        onBack={closeService}
        onOpenNotifications={() => openService('alerts')}
        balanceNgn={auth.balanceNgn ?? 0}
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
  } else if (service === 'electricity') {
    content = <ElectricityPage onBack={closeService} />;
  } else if (service === 'betting') {
    content = (
      <BettingPage onBack={closeService} onOpenHistory={() => navigatePage('history')} />
    );
  } else if (service === 'exam-pin') {
    content = <ExamPinPage onBack={closeService} />;
  } else if (service === 'gift-card') {
    content = <GiftCardPage onBack={closeService} />;
  } else if (service === 'esim') {
    content = <EsimPage onBack={closeService} />;
  } else if (service === 'activity') {
    content = <ActivityLogsPage />;
  } else if (service === 'services') {
    content = <ServicesPage open={openService} onBack={() => navigatePage('home')} />;
  } else if (page === 'history') {
    content = <HistoryPage userId={auth.contact} />;
  } else if (page === 'fund') {
    content = <FundPage session={auth} />;
  } else if (page === 'services') {
    content = <ServicesPage open={openService} onBack={() => navigatePage('home')} />;
  } else if (page === 'profile') {
    content = (
      <ProfilePage
        openService={openService}
        session={auth}
        onLogout={handleLogout}
      />
    );
  } else {
    content = (
      <HomePage go={go} openService={openService} session={auth} />
    );
  }

  const deepService = service !== null;

  return (
    <AppShell
      dark={dark}
      page={page}
      deepService={deepService}
      userName={auth.name || 'User'}
      onNavigate={navigatePage}
      onToggleTheme={() => setDark((v) => !v)}
      onOpenService={openService}
      onLogout={handleLogout}
    >
      {content}
    </AppShell>
  );
}

export { VerxorApp };
