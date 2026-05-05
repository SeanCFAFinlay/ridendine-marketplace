import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { createAdminClient, getOpsOrderDetail, type SupabaseClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';
import { OrderStatusActions } from './status-actions';
import { getEngine, getOpsActorContext } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  accepted: 'bg-blue-500',
  preparing: 'bg-purple-500',
  ready_for_pickup: 'bg-indigo-500',
  picked_up: 'bg-cyan-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-500',
};

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function formatAddress(address: {
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
} | null) {
  if (!address) return 'No delivery address recorded';

  return [
    address.address_line1,
    address.address_line2,
    `${address.city}, ${address.state} ${address.postal_code}`,
  ]
    .filter(Boolean)
    .join(', ');
}

async function getOrderDetailPageData(orderId: string) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return null;
  }

  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const engine = getEngine();

  const order = await getOpsOrderDetail(adminClient, orderId);
  if (!order) {
    return null;
  }

  const [timeline, allowedActions, financialsResult, exceptionsResult] =
    await Promise.all([
      engine.audit.getAuditTrail('order', orderId),
      engine.orders.getAllowedActions(orderId, actor.role),
      engine.commerce.getOrderFinancials(orderId),
      adminClient
        .from('order_exceptions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
    ]);

  return {
    actor,
    order,
    timeline,
    allowedActions,
    financials: financialsResult.success ? financialsResult.data : null,
    exceptions: exceptionsResult.data ?? [],
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = await params;
  const data = await getOrderDetailPageData(orderId);

  if (!data) {
    notFound();
  }

  const { order, timeline, allowedActions, financials, exceptions } = data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/orders"
              className="mb-2 inline-block text-sm text-gray-400 hover:text-white"
            >
              &larr; Back to Orders
            </Link>
            <h1 className="text-3xl font-bold text-white">
              Order #{order.order_number}
            </h1>
            <p className="mt-1 text-gray-400">
              Created {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <Badge
            className={`${
              statusColors[order.status] || 'bg-gray-500'
            } px-4 py-2 text-white`}
          >
            {order.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-opsPanel p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Order Oversight
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Order ID</span>
                <span className="font-mono text-white">{order.id}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Payment Status</span>
                <span className="text-white">{order.payment_status || 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Chef / Storefront</span>
                <div className="text-right text-white">
                  <div>{order.storefront?.name || 'Unlinked storefront'}</div>
                  {order.storefront?.chef?.display_name && (
                    <div className="text-xs text-gray-400">
                      Chef: {order.storefront.chef.display_name}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Estimated Ready</span>
                <span className="text-white">
                  {formatTimestamp(order.estimated_ready_at)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Actual Ready</span>
                <span className="text-white">
                  {formatTimestamp(order.actual_ready_at)}
                </span>
              </div>
            </div>

            {order.special_instructions && (
              <div className="mt-4 rounded-lg border border-gray-700 bg-opsPanel p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Special Instructions
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {order.special_instructions}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {order.storefront && (
                <Link
                  href={`/dashboard/chefs/${order.storefront.chef?.id ?? ''}`}
                  className="text-[#E85D26] hover:underline"
                >
                  View Chef Governance &rarr;
                </Link>
              )}
              {order.delivery?.id && (
                <Link
                  href={`/dashboard/deliveries/${order.delivery.id}`}
                  className="text-[#E85D26] hover:underline"
                >
                  View Delivery &rarr;
                </Link>
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-opsPanel p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Customer & Delivery Context
            </h2>
            {order.customer ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Customer</span>
                  <span className="text-white">
                    {order.customer.first_name} {order.customer.last_name}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{order.customer.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-white">{order.customer.phone || 'N/A'}</span>
                </div>
                <div className="pt-2">
                  <p className="text-gray-400">Delivery Address</p>
                  <p className="mt-1 text-white">
                    {formatAddress(order.delivery_address)}
                  </p>
                </div>
                <Link
                  href={`/dashboard/customers/${order.customer.id}`}
                  className="inline-block pt-2 text-[#E85D26] hover:underline"
                >
                  View Customer Profile &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Customer information not available.</p>
            )}

            <div className="mt-6 rounded-lg border border-gray-700 bg-opsPanel p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Delivery Oversight
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Delivery Status</span>
                  <span className="text-white">
                    {order.delivery?.status?.replace(/_/g, ' ') || 'Not created'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Assigned Driver</span>
                  <span className="text-white">
                    {order.delivery?.driver
                      ? `${order.delivery.driver.first_name} ${order.delivery.driver.last_name}`
                      : 'Not assigned'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-gray-800 bg-opsPanel p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Order Items & Financial Breakdown
          </h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="pb-3">Item</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.length > 0 ? (
                order.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="py-3 text-white">
                      <div>{item.menu_item?.name || 'Unknown Item'}</div>
                      {item.menu_item?.description && (
                        <div className="text-xs text-gray-400">
                          {item.menu_item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center text-white">{item.quantity}</td>
                    <td className="py-3 text-right text-white">
                      {formatMoney(item.unit_price)}
                    </td>
                    <td className="py-3 text-right text-white">
                      {formatMoney(item.total_price)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-gray-400">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-2 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Delivery Fee</span>
                <span className="text-white">
                  {formatMoney(order.delivery_fee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Service Fee</span>
                <span className="text-white">
                  {formatMoney(order.service_fee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">{formatMoney(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tip</span>
                <span className="text-white">{formatMoney(order.tip)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-2 text-lg font-bold">
                <span className="text-white">Total</span>
                <span className="text-emerald-400">{formatMoney(order.total)}</span>
              </div>
            </div>

            <div className="rounded-lg border border-gray-700 bg-opsPanel p-4">
              <h3 className="text-sm font-semibold text-white">
                Ledger Context
              </h3>
              {financials ? (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform Fee</span>
                    <span className="text-white">
                      {formatMoney(financials.platformFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chef Payable</span>
                    <span className="text-white">
                      {formatMoney(financials.chefPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Driver Payable</span>
                    <span className="text-white">
                      {formatMoney(financials.driverPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tip Payable</span>
                    <span className="text-white">
                      {formatMoney(financials.tipPayable)}
                    </span>
                  </div>
                  <div className="pt-2 text-xs text-gray-400">
                    {financials.ledgerEntries.length} ledger entries recorded for
                    this order.
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-400">
                  Financial ledger details are not available for this order yet.
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-opsPanel p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Exception Review
            </h2>
            {exceptions.length > 0 ? (
              <div className="space-y-3">
                {exceptions.map((exception: { id: string; status?: string; exception_type?: string; created_at?: string; description?: string | null }) => (
                  <div
                    key={exception.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-white">
                        {exception.exception_type || 'Exception'}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-amber-200">
                        {exception.status || 'open'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-200">
                      {exception.description || 'No description recorded.'}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Created {formatTimestamp(exception.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No linked exceptions are recorded for this order.
              </p>
            )}
          </Card>

          <Card className="border-gray-800 bg-opsPanel p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Audit Timeline
            </h2>
            {timeline.length > 0 ? (
              <div className="space-y-4">
                {timeline.slice(0, 8).map((entry: { id?: string; eventType?: string; createdAt?: string; metadata?: Record<string, unknown> | null }) => (
                  <div key={entry.id ?? `${entry.eventType}-${entry.createdAt}`} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#E85D26]" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {entry.eventType || 'Audit event'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimestamp(entry.createdAt)}
                      </p>
                      {entry.metadata && (
                        <pre className="mt-2 overflow-x-auto rounded bg-opsPanel p-2 text-xs text-gray-300">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No audit timeline is available for this order yet.
              </p>
            )}
          </Card>
        </div>

        <OrderStatusActions
          orderId={order.id}
          currentStatus={order.status}
          allowedActions={allowedActions}
        />
      </div>
    </DashboardLayout>
  );
}
