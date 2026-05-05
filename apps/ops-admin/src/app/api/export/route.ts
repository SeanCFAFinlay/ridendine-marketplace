import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function buildCsvRow(row: any): string {
  const values = Object.values(row).map((v: any) => {
    const str = v == null ? '' : String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str;
  });
  return values.join(',');
}

async function fetchOrders(client: any, startDate: string, endDate: string) {
  const { data } = await client.from('orders')
    .select('order_number, status, subtotal, delivery_fee, service_fee, tax, tip, total, payment_status, created_at')
    .gte('created_at', startDate).lte('created_at', endDate)
    .order('created_at', { ascending: false });
  return {
    rows: data || [],
    headers: ['Order Number', 'Status', 'Subtotal', 'Delivery Fee', 'Service Fee', 'Tax', 'Tip', 'Total', 'Payment', 'Date'],
  };
}

async function fetchLedger(client: any, startDate: string, endDate: string) {
  const { data } = await client.from('ledger_entries')
    .select('entry_type, amount_cents, currency, description, entity_type, entity_id, created_at')
    .gte('created_at', startDate).lte('created_at', endDate)
    .order('created_at', { ascending: false });
  return {
    rows: (data || []).map((r: any) => ({ ...r, amount: (r.amount_cents / 100).toFixed(2) })),
    headers: ['Type', 'Amount', 'Currency', 'Description', 'Entity Type', 'Entity ID', 'Date'],
  };
}

async function fetchStripeEventsProcessed(client: any, startDate: string, endDate: string) {
  const { data } = await client
    .from('stripe_events_processed')
    .select(
      'stripe_event_id, event_type, livemode, processing_status, related_order_id, processed_at, error_message, created_at'
    )
    .gte('processed_at', startDate)
    .lte('processed_at', endDate)
    .order('processed_at', { ascending: false });
  return {
    rows: data || [],
    headers: [
      'Stripe Event ID',
      'Event Type',
      'Livemode',
      'Status',
      'Related Order ID',
      'Processed At',
      'Error',
      'Created At',
    ],
  };
}

async function fetchBankPayouts(client: any, startDate: string, endDate: string) {
  const { data } = await client
    .from('chef_payouts')
    .select('id, chef_id, amount, status, bank_batch_id, bank_reference, reconciliation_status, period_start, period_end, created_at')
    .eq('payment_rail', 'bank')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });
  return {
    rows: (data || []).map((r: any) => ({
      payout_id: r.id,
      payee_type: 'chef',
      payee_id: r.chef_id,
      amount: (r.amount / 100).toFixed(2),
      status: r.status,
      bank_batch_id: r.bank_batch_id,
      bank_reference: r.bank_reference,
      reconciliation_status: r.reconciliation_status,
      period_start: r.period_start,
      period_end: r.period_end,
      created_at: r.created_at,
    })),
    headers: [
      'Payout ID',
      'Payee Type',
      'Payee ID',
      'Amount',
      'Status',
      'BANK Batch ID',
      'BANK Reference',
      'Reconciliation Status',
      'Period Start',
      'Period End',
      'Created At',
    ],
  };
}

async function fetchCustomers(client: any) {
  const { data } = await client.from('customers')
    .select('first_name, last_name, email, phone, created_at')
    .order('created_at', { ascending: false });
  return {
    rows: data || [],
    headers: ['First Name', 'Last Name', 'Email', 'Phone', 'Joined'],
  };
}

async function fetchChefs(client: any) {
  const { data } = await client.from('chef_profiles')
    .select('display_name, phone, status, created_at')
    .order('created_at', { ascending: false });
  return {
    rows: data || [],
    headers: ['Name', 'Phone', 'Status', 'Joined'],
  };
}

async function fetchDrivers(client: any) {
  const { data } = await client.from('drivers')
    .select('first_name, last_name, email, phone, status, total_deliveries, rating, created_at')
    .order('created_at', { ascending: false });
  return {
    rows: data || [],
    headers: ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Deliveries', 'Rating', 'Joined'],
  };
}

export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('start') || new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const endDate = searchParams.get('end') || new Date().toISOString();

  const financeExportTypes = new Set(['ledger', 'stripe_events', 'bank_payouts']);
  const exportDenied = financeExportTypes.has(type || '')
    ? guardPlatformApi(actor, 'finance_export_ledger')
    : guardPlatformApi(actor, 'ops_export_operational');
  if (exportDenied) return exportDenied;

  const client = createAdminClient() as any;
  let rows: any[] = [];
  let headers: string[] = [];

  switch (type) {
    case 'orders': {
      ({ rows, headers } = await fetchOrders(client, startDate, endDate));
      break;
    }
    case 'ledger': {
      ({ rows, headers } = await fetchLedger(client, startDate, endDate));
      break;
    }
    case 'stripe_events': {
      ({ rows, headers } = await fetchStripeEventsProcessed(client, startDate, endDate));
      break;
    }
    case 'bank_payouts': {
      ({ rows, headers } = await fetchBankPayouts(client, startDate, endDate));
      break;
    }
    case 'customers': {
      ({ rows, headers } = await fetchCustomers(client));
      break;
    }
    case 'chefs': {
      ({ rows, headers } = await fetchChefs(client));
      break;
    }
    case 'drivers': {
      ({ rows, headers } = await fetchDrivers(client));
      break;
    }
    default:
      return NextResponse.json(
        {
          error:
            'Invalid type. Use: orders, ledger, stripe_events, bank_payouts, customers, chefs, drivers',
        },
        { status: 400 }
      );
  }

  const csvRows = [headers.join(','), ...rows.map(buildCsvRow)];

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
