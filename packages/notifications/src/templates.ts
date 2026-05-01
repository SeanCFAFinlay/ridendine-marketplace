import type { NotificationType } from '@ridendine/types';
import type { NotificationPayload } from './types';

interface NotificationTemplate {
  title: string;
  body: string;
}

type TemplateParams = Record<string, string | number>;

const templates: Record<NotificationType, (params: TemplateParams) => NotificationTemplate> = {
  order_placed: (params) => ({
    title: 'New Order Received',
    body: `You have a new order #${params.orderNumber} from ${params.customerName}`,
  }),

  order_accepted: (params) => ({
    title: 'Order Accepted',
    body: `Your order #${params.orderNumber} has been accepted and is being prepared`,
  }),

  order_rejected: (params) => ({
    title: 'Order Rejected',
    body: `Your order #${params.orderNumber} could not be fulfilled. ${params.reason || ''}`,
  }),

  order_ready: (params) => ({
    title: 'Order Ready for Pickup',
    body: `Order #${params.orderNumber} is ready for pickup`,
  }),

  order_picked_up: (params) => ({
    title: 'Order Picked Up',
    body: `Your order #${params.orderNumber} has been picked up and is on its way`,
  }),

  order_delivered: (params) => ({
    title: 'Order Delivered',
    body: `Your order #${params.orderNumber} has been delivered. Enjoy your meal!`,
  }),

  order_cancelled: (params) => ({
    title: 'Order Cancelled',
    body: `Your order #${params.orderNumber} has been cancelled. ${params.reason || ''}`,
  }),

  refund_processed: (params) => ({
    title: 'Refund Processed',
    body: `Your refund of $${Number(params.amount).toFixed(2)} for order #${params.orderNumber} has been processed.`,
  }),

  delivery_offer: (params) => ({
    title: 'New Delivery Available',
    body: `New delivery offer: ${params.distance} km for $${params.earnings}`,
  }),

  chef_approved: () => ({
    title: 'Application Approved',
    body: 'Congratulations! Your chef application has been approved. You can now start selling!',
  }),

  driver_approved: () => ({
    title: 'Application Approved',
    body: 'Congratulations! Your driver application has been approved. You can now start delivering!',
  }),

  review_received: (params) => ({
    title: 'New Review',
    body: `You received a ${params.rating}-star review from ${params.customerName}`,
  }),
};

export function createNotification(
  type: NotificationType,
  userId: string,
  params: TemplateParams = {},
  additionalData?: Record<string, unknown>
): NotificationPayload {
  const template = templates[type](params);

  return {
    type,
    userId,
    title: template.title,
    body: template.body,
    data: additionalData,
  };
}

export function getNotificationTemplate(
  type: NotificationType,
  params: TemplateParams = {}
): NotificationTemplate {
  return templates[type](params);
}
