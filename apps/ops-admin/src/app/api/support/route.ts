import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getAllSupportTickets, createSupportTicket } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

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
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const ticket = await createSupportTicket(supabase, body);
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
