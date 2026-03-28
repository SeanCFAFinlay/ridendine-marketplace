import { NextResponse } from 'next/server';
import { createAdminClient, updateChefProfile, type SupabaseClient } from '@ridendine/db';

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
      const chef = await updateChefProfile(supabase, id, { status: body.status });
      return NextResponse.json({ data: chef });
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
