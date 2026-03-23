import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, updateSupportTicket } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const ticket = await updateSupportTicket(supabase, id, body);
    return NextResponse.json({ data: ticket });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
