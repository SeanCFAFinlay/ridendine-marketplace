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

    const stripe = this.deps.getStripe?.() ?? null;
    if (!stripe) {
      return { runId: '', processed: 0, errors: ['Stripe is not configured (STRIPE_SECRET_KEY)'] };
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

      const { data: payoutAcct } = await this.client
        .from('chef_payout_accounts')
        .select('stripe_account_id')
        .eq('chef_id', chefId)
        .maybeSingle();
      const destination = payoutAcct?.stripe_account_id as string | null;
      if (!destination) {
        errors.push(`No Stripe account for chef ${chefId}`);
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

      let transferId: string | null = null;
      try {
        const tr = await stripe.transfers.create(
          {
            amount: line.amountCents,
            currency: line.currency.toLowerCase(),
            destination,
            metadata: {
              payout_run_id: runId,
              storefront_id: line.payeeId,
              payee: 'chef',
            },
          },
          { idempotencyKey: `chef_payout_${runId}_${line.payeeId}`.slice(0, 240) }
        );
        transferId = tr.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Stripe transfer failed (${line.payeeId}): ${msg}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'chef_payout_stripe_error',
          entityId: runId,
          afterState: { storefrontId: line.payeeId, error: msg.slice(0, 500) },
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
        description: `Chef weekly payout run ${runId}`,
        stripeId: transferId,
      });
      if (led.error) {
        errors.push(`Ledger failed after Stripe transfer ${transferId}: ${led.error}`);
        try {
          await stripe.transfers.createReversal(transferId, { amount: line.amountCents });
        } catch (revErr) {
          const rm = revErr instanceof Error ? revErr.message : String(revErr);
          await this.safeAudit({
            actor: input.actor,
            entityType: 'chef_payout_reversal_failed',
            entityId: runId,
            afterState: { transferId, error: rm.slice(0, 500) },
          });
        }
        continue;
      }

      const { error: cpErr } = await this.client.from('chef_payouts').insert({
        chef_id: chefId,
        amount: line.amountCents,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        status: 'completed',
        orders_count: 0,
        stripe_transfer_id: transferId,
        payout_run_id: runId,
        paid_at: new Date().toISOString(),
      });
      if (cpErr) {
        errors.push(`chef_payouts insert failed: ${cpErr.message}`);
        try {
          await stripe.transfers.createReversal(transferId, { amount: line.amountCents });
        } catch {
          /* logged below */
        }
        await this.safeAudit({
          actor: input.actor,
          entityType: 'chef_payout_row_failed',
          entityId: runId,
          afterState: { transferId, error: cpErr.message },
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

    const stripe = this.deps.getStripe?.() ?? null;
    if (!stripe) {
      return { runId: '', processed: 0, errors: ['Stripe is not configured (STRIPE_SECRET_KEY)'] };
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
      const { data: drv } = await this.client
        .from('drivers')
        .select('stripe_connect_account_id')
        .eq('id', line.payeeId)
        .maybeSingle();
      const destination = drv?.stripe_connect_account_id as string | null;
      if (!destination) {
        errors.push(`No Stripe Connect account for driver ${line.payeeId}`);
        continue;
      }

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

      let transferId: string | null = null;
      try {
        const tr = await stripe.transfers.create(
          {
            amount: line.amountCents,
            currency: line.currency.toLowerCase(),
            destination,
            metadata: {
              payout_run_id: runId,
              driver_id: line.payeeId,
              payee: 'driver',
            },
          },
          { idempotencyKey: `driver_payout_${runId}_${line.payeeId}`.slice(0, 240) }
        );
        transferId = tr.id;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Stripe transfer failed (${line.payeeId}): ${msg}`);
        await this.safeAudit({
          actor: input.actor,
          entityType: 'driver_payout_stripe_error',
          entityId: runId,
          afterState: { driverId: line.payeeId, error: msg.slice(0, 500) },
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
        description: `Driver daily payout run ${runId}`,
        stripeId: transferId,
      });
      if (led.error) {
        errors.push(`Ledger failed after Stripe transfer ${transferId}: ${led.error}`);
        try {
          await stripe.transfers.createReversal(transferId, { amount: line.amountCents });
        } catch (revErr) {
          const rm = revErr instanceof Error ? revErr.message : String(revErr);
          await this.safeAudit({
            actor: input.actor,
            entityType: 'driver_payout_reversal_failed',
            entityId: runId,
            afterState: { transferId, error: rm.slice(0, 500) },
          });
        }
        continue;
      }

      const amountDollars = line.amountCents / 100;
      const { error: dpErr } = await this.client.from('driver_payouts').insert({
        driver_id: line.payeeId,
        amount: amountDollars,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        status: 'completed',
        payout_run_id: runId,
        stripe_transfer_id: transferId,
      });
      if (dpErr) {
        errors.push(`driver_payouts insert failed: ${dpErr.message}`);
        try {
          await stripe.transfers.createReversal(transferId, { amount: line.amountCents });
        } catch {
          /* noop */
        }
        await this.safeAudit({
          actor: input.actor,
          entityType: 'driver_payout_row_failed',
          entityId: runId,
          afterState: { transferId, error: dpErr.message },
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
    const stripe = this.deps.getStripe?.() ?? null;
    if (!stripe) {
      await this.client
        .from('instant_payout_requests')
        .update({ status: 'failed', failure_reason: 'Stripe not configured' })
        .eq('id', input.requestId);
      return { ok: false, error: 'Stripe is not configured (STRIPE_SECRET_KEY)' };
    }

    const { data: drv } = await this.client
      .from('drivers')
      .select('stripe_connect_account_id')
      .eq('id', input.driverId)
      .maybeSingle();
    const connectId = drv?.stripe_connect_account_id as string | null;
    if (!connectId) {
      await this.client
        .from('instant_payout_requests')
        .update({ status: 'failed', failure_reason: 'No Stripe Connect account' })
        .eq('id', input.requestId);
      return { ok: false, error: 'No Stripe Connect account' };
    }

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

    let payoutId: string | null = null;
    try {
      const payout = await stripe.payouts.create(
        {
          amount: input.amountCents,
          currency: input.currency.toLowerCase(),
          method: 'instant',
        },
        {
          stripeAccount: connectId,
          idempotencyKey: `instant_payout_${input.requestId}`.slice(0, 240),
        }
      );
      payoutId = payout.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.ledger.reverseInstantPayoutFee({
        orderId: null,
        driverId: input.driverId,
        feeCents: fee,
        currency: input.currency,
        requestId: input.requestId,
      });
      await this.client
        .from('instant_payout_requests')
        .update({ status: 'failed', failure_reason: msg.slice(0, 500) })
        .eq('id', input.requestId);
      await this.safeAudit({
        actor,
        entityType: 'instant_payout_stripe_error',
        entityId: input.requestId,
        afterState: { error: msg.slice(0, 500) },
      });
      return { ok: false, error: msg };
    }

    const payoutLed = await this.ledger.recordPayout({
      orderId: null,
      payee: 'driver',
      payeeEntityId: input.driverId,
      amountCents: input.amountCents,
      currency: input.currency,
      payoutRunId: `instant_principal:${input.requestId}`,
      description: `Instant payout principal ${input.requestId}`,
      stripeId: payoutId,
    });
    if (payoutLed.error) {
      await this.safeAudit({
        actor,
        entityType: 'instant_payout_ledger_critical',
        entityId: input.requestId,
        afterState: {
          stripe_payout_id: payoutId,
          error: payoutLed.error,
          note: 'Stripe payout succeeded but principal ledger failed — requires manual reconciliation',
        },
      });
      await this.client
        .from('instant_payout_requests')
        .update({
          status: 'failed',
          failure_reason: `ledger_principal_failed: ${payoutLed.error}`,
          stripe_payout_id: payoutId,
        })
        .eq('id', input.requestId);
      return { ok: false, error: payoutLed.error };
    }

    await this.client
      .from('instant_payout_requests')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        stripe_payout_id: payoutId,
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
