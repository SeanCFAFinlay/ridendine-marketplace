// ==========================================
// DOMAIN EVENT EMITTER
// Central event bus for the engine
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DomainEvent,
  DomainEventType,
  ActorContext,
} from '@ridendine/types';

export class DomainEventEmitter {
  private client: SupabaseClient;
  private pendingEvents: DomainEvent[] = [];
  private _correlationId: string | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Set correlation context for subsequent events.
   * All events emitted while this is set will share the same correlation_id.
   */
  setCorrelation(correlationId: string): void {
    this._correlationId = correlationId;
  }

  clearCorrelation(): void {
    this._correlationId = null;
  }

  /**
   * Queue an event to be emitted
   */
  emit(
    type: DomainEventType,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    actor: ActorContext
  ): DomainEvent {
    const event: DomainEvent = {
      id: crypto.randomUUID(),
      type,
      entityType,
      entityId,
      payload,
      actor,
      timestamp: new Date().toISOString(),
      version: 1,
    };

    // Inject correlation metadata
    event.payload = {
      ...event.payload,
      correlation_id: event.payload.correlation_id || this._correlationId || event.id,
      order_id: event.payload.orderId || event.payload.order_id || null,
      delivery_id: event.payload.deliveryId || event.payload.delivery_id || null,
    };

    this.pendingEvents.push(event);
    return event;
  }

  /**
   * Persist all pending events to the database
   */
  async flush(): Promise<{ success: boolean; events: DomainEvent[]; error?: string }> {
    if (this.pendingEvents.length === 0) {
      return { success: true, events: [] };
    }

    const eventsToInsert = this.pendingEvents.map((event) => ({
      id: event.id,
      event_type: event.type,
      entity_type: event.entityType,
      entity_id: event.entityId,
      payload: event.payload,
      actor_user_id: event.actor.userId,
      actor_role: event.actor.role,
      actor_entity_id: event.actor.entityId,
      version: event.version,
      published: false,
      created_at: event.timestamp,
    }));

    const { error } = await this.client
      .from('domain_events')
      .insert(eventsToInsert);

    if (error) {
      return { success: false, events: [], error: error.message };
    }

    const flushedEvents = [...this.pendingEvents];
    this.pendingEvents = [];

    // Trigger real-time broadcast for each event
    for (const event of flushedEvents) {
      await this.broadcastEvent(event);
    }

    return { success: true, events: flushedEvents };
  }

  /**
   * Broadcast event via Supabase Realtime
   */
  private async broadcastEvent(event: DomainEvent): Promise<void> {
    try {
      // Use Supabase Realtime broadcast
      await this.client.channel(`events:${event.entityType}`).send({
        type: 'broadcast',
        event: event.type,
        payload: event,
      });

      // Also broadcast to entity-specific channel
      await this.client.channel(`entity:${event.entityType}:${event.entityId}`).send({
        type: 'broadcast',
        event: event.type,
        payload: event,
      });

      // Mark event as published
      await this.client
        .from('domain_events')
        .update({ published: true, published_at: new Date().toISOString() })
        .eq('id', event.id);
    } catch (error) {
      // Log but don't fail - events are already persisted
      console.error('Failed to broadcast event:', error);
    }
  }

  /**
   * Get pending events (for inspection)
   */
  getPendingEvents(): DomainEvent[] {
    return [...this.pendingEvents];
  }

  /**
   * Clear pending events without persisting
   */
  clear(): void {
    this.pendingEvents = [];
  }
}

/**
 * Create event emitter instance
 */
export function createEventEmitter(client: SupabaseClient): DomainEventEmitter {
  return new DomainEventEmitter(client);
}
