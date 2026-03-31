// ==========================================
// KITCHEN ENGINE
// Centralized chef-side kitchen logic
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, OperationResult, DomainEventType } from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';

interface KitchenQueueEntry {
  id: string;
  storefront_id: string;
  order_id: string;
  position: number;
  estimated_prep_minutes: number;
  actual_prep_minutes?: number;
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface StorefrontState {
  id: string;
  name: string;
  is_active: boolean;
  is_paused: boolean;
  paused_reason?: string;
  current_queue_size: number;
  max_queue_size: number;
  is_overloaded: boolean;
  average_prep_minutes: number;
}

interface MenuItem {
  id: string;
  name: string;
  is_available: boolean;
  is_sold_out: boolean;
  sold_out_at?: string;
  daily_limit?: number;
  daily_sold: number;
}

export class KitchenEngine {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;
  private auditLogger: AuditLogger;

  constructor(
    client: SupabaseClient,
    eventEmitter: DomainEventEmitter,
    auditLogger: AuditLogger
  ) {
    this.client = client;
    this.eventEmitter = eventEmitter;
    this.auditLogger = auditLogger;
  }

  /**
   * Get kitchen queue for a storefront
   */
  async getKitchenQueue(storefrontId: string): Promise<KitchenQueueEntry[]> {
    const { data, error } = await this.client
      .from('kitchen_queue_entries')
      .select(`
        *,
        orders (
          id,
          order_number,
          total,
          special_instructions,
          created_at,
          customer:customers (
            first_name,
            last_name
          )
        )
      `)
      .eq('storefront_id', storefrontId)
      .in('status', ['queued', 'in_progress'])
      .order('position', { ascending: true });

    if (error || !data) return [];
    return data as KitchenQueueEntry[];
  }

  /**
   * Reorder kitchen queue
   */
  async reorderQueue(
    storefrontId: string,
    orderIds: string[],
    actor: ActorContext
  ): Promise<OperationResult> {
    // Verify actor can manage this storefront
    if (!await this.canManageStorefront(storefrontId, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this storefront' },
      };
    }

    const now = new Date().toISOString();

    // Update positions
    for (let i = 0; i < orderIds.length; i++) {
      await this.client
        .from('kitchen_queue_entries')
        .update({ position: i + 1, updated_at: now })
        .eq('storefront_id', storefrontId)
        .eq('order_id', orderIds[i]);
    }

    await this.auditLogger.log({
      action: 'update',
      entityType: 'kitchen_queue',
      entityId: storefrontId,
      actor,
      afterState: { orderIds },
      metadata: { action: 'reorder' },
    });

    return { success: true };
  }

  /**
   * Update prep time estimate
   */
  async updatePrepTime(
    orderId: string,
    newEstimatedMinutes: number,
    actor: ActorContext
  ): Promise<OperationResult> {
    // Get queue entry
    const { data: entry, error } = await this.client
      .from('kitchen_queue_entries')
      .select('*, storefront_id')
      .eq('order_id', orderId)
      .single();

    if (error || !entry) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kitchen queue entry not found' },
      };
    }

    // Verify actor can manage this storefront
    if (!await this.canManageStorefront(entry.storefront_id, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this storefront' },
      };
    }

    const now = new Date().toISOString();

    // Update queue entry
    await this.client
      .from('kitchen_queue_entries')
      .update({
        estimated_prep_minutes: newEstimatedMinutes,
        updated_at: now,
      })
      .eq('id', entry.id);

    // Update order
    await this.client
      .from('orders')
      .update({
        estimated_prep_minutes: newEstimatedMinutes,
        updated_at: now,
      })
      .eq('id', orderId);

    // Emit event
    this.eventEmitter.emit(
      'order.prep_time_updated' as DomainEventType,
      'order',
      orderId,
      { previousMinutes: entry.estimated_prep_minutes, newMinutes: newEstimatedMinutes },
      actor
    );

    await this.eventEmitter.flush();

