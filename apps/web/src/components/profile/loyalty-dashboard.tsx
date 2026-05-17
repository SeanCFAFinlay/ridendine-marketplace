'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LoyaltyBalance, LoyaltyTier } from '@ridendine/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'bonus' | 'expire';
  description: string | null;
  order_id: string | null;
  created_at: string;
}

interface LoyaltyData extends LoyaltyBalance {
  recentTransactions: LoyaltyTransaction[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_CONFIG: Record<LoyaltyTier, { label: string; color: string; bg: string; emoji: string }> = {
  bronze: { label: 'Bronze', color: 'text-warning', bg: 'bg-warningSoft border-warning/30', emoji: '🥉' },
  silver: { label: 'Silver', color: 'text-textMuted', bg: 'bg-surfaceMuted border-border', emoji: '🥈' },
  gold: { label: 'Gold', color: 'text-warning', bg: 'bg-warningSoft border-warning/30', emoji: '🥇' },
};

const TIER_MULTIPLIER: Record<LoyaltyTier, string> = {
  bronze: '1x',
  silver: '1.25x',
  gold: '1.5x',
};

const TX_TYPE_LABELS: Record<string, string> = {
  earn: 'Earned',
  redeem: 'Redeemed',
  bonus: 'Bonus',
  expire: 'Expired',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: LoyaltyTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.color}`}
    >
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function ProgressBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-textMuted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isPositive = tx.points > 0;
  const date = new Date(tx.created_at).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center justify-between border-t border-divider py-3">
      <div>
        <p className="text-sm text-text">{tx.description ?? TX_TYPE_LABELS[tx.type]}</p>
        <p className="text-xs text-textSubtle">{date}</p>
      </div>
      <span
        className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}
      >
        {isPositive ? '+' : ''}{tx.points} pts
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-lg bg-surfaceMuted" />
      <div className="h-16 rounded-lg bg-surfaceMuted" />
      <div className="h-40 rounded-lg bg-surfaceMuted" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LoyaltyDashboard() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/loyalty');
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? 'Failed to load loyalty data');
      setData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  const tierCfg = TIER_CONFIG[data.tier];
  const multiplier = TIER_MULTIPLIER[data.tier];
  const discountValue = (data.pointsBalance * 0.10).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className={`rounded-lg border p-6 shadow-sm ${tierCfg.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <TierBadge tier={data.tier} />
            <p className="mt-3 text-4xl font-bold text-text">
              {data.pointsBalance.toLocaleString()}
              <span className="ml-2 text-base font-normal text-textMuted">points</span>
            </p>
            <p className="mt-1 text-sm text-textMuted">
              Worth <span className="font-semibold text-primary">${discountValue}</span> off your next order
            </p>
          </div>
          <div className="text-right text-sm text-textMuted">
            <p className="font-medium">{data.lifetimePoints.toLocaleString()}</p>
            <p>lifetime pts</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-textMuted">
          You earn {multiplier} points per $1 spent as a {tierCfg.label} member
        </div>
      </div>

      {/* Progress to next tier */}
      {data.nextTierPoints !== null && (
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-text">Progress to Next Tier</p>
          <ProgressBar
            current={data.lifetimePoints}
            max={data.lifetimePoints + data.nextTierPoints}
            label={`${data.nextTierPoints} pts to next tier`}
          />
        </div>
      )}

      {data.tier === 'gold' && (
        <div className="rounded-lg border border-warning/30 bg-warningSoft p-4 text-sm text-warning">
          You have reached Gold status — the highest tier! Enjoy 1.5x points on every order.
        </div>
      )}

      {/* Recent transactions */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-divider px-4 py-3">
          <h4 className="text-sm font-semibold text-text">Recent Activity</h4>
        </div>
        <div className="px-4">
          {data.recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-textSubtle">
              No transactions yet. Place an order to start earning points!
            </p>
          ) : (
            data.recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
