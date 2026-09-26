/**
 * Isolated mock hooks for Rent-a-Number.
 * When backend is live: replace bodies with API fetches / webhooks.
 * New users start empty once DEMO seeds are removed.
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DEMO_LINES,
  DEMO_THREADS,
  type RentedLine,
  type SmsThread,
} from './rental-data';

export function useRentedNumbers(initial: RentedLine[] = DEMO_LINES) {
  const [lines, setLines] = useState<RentedLine[]>(initial);

  const active = useMemo(() => lines.filter((l) => l.status === 'active'), [lines]);
  const grace = useMemo(() => lines.filter((l) => l.status === 'grace'), [lines]);

  const add = useCallback((line: RentedLine) => {
    setLines((prev) => [line, ...prev]);
  }, []);

  const patch = useCallback((id: string, data: Partial<RentedLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { lines, active, grace, add, patch, remove, setLines };
}

export function useSMSInbox(initial: SmsThread[] = DEMO_THREADS) {
  const [threads, setThreads] = useState<SmsThread[]>(initial);

  const forLine = useCallback(
    (lineId: string | 'all') =>
      lineId === 'all' ? threads : threads.filter((t) => t.lineId === lineId),
    [threads],
  );

  const markRead = useCallback((id: string) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  }, []);

  return { threads, forLine, markRead, setThreads };
}
