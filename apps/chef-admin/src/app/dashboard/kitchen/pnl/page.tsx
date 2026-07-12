'use client';

// ==========================================
// KITCHEN P&L DASHBOARD (Ghost-Kitchen Phase C.3)
//
// Per-brand contribution + kitchen prime-cost rollup for the commissary. Reads
// /api/costs/pnl. Shows "needs setup" where recipes/labour are absent rather
// than fabricating numbers.
// ==========================================

import { useEffect, useState, useCallback } from 'react';

type BrandPnl = {
  storefrontId: string;
  name: string;
  sales: number;
  foodCost: number | null;
  laborCost: number | null;
  platformFees: number | null;
  overhead: number;
  contributionMargin: number | null;
  netMargin: number | null;
  foodCostPct: number | null;
  laborCostPct: number | null;
  primeCostPct: number | null;
  needsSetup: boolean;
};

type KitchenPnl = {
  period: { days: number; since: string };
  brands: BrandPnl[];
  sales: number;
  foodCost: number;
  laborCost: number;
  platformFees: number;
  overhead: number;
  contributionMargin: number;
  netMargin: number;
  primeCostPct: number | null;
  primeTargetPct: number;
  primeWarning: boolean;
  bestBrandId: string | null;
  worstBrandId: string | null;
  setup?: { laborTracked: boolean; packagingWired: boolean };
};

const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctText = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
];

export default function KitchenPnlPage() {
  const [days, setDays] = useState(1);
  const [data, setData] = useState<KitchenPnl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/costs/pnl?days=${d}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load P&L');
      setData((json.data ?? json) as KitchenPnl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load P&L');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Kitchen P&amp;L</h1>
          <p className="text-sm text-textMuted">Per-brand contribution and commissary prime cost.</p>
        </div>
        <div className="inline-flex rounded-md border border-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                days === p.days ? 'bg-primarySoft text-primary' : 'text-textMuted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="rounded-lg border border-border bg-surface p-8 text-center text-textMuted">Loading…</div>}
      {error && !loading && (
        <div className="rounded-lg border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Kitchen rollup */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sales" value={money(data.sales)} />
            <StatTile label="Contribution" value={money(data.contributionMargin)} />
            <StatTile
              label="Prime cost"
              value={pctText(data.primeCostPct)}
              tone={data.primeWarning ? 'danger' : 'ok'}
              hint={`target ≤ ${pctText(data.primeTargetPct)}`}
            />
            <StatTile label="Net (after overhead)" value={money(data.netMargin)} />
          </div>

          {data.setup && !data.setup.laborTracked && (
            <SetupNote text="Labour isn't tracked yet — clock staff in/out so labour cost and prime % reflect reality." />
          )}

          {/* Per-brand table */}
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-textMuted">
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 text-right font-medium">Sales</th>
                  <th className="px-4 py-3 text-right font-medium">Food %</th>
                  <th className="px-4 py-3 text-right font-medium">Labour %</th>
                  <th className="px-4 py-3 text-right font-medium">Prime %</th>
                  <th className="px-4 py-3 text-right font-medium">Contribution</th>
                </tr>
              </thead>
              <tbody>
                {data.brands.map((b) => (
                  <tr key={b.storefrontId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{b.name}</span>
                        {b.storefrontId === data.bestBrandId && <Tag tone="ok">Best</Tag>}
                        {b.storefrontId === data.worstBrandId && b.storefrontId !== data.bestBrandId && (
                          <Tag tone="warn">Lowest</Tag>
                        )}
                        {b.needsSetup && <Tag tone="muted">Needs setup</Tag>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text">{money(b.sales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-textMuted">{pctText(b.foodCostPct)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-textMuted">{pctText(b.laborCostPct)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-textMuted">{pctText(b.primeCostPct)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-text">
                      {money(b.contributionMargin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-textMuted">
            Shared labour is split across brands by order-count share; food cost is from active recipes; overhead is
            allocated by sales share. Packaging is not yet wired.
          </p>
        </>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-textMuted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${tone === 'danger' ? 'text-danger' : 'text-text'}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-textMuted">{hint}</div>}
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'muted' }) {
  const cls =
    tone === 'ok'
      ? 'bg-successSoft text-success'
      : tone === 'warn'
        ? 'bg-warningSoft text-warning'
        : 'bg-surfaceMuted text-textMuted';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function SetupNote({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border bg-surfaceMuted p-3 text-sm text-textMuted">{text}</div>
  );
}
