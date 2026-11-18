import type { Metadata } from 'next';
import { ArrowRight, Check, Globe2, Layers, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { MarketingHeader, MarketingFooter, SectionHeading, ButtonLink, IconTile } from '../../src/marketing/components';

export const metadata: Metadata = {
  title: 'White-label Child Panels & Reseller Program | Verxor',
  description:
    'Run your own branded digital-services child panel powered by Verxor infrastructure, with custom domain mapping, retail pricing rules, and 50% to 70% wholesale discounts.',
  alternates: { canonical: '/child-panels' },
  openGraph: {
    title: 'Child Panels & Resellers | Verxor',
    description: 'Explore a white-label digital-services panel powered by Verxor with 50% to 70% wholesale margins.',
    url: 'https://www.verxor.com/child-panels',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo-512.png', width: 512, height: 512, alt: 'Verxor' }],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Verxor Child Panel Program',
  provider: { '@type': 'Organization', name: 'Verxor', url: 'https://www.verxor.com' },
  description: 'White-label digital-services child panels for approved reseller businesses.',
  url: 'https://www.verxor.com/child-panels',
};

export default function ChildPanelsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main className="mk-partner-page">
        {/* HERO */}
        <section className="mk-partner-hero mk-reseller-hero">
          <div className="mk-container mk-partner-grid">
            <div>
              <div className="mk-subpage-badge">
                <Layers size={14} className="mk-subpage-badge-icon" />
                <span>WHITE-LABEL RESELLER ECOSYSTEM</span>
              </div>
              <h1 className="mk-subpage-title">Your brand on the front. Verxor powering the service layer.</h1>
              <p className="mk-subpage-intro">
                Launch your own branded child panel for virtual numbers, VTU utilities, eSIMs, and SMM growth.
                Enjoy turnkey custom domain mapping, custom retail markups, and automated backend fulfillment.
              </p>
              <div className="mk-hero-actions">
                <ButtonLink href="#how-it-works" variant="primary">
                  Explore Panel Program <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink href="#pricing" variant="secondary">
                  50%–70% Wholesale Margins
                </ButtonLink>
              </div>
              <div className="mk-proof-row">
                <span>
                  <Layers size={15} /> 100% White-Label Branding
                </span>
                <span>
                  <ShieldCheck size={15} /> Automated Order Routing
                </span>
              </div>
            </div>

            {/* Visual Panel Card */}
            <div className="mk-reseller-visual">
              <div className="mk-reseller-window">
                <div className="mk-reseller-window-head">
                  <img src="/brand/verxor-logo.svg" alt="" width={24} height={24} />
                  <span>Your Brand Panel</span>
                  <span className="mk-preview-pill">WHITE-LABEL</span>
                </div>
                <div className="mk-reseller-welcome">
                  <span className="mk-mini-label">RESELLER WORKSPACE</span>
                  <h2>Run your digital agency under your domain.</h2>
                  <p>Customer orders route automatically to Verxor carrier pipelines.</p>
                </div>
                <div className="mk-reseller-metrics">
                  <div>
                    <span>Wholesale Margin</span>
                    <b style={{ color: '#16a34a' }}>50% to 70% Off</b>
                  </div>
                  <div>
                    <span>Custom Domain</span>
                    <b>yourbrand.com</b>
                  </div>
                  <div>
                    <span>Order Routing</span>
                    <b>100% Automated</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THREE BENEFIT PILLARS */}
        <section className="mk-section">
          <div className="mk-container">
            <SectionHeading
              eyebrow="YOUR BUSINESS, CONNECTED"
              title="A clearer operating model for resellers."
              description="Child panels run as separate branded tenant experiences with synchronized wallet balances and custom catalog controls."
            />
            <div className="mk-benefit-grid">
              <article className="mk-benefit-card">
                <IconTile icon={Layers} tone="blue" />
                <h3>Branded Customer Experience</h3>
                <p>Present enabled services under your own logo, theme colors, and custom terms. Your customers never see upstream provider names.</p>
              </article>
              <article className="mk-benefit-card">
                <IconTile icon={Globe2} tone="violet" />
                <h3>Custom Domain Mapping</h3>
                <p>Point your custom domain (e.g. portal.yourbrand.com) with automated SSL provisioning and high-speed edge CDN delivery.</p>
              </article>
              <article className="mk-benefit-card">
                <IconTile icon={Wallet} tone="green" />
                <h3>Wallet Synchronization</h3>
                <p>Customers pay into your payment gateway, while orders deduct at wholesale discount rates from your Verxor wallet automatically.</p>
              </article>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mk-partner-dark" id="how-it-works">
          <div className="mk-container mk-partner-dark-grid">
            <div>
              <span className="mk-section-eyebrow">HOW IT WORKS</span>
              <h2>Clear boundaries. Shared infrastructure.</h2>
              <p>Verxor operates the core service layer. You manage customer marketing, relationships, and custom retail markup.</p>
            </div>
            <div className="mk-integration-steps">
              <article>
                <span>01</span>
                <div>
                  <b>Connect Your Brand &amp; Domain</b>
                  <p>Configure your business name, logo, theme, and DNS records.</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <b>Set Custom Retail Prices</b>
                  <p>Set custom retail margins above Verxor wholesale floor rates. You keep 100% of the profit.</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <b>Automate Order Routing</b>
                  <p>Every customer purchase triggers instant API fulfillment with live status updates.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* PRICING & COMMERCIALS */}
        <section className="mk-section" id="pricing">
          <div className="mk-container mk-pricing-rules">
            <div>
              <span className="mk-section-eyebrow">PRICING &amp; COMMERCIALS</span>
              <h2>50% to 70% wholesale discounts for your child panel.</h2>
              <p>
                Certified child panels automatically receive 50% to 70% wholesale discounts off retail catalog rates.
                You set your own custom retail prices above Verxor wholesale floors, keeping 100% of the markup margin
                while our infrastructure automates fulfillment.
              </p>
            </div>
            <div className="mk-rule-card">
              <div>
                <span>Wholesale discount tier</span>
                <b style={{ color: '#16a34a' }}>50% to 70% Off Retail</b>
              </div>
              <div className="mk-rule-line" />
              <div>
                <span>Your custom retail price</span>
                <b>100% of markup margin is yours</b>
              </div>
              <div className="mk-rule-check">
                <Check size={16} /> Automated order fulfillment &amp; wallet sync
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mk-section mk-application-section" id="apply">
          <div className="mk-container mk-application-grid">
            <div>
              <span className="mk-section-eyebrow">BECOME A RESELLER</span>
              <h2>Launch your child panel today.</h2>
              <p>
                Explore reseller options, API access, and custom configurations inside your Verxor workspace.
              </p>
              <ul className="mk-check-list">
                <li>
                  <Check size={16} /> Custom branding and domain options
                </li>
                <li>
                  <Check size={16} /> Enabled catalog of numbers, VTU, cards, and SMM
                </li>
                <li>
                  <Check size={16} /> 50% to 70% wholesale profit margins
                </li>
              </ul>
            </div>
            <div className="mk-application-card">
              <IconTile icon={Layers} tone="violet" />
              <h3>Reseller Workspace</h3>
              <p>
                Launch your Verxor workspace to manage your reseller settings, view wholesale rates, and connect custom domains.
              </p>
              <ButtonLink href="/dashboard" variant="primary">
                Open Reseller Workspace <ArrowRight size={16} />
              </ButtonLink>
              <p className="mk-small-note">
                Instant access. Priority queues are provisioned automatically as your monthly volume grows.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
