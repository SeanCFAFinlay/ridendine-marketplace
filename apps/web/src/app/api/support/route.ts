import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createSupportTicket } from '@ridendine/db';
import type { SupabaseClient } from '@ridendine/db';
import { supportRequestSchema } from '@ridendine/validation';

async function getOptionalUserId(adminClient: SupabaseClient): Promise<string | null> {
  try {
    const { data: { user } } = await adminClient.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function buildDescription(name: string, email: string, message: string): string {
  return `From: ${name} <${email}>\n\n${message}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = supportRequestSchema.parse(body);

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const userId = await getOptionalUserId(adminClient);

    const ticket = await createSupportTicket(adminClient, {
      user_id: userId ?? '',
      subject: validated.subject,
      description: buildDescription(validated.name, validated.email, validated.message),
      status: 'open',
      priority: 'medium',
      category: validated.category ?? 'general',
      order_id: null,
      customer_id: null,
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
      error: 'Method not allowed. Please use POST.',
    },
    { status: 405 }
  );
}
