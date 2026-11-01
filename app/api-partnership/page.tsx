import type { Metadata } from 'next';
import { ArrowRight, Check, Code2, KeyRound, Wallet, Webhook, ShieldCheck, Sparkles } from 'lucide-react';
import { MarketingHeader, MarketingFooter, SectionHeading, ButtonLink, IconTile } from '../../src/marketing/components';

export const metadata: Metadata = {
  title: 'API Partnerships & Developer Access | Verxor',
  description:
    'Learn about Verxor API partner access, 50% to 70% wholesale discounts, authentication, wallet requirements, and webhook integration.',
  alternates: { canonical: '/api-partnership' },
  openGraph: {
    title: 'API Partnerships | Verxor',
    description: 'Build with Verxor’s high-throughput digital-services API infrastructure with 50% to 70% wholesale margins.',
    url: 'https://www.verxor.com/api-partnership',
    siteName: 'Verxor',
    type: 'website',
    images: [{ url: '/brand/verxor-logo-512.png', width: 512, height: 512, alt: 'Verxor' }],
  },
};

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Verxor API Partnership',
  provider: { '@type': 'Organization', name: 'Verxor', url: 'https://www.verxor.com' },
  description: 'API access for eligible developers and businesses with 50% to 70% wholesale discounts.',
  url: 'https://www.verxor.com/api-partnership',
};

