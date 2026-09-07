import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import { HomePage, HistoryPage, FundPage, NumbersPage, ProfilePage } from './pages';
import type { Page } from './types';
import './styles.css';

function App() {
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const go = (next: Page) => setPage(next);
  const content = {
    home: <HomePage go={go} />,
    history: <HistoryPage />,
    fund: <FundPage />,
    numbers: <NumbersPage />,
    profile: <ProfilePage />,
  }[page];
  return <AppShell dark={dark} onToggleTheme={() => setDark(v => !v)}>{content}</AppShell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
