import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, CircleHelp, Clock3, ShieldCheck } from 'lucide-react';
import { MarketingHeader, MarketingFooter, ButtonLink } from '../../../src/marketing/components';
import { servicePages } from '../../../src/marketing/data';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return servicePages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = servicePages.find(item => item.slug === slug);
  if (!service) return { title: 'Service not found | Verxor' };
  const canonical = '/services/' + service.slug;
  return {
    title: service.title + ' | Verxor',
    description: service.description,
    alternates: { canonical },
    openGraph: { title: service.title + ' | Verxor', description: service.description, url: 'https://verxor.com' + canonical, siteName: 'Verxor', type: 'website', images: [{ url: '/brand/verxor-logo.svg', alt: 'Verxor' }] },
  };
}

export default async function ServiceLandingPage({ params }: Props) {
  const { slug } = await params;
  const service = servicePages.find(item => item.slug === slug);
  if (!service) notFound();

  const serviceSchema = { '@context': 'https://schema.org', '@type': 'Service', name: service.title, description: service.description, provider: { '@type': 'Organization', name: 'Verxor', url: 'https://verxor.com' }, url: 'https://verxor.com/services/' + service.slug };
  const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: service.faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} /><MarketingHeader />
    <main className="mk-service-page">
      <section className="mk-service-hero"><div className="mk-container mk-service-hero-grid"><div><div className="mk-breadcrumb"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span><span>{service.shortTitle}</span></div><span className="mk-section-eyebrow">{service.eyebrow}</span><h1>{service.title}</h1><p>{service.intro}</p><div className="mk-hero-actions"><ButtonLink href="/workspace" variant="primary">Explore in Verxor <ArrowRight size={17} /></ButtonLink><ButtonLink href="/api-partnership" variant="secondary">API & partner access</ButtonLink></div><div className="mk-service-assurance"><span><ShieldCheck size={16} /> Clear terms</span><span><Clock3 size={16} /> Status visibility</span></div></div><div className="mk-service-art"><div className="mk-service-art-orb" /><div className="mk-service-art-card"><img src="/brand/verxor-logo.svg" alt="" /><span className="mk-mini-label">VERXOR SERVICE GUIDE</span><h2>{service.shortTitle}</h2><p>{service.description}</p><div className="mk-art-divider" /><div className="mk-art-row"><span>Availability</span><b>Check current listing</b></div><div className="mk-art-row"><span>Pricing</span><b>Shown before order</b></div><div className="mk-art-row"><span>Order status</span><b>Track in account</b></div></div></div></div></section>
      <section className="mk-section"><div className="mk-container"><div className="mk-section-heading"><span className="mk-section-eyebrow">WHAT TO KNOW</span><h2>Make an informed choice.</h2><p>Understand the key details before you place an order or integrate this service.</p></div><div className="mk-benefit-grid">{service.benefits.map((benefit, i) => <article key={benefit.title}><span className="mk-benefit-index">0{i + 1}</span><h3>{benefit.title}</h3><p>{benefit.description}</p></article>)}</div></div></section>
      <section className="mk-service-process"><div className="mk-container mk-service-process-grid"><div><span className="mk-section-eyebrow">HOW IT WORKS</span><h2>Three steps to get started.</h2><p>The precise options depend on the selected product and the current availability shown in your account.</p></div><div className="mk-process-list">{service.steps.map((step, i) => <article key={step.title}><span>{i + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}</div></div></section>
      <section className="mk-section mk-service-faq"><div className="mk-container mk-faq-layout"><div><span className="mk-section-eyebrow">SERVICE FAQ</span><h2>Before you continue.</h2><p>Important answers about {service.shortTitle.toLowerCase()}.</p></div><div className="mk-faq-list">{service.faqs.map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="mk-note-band"><div className="mk-container"><CircleHelp size={20} /><p>{service.note}</p></div></section>
      <section className="mk-service-bottom"><div className="mk-container"><div><h2>Ready to explore {service.shortTitle.toLowerCase()}?</h2><p>Review current availability, price and terms in the Verxor platform before confirming.</p></div><ButtonLink href="/workspace" variant="white">Open Verxor <ArrowRight size={17} /></ButtonLink></div></section>
    </main><MarketingFooter /></>;
}
