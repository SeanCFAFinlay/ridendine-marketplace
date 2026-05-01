// ==========================================
// NOTIFICATION SENDER
// Wraps notification delivery with error isolation.
// Supports database notifications (always) and external
// delivery providers (email/SMS) when configured.
// FND-006 fix: delivery abstraction layer
// Phase 12: optional dedupe when order_id / delivery_id present in additionalData
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@ridendine/notifications';
import type { NotificationType } from '@ridendine/types';

/**
 * External delivery provider interface.
 * Implementations can deliver via email, SMS, push, etc.
 * The NotificationSender calls these after the DB insert succeeds.
 */
export interface NotificationDeliveryProvider {
  name: string;
  /** Return true if this provider is configured and ready */
  isAvailable(): boolean;
  /** Deliver notification externally. Errors should be caught internally. */
  deliver(params: {
    type: NotificationType;
    userId: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<{ delivered: boolean; error?: string }>;
}

export class NotificationSender {
  private providers: NotificationDeliveryProvider[] = [];

  constructor(private client: SupabaseClient) {}

  /**
   * Register an external delivery provider (email, SMS, push).
   * Providers are called after the database notification is written.
   */
  registerProvider(provider: NotificationDeliveryProvider): void {
    this.providers.push(provider);
    const available = provider.isAvailable();
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Notification provider registered: ${provider.name}`,
        available,
      })
    );
  }

  async send(
    type: NotificationType,
    userId: string,
    params: Record<string, string | number> = {},
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    let mergedAdditional = additionalData ? { ...additionalData } : undefined;

    try {
      const dedupePart =
        typeof mergedAdditional?.order_id === 'string'
          ? mergedAdditional.order_id
          : typeof mergedAdditional?.delivery_id === 'string'
            ? mergedAdditional.delivery_id
            : null;
      if (dedupePart) {
        const dedupeKey = `${String(type)}:${userId}:${dedupePart}`;
        const { data: existing } = await (this.client as any)
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .contains('data', { dedupe_key: dedupeKey })
          .maybeSingle();
        if (existing?.id) {
          return;
        }
        mergedAdditional = { ...mergedAdditional, dedupe_key: dedupeKey };
      }
    } catch {
      /* dedupe probe is best-effort; never block sends */
    }

    const payload = createNotification(type, userId, params, mergedAdditional);

    // Step 1: Always write to database (primary delivery channel)
    try {
      await (this.client as any).from('notifications').insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || null,
        is_read: false,
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Failed to send database notification',
          context: { type, userId },
          error: err instanceof Error ? err.message : String(err),
        })
      );
      // Database notification failed — still try external providers
    }

    // Step 2: Try external delivery providers (best-effort, never throws)
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;

      try {
        const result = await provider.deliver({
          type: payload.type as NotificationType,
          userId: payload.userId,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        });

        if (!result.delivered) {
          console.warn(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: `External notification not delivered via ${provider.name}`,
              context: { type, userId },
              error: result.error,
            })
          );
        }
      } catch (err) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `External notification provider ${provider.name} threw`,
            context: { type, userId },
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    }
  }
}

export function createNotificationSender(client: SupabaseClient): NotificationSender {
  return new NotificationSender(client);
}
