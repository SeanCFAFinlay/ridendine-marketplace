import { redirect } from 'next/navigation';
import { orderConfirmationPath } from '@/lib/customer-ordering';

interface Props {
  params: Promise<{ orderId: string }>;
}

/**
 * IRR-011: legacy URL — permanent redirect to canonical confirmation.
 * @see docs/CUSTOMER_ORDERING_FLOW.md
 */
export default async function LegacyOrderConfirmationRedirect({ params }: Props) {
  const { orderId } = await params;
  redirect(orderConfirmationPath(orderId));
}
