import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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
    const supabase = createAdminClient();
    const body = await request.json();

    const { first_name, last_name, email, phone, status = 'pending' } = body;

    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Generate a UUID for ops-admin created drivers
    const placeholderUserId = crypto.randomUUID();

    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert({
        user_id: placeholderUserId,
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
