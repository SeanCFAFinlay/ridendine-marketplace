import { NextResponse } from 'next/server';
import { createAdminClient, getAllSupportTickets, createSupportTicket, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const tickets = await getAllSupportTickets(supabase);
    return NextResponse.json({ data: tickets });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const ticket = await createSupportTicket(supabase, body);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
