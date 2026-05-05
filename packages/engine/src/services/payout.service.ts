// ==========================================
// PAYOUT SERVICE — Stripe execution + ledger (Phase 6)
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type { ActorContext } from '@ridendine/types';
import { ActorRole, AuditAction } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import { LedgerService } from './ledger.service';
import {
  validateChefPayoutLine,
  validateDriverBatchPayoutLine,
  validateInstantPayoutRequest,
} from './payout-risk.service';

const INSTANT_FEE_BPS = 150; // 1.5%

export type PayoutPreviewLine = {
  payeeId: string;
  name: string;
  amountCents: number;
  currency: string;
};

export type PayoutServiceDeps = {
  audit?: AuditLogger;
  /** Returns null when Stripe is not configured */
  getStripe?: () => Stripe | null;
};

type BankPayoutPayeeType = 'chef' | 'driver';

function bankPayoutTable(payeeType: BankPayoutPayeeType): 'chef_payouts' | 'driver_payouts' {
  return payeeType === 'chef' ? 'chef_payouts' : 'driver_payouts';
}

export class PayoutService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly ledger: LedgerService,
    private readonly deps: PayoutServiceDeps = {}
  ) {}

  private async safeAudit(params: {
    actor: ActorContext;
    entityType: string;
    entityId: string;
    afterState: Record<string, unknown>;
  }): Promise<void> {
    if (!this.deps.audit) return;
    try {
      await this.deps.audit.log({
        action: AuditAction.PAYOUT,
        entityType: params.entityType,
        entityId: params.entityId,
        actor: params.actor,
        afterState: params.afterState,
      });
    } catch (e) {
      console.error('[PayoutService] audit log failed', e instanceof Error ? e.message : e);
    }
  }

  /** Weekly chef run: balances from platform_accounts (chef_payable). */
  async previewChefRun(_weekEnd: Date): Promise<{ lines: PayoutPreviewLine[]; currency: string }> {
    const { data: rows, error } = await this.client
      .from('platform_accounts')
      .select('owner_id, balance_cents, currency')
      .eq('account_type', 'chef_payable')
      .gt('balance_cents', 0);

    if (error || !rows?.length) {
      return { lines: [], currency: 'CAD' };
    }

    const storefrontIds = rows.map((r) => r.owner_id as string);
    const { data: storefronts } = await this.client
      .from('chef_storefronts')
      .select('id, name, chef_id')
      .in('id', storefrontIds);

    const nameByStore = new Map((storefronts ?? []).map((s) => [s.id as string, (s.name as string) ?? s.id]));

    const lines: PayoutPreviewLine[] = rows.map((r) => ({
      payeeId: r.owner_id as string,
      name: nameByStore.get(r.owner_id as string) ?? (r.owner_id as string),
      amountCents: r.balance_cents as number,
      currency: (r.currency as string) || 'CAD',
    }));

    return { lines, currency: lines[0]?.currency ?? 'CAD' };
  }

  async executeChefRun(input: {
    periodStart: string;
    periodEnd: string;
    actor: ActorContext;
  }): Promise<{ runId: string; processed: number; errors: string[] }> {
    const preview = await this.previewChefRun(new Date(input.periodEnd));
    const errors: string[] = [];
    if (preview.lines.length === 0) {
      return { runId: '', processed: 0, errors: ['No chef payables to settle'] };
    }

    const totalCents = preview.lines.reduce((s, l) => s + l.amountCents, 0);
    const { data: run, error: runErr } = await this.client
      .from('payout_runs')
      .insert({
        run_type: 'chef',
        period_start: input.periodStart,
        period_end: input.periodEnd,
        initiated_by: input.actor.userId,
        status: 'processing',
        total_amount: totalCents / 100,
        total_recipients: preview.lines.length,
        successful_payouts: 0,
        failed_payouts: 0,
      })
      .select('id')
      .single();

    if (runErr || !run) {
      return { runId: '', processed: 0, errors: [runErr?.message ?? 'payout_runs insert failed'] };
    }

    const runId = run.id as string;
    let ok = 0;

    for (const line of preview.lines) {
      const { data: sf } = await this.client
        .from('chef_storefronts')
        .select('chef_id')
        .eq('id', line.payeeId)
        .maybeSingle();
      const chefId = (sf?.chef_id as string) ?? null;
      if (!chefId) {
        errors.push(`No chef for storefront ${line.payeeId}`);
        continue;
      }

      const risk = await validateChefPayoutLine(this.client, {
        storefrontId: line.payeeId,
        chefId,
        amountCents: line.amountCents,
        currency: line.currency,
        payoutRunId: runId,
      });
      if (!risk.ok) {
        errors.push(`${line.payeeId}: ${risk.message}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'chef_payout_blocked',
          entityId: runId,
          afterState: { storefrontId: line.payeeId, code: risk.code, message: risk.message },
        });
        continue;
      }

      const led = await this.ledger.recordPayout({
        orderId: null,
        payee: 'chef',
        payeeEntityId: line.payeeId,
        amountCents: line.amountCents,
        currency: line.currency,
        payoutRunId: runId,
        description: `Bank-funded chef weekly payout run ${runId}`,
        stripeId: null,
      });
      if (led.error) {
        errors.push(`Ledger failed for bank-funded chef payout: ${led.error}`);
        continue;
      }

      const { error: cpErr } = await this.client.from('chef_payouts').insert({
        chef_id: chefId,
        amount: line.amountCents,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        status: 'paid',
        payment_rail: 'bank',
        reconciliation_status: 'pending',
        orders_count: 0,
        stripe_transfer_id: null,
        payout_run_id: runId,
        paid_at: new Date().toISOString(),
      });
      if (cpErr) {
        errors.push(`chef_payouts insert failed: ${cpErr.message}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'chef_payout_row_failed',
          entityId: runId,
          afterState: { paymentRail: 'bank', error: cpErr.message },
        });
        continue;
      }
      ok += 1;
    }

    await this.client
      .from('payout_runs')
      .update({
        status: ok === preview.lines.length ? 'completed' : 'failed',
        successful_payouts: ok,
        failed_payouts: preview.lines.length - ok,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return { runId, processed: ok, errors };
  }

  async previewDriverRun(_dayEnd: Date): Promise<{ lines: PayoutPreviewLine[]; currency: string }> {
    const { data: rows, error } = await this.client
      .from('platform_accounts')
      .select('owner_id, balance_cents, currency')
      .eq('account_type', 'driver_payable')
      .gt('balance_cents', 0);

    if (error || !rows?.length) {
      return { lines: [], currency: 'CAD' };
    }

    const driverIds = rows.map((r) => r.owner_id as string);
    const { data: drivers } = await this.client
      .from('drivers')
      .select('id, first_name, last_name')
      .in('id', driverIds);

    const nameBy = new Map(
      (drivers ?? []).map((d) => [
        d.id as string,
        `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || (d.id as string),
      ])
    );

    const lines: PayoutPreviewLine[] = rows.map((r) => ({
      payeeId: r.owner_id as string,
      name: nameBy.get(r.owner_id as string) ?? (r.owner_id as string),
      amountCents: r.balance_cents as number,
      currency: (r.currency as string) || 'CAD',
    }));

    return { lines, currency: lines[0]?.currency ?? 'CAD' };
  }

  async executeDriverRun(input: {
    periodStart: string;
    periodEnd: string;
    actor: ActorContext;
  }): Promise<{ runId: string; processed: number; errors: string[] }> {
    const preview = await this.previewDriverRun(new Date(input.periodEnd));
    const errors: string[] = [];
    if (preview.lines.length === 0) {
      return { runId: '', processed: 0, errors: ['No driver payables to settle'] };
    }

    const totalCents = preview.lines.reduce((s, l) => s + l.amountCents, 0);
    const { data: run, error: runErr } = await this.client
      .from('payout_runs')
      .insert({
        run_type: 'driver',
        period_start: input.periodStart,
        period_end: input.periodEnd,
        initiated_by: input.actor.userId,
        status: 'processing',
        total_amount: totalCents / 100,
        total_recipients: preview.lines.length,
        successful_payouts: 0,
        failed_payouts: 0,
      })
      .select('id')
      .single();

    if (runErr || !run) {
      return { runId: '', processed: 0, errors: [runErr?.message ?? 'payout_runs insert failed'] };
    }

    const runId = run.id as string;
    let ok = 0;

    for (const line of preview.lines) {
      const risk = await validateDriverBatchPayoutLine(this.client, {
        driverId: line.payeeId,
        amountCents: line.amountCents,
        payoutRunId: runId,
      });
      if (!risk.ok) {
        errors.push(`${line.payeeId}: ${risk.message}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'driver_payout_blocked',
          entityId: runId,
          afterState: { driverId: line.payeeId, code: risk.code, message: risk.message },
        });
        continue;
      }

      const led = await this.ledger.recordPayout({
        orderId: null,
        payee: 'driver',
        payeeEntityId: line.payeeId,
        amountCents: line.amountCents,
        currency: line.currency,
        payoutRunId: runId,
        description: `Bank-funded driver daily payout run ${runId}`,
        stripeId: null,
      });
      if (led.error) {
        errors.push(`Ledger failed for bank-funded driver payout: ${led.error}`);
        continue;
      }

      const amountDollars = line.amountCents / 100;
      const { error: dpErr } = await this.client.from('driver_payouts').insert({
        driver_id: line.payeeId,
        amount: amountDollars,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        status: 'paid',
        payment_rail: 'bank',
        reconciliation_status: 'pending',
        payout_run_id: runId,
        stripe_transfer_id: null,
      });
      if (dpErr) {
        errors.push(`driver_payouts insert failed: ${dpErr.message}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'driver_payout_row_failed',
          entityId: runId,
          afterState: { paymentRail: 'bank', error: dpErr.message },
        });
        continue;
      }
      ok += 1;
    }

    await this.client
      .from('payout_runs')
      .update({
        status: ok === preview.lines.length ? 'completed' : 'failed',
        successful_payouts: ok,
        failed_payouts: preview.lines.length - ok,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return { runId, processed: ok, errors };
  }

  async scheduleChefPayout(input: {
    chefId: string;
    storefrontId: string;
    amountCents: number;
    actor: ActorContext;
  }): Promise<{ payoutId: string; amountCents: number; currency: string; error?: string }> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { payoutId: '', amountCents: input.amountCents, currency: 'CAD', error: 'amountCents must be a positive integer' };
    }

    const { data: account } = await this.client
      .from('platform_accounts')
      .select('balance_cents, currency')
      .eq('account_type', 'chef_payable')
      .eq('owner_id', input.storefrontId)
      .maybeSingle();

    const balanceCents = Number((account as { balance_cents?: number } | null)?.balance_cents ?? 0);
    const currency = ((account as { currency?: string } | null)?.currency ?? 'CAD').toUpperCase();
    if (input.amountCents > balanceCents) {
      return { payoutId: '', amountCents: input.amountCents, currency, error: 'Amount exceeds available chef payable balance' };
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { data, error } = await this.client
      .from('chef_payouts')
      .insert({
        chef_id: input.chefId,
        amount: input.amountCents,
        status: 'scheduled',
        payment_rail: 'bank',
        reconciliation_status: 'pending',
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        orders_count: 0,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { payoutId: '', amountCents: input.amountCents, currency, error: error?.message ?? 'chef_payouts insert failed' };
    }

    await this.safeAudit({
      actor: input.actor,
      entityType: 'chef_payout',
      entityId: data.id as string,
      afterState: {
        status: 'scheduled',
        chefId: input.chefId,
        storefrontId: input.storefrontId,
        amountCents: input.amountCents,
      },
    });

    return { payoutId: data.id as string, amountCents: input.amountCents, currency };
  }

  async approveBankPayout(input: {
    payeeType: BankPayoutPayeeType;
    payoutId: string;
    actor: ActorContext;
  }): Promise<{ ok: boolean; error?: string }> {
    const now = new Date().toISOString();
    const { error } = await this.client
      .from(bankPayoutTable(input.payeeType))
      .update({
        status: 'approved',
        payment_rail: 'bank',
        approved_by: input.actor.userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', input.payoutId)
      .eq('status', 'scheduled')
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async exportBankPayoutBatch(input: {
    payeeType: BankPayoutPayeeType;
    payoutIds: string[];
    actor: ActorContext;
    bankBatchId?: string;
  }): Promise<{ ok: boolean; bankBatchId: string; error?: string }> {
    const bankBatchId = input.bankBatchId ?? `bank_${input.payeeType}_${Date.now()}`;
    if (input.payoutIds.length === 0) {
      return { ok: false, bankBatchId, error: 'No payout ids provided' };
    }

    const now = new Date().toISOString();
    const { error } = await this.client
      .from(bankPayoutTable(input.payeeType))
      .update({
        status: 'exported',
        payment_rail: 'bank',
        bank_batch_id: bankBatchId,
        executed_by: input.actor.userId,
        executed_at: now,
        updated_at: now,
      })
      .in('id', input.payoutIds)
      .in('status', ['approved', 'scheduled']);

    if (error) return { ok: false, bankBatchId, error: error.message };
    return { ok: true, bankBatchId };
  }

  async markBankPayoutSubmitted(input: {
    payeeType: BankPayoutPayeeType;
    payoutId: string;
    actor: ActorContext;
    bankReference?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.updateBankPayoutStatus(input.payeeType, input.payoutId, {
      status: 'bank_submitted',
      bank_reference: input.bankReference ?? null,
      executed_by: input.actor.userId,
      executed_at: new Date().toISOString(),
    });
  }

  async markBankPayoutPaid(input: {
    payeeType: BankPayoutPayeeType;
    payoutId: string;
    actor: ActorContext;
    bankReference: string;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.updateBankPayoutStatus(input.payeeType, input.payoutId, {
      status: 'paid',
      bank_reference: input.bankReference,
      paid_at: new Date().toISOString(),
      executed_by: input.actor.userId,
      executed_at: new Date().toISOString(),
    });
  }

  async reconcileBankPayout(input: {
    payeeType: BankPayoutPayeeType;
    payoutId: string;
    actor: ActorContext;
    bankReference?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    return this.updateBankPayoutStatus(input.payeeType, input.payoutId, {
      status: 'reconciled',
      reconciliation_status: 'reconciled',
      bank_reference: input.bankReference ?? null,
    });
  }

  private async updateBankPayoutStatus(
    payeeType: BankPayoutPayeeType,
    payoutId: string,
    patch: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.client
      .from(bankPayoutTable(payeeType))
      .update({
        payment_rail: 'bank',
        updated_at: new Date().toISOString(),
        ...patch,
      })
      .eq('id', payoutId)
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  instantFeeCents(amountCents: number): number {
    return Math.round((amountCents * INSTANT_FEE_BPS) / 10_000);
  }

  async requestInstantPayout(input: {
    driverId: string;
    amountCents: number;
    currency: string;
  }): Promise<{ requestId: string; feeCents: number; error?: string }> {
    const fee = this.instantFeeCents(input.amountCents);
    const { data, error } = await this.client
      .from('instant_payout_requests')
      .insert({
        driver_id: input.driverId,
        amount_cents: input.amountCents,
        fee_cents: fee,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !data) {
      return { requestId: '', feeCents: fee, error: error?.message ?? 'insert failed' };
    }
    return { requestId: data.id as string, feeCents: fee };
  }

  async executeInstantPayout(input: {
    requestId: string;
    driverId: string;
    amountCents: number;
    currency: string;
    actor?: ActorContext;
  }): Promise<{ ok: boolean; error?: string }> {
    const actor =
      input.actor ??
      ({
        userId: '00000000-0000-0000-0000-000000000000',
        role: ActorRole.SYSTEM,
      } as ActorContext);

    const risk = await validateInstantPayoutRequest(this.client, {
      requestId: input.requestId,
      driverId: input.driverId,
      amountCents: input.amountCents,
    });
    if (!risk.ok) {
      await this.client
        .from('instant_payout_requests')
        .update({ status: 'failed', failure_reason: risk.message })
        .eq('id', input.requestId)
        .eq('status', 'pending');
      await this.safeAudit({
        actor,
        entityType: 'instant_payout_blocked',
        entityId: input.requestId,
        afterState: { code: risk.code, message: risk.message },
      });
      return { ok: false, error: risk.message };
    }

    const { data: locked } = await this.client
      .from('instant_payout_requests')
      .update({ status: 'executing' })
      .eq('id', input.requestId)
      .eq('status', 'pending')
      .select('id, fee_cents, amount_cents')
      .maybeSingle();

    if (!locked) {
      return { ok: false, error: 'Request not pending or already executing' };
    }

    const fee = (locked.fee_cents as number) ?? this.instantFeeCents(input.amountCents);
    const feeLed = await this.ledger.recordInstantPayoutFee({
      orderId: null,
      driverId: input.driverId,
      feeCents: fee,
      currency: input.currency,
      requestId: input.requestId,
    });
    if (feeLed.error) {
      await this.client
        .from('instant_payout_requests')
        .update({ status: 'failed', failure_reason: feeLed.error })
        .eq('id', input.requestId);
      return { ok: false, error: feeLed.error };
    }

    const payoutLed = await this.ledger.recordPayout({
      orderId: null,
      payee: 'driver',
      payeeEntityId: input.driverId,
      amountCents: input.amountCents,
      currency: input.currency,
      payoutRunId: `instant_principal:${input.requestId}`,
      description: `Bank-funded instant payout principal ${input.requestId}`,
      stripeId: null,
    });
    if (payoutLed.error) {
      await this.safeAudit({
        actor,
        entityType: 'instant_payout_ledger_critical',
        entityId: input.requestId,
        afterState: {
          paymentRail: 'bank',
          error: payoutLed.error,
          note: 'Bank-funded instant payout ledger failed — requires manual reconciliation',
        },
      });
      await this.client
        .from('instant_payout_requests')
        .update({
          status: 'failed',
          failure_reason: `ledger_principal_failed: ${payoutLed.error}`,
          stripe_payout_id: null,
        })
        .eq('id', input.requestId);
      return { ok: false, error: payoutLed.error };
    }

    await this.client
      .from('instant_payout_requests')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        stripe_payout_id: null,
        failure_reason: null,
      })
      .eq('id', input.requestId);

    return { ok: true };
  }

  async cancelInstantPayout(requestId: string): Promise<{ ok: boolean; error?: string }> {
    const { data: updated, error } = await this.client
      .from('instant_payout_requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!updated) return { ok: false, error: 'Request not found or not pending' };
    return { ok: true };
  }
}

export function createPayoutService(
  client: SupabaseClient,
  ledger: LedgerService,
  deps?: PayoutServiceDeps
): PayoutService {
  return new PayoutService(client, ledger, deps);
}
