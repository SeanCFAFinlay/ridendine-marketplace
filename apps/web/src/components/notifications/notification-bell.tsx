'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createBrowserClient, customerNotificationsChannel } from '@ridendine/db';
import { usePushNotifications } from '@/hooks/use-push-notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'delivery' | 'promo' | 'system';
  read: boolean;
  created_at: string;
  action_url?: string;
}

function mapDbNotification(row: {
  id: string;
  title: string;
  body: string;
  message: string | null;
  type: string;
  created_at: string;
  is_read: boolean;
  data: unknown;
}): Notification {
  const allowed: Notification['type'][] = ['order', 'delivery', 'promo', 'system'];
  const t = allowed.includes(row.type as Notification['type'])
    ? (row.type as Notification['type'])
    : 'system';
  let action_url: string | undefined;
  if (row.data && typeof row.data === 'object' && row.data !== null && 'action_url' in row.data) {
    const u = (row.data as { action_url?: unknown }).action_url;
    if (typeof u === 'string') action_url = u;
  }
  return {
    id: row.id,
    title: row.title,
    message: row.message ?? row.body,
    type: t,
    read: row.is_read,
    created_at: row.created_at,
    action_url,
  };
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => createBrowserClient(), []);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const { isSupported: pushSupported, permission: pushPermission, subscribe: pushSubscribe } =
    usePushNotifications();

  // Show push prompt once when user opens the bell and hasn't decided yet
  useEffect(() => {
    if (isOpen && pushSupported && pushPermission === 'default') {
      setShowPushPrompt(true);
    }
  }, [isOpen, pushSupported, pushPermission]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const db = supabase;
    let cancelled = false;
    let channel: ReturnType<typeof db.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const dbg = db as any;
      const { data } = await dbg
        .from('notifications')
        .select('id, title, body, message, type, user_id, created_at, is_read, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!cancelled && data) {
        setNotifications(data.map(mapDbNotification));
      }
      if (!cancelled) setLoading(false);

      if (cancelled) return;

      const filter = `user_id=eq.${user.id}`;
      channel = db
        .channel(customerNotificationsChannel(user.id))
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              title: string;
              body: string;
              message: string | null;
              type: string;
              created_at: string;
              is_read: boolean;
              data: unknown;
              user_id?: string;
            };
            if (row.user_id && row.user_id !== user.id) return;
            const mapped = mapDbNotification(row);
            setNotifications((prev) => [mapped, ...prev]);

            if (Notification.permission === 'granted') {
              new Notification(mapped.title, {
                body: mapped.message,
                icon: '/icons/icon-192.png',
              });
            }
          }
        )
        .subscribe();
    }

    void setup();

    return () => {
      cancelled = true;
      if (channel) db.removeChannel(channel);
    };
  }, [supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;
    await (supabase as any).from('notifications').update({ is_read: true }).eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'delivery':
        return '🚗';
      case 'promo':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
        aria-label="Notifications"
      >
        <svg
          className="h-6 w-6 text-textMuted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primaryFg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-dropdown mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-divider p-4">
            <h3 className="font-semibold text-text">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-sm text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:shadow-focus"
              >
                Mark all read
              </button>
            )}
          </div>

          {showPushPrompt && pushPermission === 'default' && (
            <div className="border-b border-divider bg-primarySoft px-4 py-3">
              <p className="text-xs text-primary">
                Enable notifications to track your orders in real time.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await pushSubscribe();
                    setShowPushPrompt(false);
                  }}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primaryFg transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:shadow-focus"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={() => setShowPushPrompt(false)}
                  className="rounded-md border border-border bg-surface px-3 py-1 text-xs text-textMuted transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-textMuted">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-textMuted">
                <div className="text-3xl mb-2">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex cursor-pointer gap-3 border-b border-divider p-4 transition-colors hover:bg-surfaceMuted ${
                    !notification.read ? 'bg-primarySoft' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.action_url) {
                      window.location.href = notification.action_url;
                    }
                  }}
                >
                  <span className="text-2xl">{getIcon(notification.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{notification.title}</p>
                    <p className="text-sm text-textMuted line-clamp-2">{notification.message}</p>
                    <p className="mt-1 text-xs text-textSubtle">{formatTime(notification.created_at)}</p>
                  </div>
                  {!notification.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
