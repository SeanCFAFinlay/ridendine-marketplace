import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext } from '@/lib/engine';

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
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('start') || new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const endDate = searchParams.get('end') || new Date().toISOString();

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
      return NextResponse.json({ error: 'Invalid type. Use: orders, ledger, customers, chefs, drivers' }, { status: 400 });
  }

  const csvRows = [headers.join(','), ...rows.map(buildCsvRow)];

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
