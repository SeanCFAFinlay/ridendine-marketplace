'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '../client/browser';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimeConfig {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  config: RealtimeConfig,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled = true,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`realtime-${config.table}-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter ? { filter: config.filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          onEventRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config.table, config.schema, config.event, config.filter, enabled]);
}
