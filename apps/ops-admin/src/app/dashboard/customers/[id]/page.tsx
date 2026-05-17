import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import {
  createAdminClient,
  getOpsCustomerDetail,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';
import { CustomerActions } from './customer-actions';

export const dynamic = 'force-dynamic';

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

async function getCustomerPageData(customerId: string) {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  return getOpsCustomerDetail(adminClient, customerId);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerPageData(id);

  if (!customer) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/customers"
              className="mb-2 inline-block text-sm text-textMuted hover:text-white"
            >
              &larr; Back to Customers
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="mt-1 text-textMuted">
              Customer since {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className="bg-success px-4 py-2 text-white">Active</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-surface p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Customer Account Context
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-textMuted">Email</p>
                <p className="text-white">{customer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Phone</p>
                <p className="text-white">{customer.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">User ID</p>
                <p className="font-mono text-sm text-white">{customer.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Customer ID</p>
                <p className="font-mono text-sm text-white">{customer.id}</p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-textMuted mb-3">
                Customer Actions
              </p>
              <CustomerActions
                customerId={customer.id}
                customerName={`${customer.first_name} ${customer.last_name}`}
              />
            </div>
          </Card>

          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Order Snapshot
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-success">
                  {formatMoney(customer.stats.totalSpent)}
                </p>
                <p className="text-sm text-textMuted">Total Spend</p>
              </div>
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-info">
                  {customer.stats.totalOrders}
                </p>
                <p className="text-sm text-textMuted">Total Orders</p>
              </div>
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-info">
                  {customer.stats.completedOrders}
                </p>
                <p className="text-sm text-textMuted">Completed Orders</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Saved Addresses
            </h2>
            {customer.addresses.length > 0 ? (
              <div className="space-y-3">
                {customer.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-lg bg-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">
                          {address.label || 'Address'}
                        </p>
                        <p className="text-sm text-textMuted">
                          {address.address_line1}
                          {address.address_line2 ? `, ${address.address_line2}` : ''}
                        </p>
                        <p className="text-sm text-textMuted">
                          {address.city}, {address.state} {address.postal_code}
                        </p>
                      </div>
                      {address.is_default && (
                        <Badge className="bg-info text-white">Default</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-textMuted">
                No saved addresses are recorded for this customer.
              </p>
            )}
          </Card>

          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Customer Oversight Context
            </h2>
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-textMuted">Last Order</p>
                <p className="mt-1 text-white">
                  {customer.stats.lastOrderAt
                    ? new Date(customer.stats.lastOrderAt).toLocaleString()
                    : 'No orders yet'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="text-textMuted">Cancelled Orders</p>
                <p className="mt-1 text-white">
                  {customer.stats.cancelledOrders}
                </p>
              </div>
              <Link
                href="/dashboard/support"
                className="inline-block text-primary hover:underline"
              >
                Review support queue for customer issues &rarr;
              </Link>
            </div>
          </Card>
        </div>

        <Card className="border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Recent Orders
          </h2>
          {customer.recent_orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-textMuted">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {customer.recent_orders.map((order) => (
                    <tr key={order.id} className="border-b border-border">
                      <td className="py-3 text-white">#{order.order_number}</td>
                      <td className="py-3">
                        <Badge
                          className={`${
                            order.status === 'delivered'
                              ? 'bg-success'
                              : order.status === 'cancelled'
                                ? 'bg-danger'
                                : 'bg-info'
                          } text-white`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 text-white">{formatMoney(order.total)}</td>
                      <td className="py-3 text-textMuted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-primary hover:underline"
                        >
                          View order &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-textMuted">
              No orders are recorded for this customer yet.
            </p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
