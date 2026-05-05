import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createSupportTicket,
  type SupabaseClient,
} from '@ridendine/db';
import { supportRequestSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getCustomerActorContext } from '@ridendine/engine/server';

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
  // Support is intentionally semi-public: anonymous ticket submission is allowed.
  // getCustomerActorContext is called to attach customerId when the user is authenticated.
  const customerCtx = await getCustomerActorContext();

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

    const adminClient = createAdminClient() as unknown as SupabaseClient;

    const customerId: string | null = customerCtx?.customerId ?? null;

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
