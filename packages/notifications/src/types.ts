import type { NotificationType } from '@ridendine/types';

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

export interface SMSNotification {
  to: string;
  body: string;
}
