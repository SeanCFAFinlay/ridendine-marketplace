import { describe, expect, it, vi } from 'vitest';
import type { ActorContext, OperationResult } from '@ridendine/types';
import { createOperationsCommandGateway } from './operations-command.gateway';

const actor: ActorContext = {
  userId: 'ops-user-1',
  role: 'finance_manager',
};

describe('OperationsCommandGateway', () => {
  it('processes refund commands by creating the Stripe refund inside commerce engine', async () => {
    const createStripeRefund = vi
      .fn<[], Promise<OperationResult<{ id: string }>>>()
      .mockResolvedValue({ success: true, data: { id: 'refund-case-1' } });
    const processRefund = vi.fn();

    const gateway = createOperationsCommandGateway({
      commerce: {
        createStripeRefund,
        processRefund,
      },
    });

    const result = await gateway.execute(
      {
        action: 'process_refund',
        refundCaseId: '123e4567-e89b-12d3-a456-426614174004',
      },
      actor
    );

    expect(result.success).toBe(true);
    expect(createStripeRefund).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174004',
      actor
    );
    expect(processRefund).not.toHaveBeenCalled();
  });

  it('normalizes BANK payout service results into operation results', async () => {
    const markBankPayoutPaid = vi
      .fn<[], Promise<{ ok: boolean; error?: string }>>()
      .mockResolvedValue({ ok: true });

    const gateway = createOperationsCommandGateway({
      payoutAutomation: {
        markBankPayoutPaid,
      },
    });

    const result = await gateway.execute(
      {
        action: 'mark_bank_paid',
        payeeType: 'chef',
        payoutId: '123e4567-e89b-12d3-a456-426614174003',
        bankReference: 'BANK-REF-100',
      },
      actor
    );

    expect(result.success).toBe(true);
    expect(markBankPayoutPaid).toHaveBeenCalledWith({
      payeeType: 'chef',
      payoutId: '123e4567-e89b-12d3-a456-426614174003',
      bankReference: 'BANK-REF-100',
      actor,
    });
  });
});
