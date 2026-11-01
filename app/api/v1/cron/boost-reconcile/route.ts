import { NextRequest } from 'next/server';
import { GET as reconcileGet, POST as reconcilePost } from '../../boost/reconcile/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return reconcileGet(req);
}

export async function POST(req: NextRequest) {
  return reconcilePost(req);
}
