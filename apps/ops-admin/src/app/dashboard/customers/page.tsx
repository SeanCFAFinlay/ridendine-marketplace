'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader, DataTable, EmptyState } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { Users } from 'lucide-react';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders?: { count: number }[];
};

const columns: ColumnDef<Customer>[] = [
  {
    key: 'first_name',
    header: 'Name',
    sortable: true,
    cell: (row) => (
      <Link
        href={`/dashboard/customers/${row.id}`}
        className="font-medium text-white hover:text-primary"
      >
        {row.first_name} {row.last_name}
      </Link>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    cell: (row) => <span className="text-textSubtle text-sm">{row.email}</span>,
  },
  {
    key: 'phone',
    header: 'Phone',
    cell: (row) => <span className="text-textMuted text-sm">{row.phone ?? 'N/A'}</span>,
  },
  {
    key: 'orders',
    header: 'Orders',
    cell: (row) => (
      <span className="text-textSubtle text-sm">{row.orders?.[0]?.count ?? 0}</span>
    ),
  },
  {
    key: 'created_at',
    header: 'Joined',
    sortable: true,
    cell: (row) => (
      <span className="text-textMuted text-xs">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'actions',
    header: '',
    cell: (row) => (
      <Link
        href={`/dashboard/customers/${row.id}`}
        className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primaryHover"
      >
        View
      </Link>
    ),
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void fetchCustomers(); }, []);

  async function fetchCustomers() {
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      const payload = result?.data;
      setCustomers(Array.isArray(payload) ? payload : payload?.items ?? []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
    finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Customers"
          subtitle="Oversee real customer accounts, ordering history, and support context."
          actions={
            <a
              href="/api/export?type=customers"
              className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-textSubtle hover:border-border"
            >
              Export CSV
            </a>
          }
        />

        <DataTable
          columns={columns}
          data={customers}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          emptyState={
            <EmptyState
              icon={<Users className="h-10 w-10" />}
              title="No customers yet"
              description="Customers appear here after signing up and placing orders through the customer app."
            />
          }
          className="border-border bg-surface"
        />
      </div>
    </DashboardLayout>
  );
}
