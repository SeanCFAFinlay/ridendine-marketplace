import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getDriverByUserId, updateDriverStatus } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const driver = await getDriverByUserId(supabase as any, user.id);

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['offline', 'online', 'busy'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: offline, online, busy' },
        { status: 400 }
      );
    }

    const presence = await updateDriverStatus(supabase as any, driver.id, status);

    return NextResponse.json({ presence });
  } catch (error) {
    console.error('Error updating driver presence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
