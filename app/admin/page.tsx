'use client';

import { useRouter } from 'next/navigation';
import { AdminPage } from '../../src/admin-page';

/**
 * Operator console — separate from user /workspace login.
 * Entry: discreet footer "Admin" link on the marketing site → /admin
 * Auth: ADMIN_PASSWORD via /api/admin/login (not user PIN / phone auth).
 */
export default function AdminRoutePage() {
  const router = useRouter();

  return (
    <AdminPage
      onBack={() => {
        router.push('/');
      }}
    />
  );
}
