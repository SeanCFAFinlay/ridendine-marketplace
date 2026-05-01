// ==========================================
// NOTIFICATION TRIGGERS
// Maps domain events to notification sends.
// Sits on top of NotificationSender — best-effort,
// never throws from public methods.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationType } from '@ridendine/types';
import type { NotificationSender } from './notification-sender';

// ---- Input types ----

export interface OrderCreatedInput {
  orderId: string;
  customerName: string;
  storefrontId: string;
  orderNumber: string;
}

export interface OrderEventInput {
  orderId: string;
  customerId: string;
  orderNumber: string;
}

export interface RejectedInput extends OrderEventInput {
  reason: string;
}

export interface DriverOfferedInput {
  deliveryId: string;
  driverId: string;
  storefrontName: string;
  pickupAddress: string;
}

export interface DriverAssignedInput {
  orderId: string;
  customerId: string;
  driverName: string;
  /** When omitted, resolved from `orders.order_number` by `orderId`. */
  orderNumber?: string;
}

export interface CancelledInput extends OrderEventInput {
  reason: string;
}

export interface RefundInput extends OrderEventInput {
  amount: number;
}

// ---- Helpers ----

function logError(method: string, err: unknown): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: `NotificationTriggers.${method} failed`,
    error: err instanceof Error ? err.message : String(err),
  }));
}

// ---- Class ----

export class NotificationTriggers {
  constructor(
    private client: SupabaseClient,
    private sender: NotificationSender,
  ) {}

  async onOrderCreated(input: OrderCreatedInput): Promise<void> {
    try {
      const [customerId, chefUserId] = await Promise.all([
        this.fetchOrderCustomerId(input.orderId),
        this.fetchChefUserId(input.storefrontId),
      ]);

      if (customerId) {
        const customerUserId = await this.resolveCustomerUserId(customerId);
        if (customerUserId) {
          await this.sender.send(
            'order_placed' as NotificationType,
            customerUserId,
            { orderNumber: input.orderNumber, customerName: input.customerName },
            { order_id: input.orderId },
          );
        }
      }

      if (chefUserId) {
        await this.sender.send(
          'order_placed' as NotificationType,
          chefUserId,
          { orderNumber: input.orderNumber, customerName: input.customerName },
          { order_id: input.orderId },
        );
      }
    } catch (err) {
      logError('onOrderCreated', err);
    }
  }

  async onChefAccepted(input: OrderEventInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'order_accepted' as NotificationType,
        userId,
        { orderNumber: input.orderNumber },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onChefAccepted', err);
    }
  }

  async onChefRejected(input: RejectedInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'order_rejected' as NotificationType,
        userId,
        { orderNumber: input.orderNumber, reason: input.reason },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onChefRejected', err);
    }
  }

  async onOrderReady(input: OrderEventInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'order_ready' as NotificationType,
        userId,
        { orderNumber: input.orderNumber },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onOrderReady', err);
    }
  }

  async onDriverOffered(input: DriverOfferedInput): Promise<void> {
    try {
      const driverUserId = await this.fetchDriverUserId(input.driverId);
      if (!driverUserId) return;

      await this.sender.send(
        'delivery_offer' as NotificationType,
        driverUserId,
        {
          storefrontName: input.storefrontName,
          pickupAddress: input.pickupAddress,
        },
        { delivery_id: input.deliveryId },
      );
    } catch (err) {
      logError('onDriverOffered', err);
    }
  }

  async onDriverAssigned(input: DriverAssignedInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      let orderNumber = input.orderNumber;
      if (!orderNumber) {
        orderNumber = (await this.fetchOrderNumber(input.orderId)) ?? input.orderId;
      }
      await this.sender.send(
        'order_picked_up' as NotificationType,
        userId,
        { orderNumber, driverName: input.driverName },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onDriverAssigned', err);
    }
  }

  async onOrderDelivered(input: OrderEventInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'order_delivered' as NotificationType,
        userId,
        { orderNumber: input.orderNumber },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onOrderDelivered', err);
    }
  }

  async onOrderCancelled(input: CancelledInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'order_cancelled' as NotificationType,
        userId,
        { orderNumber: input.orderNumber, reason: input.reason },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onOrderCancelled', err);
    }
  }

  async onRefundProcessed(input: RefundInput): Promise<void> {
    try {
      const userId = await this.resolveCustomerUserId(input.customerId);
      if (!userId) return;
      await this.sender.send(
        'refund_processed' as NotificationType,
        userId,
        { orderNumber: input.orderNumber, amount: input.amount },
        { order_id: input.orderId },
      );
    } catch (err) {
      logError('onRefundProcessed', err);
    }
  }

  // ---- Private lookups ----

  /** `orders.customer_id` / trigger inputs use `customers.id`; `notifications.user_id` is `auth.users.id`. */
  private async resolveCustomerUserId(customerProfileId: string): Promise<string | null> {
    const { data } = await (this.client as any)
      .from('customers')
      .select('user_id')
      .eq('id', customerProfileId)
      .single();
    return data?.user_id ?? null;
  }

  private async fetchOrderCustomerId(orderId: string): Promise<string | null> {
    const { data } = await (this.client as any)
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single();
    return data?.customer_id ?? null;
  }

  private async fetchOrderNumber(orderId: string): Promise<string | null> {
    const { data } = await (this.client as any)
      .from('orders')
      .select('order_number')
      .eq('id', orderId)
      .single();
    return data?.order_number ?? null;
  }

  private async fetchChefUserId(storefrontId: string): Promise<string | null> {
    const { data } = await (this.client as any)
      .from('chef_storefronts')
      .select('chef_profiles(user_id)')
      .eq('id', storefrontId)
      .single();
    return data?.chef_profiles?.user_id ?? null;
  }

  private async fetchDriverUserId(driverProfileId: string): Promise<string | null> {
    const { data } = await (this.client as any)
      .from('driver_profiles')
      .select('user_id')
      .eq('id', driverProfileId)
      .single();
    return data?.user_id ?? null;
  }
}

// ---- Factory ----

export function createNotificationTriggers(
  client: SupabaseClient,
  sender: NotificationSender,
): NotificationTriggers {
  return new NotificationTriggers(client, sender);
}
