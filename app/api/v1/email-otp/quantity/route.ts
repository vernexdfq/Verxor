import { NextRequest, NextResponse } from 'next/server';
import * as anymessage from '@/lib/providers/anymessage';
import { resolveEmailOtpPricing } from '@/lib/email-otp-pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!anymessage.isConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Email OTP provider is not configured' },
        { status: 503 },
      );
    }

    const site = (req.nextUrl.searchParams.get('site') || '').trim();
    if (!site || site.length < 3) {
      return NextResponse.json({ ok: false, error: 'site is required' }, { status: 400 });
    }

    // Audience-aware: retail / API user / Child Panel toggles decide the markup.
    const { audience, markup, rate } = await resolveEmailOtpPricing(req);

    const raw = await anymessage.getQuantity(site);
    const domains = anymessage.priceDomains(raw, { markup, rate });

    return NextResponse.json(
      {
        ok: true,
        site: site
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0],
        audience,
        domains,
      },
      // Audience-specific prices must never be cached on the CDN.
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load domains';
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
