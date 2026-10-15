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
import { signOutAuth, supabaseAuthEnabled } from '../lib/supabase/auth';
import {
  clearSessionUnlock,
  loadSessionProfile,
  loadSessionTokens,
  isSessionUnlocked,
  saveSessionProfile,
} from './auth/session-unlock';
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
 * Soft session: after a successful PIN unlock, the user stays logged in
 * across refreshes. Balance is always refreshed from public.wallets.
 */
export function VerxorApp() {
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const skipPushRef = useRef(false);
  const pageRef = useRef(page);
  const serviceRef = useRef(service);
  const authRef = useRef(auth);
  pageRef.current = page;
  serviceRef.current = service;
  authRef.current = auth;

  const pushNav = useCallback((next: NavState) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('verxor-nav', JSON.stringify(next));
    } catch {
      /* ignore */
    }
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

  const closeService = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.service) {
      window.history.back();
      return;
    }
    setService(null);
  }, []);

  /** Pull live balance from public.wallets and update session + local profile */
  const refreshBalance = useCallback(async (session?: AuthSession | null) => {
    const s = session ?? authRef.current;
    if (!s) return;
    try {
      const profile = loadSessionProfile();
      const tokens = loadSessionTokens();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (tokens?.access_token) headers.Authorization = `Bearer ${tokens.access_token}`;

      const qs = new URLSearchParams();
      if (profile?.userId) qs.set('userId', profile.userId);
      if (s.email || profile?.email) qs.set('email', s.email || profile?.email || '');
      if (s.contact || profile?.contact) qs.set('phone', s.contact || profile?.contact || '');

      const res = await fetch(`/api/v1/wallet/balance?${qs.toString()}`, {
        cache: 'no-store',
        headers,
      }).catch(() => null);

      if (!res || !res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        balanceNgn?: number;
        balanceUsd?: number;
        userId?: string;
      };
      if (!data.ok) return;

      const balanceNgn = Number(data.balanceNgn) || 0;
      const balanceUsd = Number(data.balanceUsd) || 0;

      setAuth((prev) =>
        prev
          ? {
              ...prev,
              balanceNgn,
              balanceUsd,
            }
          : prev,
      );

      const current = loadSessionProfile();
      if (current) {
        saveSessionProfile({
          ...current,
          balanceNgn,
          balanceUsd,
          userId: data.userId || current.userId,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Restore soft session on first paint (refresh stays inside the app).
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

    let forceSignin = false;
    try {
      forceSignin = sessionStorage.getItem('verxor-force-signin') === '1';
      if (forceSignin) {
        sessionStorage.removeItem('verxor-force-signin');
        clearSessionUnlock();
      }
    } catch {
      /* ignore */
    }

    if (!forceSignin && isSessionUnlocked()) {
      const profile = loadSessionProfile();
      if (profile) {
        const restored: AuthSession = {
          authenticated: true,
          method: profile.method || 'phone',
          contact: profile.contact,
          name: profile.name,
          pin: '',
          password: '',
          email: profile.email || '',
          phoneCountry: profile.phoneCountry || 'NG',
          dialCode: profile.dialCode || '234',
          homeCurrency: profile.homeCurrency || 'NGN',
          vtuEligible: profile.vtuEligible ?? true,
          balanceNgn: profile.balanceNgn ?? 0,
          balanceUsd: profile.balanceUsd ?? 0,
        };
        setAuth(restored);

        // Best-effort restore Supabase client session from stored tokens
        const tokens = loadSessionTokens();
        if (tokens?.access_token && tokens?.refresh_token && supabaseAuthEnabled()) {
          void (async () => {
            try {
              const { getSupabaseBrowser } = await import('../lib/supabase/client');
              const sb = getSupabaseBrowser();
              if (sb) {
                await sb.auth.setSession({
                  access_token: tokens.access_token!,
                  refresh_token: tokens.refresh_token!,
                });
              }
            } catch {
              /* ignore */
            }
          })();
        }

        // Live balance from wallets table (overrides stale cached 0)
        void refreshBalance(restored);

        // On browser refresh, authenticated users start at the Home Dashboard.
        try {
          sessionStorage.removeItem('verxor-nav');
          const homeState: NavState = { page: 'home', service: null };
          setPage('home');
          setService(null);
          skipPushRef.current = true;
          window.history.replaceState(
            homeState,
            '',
            window.location.pathname + window.location.search,
          );
        } catch {
          /* ignore */
        }
      }
    }

    setAuthReady(true);
  }, [refreshBalance]);

  // Refresh balance when tab becomes visible or user lands on home/fund
  useEffect(() => {
    if (!auth) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshBalance();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Also refresh when switching to home or fund
    if (page === 'home' || page === 'fund') {
      void refreshBalance();
    }

    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [auth, page, refreshBalance]);

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

  const handleAuth = useCallback(
    (s: AuthSession) => {
      const restoredSession: AuthSession = {
        ...s,
        balanceNgn: s.balanceNgn ?? 0,
        balanceUsd: s.balanceUsd ?? 0,
      };
      setAuth(restoredSession);
      saveSessionProfile({
        name: restoredSession.name || 'User',
        contact: restoredSession.contact || '',
        email: restoredSession.email || '',
        method: restoredSession.method || 'phone',
        phoneCountry: restoredSession.phoneCountry || 'NG',
        dialCode: restoredSession.dialCode || '234',
        homeCurrency: restoredSession.homeCurrency || 'NGN',
        vtuEligible: restoredSession.vtuEligible ?? true,
        balanceNgn: restoredSession.balanceNgn ?? 0,
        balanceUsd: restoredSession.balanceUsd ?? 0,
      });
      // Always pull live balance after login (PIN may have returned stale/0)
      void refreshBalance(restoredSession);
      try {
        const raw = sessionStorage.getItem('verxor-nav');
        if (raw) {
          const restored = readNavState(JSON.parse(raw));
          if (restored) {
            setPage(restored.page);
            setService(restored.service);
            skipPushRef.current = true;
            try {
              window.history.replaceState(
                restored,
                '',
                window.location.pathname + window.location.search,
              );
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }
    },
    [refreshBalance],
  );

  const handleLogout = useCallback(() => {
    try {
      sessionStorage.setItem('verxor-force-signin', '1');
      sessionStorage.removeItem('verxor-nav');
    } catch {
      /* ignore */
    }
    clearSessionUnlock();
    if (supabaseAuthEnabled()) {
      void signOutAuth();
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
        session={auth}
        onBack={closeService}
        onOpenNotifications={() => openService('alerts')}
      />
    );
  } else if (service === 'accounts') {
    content = <AccountsPage onBack={closeService} session={auth} />;
  } else if (service === 'boost') {
    content = <BoostPage onBack={closeService} session={auth} />;
  } else if (service === 'airtime') {
    content = <AirtimePage onBack={closeService} session={auth} />;
  } else if (service === 'data') {
    content = <DataPage onBack={closeService} session={auth} />;
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
          setAuth((prev) =>
            prev
              ? { ...prev, name: patch.name, username: patch.username }
              : prev,
          );
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
