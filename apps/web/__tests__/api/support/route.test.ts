/**
 * @jest-environment node
 */

const mockCreateSupportTicket = jest.fn();
const mockCreateAdminClient = jest.fn();
const mockGetUser = jest.fn();
const mockGetCustomerByUserId = jest.fn();

const mockSessionClient = {
  auth: { getUser: mockGetUser },
};

jest.mock('@ridendine/db', () => ({
  createAdminClient: mockCreateAdminClient,
  createServerClient: jest.fn(() => mockSessionClient),
  createSupportTicket: mockCreateSupportTicket,
  getCustomerByUserId: mockGetCustomerByUserId,
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({ getAll: jest.fn(() => []) })),
}));

import { NextRequest } from 'next/server';

async function importRoute() {
  jest.resetModules();

  jest.mock('@ridendine/db', () => ({
    createAdminClient: mockCreateAdminClient,
    createServerClient: jest.fn(() => mockSessionClient),
    createSupportTicket: mockCreateSupportTicket,
    getCustomerByUserId: mockGetCustomerByUserId,
  }));

  jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({ getAll: jest.fn(() => []) })),
  }));

  return import('../../../src/app/api/support/route');
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'My order is late',
  message: 'My order has been delayed and I need help.',
  category: 'order' as const,
};

describe('POST /api/support', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateAdminClient.mockReturnValue({});
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetCustomerByUserId.mockResolvedValue(null);
    mockCreateSupportTicket.mockResolvedValue({
      id: 'ticket-uuid-123',
      customer_id: null,
      subject: 'My order is late',
      description:
        'From: Jane Doe <jane@example.com>\n\nMy order has been delayed and I need help.',
      status: 'open',
      priority: 'medium',
      category: 'order',
      order_id: null,
      assigned_to: null,
      resolved_at: null,
      created_at: '2026-04-20T00:00:00Z',
      updated_at: '2026-04-20T00:00:00Z',
    });
  });

  it('returns 200 with real ticket ID on valid request', async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.ticketId).toBe('ticket-uuid-123');
    expect(json.data.ticketId).not.toMatch(/^TICKET-\d+$/);
  });

  it('calls createSupportTicket with subject and description containing name/email', async () => {
    const { POST } = await importRoute();
    await POST(makeRequest(validBody));

    expect(mockCreateSupportTicket).toHaveBeenCalledTimes(1);
    const [, ticket] = mockCreateSupportTicket.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(ticket.subject).toBe('My order is late');
    expect(ticket.description).toContain('Jane Doe');
    expect(ticket.description).toContain('jane@example.com');
    expect(ticket.description).toContain('My order has been delayed');
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('medium');
  });

  it('calls createAdminClient for ticket insert', async () => {
    const { POST } = await importRoute();
    await POST(makeRequest(validBody));

    expect(mockCreateAdminClient).toHaveBeenCalled();
  });

  it('sets customer_id when user is authenticated and profile exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc' } },
      error: null,
    });
    mockGetCustomerByUserId.mockResolvedValue({ id: 'cust-xyz' });

    const { POST } = await importRoute();
    await POST(makeRequest(validBody));

    const [, ticket] = mockCreateSupportTicket.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(ticket.customer_id).toBe('cust-xyz');
    expect(mockGetCustomerByUserId).toHaveBeenCalled();
  });

  it('sets customer_id to null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await importRoute();
    await POST(makeRequest(validBody));

    const [, ticket] = mockCreateSupportTicket.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(ticket.customer_id).toBeNull();
  });

  it('returns 400 on invalid request (missing subject)', async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ ...validBody, subject: '' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });

  it('returns 400 on invalid email', async () => {
    const { POST } = await importRoute();
    const res = await POST(makeRequest({ ...validBody, email: 'not-an-email' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'email' })])
    );
  });

  it('returns 500 when createSupportTicket throws', async () => {
    mockCreateSupportTicket.mockRejectedValue(new Error('DB failure'));

    const { POST } = await importRoute();
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

describe('GET /api/support', () => {
  it('returns 405 method not allowed', async () => {
    const { GET } = await importRoute();
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(405);
    expect(json.success).toBe(false);
  });
});
