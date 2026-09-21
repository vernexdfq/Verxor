import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.GRIZZLYSMS_API_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  try {
    await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // TODO: update number order OTP status in Supabase + push notification row
  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ service: 'grizzlysms-webhook', ready: Boolean(process.env.GRIZZLYSMS_API_KEY) });
}
