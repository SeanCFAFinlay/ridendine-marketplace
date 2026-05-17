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
  const [pendingAction, setPendingAction] = useState<'activate_maintenance' | 'deactivate_maintenance' | null>(null);

  useEffect(() => {
    fetch('/api/engine/maintenance')
      .then(r => r.json())
      .then(d => { if (d.success) setState(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (action: 'activate_maintenance' | 'deactivate_maintenance') => {
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
      setPendingAction(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setToggling(false); }
  };

  if (loading) return <Card className="border-border bg-surface p-6"><div className="h-20 bg-surfaceMuted/30 rounded animate-pulse" /></Card>;

  const isActive = state?.maintenanceMode;

  return (
    <Card className={`p-6 ${isActive ? 'border-danger/50 bg-dangerSoft' : 'border-border bg-surface'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
            <Badge className={isActive ? 'bg-danger/20 text-danger animate-pulse' : 'bg-success/20 text-success'}>
              {isActive ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-textMuted">
            {isActive
              ? `Activated ${state?.activatedAt ? new Date(state.activatedAt).toLocaleString() : 'recently'}. All storefronts paused.`
              : 'Pauses all storefronts and blocks new orders. Use for planned downtime or emergencies.'}
          </p>
          {state && (
            <p className="mt-2 text-xs text-textMuted">
              Storefronts: {state.storefronts.active} active, {state.storefronts.paused} paused, {state.storefronts.total} total
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isActive ? (
            <Button onClick={() => setPendingAction('deactivate_maintenance')} disabled={toggling}
              className="bg-success hover:bg-success">
              {toggling ? 'Restoring...' : 'End Maintenance'}
            </Button>
          ) : (
            <div className="space-y-2">
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full rounded-lg bg-surface border border-border text-white px-3 py-1.5 text-sm" />
              <Button onClick={() => setPendingAction('activate_maintenance')} disabled={toggling} variant="destructive" className="w-full">
                {toggling ? 'Activating...' : 'Activate Maintenance'}
              </Button>
            </div>
          )}
        </div>
      </div>
      {pendingAction && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm text-warning">
            {pendingAction === 'activate_maintenance'
              ? 'Confirm maintenance mode. This pauses active storefronts and blocks new orders.'
              : 'Confirm ending maintenance. Storefronts paused by maintenance will be restored.'}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => toggle(pendingAction)} disabled={toggling}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPendingAction(null)} disabled={toggling}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <div className="mt-3 rounded-lg bg-danger/20 p-2 text-xs text-danger">{error}</div>}
    </Card>
  );
}
