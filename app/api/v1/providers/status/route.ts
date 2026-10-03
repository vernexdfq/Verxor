import { NextResponse } from 'next/server';

/** Operator status — booleans only, no key values. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    providers: {
      fivesim: Boolean(process.env.FIVESIM_API_KEY),
      grizzly: Boolean(process.env.GRIZZLYSMS_API_KEY),
      smsbower: Boolean(process.env.SMSBOWER_API_KEY),
      pvapins: Boolean(process.env.PVAPINS_API_KEY),
      supabase: Boolean(
        (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      resend: Boolean(process.env.RESEND_API_KEY),
      yoyomedia: Boolean(process.env.YOYOMEDIA_API_KEY),
    },
  });
}
