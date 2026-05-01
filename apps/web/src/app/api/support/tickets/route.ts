import type { SupabaseClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createServerClient,
  getCustomerByUserId,
  listCustomerSupportTickets,
} from '@ridendine/db';

export const dynamic = 'force-dynamic';

/**
 * Authenticated customers: list own support tickets (no cross-customer rows).
 */
export async function GET() {
  try {
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
      return NextResponse.json(
        { success: false, error: 'Customer profile required to view tickets' },
        { status: 403 }
      );
    }

    const tickets = await listCustomerSupportTickets(
      adminClient as unknown as SupabaseClient,
      customer.id
    );
    return NextResponse.json({ success: true, data: { items: tickets } });
  } catch (e) {
    console.error('[ridendine][web][support-tickets-list]', e);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
