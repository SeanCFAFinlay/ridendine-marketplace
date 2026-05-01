import { describe, expect, it, vi } from 'vitest';
import {
  getSupportTicketForCustomer,
  listCustomerSupportTickets,
  listSupportTicketsForSupportAgent,
} from './support.repository';

describe('listSupportTicketsForSupportAgent', () => {
  it('merges assigned tickets with unassigned open pool and dedupes by id', async () => {
    const assignedData = [
      { id: 'a', assigned_to: 'u1', status: 'in_progress', created_at: '2026-01-02T00:00:00Z' },
    ];
    const poolData = [
      { id: 'b', assigned_to: null, status: 'open', created_at: '2026-01-01T00:00:00Z' },
    ];

    const from = vi.fn(() => {
      const chain = {
        select: vi.fn(),
        eq: vi.fn(),
        is: vi.fn(),
        order: vi.fn(),
        _branch: undefined as string | undefined,
      };
      chain.select.mockImplementation(() => chain);
      chain.eq.mockImplementation((col: string) => {
        if (col === 'assigned_to') chain._branch = 'assigned';
        if (col === 'status') chain._branch = 'open_pool';
        return chain;
      });
      chain.is.mockImplementation(() => {
        chain._branch = 'open_pool';
        return chain;
      });
      chain.order.mockImplementation(() => {
        if (chain._branch === 'assigned') {
          return Promise.resolve({ data: assignedData, error: null });
        }
        return Promise.resolve({ data: poolData, error: null });
      });
      return chain;
    });

    const out = await listSupportTicketsForSupportAgent({ from } as any, 'u1');
    expect(out.map((t) => t.id).sort()).toEqual(['a', 'b']);
    expect(out[0]?.id).toBe('a');
  });
});

describe('customer ticket ownership filters', () => {
  it('listCustomerSupportTickets filters rows by customer_id', async () => {
    const eq = vi.fn().mockReturnThis();
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ eq, order });
    const from = vi.fn().mockReturnValue({ select });

    await listCustomerSupportTickets({ from } as any, 'cust-123');
    expect(eq).toHaveBeenCalledWith('customer_id', 'cust-123');
  });

  it('getSupportTicketForCustomer enforces ticket id + customer_id', async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ eq, maybeSingle });
    const from = vi.fn().mockReturnValue({ select });

    await getSupportTicketForCustomer({ from } as any, 'ticket-1', 'cust-999');
    expect(eq).toHaveBeenCalledWith('id', 'ticket-1');
    expect(eq).toHaveBeenCalledWith('customer_id', 'cust-999');
  });
});
