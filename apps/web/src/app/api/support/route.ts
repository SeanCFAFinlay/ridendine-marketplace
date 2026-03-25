import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const supportRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.enum(['general', 'order', 'technical', 'chef', 'other']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = supportRequestSchema.parse(body);

    console.log('Support request received:', {
      name: validated.name,
      email: validated.email,
      subject: validated.subject,
      category: validated.category || 'general',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Support request received. We will contact you within 24 hours.',
        data: {
          ticketId: `TICKET-${Date.now()}`,
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
