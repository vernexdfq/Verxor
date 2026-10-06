'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AuthSession } from './auth/AuthFlow';
import { AuthFlow } from './auth/AuthFlow';
import { signOutAuth, supabaseAuthEnabled } from '../lib/supabase/auth';
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
import { TvPage } from './tv-page';
import { ProxiesPage } from './proxies-page';
import { VirtualCardPage } from './virtual-card-page';
import { SecurityPage } from './security-page';
import { ReferralPage } from './referral-page';
import { PrivacyPolicyPage } from './privacy-policy-page';
import { SupportCenterPage } from './support-center-page';
import { ServicePage } from './service-pages';
import { ServicesHub } from './services-hub';
import type { ServiceView as CatalogServiceView } from './service-pages';
import type { Page } from './types';
import { Home, LayoutGrid, WalletCards, Clock3, UserRound } from 'lucide-react';

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
  | 'proxies'
  | 'virtual-card';

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
  return view as AppService;
}

function VerxorApp() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [forceSignin, setForceSignin] = useState(false);
  const [service, setService] = useState<AppService>(null);
  const [tab, setTab] = useState<Page>('home');
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
      setAuth(s);
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
    setTab('home');
  }, []);

  const handleLogout = useCallback(() => {
    setAuth(null);
    setService(null);
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
    if (view === 'fund' || view === 'history') {
      setService(view);
      return;
    }
    setService(mapCatalogService(view as CatalogServiceView));
  }, []);

  const closeService = useCallback(() => setService(null), []);

  const go = useCallback((page: Page) => {
    setService(null);
    if (page === 'fund') {
      setService('fund');
      setTab('fund');
      return;
    }
    if (page === 'history') {
      setService('history');
      setTab('history');
      return;
    }
    setTab(page);
  }, []);

  if (!hydrated) {
    return (
      <div className="vx-shell vx-loading" aria-busy="true">
        <p>Loading…</p>
      </div>
    );
  }

  if (!auth?.authenticated || forceSignin) {
    return <AuthFlow onAuthenticated={handleAuthenticated} />;
  }

  let content: ReactNode = null;
  if (service === 'fund') {
    content = <FundPage session={auth} />;
  } else if (service === 'history') {
    content = <HistoryPage userId={auth.contact} />;
  } else if (service === 'alerts' || service === 'notifications-prefs') {
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
    content = <BettingPage onBack={closeService} onOpenHistory={() => openService('history')} />;
  } else if (service === 'exam-pin') {
    content = <ExamPinPage onBack={closeService} />;
  } else if (service === 'gift-card') {
    content = <GiftCardPage onBack={closeService} />;
  } else if (service === 'esim') {
    content = <EsimPage onBack={closeService} />;
  } else if (service === 'tv-cable') {
    content = <TvPage onBack={closeService} />;
  } else if (service === 'proxies') {
    content = <ProxiesPage onBack={closeService} />;
  } else if (service === 'virtual-card') {
    content = <VirtualCardPage onBack={closeService} />;
  } else if (service === 'activity') {
    content = <ActivityLogsPage />;
  } else if (service === 'security') {
    content = <SecurityPage onBack={closeService} session={auth} />;
  } else if (service === 'referral') {
    content = <ReferralPage onBack={closeService} session={auth} />;
  } else if (service === 'privacy') {
    content = <PrivacyPolicyPage onBack={closeService} />;
  } else if (service === 'support-center') {
    content = <SupportCenterPage onBack={closeService} />;
  } else if (service === 'settings' || service === 'child-panel' || service === 'api-keys') {
    content = <ServicePage view={service} onBack={closeService} />;
  } else if (tab === 'profile') {
    content = (
      <ProfilePage
        openService={openService}
        session={auth}
        onLogout={handleLogout}
      />
    );
  } else if (tab === 'services') {
    content = (
      <ServicesHub
        open={(view) => openService(view)}
        onBack={() => go('home')}
      />
    );
  } else if (tab === 'fund' || service === 'fund') {
    content = <FundPage session={auth} />;
  } else if (tab === 'history' || service === 'history') {
    content = <HistoryPage userId={auth.contact} />;
  } else {
    content = (
      <HomePage
        go={go}
        openService={openService}
        session={auth}
      />
    );
  }

  /** Deep service pages hide the main tab bar (back button only). */
  const deepService = !!service && service !== 'fund' && service !== 'history';

  const navItems: { id: Page; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: LayoutGrid },
    { id: 'fund', label: 'Fund', icon: WalletCards },
    { id: 'history', label: 'History', icon: Clock3 },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ];

  return (
    <div className="vx-shell">
      {content}
      {!deepService && (
        <nav className="bottom-nav" aria-label="Main">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active =
              (id === 'home' && tab === 'home' && !service) ||
              (id === 'services' && tab === 'services' && !service) ||
              (id === 'fund' && (tab === 'fund' || service === 'fund')) ||
              (id === 'history' && (tab === 'history' || service === 'history')) ||
              (id === 'profile' && tab === 'profile' && !service);
            return (
              <button
                key={id}
                type="button"
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={active ? 2.25 : 1.9} />
                <small>{label}</small>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export { VerxorApp };
export default VerxorApp;