export default function ApiPartnershipPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <MarketingHeader />
      <main className="mk-partner-page">
        {/* HERO */}
        <section className="mk-partner-hero">
          <div className="mk-container mk-partner-grid">
            <div>
              <div className="mk-subpage-badge">
                <Code2 size={14} className="mk-subpage-badge-icon" />
                <span>FOR DEVELOPERS &amp; HIGH-VOLUME AGENCIES</span>
              </div>
              <h1 className="mk-subpage-title">Build your platform on our automated infrastructure.</h1>
              <p className="mk-subpage-intro">
                High-throughput REST API with documented authentication, sub-second wallet debit, and real-time webhook status callbacks across virtual numbers, VTU data, eSIM, cards, and SMM.
              </p>
              <div className="mk-hero-actions">
                <ButtonLink href="#apply" variant="primary">
                  Apply for API Access <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink href="#commercials" variant="secondary">
                  50%–70% Wholesale Margins
                </ButtonLink>
              </div>
              <div className="mk-proof-row">
                <span>
                  <KeyRound size={15} /> Scoped Bearer Credentials
                </span>
                <span>
                  <Webhook size={15} /> Automated Webhook Push
                </span>
              </div>
            </div>

            {/* Code Window */}
            <div className="mk-code-card">
              <div className="mk-code-top">
                <div className="mk-code-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <b>REST API · Request Example</b>
              </div>
              <pre>
                <code>{`POST /api/v1/orders
Authorization: Bearer vx_live_sec_...
Content-Type: application/json

{
  "service": "virtual-numbers",
  "country": "US",
  "target_app": "whatsapp",
  "webhook_url": "https://yourapp.com/events"
}`}</code>
              </pre>
              <div className="mk-code-foot">
                <ShieldCheck size={14} /> Idempotent order processing · Automated status push
              </div>
            </div>
          </div>
        </section>

        {/* ESSENTIALS */}
        <section className="mk-section">
          <div className="mk-container">
            <SectionHeading
              eyebrow="DESIGNED FOR SCALE"
              title="Built for engineering teams and volume operators."
              description="Reliable REST architecture, strict idempotency, and automated account ledger reconciliation."
            />
            <div className="mk-benefit-grid mk-api-benefits">
              <article className="mk-benefit-card">
                <IconTile icon={KeyRound} tone="blue" />
                <h3>Bearer Authentication</h3>
                <p>Simple token-based authorization with granular API keys and IP allowlisting for enterprise partners.</p>
              </article>
              <article className="mk-benefit-card">
                <IconTile icon={Wallet} tone="green" />
                <h3>Unified Single Balance</h3>
                <p>One balance in Naira or USD covers orders across all services. Reconcile transactions with permanent audit IDs.</p>
              </article>
              <article className="mk-benefit-card">
                <IconTile icon={Webhook} tone="violet" />
                <h3>Instant Webhook Events</h3>
                <p>Receive signed webhook payloads when SMS codes arrive, data bundles deliver, or transactions complete.</p>
              </article>
            </div>
          </div>
        </section>

        {/* INTEGRATION STEPS */}
        <section className="mk-partner-dark" id="integration">
          <div className="mk-container mk-partner-dark-grid">
            <div>
              <span className="mk-section-eyebrow">INTEGRATION FLOW</span>
              <h2>From sandbox testing to high-speed production.</h2>
              <p>Simple three-step developer onboarding to get your application running live.</p>
            </div>
            <div className="mk-integration-steps">
              <article>
                <span>01</span>
                <div>
                  <b>Generate Live API Key</b>
                  <p>Fund your Verxor wallet and generate your scoped partner API key in one click.</p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <b>Connect Endpoints</b>
                  <p>Send standard JSON POST payloads to our catalog, order, and balance endpoints.</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <b>Automate Callbacks</b>
                  <p>Register your webhook receiver to catch status updates and SMS verification codes live.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* WHOLESALE COMMERCIALS */}
        <section className="mk-section" id="commercials">
          <div className="mk-container mk-share-grid">
            <div>
              <span className="mk-section-eyebrow">PARTNER COMMERCIALS</span>
              <h2>50% to 70% wholesale discount pricing for certified partners.</h2>
              <p>
                Certified white-label reseller panels, high-volume agencies, and developers integrating via our unified
                REST API automatically qualify for 50% to 70% wholesale discounts off retail catalog rates. This tiered
                commercial structure provides institutional margins across SMM, virtual numbers, eSIM, VTU data, proxies,
                and digital utility pipelines.
              </p>
              <div className="mk-share-equation">
                <span>Retail Catalog Price</span>
                <b>−</b>
                <span>Wholesale Discount (50%–70%)</span>
                <b>=</b>
                <strong>Institutional Partner Rate</strong>
              </div>
              <p className="mk-small-note">
                Exact discount tiers depend on service category, transaction volume, and account verification tier.
                Priority queues and dedicated server bandwidth are provisioned automatically for active partner accounts.
              </p>
            </div>
            <div className="mk-share-card">
              <span className="mk-share-card-label">ILLUSTRATIVE WHOLESALE SAVINGS</span>
              <div>
                <span>Standard retail catalog</span>
                <b>₦1,000</b>
              </div>
              <div>
                <span>Wholesale discount tier</span>
                <b style={{ color: '#16a34a' }}>− 50% to 70%</b>
              </div>
              <div className="mk-share-net">
                <span>Partner wholesale cost</span>
                <strong>₦300 – ₦500</strong>
              </div>
              <div className="mk-share-split">
                <span>Estimated gross margin</span>
                <strong style={{ color: '#2563eb' }}>50% to 70%</strong>
              </div>
              <p>
                Tiered wholesale pricing applies automatically at checkout and API debit for approved developers,
                agencies, and reseller child panels.
              </p>
            </div>
          </div>
        </section>

        {/* APPLICATION SECTION */}
        <section className="mk-section mk-application-section" id="apply">
          <div className="mk-container mk-application-grid">
            <div>
              <span className="mk-section-eyebrow">JOIN THE PARTNER PROGRAM</span>
              <h2>Start building with Verxor today.</h2>
              <p>
                API documentation, endpoints, and credentials are provided directly inside your active Verxor workspace.
              </p>
              <ul className="mk-check-list">
                <li>
                  <Check size={16} /> Instant API token generation
                </li>
                <li>
                  <Check size={16} /> Full documentation and Swagger definitions
                </li>
                <li>
                  <Check size={16} /> Dedicated technical partner channel
                </li>
              </ul>
            </div>
            <div className="mk-application-card">
              <IconTile icon={Code2} tone="blue" />
              <h3>Developer Workspace</h3>
              <p>
                Launch your Verxor workspace to access your API keys, inspect live documentation, and manage webhook endpoints.
              </p>
              <ButtonLink href="/workspace" variant="primary">
                Open Developer Workspace <ArrowRight size={16} />
              </ButtonLink>
              <p className="mk-small-note">
                Available to all registered accounts. Higher volume tiers unlock automatic priority server queues.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
