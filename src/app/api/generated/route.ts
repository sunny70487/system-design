import { NextResponse } from 'next/server';
import { listGenerated } from '@/lib/server/generated/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = listGenerated();
  return NextResponse.json({ items });
}
