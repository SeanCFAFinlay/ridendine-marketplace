import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify ops user is authenticated
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify ops user is authenticated
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { first_name, last_name, email, phone, status = 'pending' } = body;

    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Create driver (user_id is null for admin-created drivers)
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert({
        user_id: null,
        first_name,
        last_name,
        email,
        phone,
        status,
        profile_image_url: null,
      })
      .select()
      .single();

    if (driverError) {
      console.error('Failed to create driver:', driverError);
      return NextResponse.json(
        { error: driverError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: driver }, { status: 201 });
  } catch (error) {
    console.error('Failed to create driver:', error);
    return NextResponse.json(
      { error: 'Failed to create driver' },
      { status: 500 }
    );
  }
}
