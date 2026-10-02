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
import type { Page } from './types';

const SESSION_USER = { name: 'Destiny' };

export function VerxorApp() {
  const [page, setPage] = useState<Page>('home');
  const [service, setService] = useState<ServiceView | null>(null);
  const [dark, setDark] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') {
      setAdmin(true);
    }
  }, []);

  const closeService = () => setService(null);

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

  const deepService = service !== null;

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
      userName={SESSION_USER.name}
      onNavigate={(next) => {
        setService(null);
        setPage(next);
      }}
      onToggleTheme={() => setDark((v) => !v)}
      onOpenService={(next) => setService(next)}
      onLogout={() => {
        setService(null);
        setPage('home');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }}
    >
      {content}
    </AppShell>
  );
}
