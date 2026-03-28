import { NextResponse } from 'next/server';
import { createAdminClient, updateDriver, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    if (body.status) {
      const driver = await updateDriver(supabase, id, { status: body.status });
      return NextResponse.json({ data: driver });
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
