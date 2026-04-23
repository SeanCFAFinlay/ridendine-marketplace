// ==========================================
// NOTIFICATION SENDER
// Wraps notification inserts with error isolation
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@ridendine/notifications';
import type { NotificationType } from '@ridendine/types';

export class NotificationSender {
  constructor(private client: SupabaseClient) {}

  async send(
    type: NotificationType,
    userId: string,
    params: Record<string, string | number> = {},
    additionalData?: Record<string, unknown>,
  ): Promise<void> {
    const payload = createNotification(type, userId, params, additionalData);

    try {
      await (this.client as any).from('notifications').insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || null,
      });
    } catch (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Failed to send notification',
        context: { type, userId },
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }
}

export function createNotificationSender(client: SupabaseClient): NotificationSender {
  return new NotificationSender(client);
}
