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
import { PrivacyPolicyPage } from './privacy-policy-page';
import { AdminPage } from './admin-page';
import { AuthFlow, type AuthSession } from './auth/AuthFlow';
import { canOpenService, NG_ONLY_MESSAGE } from './lib/service-access';
import type { Page } from './types';

const STORAGE_KEY = 'verxor-auth-session';

function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed && typeof parsed.contact === 'string') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(s: AuthSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function VerxorApp() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    setAuth(loadSession());
    setBooting(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Capture inbound referral for signup attribution
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) sessionStorage.setItem('verxor-inbound-ref', ref.trim().toUpperCase());
    } catch {
      /* ignore */
    }
  }, []);

  const closeService = useCallback(() => {
    setService(null);
    if (typeof window !== 'undefined' && window.history.state?.vx) {
      window.history.back();
    }
  }, []);

  const openService = useCallback(
    (next: ServiceView) => {
      if (auth && !canOpenService(next, auth)) {
        setBlockedMsg(NG_ONLY_MESSAGE);
        window.setTimeout(() => setBlockedMsg(null), 3200);
        return;
      }
      setService(next);
      if (typeof window !== 'undefined') {
        window.history.pushState({ vx: true, service: next }, '');
      }
    },
    [auth],
  );

  const navigatePage = useCallback((next: Page) => {
    setService(null);
    setPage(next);
  }, []);

  useEffect(() => {
    const onPop = () => {
      setService(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleAuth = useCallback((s: AuthSession) => {
    setAuth(s);
    saveSession(s);
  }, []);

  const handleLogout = useCallback(() => {
    setAuth(null);
    saveSession(null);
    setService(null);
    setPage('home');
  }, []);

  if (booting) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#F8FAFC' }}>
        <span style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading…</span>
      </div>
    );
  }

  if (!auth) {
    return <AuthFlow onAuthenticated={handleAuth} />;
  }

  const userName = auth.name || 'User';
  const deepService = Boolean(service);

  const blockedBanner = blockedMsg ? (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 88,
        transform: 'translateX(-50%)',
        zIndex: 80,
        maxWidth: '90%',
        padding: '12px 16px',
        borderRadius: 12,
        background: '#0F172A',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 10px 28px rgba(15,23,42,.28)',
      }}
    >
      {blockedMsg}
    </div>
  ) : null;

  const body =
    service === 'services' ? (
      <ServicesPage open={openService} onBack={closeService} />
    ) : service === 'rental' ? (
      <RentalPage onBack={closeService} onOpenEsim={() => openService('esim')} />
    ) : service === 'virtual-numbers' ? (
      <VirtualNumbersPage onBack={closeService} />
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
    ) : service === 'privacy' ? (
      <PrivacyPolicyPage onBack={closeService} />
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
        {body}
      </AppShell>
    </>
  );
}
