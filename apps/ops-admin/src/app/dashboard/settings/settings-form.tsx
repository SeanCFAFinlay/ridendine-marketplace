'use client';

import { useState } from 'react';
import type { PlatformRuleSet } from '@ridendine/types';

type SettingsFormProps = {
  initialRules: PlatformRuleSet;
  canEdit: boolean;
};

export function SettingsForm({ initialRules, canEdit }: SettingsFormProps) {
  const [form, setForm] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/engine/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        setError(result?.error?.message || 'Failed to save settings');
        return;
      }
      setForm(result.data);
      setMessage('Platform rules saved');
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function updateNumber<K extends keyof PlatformRuleSet>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Platform fee %</span>
          <input
            type="number"
            step="0.01"
            value={form.platformFeePercent}
            onChange={(event) => updateNumber('platformFeePercent', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Dispatch radius km</span>
          <input
            type="number"
            step="0.1"
            value={form.dispatchRadiusKm}
            onChange={(event) => updateNumber('dispatchRadiusKm', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Max delivery distance km</span>
          <input
            type="number"
            step="0.1"
            value={form.maxDeliveryDistanceKm}
            onChange={(event) => updateNumber('maxDeliveryDistanceKm', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Default prep time minutes</span>
          <input
            type="number"
            value={form.defaultPrepTimeMinutes}
            onChange={(event) => updateNumber('defaultPrepTimeMinutes', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Offer timeout seconds</span>
          <input
            type="number"
            value={form.offerTimeoutSeconds}
            onChange={(event) => updateNumber('offerTimeoutSeconds', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Max assignment attempts</span>
          <input
            type="number"
            value={form.maxAssignmentAttempts}
            onChange={(event) => updateNumber('maxAssignmentAttempts', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Refund auto-review threshold cents</span>
          <input
            type="number"
            value={form.refundAutoReviewThresholdCents}
            onChange={(event) => updateNumber('refundAutoReviewThresholdCents', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Support SLA warning minutes</span>
          <input
            type="number"
            value={form.supportSlaWarningMinutes}
            onChange={(event) => updateNumber('supportSlaWarningMinutes', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-gray-300">Support SLA breach minutes</span>
          <input
            type="number"
            value={form.supportSlaBreachMinutes}
            onChange={(event) => updateNumber('supportSlaBreachMinutes', event.target.value)}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-white disabled:opacity-60"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-3">
          <span className="text-sm text-gray-300">Auto-assign enabled</span>
          <input
            type="checkbox"
            checked={form.autoAssignEnabled}
            onChange={(event) =>
              setForm((current) => ({ ...current, autoAssignEnabled: event.target.checked }))
            }
            disabled={!canEdit}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#1a1a2e] px-4 py-3">
          <span className="text-sm text-gray-300">Storefront auto-pause enabled</span>
          <input
            type="checkbox"
            checked={form.storefrontAutoPauseEnabled}
            onChange={(event) =>
              setForm((current) => ({ ...current, storefrontAutoPauseEnabled: event.target.checked }))
            }
            disabled={!canEdit}
          />
        </label>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            error
              ? 'border border-red-500/30 bg-red-500/10 text-red-200'
              : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {error ?? message}
        </div>
      )}

      <button
        type="submit"
        disabled={!canEdit || saving}
        className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Platform Rules'}
      </button>
    </form>
  );
}
