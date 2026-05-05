'use client';

import { useState } from 'react';
import type { PlatformRuleSet } from '@ridendine/types';

type SettingsFormProps = {
  initialRules: PlatformRuleSet;
  canEdit: boolean;
};

const inputClass =
  'w-full rounded-lg border border-gray-700 bg-opsPanel px-3 py-2 text-white disabled:opacity-60';

function NumberField({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-gray-300">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={inputClass}
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-gray-700 bg-opsPanel px-4 py-3">
      <span className="text-sm text-gray-300">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </h3>
  );
}

export function SettingsForm({ initialRules, canEdit }: SettingsFormProps) {
  const [form, setForm] = useState(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setNumber<K extends keyof PlatformRuleSet>(key: K, value: string) {
    setForm((cur) => ({ ...cur, [key]: Number(value) }));
  }

  function setBool<K extends keyof PlatformRuleSet>(key: K, value: boolean) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

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

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Financial */}
      <div className="space-y-4">
        <SectionHeading>Financial</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          <NumberField
            label="Platform fee %"
            value={form.platformFeePercent}
            step="0.01"
            disabled={!canEdit}
            onChange={(v) => setNumber('platformFeePercent', v)}
          />
          <NumberField
            label="Service fee %"
            value={form.serviceFeePercent}
            step="0.01"
            disabled={!canEdit}
            onChange={(v) => setNumber('serviceFeePercent', v)}
          />
          <NumberField
            label="HST rate %"
            value={form.hstRate}
            step="0.01"
            disabled={!canEdit}
            onChange={(v) => setNumber('hstRate', v)}
          />
          <NumberField
            label="Min order amount (cents)"
            value={form.minOrderAmount}
            disabled={!canEdit}
            onChange={(v) => setNumber('minOrderAmount', v)}
          />
          <NumberField
            label="Refund auto-review threshold (cents)"
            value={form.refundAutoReviewThresholdCents}
            disabled={!canEdit}
            onChange={(v) => setNumber('refundAutoReviewThresholdCents', v)}
          />
        </div>
      </div>

      {/* Dispatch */}
      <div className="space-y-4">
        <SectionHeading>Dispatch</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          <NumberField
            label="Dispatch radius km"
            value={form.dispatchRadiusKm}
            step="0.1"
            disabled={!canEdit}
            onChange={(v) => setNumber('dispatchRadiusKm', v)}
          />
          <NumberField
            label="Max delivery distance km"
            value={form.maxDeliveryDistanceKm}
            step="0.1"
            disabled={!canEdit}
            onChange={(v) => setNumber('maxDeliveryDistanceKm', v)}
          />
          <NumberField
            label="Offer timeout seconds"
            value={form.offerTimeoutSeconds}
            disabled={!canEdit}
            onChange={(v) => setNumber('offerTimeoutSeconds', v)}
          />
          <NumberField
            label="Max assignment attempts"
            value={form.maxAssignmentAttempts}
            disabled={!canEdit}
            onChange={(v) => setNumber('maxAssignmentAttempts', v)}
          />
          <NumberField
            label="Default prep time minutes"
            value={form.defaultPrepTimeMinutes}
            disabled={!canEdit}
            onChange={(v) => setNumber('defaultPrepTimeMinutes', v)}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleField
            label="Auto-assign enabled"
            checked={form.autoAssignEnabled}
            disabled={!canEdit}
            onChange={(v) => setBool('autoAssignEnabled', v)}
          />
        </div>
      </div>

      {/* SLA */}
      <div className="space-y-4">
        <SectionHeading>SLA</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberField
            label="Support SLA warning minutes"
            value={form.supportSlaWarningMinutes}
            disabled={!canEdit}
            onChange={(v) => setNumber('supportSlaWarningMinutes', v)}
          />
          <NumberField
            label="Support SLA breach minutes"
            value={form.supportSlaBreachMinutes}
            disabled={!canEdit}
            onChange={(v) => setNumber('supportSlaBreachMinutes', v)}
          />
        </div>
      </div>

      {/* Storefront */}
      <div className="space-y-4">
        <SectionHeading>Storefront</SectionHeading>
        <div className="grid gap-4 lg:grid-cols-3">
          <NumberField
            label="Throttle order limit"
            value={form.storefrontThrottleOrderLimit}
            disabled={!canEdit}
            onChange={(v) => setNumber('storefrontThrottleOrderLimit', v)}
          />
          <NumberField
            label="Throttle window minutes"
            value={form.storefrontThrottleWindowMinutes}
            disabled={!canEdit}
            onChange={(v) => setNumber('storefrontThrottleWindowMinutes', v)}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleField
            label="Storefront auto-pause enabled"
            checked={form.storefrontAutoPauseEnabled}
            disabled={!canEdit}
            onChange={(v) => setBool('storefrontAutoPauseEnabled', v)}
          />
          <ToggleField
            label="Pause storefront on SLA breach"
            checked={form.storefrontPauseOnSlaBreach}
            disabled={!canEdit}
            onChange={(v) => setBool('storefrontPauseOnSlaBreach', v)}
          />
        </div>
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
