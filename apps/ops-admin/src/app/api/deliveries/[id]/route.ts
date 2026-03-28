import { NextResponse } from 'next/server';
import { createAdminClient, assignDriver, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    if (body.driverId) {
      const delivery = await assignDriver(supabase, id, body.driverId);
      return NextResponse.json({ data: delivery });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
