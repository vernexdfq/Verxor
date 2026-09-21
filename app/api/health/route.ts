import { NextResponse } from 'next/server';

/** Public health check — no secrets. */
export async function GET() {
  const checks = {
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    flutterwave: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
    fivesim: Boolean(process.env.FIVESIM_API_KEY),
    grizzly: Boolean(process.env.GRIZZLYSMS_API_KEY),
    textverified: Boolean(process.env.TEXTVERIFIED_API_KEY),
    smsbower: Boolean(process.env.SMSBOWER_API_KEY),
  };

  return NextResponse.json({
    ok: true,
    service: 'verxor',
    framework: 'next.js',
    envConfigured: checks,
    timestamp: new Date().toISOString(),
  });
}
