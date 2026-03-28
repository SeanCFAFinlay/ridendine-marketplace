import { NextResponse } from 'next/server';
import { createAdminClient, updateSupportTicket, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const ticket = await updateSupportTicket(supabase, id, body);
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
