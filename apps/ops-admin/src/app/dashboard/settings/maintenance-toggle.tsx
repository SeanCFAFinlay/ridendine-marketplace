'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';

interface MaintenanceState {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  activatedAt: string | null;
  storefronts: { active: number; paused: number; total: number };
}

export function MaintenanceToggle() {
  const [state, setState] = useState<MaintenanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/engine/maintenance')
      .then(r => r.json())
      .then(d => { if (d.success) setState(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (action: 'activate' | 'deactivate') => {
    const confirmMsg = action === 'activate'
      ? `This will PAUSE ALL storefronts. No new orders can be placed. Continue?`
      : `This will restore all storefronts that were paused by maintenance. Continue?`;
    if (!confirm(confirmMsg)) return;

    setToggling(true); setError('');
    try {
      const res = await fetch('/api/engine/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Refresh state
      const fresh = await fetch('/api/engine/maintenance').then(r => r.json());
      if (fresh.success) setState(fresh.data);
      setMessage('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setToggling(false); }
  };

  if (loading) return <Card className="border-gray-800 bg-[#16213e] p-6"><div className="h-20 bg-gray-700/30 rounded animate-pulse" /></Card>;

  const isActive = state?.maintenanceMode;

  return (
    <Card className={`p-6 ${isActive ? 'border-red-500/50 bg-red-950/20' : 'border-gray-800 bg-[#16213e]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
            <Badge className={isActive ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-emerald-500/20 text-emerald-300'}>
              {isActive ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {isActive
              ? `Activated ${state?.activatedAt ? new Date(state.activatedAt).toLocaleString() : 'recently'}. All storefronts paused.`
              : 'Pauses all storefronts and blocks new orders. Use for planned downtime or emergencies.'}
          </p>
          {state && (
            <p className="mt-2 text-xs text-gray-500">
              Storefronts: {state.storefronts.active} active, {state.storefronts.paused} paused, {state.storefronts.total} total
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isActive ? (
            <Button onClick={() => toggle('deactivate')} disabled={toggling}
              className="bg-emerald-600 hover:bg-emerald-700">
              {toggling ? 'Restoring...' : 'End Maintenance'}
            </Button>
          ) : (
            <div className="space-y-2">
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg bg-[#1a1a2e] border border-gray-600 text-white px-3 py-1.5 text-sm" />
              <Button onClick={() => toggle('activate')} disabled={toggling} variant="destructive" className="w-full">
                {toggling ? 'Activating...' : 'Activate Maintenance'}
              </Button>
            </div>
          )}
        </div>
      </div>
      {error && <div className="mt-3 rounded-lg bg-red-500/20 p-2 text-xs text-red-300">{error}</div>}
    </Card>
  );
}
