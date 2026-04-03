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

type LedgerEntityAmountRow = {
  entity_id: string | null;
  amount_cents: number | null;
};

type ChefNameRow = {
  id: string;
  display_name: string;
};

type DriverNameRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

export async function getChefLiabilitySummaries(
  client: SupabaseClient,
  limit = 10
): Promise<LiabilitySummary[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .eq('entry_type', 'chef_payable');

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as LedgerEntityAmountRow[]) {
    if (!row.entity_id) continue;
    totals.set(row.entity_id, (totals.get(row.entity_id) ?? 0) + ((row.amount_cents ?? 0) / 100));
  }

  const ids = [...totals.keys()];
  if (ids.length === 0) return [];

  const { data: chefs, error: chefsError } = await client
    .from('chef_profiles')
    .select('id, display_name')
    .in('id', ids);

  if (chefsError) throw chefsError;

  const names = new Map(((chefs ?? []) as ChefNameRow[]).map((chef) => [chef.id, chef.display_name]));

  return ids
    .map((id) => ({ id, name: names.get(id) ?? 'Unknown Chef', amount: totals.get(id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export async function getDriverLiabilitySummaries(
  client: SupabaseClient,
  limit = 10
): Promise<LiabilitySummary[]> {
  const { data, error } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .in('entry_type', ['driver_payable', 'tip_payable']);

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as LedgerEntityAmountRow[]) {
    if (!row.entity_id) continue;
    totals.set(row.entity_id, (totals.get(row.entity_id) ?? 0) + ((row.amount_cents ?? 0) / 100));
  }

  const ids = [...totals.keys()];
  if (ids.length === 0) return [];

  const { data: drivers, error: driversError } = await client
    .from('drivers')
    .select('id, first_name, last_name')
    .in('id', ids);

  if (driversError) throw driversError;

  const names = new Map(
    ((drivers ?? []) as DriverNameRow[]).map((driver) => [
      driver.id,
      [driver.first_name, driver.last_name].filter(Boolean).join(' ') || 'Unknown Driver',
    ])
  );

  return ids
    .map((id) => ({ id, name: names.get(id) ?? 'Unknown Driver', amount: totals.get(id) ?? 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
