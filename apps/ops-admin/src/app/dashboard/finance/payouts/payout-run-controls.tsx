'use client';

// ==========================================
// PAYOUT RUN CONTROLS
//
// /api/engine/payouts/{preview,execute} were fully implemented and correctly
// guarded by `finance_payouts`, but NOTHING in the UI called them — this page
// was a read-only list. Running a chef or driver payout meant hand-crafting an
// HTTP request with an ops session cookie.
//
// Deliberately preview-first: money never moves until an operator has seen the
// exact line count and total and typed a confirmation. Execute is disabled
// until a preview for the same rail and period has been loaded, so nobody can
// fire a payout run blind.
// ==========================================

import { useCallback, useMemo, useState } from 'react';

type RunType = 'chef' | 'driver';

interface PreviewLine {
  payeeId: string;
  name: string;
  amountCents: number;
  currency: string;
}

interface PreviewState {
  runType: RunType;
  periodStart: string;
  periodEnd: string;
  lines: PreviewLine[];
  currency: string;
}

function formatCents(cents: number, currency = 'CAD'): string {
  return `${currency === 'CAD' ? '$' : ''}${(cents / 100).toFixed(2)}`;
}

/** Default period: chef runs are weekly, driver runs are daily. */
function defaultPeriod(runType: RunType): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (runType === 'chef' ? 7 : 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function PayoutRunControls() {
  const [runType, setRunType] = useState<RunType>('chef');
  const initial = useMemo(() => defaultPeriod('chef'), []);
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);

  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState<false | 'preview' | 'execute'>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Any change to the rail or period invalidates the preview — otherwise an
  // operator could preview one period and execute another.
  const invalidatePreview = useCallback(() => {
    setPreview(null);
    setConfirmText('');
    setResult(null);
  }, []);

  const onRunTypeChange = (next: RunType) => {
    setRunType(next);
    const p = defaultPeriod(next);
    setPeriodStart(p.start);
    setPeriodEnd(p.end);
    invalidatePreview();
  };

  const totalCents = preview?.lines.reduce((sum, l) => sum + l.amountCents, 0) ?? 0;

  const previewMatchesForm =
    preview !== null &&
    preview.runType === runType &&
    preview.periodStart === periodStart &&
    preview.periodEnd === periodEnd;

  const canExecute =
    previewMatchesForm && preview.lines.length > 0 && confirmText.trim().toUpperCase() === 'RUN';

  async function loadPreview() {
    setBusy('preview');
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/engine/payouts/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: runType }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error?.message ?? 'Failed to load preview');
      }
      const data = body.data ?? body;
      setPreview({
        runType,
        periodStart,
        periodEnd,
        lines: (data.lines ?? []) as PreviewLine[],
        currency: data.currency ?? 'CAD',
      });
      setConfirmText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    if (!canExecute) return;
    setBusy('execute');
    setError(null);
    try {
      const res = await fetch('/api/engine/payouts/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: runType,
          // The API validates these as ISO datetimes.
          periodStart: new Date(`${periodStart}T00:00:00.000Z`).toISOString(),
          periodEnd: new Date(`${periodEnd}T23:59:59.999Z`).toISOString(),
        }),
      });
      const body = await res.json();
      if (!res.ok || body?.success === false) {
        throw new Error(body?.error?.message ?? 'Payout run failed');
      }
      setResult(
        `${runType} payout run started. Refresh to see it in the list below.`
      );
      setPreview(null);
      setConfirmText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout run failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold">Run a payout</h2>
      <p className="mt-1 text-sm text-textMuted">
        Preview first. Money only moves after you confirm the exact total below.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="block text-textMuted">Rail</span>
          <select
            value={runType}
            onChange={(e) => onRunTypeChange(e.target.value as RunType)}
            className="mt-1 rounded-md border border-border px-3 py-2"
          >
            <option value="chef">Chef (weekly)</option>
            <option value="driver">Driver (daily)</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="block text-textMuted">Period start</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => {
              setPeriodStart(e.target.value);
              invalidatePreview();
            }}
            className="mt-1 rounded-md border border-border px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="block text-textMuted">Period end</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => {
              setPeriodEnd(e.target.value);
              invalidatePreview();
            }}
            className="mt-1 rounded-md border border-border px-3 py-2"
          />
        </label>

        <button
          type="button"
          onClick={loadPreview}
          disabled={busy !== false}
          className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        >
          {busy === 'preview' ? 'Loading…' : 'Preview run'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-dangerSoft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <p role="status" className="mt-4 rounded-md bg-successSoft px-3 py-2 text-sm text-success">
          {result}
        </p>
      ) : null}

      {previewMatchesForm ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-sm">
              <span className="text-textMuted">Recipients:</span>{' '}
              <strong>{preview.lines.length}</strong>
            </p>
            <p className="text-sm">
              <span className="text-textMuted">Total:</span>{' '}
              <strong>{formatCents(totalCents, preview.currency)}</strong>
            </p>
          </div>

          {preview.lines.length === 0 ? (
            <p className="mt-3 text-sm text-textMuted">
              Nothing to pay for this period — there is no run to execute.
            </p>
          ) : (
            <>
              <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surfaceMuted text-left text-textMuted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Payee</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((line) => (
                      <tr key={line.payeeId} className="border-t border-border">
                        <td className="px-3 py-2">{line.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCents(line.amountCents, line.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="block text-textMuted">
                    Type <strong>RUN</strong> to confirm {formatCents(totalCents, preview.currency)}{' '}
                    to {preview.lines.length} {runType}s
                  </span>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RUN"
                    className="mt-1 rounded-md border border-border px-3 py-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={execute}
                  disabled={!canExecute || busy !== false}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primaryFg disabled:opacity-50"
                >
                  {busy === 'execute' ? 'Running…' : 'Execute payout run'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
