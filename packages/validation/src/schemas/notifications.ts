import { z } from 'zod';

// ==========================================
// NOTIFICATION VALIDATION SCHEMAS
// ==========================================

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().optional().default('system'),
  action_url: z.string().url().optional(),
  user_id: z.string().uuid().optional(),
});

export const updateNotificationSchema = z.union([
  z.object({
    notification_id: z.string().uuid('notification_id must be a valid UUID'),
    read: z.boolean(),
  }),
  z.object({
    notification_id: z.undefined(),
    read: z.boolean().optional(),
  }),
]);

export const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('endpoint must be a valid URL'),
    keys: z.object({
      p256dh: z.string().min(1, 'p256dh key is required'),
      auth: z.string().min(1, 'auth key is required'),
    }),
  }),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url('endpoint must be a valid URL'),
});

// Type exports
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
