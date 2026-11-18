import { notFound } from 'next/navigation';
import { serviceViewFromSlug } from '../../../src/nav-url';
import { VerxorApp } from '../../../src/VerxorApp';

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (view === 'fund') {
    return <VerxorApp initialPage="fund" />;
  }
  const service = serviceViewFromSlug(view);
  if (!service) {
    notFound();
  }
  return <VerxorApp initialPage="home" initialService={service} />;
}
