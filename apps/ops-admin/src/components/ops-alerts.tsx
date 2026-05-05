'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createBrowserClient } from '@ridendine/db';
import { opsAlertsChannel } from '@ridendine/db';

interface AlertItem {
  id: string;
  type: string;
  title: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  link: string;
  time: string;
}

/** Matches `.select(...)` on `system_alerts` below (browser client row typing is loose). */
interface SystemAlertRow {
  id: string;
  alert_type: string;
  title: string;
  severity: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

function playAlertBeep(severity: string) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = severity === 'critical' ? 1200 : severity === 'error' ? 900 : 600;
    osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    if (severity === 'critical' || severity === 'error') {
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = severity === 'critical' ? 1400 : 1100;
        osc2.type = 'sine';
        gain2.gain.value = 0.2;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);
    }
  } catch { /* audio unavailable */ }
}

function buildAlertLink(entityType: string, entityId: string): string {
  if (entityType === 'delivery') return `/dashboard/deliveries/${entityId}`;
  if (entityType === 'order') return `/dashboard/orders/${entityId}`;
  return '/dashboard';
}

function mapSeverity(raw: string): AlertItem['severity'] {
  if (raw === 'critical') return 'critical';
  if (raw === 'error') return 'error';
  if (raw === 'warning') return 'warning';
  return 'info';
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500',
  error: 'bg-red-400',
  warning: 'bg-yellow-400',
  info: 'bg-blue-400',
};

export function OpsAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [open, setOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const lastCountRef = useRef(0);
  const supabase = useMemo(() => createBrowserClient(), []);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!supabase) return;
      try {
        const { data: sysAlerts } = await supabase
          .from('system_alerts')
          .select('id, alert_type, title, severity, entity_type, entity_id, created_at')
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(20);

        const rows = (sysAlerts ?? []) as SystemAlertRow[];
        const items: AlertItem[] = rows.map((a) => ({
          id: a.id,
          type: a.alert_type,
          title: a.title,
          severity: mapSeverity(a.severity),
          link: buildAlertLink(a.entity_type, a.entity_id),
          time: a.created_at,
        }));

        if (items.length > lastCountRef.current && items[0]) {
          playAlertBeep(items[0].severity);
        }
        lastCountRef.current = items.length;
        setAlerts(items);
        setUnseenCount(items.length);
      } catch { /* silent */ }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(opsAlertsChannel())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_alerts' }, () => {
        setUnseenCount(prev => prev + 1);
        playAlertBeep('error');
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open) setUnseenCount(0);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Alerts"
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-700 bg-opsPanel shadow-2xl z-50">
          <div className="border-b border-gray-700 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Alerts ({alerts.length})</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No active alerts</div>
            ) : (
              alerts.map((alert) => (
                <Link key={alert.id} href={alert.link} onClick={() => setOpen(false)}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div
                      className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${SEVERITY_COLOR[alert.severity] ?? 'bg-gray-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                      <p className="text-xs text-gray-500">{new Date(alert.time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          {alerts.length > 0 && (
            <div className="border-t border-gray-700 px-4 py-2">
              <Link
                href="/dashboard/support"
                onClick={() => setOpen(false)}
                className="text-xs text-[#E85D26] hover:underline"
              >
                View all alerts
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
