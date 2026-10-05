import type { SupabaseClient } from '../client/types';

export interface PendingRefundSummary {
  id: string;
  order_number: string;
  amount_cents: number;
  reason: string | null;
  customer_name: string;
  created_at: string;
}

export interface PendingPayoutAdjustmentSummary {
  id: string;
  payee_type: string;
  payee_id: string;
  amount_cents: number;
  adjustment_type: string;
  status: string;
  created_at: string;
  order_number: string;
}

export interface LedgerEntrySummary {
  id: string;
  entry_type: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
}

export interface LiabilitySummary {
  id: string;
  name: string;
  amount: number;
}

type RefundCaseRow = {
  id: string;
  approved_amount_cents?: number;
  requested_amount_cents: number;
  refund_reason?: string | null;
  created_at: string;
  orders?:
    | {
        order_number?: string;
        customer?: { first_name?: string | null; last_name?: string | null } | null;
      }
    | Array<{
        order_number?: string;
        customer?: { first_name?: string | null; last_name?: string | null } | null;
      }>
    | null;
};

type AdjustmentRow = {
  id: string;
  payee_type: string;
  payee_id: string;
  amount_cents: number;
  adjustment_type: string;
  status: string;
  created_at: string;
  orders?: { order_number?: string } | Array<{ order_number?: string }> | null;
};

type LiabilitySummaryRow = {
  id: string;
  name: string | null;
  amount: number | string | null;
};

function getRefundOrderNumber(refund: RefundCaseRow): string {
  if (!refund.orders) return 'Unknown';
  return Array.isArray(refund.orders)
    ? refund.orders[0]?.order_number ?? 'Unknown'
    : refund.orders.order_number ?? 'Unknown';
}

