import { NextResponse } from 'next/server';
import { createAdminClient, listOpsDeliveries, type SupabaseClient } from '@ridendine/db';
import { getOpsActorContext, errorResponse, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'deliveries_read');
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const supabase = createAdminClient() as unknown as SupabaseClient;
    const data = await listOpsDeliveries(supabase, { status: status || undefined });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
