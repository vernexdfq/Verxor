'use client';

import { useRouter } from 'next/navigation';
import { AdminPage } from '../../../src/admin-page';

export default function DailyEarningsPage() {
  const router = useRouter();
  return <AdminPage onBack={() => router.push('/admin')} initialSection="overview" />;
}