function getRefundCustomerName(refund: RefundCaseRow): string {
  const customer = Array.isArray(refund.orders) ? refund.orders[0]?.customer : refund.orders?.customer;
  return `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim() || 'Unknown Customer';
}

function getAdjustmentOrderNumber(adjustment: AdjustmentRow): string {
  if (!adjustment.orders) return 'Unknown';
  return Array.isArray(adjustment.orders)
    ? adjustment.orders[0]?.order_number ?? 'Unknown'
    : adjustment.orders.order_number ?? 'Unknown';
}

export async function getPendingRefundSummaries(
  client: SupabaseClient,
  limit = 25
): Promise<PendingRefundSummary[]> {
  const { data, error } = await client
    .from('refund_cases')
    .select(`
      id,
      approved_amount_cents,
      requested_amount_cents,
      refund_reason,
      created_at,
      orders (
        order_number,
        customer:customers (
          first_name,
          last_name
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as RefundCaseRow[]).map((refund) => ({
    id: refund.id,
    order_number: getRefundOrderNumber(refund),
    amount_cents: refund.approved_amount_cents ?? refund.requested_amount_cents,
    reason: refund.refund_reason ?? null,
    customer_name: getRefundCustomerName(refund),
    created_at: refund.created_at,
  }));
}

export async function getPendingPayoutAdjustmentSummaries(
  client: SupabaseClient,
  limit = 25
): Promise<PendingPayoutAdjustmentSummary[]> {
  const { data, error } = await client
    .from('payout_adjustments')
    .select(`
      id,
      payee_type,
      payee_id,
      amount_cents,
      adjustment_type,
      status,
      created_at,
      orders (order_number)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as AdjustmentRow[]).map((adjustment) => ({
    id: adjustment.id,
    payee_type: adjustment.payee_type,
    payee_id: adjustment.payee_id,
    amount_cents: adjustment.amount_cents,
    adjustment_type: adjustment.adjustment_type,
    status: adjustment.status,
    created_at: adjustment.created_at,
    order_number: getAdjustmentOrderNumber(adjustment),
  }));
}

export async function getRecentLedgerEntries(
  client: SupabaseClient,
  limit = 25
): Promise<LedgerEntrySummary[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('id, entry_type, amount_cents, currency, description, created_at, entity_type, entity_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LedgerEntrySummary[];
}

function mapLiabilitySummaryRows(
  rows: LiabilitySummaryRow[],
  fallbackName: string
): LiabilitySummary[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? fallbackName,
    amount: Number(row.amount ?? 0),
  }));
}

export async function getChefLiabilitySummaries(
  client: SupabaseClient,
  limit = 10
): Promise<LiabilitySummary[]> {
  // Aggregation is done in SQL (SUM ... GROUP BY) by a SECURITY DEFINER RPC
  // (migration 00045) instead of selecting every ledger row and summing in JS.
  const { data, error } = await client.rpc('get_chef_liability_summaries', { p_limit: limit });

  if (error) throw error;
  return mapLiabilitySummaryRows((data ?? []) as LiabilitySummaryRow[], 'Unknown Chef');
}

export async function getDriverLiabilitySummaries(
  client: SupabaseClient,
  limit = 10
): Promise<LiabilitySummary[]> {
  // Aggregation is done in SQL (SUM ... GROUP BY) by a SECURITY DEFINER RPC
  // (migration 00045) instead of selecting every ledger row and summing in JS.
  const { data, error } = await client.rpc('get_driver_liability_summaries', { p_limit: limit });

  if (error) throw error;
  return mapLiabilitySummaryRows((data ?? []) as LiabilitySummaryRow[], 'Unknown Driver');
}

// ==========================================
// LEDGER READ MODELS (ops-admin payouts/analytics)
// ==========================================

export interface LedgerEntityAmountRow {
  entity_id: string | null;
  amount_cents: number;
}

/** chef_payable ledger lines (entity_id + amount) since `sinceIso`. */
export async function listChefPayableLedgerTotalsSince(
  client: SupabaseClient,
  sinceIso: string
): Promise<LedgerEntityAmountRow[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .eq('entry_type', 'chef_payable')
    .gte('created_at', sinceIso);

  if (error) throw error;
  return (data ?? []) as unknown as LedgerEntityAmountRow[];
}

/** All chef_payable ledger lines scoped to chef entities (lifetime totals). */
export async function listChefPayableLedgerTotals(
  client: SupabaseClient
): Promise<LedgerEntityAmountRow[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .eq('entry_type', 'chef_payable')
    .eq('entity_type', 'chef');

  if (error) throw error;
  return (data ?? []) as unknown as LedgerEntityAmountRow[];
}

export interface LedgerEntryDetailRow {
  id: string;
  created_at: string;
  entry_type: string;
  amount_cents: number;
  description: string | null;
  order_id?: string | null;
  entity_id?: string | null;
  metadata: Record<string, unknown> | null;
}

/** Ledger lines scoped to one entity (chef/driver account detail). */
export async function listLedgerEntriesForEntity(
  client: SupabaseClient,
  entityType: string,
  entityId: string,
  limit = 100
): Promise<LedgerEntryDetailRow[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('id, created_at, entry_type, amount_cents, description, order_id, metadata')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as LedgerEntryDetailRow[];
}

/** Ledger lines tagged with a payout run id in their metadata. */
export async function listLedgerEntriesForPayoutRun(
  client: SupabaseClient,
  payoutRunId: string,
  limit = 200
): Promise<LedgerEntryDetailRow[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('id, created_at, entry_type, amount_cents, description, entity_id, metadata')
    .contains('metadata', { payout_run_id: payoutRunId })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as LedgerEntryDetailRow[];
}

export interface LedgerExportRow {
  entry_type: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

/** Ledger lines in [start, end] for CSV export, newest first. */
export async function listLedgerExportRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<LedgerExportRow[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('entry_type, amount_cents, currency, description, entity_type, entity_id, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as LedgerExportRow[];
}

// ==========================================
// CHEF PAYOUTS / PAYOUT ACCOUNTS
// ==========================================

export interface ChefPayoutTotalRow {
  chef_id: string;
  amount: number;
}

/** chef_payouts (chef_id + amount) in the given statuses. */
export async function listChefPayoutTotalsByStatuses(
  client: SupabaseClient,
  statuses: string[]
): Promise<ChefPayoutTotalRow[]> {
  const { data, error } = await client
    .from('chef_payouts')
    .select('chef_id, amount')
    .in('status', statuses as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as ChefPayoutTotalRow[];
}

export interface ChefPayoutAccountRef {
  chef_id: string;
  stripe_account_id: string | null;
  payout_enabled: boolean | null;
}

/** Payout account refs for the given chef ids. */
export async function listChefPayoutAccountRefs(
  client: SupabaseClient,
  chefIds: string[]
): Promise<ChefPayoutAccountRef[]> {
  const { data, error } = await client
    .from('chef_payout_accounts')
    .select('chef_id, stripe_account_id, payout_enabled')
    .in('chef_id', chefIds as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as ChefPayoutAccountRef[];
}

export interface BankChefPayoutRow {
  id: string;
  chef_id: string;
  amount: number;
  status: string;
  payment_rail?: string | null;
  bank_batch_id: string | null;
  bank_reference: string | null;
  reconciliation_status: string | null;
  created_at: string;
}

/** Bank-rail chef payouts in the given statuses. */
export async function listBankChefPayouts(
  client: SupabaseClient,
  statuses: string[]
): Promise<BankChefPayoutRow[]> {
  const { data, error } = await client
    .from('chef_payouts')
    .select('id, chef_id, amount, status, payment_rail, bank_batch_id, bank_reference, reconciliation_status, created_at')
    .eq('payment_rail', 'bank')
    .in('status', statuses as never[]);

  if (error) throw error;
  return (data || []) as unknown as BankChefPayoutRow[];
}

export interface BankPayoutExportRow {
  id: string;
  chef_id: string;
  amount: number;
  status: string;
  bank_batch_id: string | null;
  bank_reference: string | null;
  reconciliation_status: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

/** Bank-rail chef payouts created in [start, end] for CSV export. */
export async function listBankPayoutExportRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<BankPayoutExportRow[]> {
  const { data, error } = await client
    .from('chef_payouts')
    .select('id, chef_id, amount, status, bank_batch_id, bank_reference, reconciliation_status, period_start, period_end, created_at')
    .eq('payment_rail', 'bank')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as BankPayoutExportRow[];
}

// ==========================================
// PAYOUT RUNS
// ==========================================

export interface PayoutRunSummaryRow {
  id: string;
  run_type: string;
  status: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  successful_payouts: number;
  failed_payouts: number;
  created_at: string;
}

/** Recent payout runs, newest first. */
export async function listPayoutRunSummaries(
  client: SupabaseClient,
  limit = 80
): Promise<PayoutRunSummaryRow[]> {
  const { data, error } = await client
    .from('payout_runs')
    .select('id, run_type, status, period_start, period_end, total_amount, successful_payouts, failed_payouts, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PayoutRunSummaryRow[];
}

/** Full payout run row by id, or null when missing. */
export async function getPayoutRunById(
  client: SupabaseClient,
  runId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('payout_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();

  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * The currently `processing` payout run for a rail, or null. Used as the
 * friendly 409 guard before triggering a new run (migration 00032's partial
 * unique index remains the ironclad guard).
 */
export async function getProcessingPayoutRun(
  client: SupabaseClient,
  runType: 'chef' | 'driver'
): Promise<{ id: string; updated_at?: string | null; created_at?: string | null } | null> {
  const { data, error } = await client
    .from('payout_runs')
    .select('id, updated_at, created_at')
    .eq('run_type', runType)
    .eq('status', 'processing')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as { id: string; updated_at?: string | null; created_at?: string | null } | null) ?? null;
}

/**
 * A payout run left in 'processing' by a crashed or timed-out invocation blocks
 * EVERY future run of that type, because payout_runs_one_processing_per_type is
 * a partial unique index on status='processing' (migration 00032). Previously
 * there was no UI control and no documented remediation, so clearing it meant a
 * manual UPDATE against production.
 *
 * A run older than this window cannot still be executing — Vercel serverless
 * functions are capped far below it — so it is safe to mark abandoned.
 * Deliberately generous: a live run must never be killed mid-payout.
 */
export const PAYOUT_RUN_STALE_MS = 15 * 60 * 1000;

/**
 * Atomically mark an abandoned 'processing' run as failed, freeing the partial
 * unique index. The update is conditional on the row STILL being 'processing'
 * and STILL older than the cutoff, so two concurrent reclaims cannot both win
 * and a run that resumed in the meantime is left alone.
 *
 * Returns the reclaimed run id, or null if nothing was eligible.
 */
export async function reclaimStalePayoutRun(
  client: SupabaseClient,
  runType: 'chef' | 'driver',
  staleMs: number = PAYOUT_RUN_STALE_MS
): Promise<{ id: string } | null> {
  const cutoff = new Date(Date.now() - staleMs).toISOString();

  const { data, error } = await client
    .from('payout_runs')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    } as never)
    .eq('run_type', runType)
    .eq('status', 'processing')
    .lt('updated_at', cutoff)
    .select('id')
    .maybeSingle();

  if (error) return null;
  return (data as { id: string } | null) ?? null;
}

/** Driver payout lines attached to a payout run. */
export async function listDriverPayoutsForRun(
  client: SupabaseClient,
  payoutRunId: string
): Promise<Record<string, unknown>[]> {
  const { data, error } = await client
    .from('driver_payouts')
    .select('*')
    .eq('payout_run_id', payoutRunId);

  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

// ==========================================
// INSTANT PAYOUTS
// ==========================================

export interface InstantPayoutRequestRow {
  id: string;
  driver_id: string;
  amount_cents: number;
  fee_cents: number | null;
  status: string;
  requested_at: string;
  executed_at: string | null;
  failure_reason: string | null;
}

/** Instant payout queue, newest request first. */
export async function listInstantPayoutRequests(
  client: SupabaseClient,
  limit = 100
): Promise<InstantPayoutRequestRow[]> {
  const { data, error } = await client
    .from('instant_payout_requests')
    .select('id, driver_id, amount_cents, fee_cents, status, requested_at, executed_at, failure_reason')
    .order('requested_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as InstantPayoutRequestRow[];
}

export interface InstantPayoutRequestRef {
  id: string;
  driver_id: string;
  amount_cents: number;
  status: string;
}

/** A single instant payout request (id, driver, amount, status), or null. */
export async function getInstantPayoutRequestById(
  client: SupabaseClient,
  id: string
): Promise<InstantPayoutRequestRef | null> {
  const { data, error } = await client
    .from('instant_payout_requests')
    .select('id, driver_id, amount_cents, status')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as InstantPayoutRequestRef;
}

// ==========================================
// STRIPE RECONCILIATION / EVENT EXPORTS
// ==========================================

/** Stripe reconciliation rows, newest first, optionally filtered by status. */
export async function listStripeReconciliationRows(
  client: SupabaseClient,
  options: { status?: string; limit?: number } = {}
): Promise<Record<string, unknown>[]> {
  let query = client
    .from('stripe_reconciliation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 200);
  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Record<string, unknown>[];
}

export interface StripeEventExportRow {
  stripe_event_id: string;
  event_type: string;
  livemode: boolean | null;
  processing_status: string | null;
  related_order_id: string | null;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

/** Processed Stripe events in [start, end] for CSV export, newest first. */
export async function listStripeEventExportRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<StripeEventExportRow[]> {
  const { data, error } = await client
    .from('stripe_events_processed')
    .select(
      'stripe_event_id, event_type, livemode, processing_status, related_order_id, processed_at, error_message, created_at'
    )
    .gte('processed_at', startIso)
    .lte('processed_at', endIso)
    .order('processed_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as StripeEventExportRow[];
}

// ==========================================
// PLATFORM ACCOUNTS
// ==========================================

export interface PlatformAccountBalanceRow {
  owner_id: string;
  balance_cents: number;
  pending_payout_cents: number | null;
  currency: string | null;
  updated_at: string | null;
}

/** Payable account balances for an account type, highest balance first. */
export async function listPlatformAccountsByType(
  client: SupabaseClient,
  accountType: string
): Promise<PlatformAccountBalanceRow[]> {
  const { data, error } = await client
    .from('platform_accounts')
    .select('owner_id, balance_cents, pending_payout_cents, currency, updated_at')
    .eq('account_type', accountType)
    .order('balance_cents', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PlatformAccountBalanceRow[];
}

/** Full platform account row for (account_type, owner), or null. */
export async function getPlatformAccount(
  client: SupabaseClient,
  accountType: string,
  ownerId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('platform_accounts')
    .select('*')
    .eq('account_type', accountType)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}
