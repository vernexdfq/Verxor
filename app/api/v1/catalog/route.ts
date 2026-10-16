import { NextRequest, NextResponse } from 'next/server';
import { sbSelect, supabaseConfigured } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// TEMP marker - will be replaced
export async function GET() {
  return NextResponse.json({ ok: false, reason: 'restoring' }, { status: 503 });
}
