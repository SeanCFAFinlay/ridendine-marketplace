import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    await supabase.auth.signOut();

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
