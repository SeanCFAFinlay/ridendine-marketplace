'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '../client/browser';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { postgresTableChannelId } from '../realtime/channels';

export interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  /** Override default stable channel id (e.g. app-specific ops channel). */
  channelName?: string;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  config: RealtimeConfig,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled = true
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    if (!supabase) return;

    const schema = config.schema || 'public';
    const event = config.event || '*';
    const channelName =
      config.channelName ??
      postgresTableChannelId(schema, config.table, event, config.filter);

    const filterConfig = {
      event,
      schema,
      table: config.table,
      ...(config.filter ? { filter: config.filter } : {}),
    } as const;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filterConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onEventRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    config.table,
    config.schema,
    config.event,
    config.filter,
    config.channelName,
    enabled,
  ]);
}
