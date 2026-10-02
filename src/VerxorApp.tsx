'use client';

import { useEffect, useState } from 'react';
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
import { VirtualNumbersPage } from './virtual-numbers-page';
import { AdminPage } from './admin-page';
import { AuthFlow, type AuthSession } from './auth/AuthFlow';
import type { Page } from './types';

const STORAGE_KEY = 'verxor-auth-session';

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setAdmin(true);
    }
    // Do NOT load authenticated=true from storage.
    // Always present AuthFlow (PIN gate) on every open.
    setAuthReady(true);
  }, []);

  const closeService = () => setService(null);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AuthSession;
          // Keep remembered contact/method/pin — clear only the live session flag
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...parsed, authenticated: false }),
          );
        }
      } catch {
        /* ignore */
      }
    }
    setAuth(null);
    setService(null);
    setPage('home');
  };

  if (admin) {
    return (
      <div className={dark ? 'app dark' : 'app'}>
        <AdminPage
          onBack={() => {
            setAdmin(false);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('admin');
              window.history.replaceState({}, '', url.pathname);
            }
          }}
        />
      </div>
    );
  }

  if (!authReady) {
    return (
      <div
        className="app"
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

  const deepService = service !== null;
  const userName = auth.name || 'User';

  const content =
    service === 'services' ? (
      <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />
    ) : service === 'rental' ? (
      <RentalPage onBack={closeService} onOpenEsim={() => setService('esim')} />
    ) : service === 'virtual-numbers' ? (
      <VirtualNumbersPage onBack={closeService} onOpenNotifications={() => setService('alerts')} />
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
    ) : service ? (
      <ServicePage view={service} onBack={closeService} />
    ) : page === 'history' ? (
      <HistoryPage />
    ) : page === 'services' ? (
      <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />
    ) : (
      {
        home: <HomePage go={setPage} openService={setService} />,
        fund: <FundPage />,
        services: <ServicesPage open={setService} onBack={() => { setService(null); setPage('home'); }} />,
        profile: <ProfilePage openService={setService} />,
      }[page]
    );

  return (
    <AppShell
      dark={dark}
      page={page}
      deepService={deepService}
      userName={userName}
      onNavigate={(next) => {
        setService(null);
        setPage(next);
      }}
      onToggleTheme={() => setDark((v) => !v)}
      onOpenService={(next) => setService(next)}
      onLogout={handleLogout}
    >
      {content}
    </AppShell>
  );
}
