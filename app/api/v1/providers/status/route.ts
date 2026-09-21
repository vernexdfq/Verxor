import { NextResponse } from 'next/server';

/** Operator status — booleans only, no key values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: {
      fivesim: Boolean(process.env.FIVESIM_API_KEY),
      grizzly: Boolean(process.env.GRIZZLYSMS_API_KEY),
      textverified: Boolean(process.env.TEXTVERIFIED_API_KEY),
      smsbower: Boolean(process.env.SMSBOWER_API_KEY),
      flutterwave: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  });
}
