import type { SupabaseClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createServerClient,
  getCustomerByUserId,
  getSupportTicketForCustomer,
} from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionClient = createServerClient(cookieStore);
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await getCustomerByUserId(
      sessionClient as unknown as SupabaseClient,
      user.id
    );
    if (!customer?.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const ticket = await getSupportTicketForCustomer(
      adminClient as unknown as SupabaseClient,
      id,
      customer.id
    );
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (e) {
    console.error('[ridendine][web][support-ticket-detail]', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
