import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createServerClient,
  createSupportTicket,
  getCustomerByUserId,
  type SupabaseClient,
} from '@ridendine/db';
import { supportRequestSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';

function buildDescription(
  name: string,
  email: string,
  message: string,
  category?: string
): string {
  const cat = category ? `Category: ${category}\n` : '';
  return `${cat}From: ${name} <${email}>\n\n${message}`;
}

export async function POST(request: NextRequest) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.supportWrite,
    namespace: 'web-support',
    routeKey: 'POST:/api/support',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const validated = supportRequestSchema.parse(body);

    const cookieStore = await cookies();
    const sessionClient = createServerClient(cookieStore);
    const adminClient = createAdminClient() as unknown as SupabaseClient;

    let customerId: string | null = null;
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (user) {
      const customer = await getCustomerByUserId(sessionClient as unknown as SupabaseClient, user.id);
      customerId = customer?.id ?? null;
    }

    const ticket = await createSupportTicket(adminClient, {
      customer_id: customerId,
      subject: validated.subject,
      description: buildDescription(
        validated.name,
        validated.email,
        validated.message,
        validated.category
      ),
      status: 'open',
      priority: 'medium',
      order_id: null,
      chef_id: null,
      driver_id: null,
      assigned_to: null,
      resolved_at: null,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Support request received. We will contact you within 24 hours.',
        data: {
          ticketId: ticket.id,
          estimatedResponseTime: '24 hours',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Support request error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process support request',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed. Please use POST or GET /api/support/tickets.',
    },
    { status: 405 }
  );
}
