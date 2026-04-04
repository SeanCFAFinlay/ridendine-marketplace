import { NextResponse } from 'next/server';
import { createAdminClient, listOpsSupportTickets, createSupportTicket, type SupabaseClient } from '@ridendine/db';
import { getOpsActorContext, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const tickets = await listOpsSupportTickets(supabase);
    return NextResponse.json({ data: tickets });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const ticket = await createSupportTicket(supabase, body);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
