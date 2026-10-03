import { redirect } from 'next/navigation';

/** Clean URL → workspace admin mode */
export default function AdminRedirectPage() {
  redirect('/workspace?admin=1');
}
