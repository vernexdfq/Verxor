import { redirect } from 'next/navigation';

/**
 * Hidden operator entry: /admin → workspace with admin shell.
 * Primary entry remains the barely-visible footer link on the marketing page.
 */
export default function AdminRedirectPage() {
  redirect('/workspace?admin=1');
}