    return { success: true };
  }

  /**
   * Pause storefront (stop accepting new orders)
   */
  async pauseStorefront(
    storefrontId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<StorefrontState>> {
    // Verify actor can manage this storefront
    if (!await this.canManageStorefront(storefrontId, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this storefront' },
      };
    }

    const now = new Date().toISOString();

    // Get current state
    const { data: current } = await this.client
      .from('chef_storefronts')
      .select('*')
      .eq('id', storefrontId)
      .single();

    // Update storefront
    const { data: updated, error } = await this.client
      .from('chef_storefronts')
      .update({
        is_paused: true,
        paused_reason: reason,
        paused_at: now,
        paused_by: actor.userId,
        updated_at: now,
      })
      .eq('id', storefrontId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Log state change
    await this.client.from('storefront_state_changes').insert({
      storefront_id: storefrontId,
      previous_state: current?.is_paused ? 'paused' : 'published',
      new_state: 'paused',
      reason,
      changed_by: actor.userId,
      changed_by_role: actor.role,
    });

    // Emit event
    this.eventEmitter.emit(
      'storefront.paused' as DomainEventType,
      'storefront',
      storefrontId,
      { reason },
      actor
    );

    await this.auditLogger.log({
      action: 'status_change',
      entityType: 'storefront',
      entityId: storefrontId,
      actor,
      beforeState: { is_paused: false },
      afterState: { is_paused: true, paused_reason: reason },
      reason,
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as StorefrontState };
  }

  /**
   * Unpause storefront
   */
  async unpauseStorefront(
    storefrontId: string,
    actor: ActorContext
  ): Promise<OperationResult<StorefrontState>> {
    // Verify actor can manage this storefront
    if (!await this.canManageStorefront(storefrontId, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this storefront' },
      };
    }

    const now = new Date().toISOString();

    // Update storefront
    const { data: updated, error } = await this.client
      .from('chef_storefronts')
      .update({
        is_paused: false,
        paused_reason: null,
        paused_at: null,
        paused_by: null,
        updated_at: now,
      })
      .eq('id', storefrontId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Log state change
    await this.client.from('storefront_state_changes').insert({
      storefront_id: storefrontId,
      previous_state: 'paused',
      new_state: 'published',
      changed_by: actor.userId,
      changed_by_role: actor.role,
    });

    // Emit event
    this.eventEmitter.emit(
      'storefront.unpaused' as DomainEventType,
      'storefront',
      storefrontId,
      {},
      actor
    );

    await this.auditLogger.log({
      action: 'status_change',
      entityType: 'storefront',
      entityId: storefrontId,
      actor,
      beforeState: { is_paused: true },
      afterState: { is_paused: false },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as StorefrontState };
  }

  /**
   * Mark item as sold out (86'd)
   */
  async markItemSoldOut(
    menuItemId: string,
    actor: ActorContext
  ): Promise<OperationResult<MenuItem>> {
    // Get item and verify ownership
    const { data: item, error: itemError } = await this.client
      .from('menu_items')
      .select('*, storefront_id')
      .eq('id', menuItemId)
      .single();

    if (itemError || !item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Menu item not found' },
      };
    }

    if (!await this.canManageStorefront(item.storefront_id, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this item' },
      };
    }

    const now = new Date().toISOString();

    // Update item
    const { data: updated, error } = await this.client
      .from('menu_items')
      .update({
        is_sold_out: true,
        sold_out_at: now,
        updated_at: now,
      })
      .eq('id', menuItemId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Check pending orders with this item and create exceptions
    const { data: affectedOrders } = await this.client
      .from('order_items')
      .select('order_id, orders!inner(status)')
      .eq('menu_item_id', menuItemId)
      .in('orders.status', ['pending', 'accepted']);

    if (affectedOrders && affectedOrders.length > 0) {
      // Create exceptions for affected orders
      for (const affected of affectedOrders) {
        await this.client.from('order_exceptions').insert({
          exception_type: 'item_sold_out_after_order',
          severity: 'medium',
          status: 'open',
          order_id: affected.order_id,
          title: 'Item Sold Out After Order',
          description: `Menu item "${item.name}" is now sold out but is part of this order.`,
          recommended_actions: ['Contact customer', 'Offer substitute', 'Partial refund'],
        });
      }
    }

    // Emit event
    this.eventEmitter.emit(
      'menu.item.sold_out' as DomainEventType,
      'menu_item',
      menuItemId,
      { itemName: item.name, storefrontId: item.storefront_id },
      actor
    );

    await this.auditLogger.log({
      action: 'update',
      entityType: 'menu_item',
      entityId: menuItemId,
      actor,
      beforeState: { is_sold_out: false },
      afterState: { is_sold_out: true },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as MenuItem };
  }

  /**
   * Restock item (remove sold out status)
   */
  async restockItem(
    menuItemId: string,
    actor: ActorContext
  ): Promise<OperationResult<MenuItem>> {
    const { data: item } = await this.client
      .from('menu_items')
      .select('*, storefront_id')
      .eq('id', menuItemId)
      .single();

    if (!item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Menu item not found' },
      };
    }

    if (!await this.canManageStorefront(item.storefront_id, actor)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot manage this item' },
      };
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await this.client
      .from('menu_items')
      .update({
        is_sold_out: false,
        sold_out_at: null,
        restock_at: now,
        daily_sold: 0,
        updated_at: now,
      })
      .eq('id', menuItemId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    this.eventEmitter.emit(
      'menu.item.restocked' as DomainEventType,
      'menu_item',
      menuItemId,
      { itemName: item.name },
      actor
    );

    await this.eventEmitter.flush();

    return { success: true, data: updated as MenuItem };
  }

  /**
   * Check storefront overload status
   */
  async checkOverloadStatus(storefrontId: string): Promise<{
    isOverloaded: boolean;
    queueSize: number;
    maxQueueSize: number;
    averageWaitMinutes: number;
  }> {
    const { data: storefront } = await this.client
      .from('chef_storefronts')
      .select('current_queue_size, max_queue_size, average_prep_minutes, is_overloaded')
      .eq('id', storefrontId)
      .single();

    const queueSize = storefront?.current_queue_size || 0;
    const maxQueueSize = storefront?.max_queue_size || 10;
    const averagePrepMinutes = storefront?.average_prep_minutes || 20;

    const isOverloaded = queueSize >= maxQueueSize;
    const averageWaitMinutes = queueSize * averagePrepMinutes;

    // Auto-update overload status if changed
    if (storefront && storefront.is_overloaded !== isOverloaded) {
      await this.client
        .from('chef_storefronts')
        .update({ is_overloaded: isOverloaded, updated_at: new Date().toISOString() })
        .eq('id', storefrontId);
    }

    return {
      isOverloaded,
      queueSize,
      maxQueueSize,
      averageWaitMinutes,
    };
  }

  /**
   * Get storefront live availability
   */
  async getStorefrontAvailability(storefrontId: string): Promise<{
    isOpen: boolean;
    isPaused: boolean;
    isOverloaded: boolean;
    estimatedWaitMinutes: number;
    soldOutItems: string[];
  }> {
    const { data: storefront } = await this.client
      .from('chef_storefronts')
      .select('is_active, is_paused, is_overloaded, current_queue_size, average_prep_minutes')
      .eq('id', storefrontId)
      .single();

    const { data: soldOutItems } = await this.client
      .from('menu_items')
      .select('id')
      .eq('storefront_id', storefrontId)
      .eq('is_sold_out', true);

    const queueSize = storefront?.current_queue_size || 0;
    const averagePrepMinutes = storefront?.average_prep_minutes || 20;

    return {
      isOpen: storefront?.is_active || false,
      isPaused: storefront?.is_paused || false,
      isOverloaded: storefront?.is_overloaded || false,
      estimatedWaitMinutes: queueSize * averagePrepMinutes,
      soldOutItems: soldOutItems?.map((i) => i.id) || [],
    };
  }

  /**
   * Get kitchen stats for dashboard
   */
  async getKitchenStats(storefrontId: string, dateRange: { start: string; end: string }): Promise<{
    totalOrders: number;
    averagePrepTime: number;
    rejectionRate: number;
    onTimeRate: number;
  }> {
    // Get completed orders in range
    const { data: orders } = await this.client
      .from('orders')
      .select('id, status, estimated_prep_minutes, actual_prep_minutes')
      .eq('storefront_id', storefrontId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (!orders || orders.length === 0) {
      return {
        totalOrders: 0,
        averagePrepTime: 0,
        rejectionRate: 0,
        onTimeRate: 0,
      };
    }

    const completedOrders = orders.filter((o) =>
      ['completed', 'delivered', 'ready_for_pickup'].includes(o.status)
    );
    const rejectedOrders = orders.filter((o) => o.status === 'rejected');

    const prepTimes = completedOrders
      .filter((o) => o.actual_prep_minutes)
      .map((o) => o.actual_prep_minutes as number);

    const onTimeOrders = completedOrders.filter(
      (o) => o.actual_prep_minutes && o.estimated_prep_minutes &&
        o.actual_prep_minutes <= o.estimated_prep_minutes
    );

    return {
      totalOrders: orders.length,
      averagePrepTime: prepTimes.length > 0
        ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
        : 0,
      rejectionRate: orders.length > 0
        ? Math.round((rejectedOrders.length / orders.length) * 100)
        : 0,
      onTimeRate: completedOrders.length > 0
        ? Math.round((onTimeOrders.length / completedOrders.length) * 100)
        : 0,
    };
  }

  /**
   * Verify actor can manage storefront
   */
  private async canManageStorefront(storefrontId: string, actor: ActorContext): Promise<boolean> {
    // Ops can manage any storefront
    if (['ops_agent', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return true;
    }

    // Chefs can only manage their own
    if (actor.role === 'chef_user' || actor.role === 'chef_manager') {
      const { data: chef } = await this.client
        .from('chef_profiles')
        .select('id')
        .eq('user_id', actor.userId)
        .single();

      if (!chef) return false;

      const { data: storefront } = await this.client
        .from('chef_storefronts')
        .select('chef_id')
        .eq('id', storefrontId)
        .single();

      return storefront?.chef_id === chef.id;
    }

    return false;
  }
}

/**
 * Create kitchen engine instance
 */
export function createKitchenEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger
): KitchenEngine {
  return new KitchenEngine(client, eventEmitter, auditLogger);
}
