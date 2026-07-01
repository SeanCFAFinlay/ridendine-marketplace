'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Button, Spinner } from '@ridendine/ui';
import { Check, Plus, RefreshCw, Wand2 } from 'lucide-react';

interface PrepTask {
  id: string;
  title: string;
  target_quantity: number | null;
  completed_quantity: number;
  status: 'pending' | 'in_progress' | 'done';
  plan_date: string;
}
interface Batch {
  id: string;
  name: string;
  status: string;
  planned_yield: number | null;
}
interface Plan {
  today: string;
  tomorrow: string;
  todayTasks: PrepTask[];
  tomorrowTasks: PrepTask[];
  todayProgress: { done: number; total: number; pct: number };
  openBatches: Batch[];
}

export default function ProductionPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [forecasting, setForecasting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/production/plan');
      if (res.ok) setPlan((await res.json()).data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleTask = async (task: PrepTask) => {
    setBusy((b) => ({ ...b, [task.id]: true }));
    const nextStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      await fetch(`/api/production/prep-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchData();
    } finally {
      setBusy((b) => ({ ...b, [task.id]: false }));
    }
  };

  const addTask = async () => {
    if (!newTitle.trim() || adding || !plan) return;
    setAdding(true);
    try {
      await fetch('/api/production/prep-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), planDate: plan.today }),
      });
      setNewTitle('');
      await fetchData();
    } finally {
      setAdding(false);
    }
  };

  const forecast = async () => {
    if (forecasting || !plan) return;
    setForecasting(true);
    try {
      await fetch('/api/production/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planDate: plan.tomorrow }),
      });
      await fetchData();
    } finally {
      setForecasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const TaskRow = ({ task }: { task: PrepTask }) => (
    <div className="flex items-center gap-3 border-b border-divider py-2 last:border-0">
      <button
        onClick={() => toggleTask(task)}
        disabled={Boolean(busy[task.id])}
        aria-label={task.status === 'done' ? 'Mark not done' : 'Mark done'}
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border ${task.status === 'done' ? 'border-success bg-success text-white' : 'border-borderStrong bg-white hover:border-primary'}`}
      >
        {task.status === 'done' && <Check className="h-4 w-4" />}
      </button>
      <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-textMuted line-through' : 'text-text'}`}>{task.title}</span>
      {task.target_quantity != null && <span className="text-xs text-textMuted">{task.target_quantity}</span>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Production</h1>
          <p className="mt-1 text-sm text-textMuted">Prep plan and batch production. Prep progress is saved and shared across devices.</p>
        </div>
        <button onClick={fetchData} aria-label="Refresh" className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted hover:text-text">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Today's prep */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-text">
            Today&apos;s prep{' '}
            {plan && plan.todayProgress.total > 0 && (
              <span className="ml-2 text-sm font-normal text-textMuted">
                {plan.todayProgress.done}/{plan.todayProgress.total} done
              </span>
            )}
          </h2>
        </div>
        {plan && plan.todayTasks.length > 0 ? (
          <div>{plan.todayTasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
        ) : (
          <p className="py-4 text-center text-sm text-textMuted">No prep tasks for today yet.</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a prep task…"
            className="min-h-10 flex-1 rounded-lg border border-borderStrong px-3 text-sm"
          />
          <Button onClick={addTask} disabled={!newTitle.trim() || adding}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
      </Card>

      {/* Tomorrow */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-text">Tomorrow&apos;s prep</h2>
          <Button size="sm" variant="outline" onClick={forecast} disabled={forecasting}>
            <Wand2 className="mr-1 h-4 w-4" />{forecasting ? 'Forecasting…' : 'Forecast from demand'}
          </Button>
        </div>
        {plan && plan.tomorrowTasks.length > 0 ? (
          <div>{plan.tomorrowTasks.map((t) => <TaskRow key={t.id} task={t} />)}</div>
        ) : (
          <p className="py-4 text-center text-sm text-textMuted">Nothing planned. Forecast from same-weekday demand to auto-fill.</p>
        )}
      </Card>

      {/* Batches */}
      <Card>
        <h2 className="mb-3 font-bold text-text">Open batches</h2>
        {plan && plan.openBatches.length > 0 ? (
          <div className="space-y-2">
            {plan.openBatches.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-surfaceMuted px-3 py-2 text-sm">
                <span className="font-medium text-text">{b.name}</span>
                <span className="text-textMuted">{b.status}{b.planned_yield != null ? ` · yield ${b.planned_yield}` : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-textMuted">No open batches.</p>
        )}
      </Card>
    </div>
  );
}
