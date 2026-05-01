'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input } from '@ridendine/ui';

type Slot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
};

const DEFAULTS: Slot[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d,
  start_time: '09:00',
  end_time: '21:00',
  is_available: true,
}));

const LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeeklyAvailabilityForm() {
  const [slots, setSlots] = useState<Slot[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/storefront/availability');
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to load');
        return;
      }
      const loaded = json.data?.slots as
        | { day_of_week: number; start_time: string; end_time: string; is_available: boolean }[]
        | undefined;
      if (loaded && loaded.length > 0) {
        const byDay = [...DEFAULTS];
        for (const row of loaded) {
          const i = byDay.findIndex((s) => s.day_of_week === row.day_of_week);
          if (i >= 0) {
            byDay[i] = {
              day_of_week: row.day_of_week,
              start_time: row.start_time.slice(0, 5),
              end_time: row.end_time.slice(0, 5),
              is_available: row.is_available,
            };
          }
        }
        setSlots(byDay);
      } else {
        setSlots(DEFAULTS);
      }
    } catch {
      setError('Network error loading availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/storefront/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: slots.map((s) => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_available: s.is_available,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Save failed');
        return;
      }
      setMessage('Saved. Customers can only order during open hours you configure.');
      await load();
    } catch {
      setError('Network error saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 text-sm text-gray-500">Loading availability…</Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900">Weekly hours</h2>
      <p className="mt-1 text-sm text-gray-500">
        Set open hours per day. Times use your browser&apos;s local timezone; saved as
        HH:MM in the database. Customers are blocked outside these windows when rows exist.
      </p>

      <div className="mt-6 space-y-4">
        {slots.map((slot, idx) => (
          <div
            key={slot.day_of_week}
            className="flex flex-wrap items-end gap-4 border-b border-gray-100 pb-4 last:border-0"
          >
            <div className="w-14 text-sm font-medium text-gray-700">{LABELS[idx]}</div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={slot.is_available}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, is_available: e.target.checked };
                  setSlots(next);
                }}
              />
              Open
            </label>
            <div>
              <span className="text-xs text-gray-500">From</span>
              <Input
                type="time"
                value={slot.start_time}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, start_time: e.target.value };
                  setSlots(next);
                }}
                disabled={!slot.is_available}
              />
            </div>
            <div>
              <span className="text-xs text-gray-500">To</span>
              <Input
                type="time"
                value={slot.end_time}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { ...slot, end_time: e.target.value };
                  setSlots(next);
                }}
                disabled={!slot.is_available}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}

      <Button className="mt-6" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save hours'}
      </Button>
    </Card>
  );
}
