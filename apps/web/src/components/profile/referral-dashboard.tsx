'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReferralStats } from '@ridendine/engine';

/**
 * Referral links were previously hard-coded to `https://ridendine.com/signup`,
 * which was wrong twice over: production is `ridendine.ca`, and `/signup` does
 * not exist — the signup page is `/auth/signup`. Every shared link 404'd on a
 * domain the company may not control, so the whole referral channel was dead
 * while the capture side (`/auth/signup?ref=`) worked perfectly.
 *
 * Derived from NEXT_PUBLIC_APP_URL so it follows the deployment, and pointed at
 * the real signup route. Asserted by referral-dashboard.test.tsx.
 */
const REFERRAL_SIGNUP_PATH = '/auth/signup';

function referralBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  // Client-side fallback: the page the customer is already on is the right origin.
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function buildReferralLink(code: string): string {
  return `${referralBaseUrl()}${REFERRAL_SIGNUP_PATH}?ref=${encodeURIComponent(code)}`;
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// Sub-components

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-sm text-textMuted">{label}</p>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primaryFg transition hover:bg-primaryHover focus:outline-none focus-visible:shadow-focus"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}

function ReferralSignupRow({ signup }: { signup: ReferralStats['signups'][0] }) {
  const statusColors: Record<string, string> = {
    pending: 'text-warning bg-warningSoft',
    completed: 'text-success bg-successSoft',
    rewarded: 'text-info bg-infoSoft',
  };

  const colorClass = statusColors[signup.status] ?? 'text-textMuted bg-surfaceMuted';

  return (
    <tr className="border-t border-divider">
      <td className="py-3 pl-4 pr-3 text-sm text-text font-mono">
        {signup.referredUserId.slice(0, 8)}…
      </td>
      <td className="py-3 px-3 text-sm capitalize text-textMuted">
        {signup.referredUserType}
      </td>
      <td className="py-3 px-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
          {signup.status}
        </span>
      </td>
      <td className="py-3 pl-3 pr-4 text-sm text-textMuted">
        {signup.rewardPaid ? 'Paid' : 'Pending'}
      </td>
    </tr>
  );
}

function EmptySignups() {
  return (
    <p className="py-8 text-center text-sm text-textSubtle">
      No referrals yet. Share your code to start earning!
    </p>
  );
}

// Main component

interface Props {
  userId: string;
}

export function ReferralDashboard(_props: Props) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      const body = await res.json();
      if (!res.ok || body.success === false) {
        if (res.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/auth/login?redirect=/profile';
          return;
        }
        throw new Error(body.error?.message || body.error || 'Failed to load referral data');
      }
      setStats(body.data?.referral ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/referrals', { method: 'POST' });
      const body = await res.json();
      if (!res.ok || body.success === false) {
        if (res.status === 401 && typeof window !== 'undefined') {
          window.location.href = '/auth/login?redirect=/profile';
          return;
        }
        throw new Error(body.error?.message || body.error || 'Failed to generate referral code');
      }
      setStats(body.data?.referral ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate referral code');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-lg bg-surfaceMuted" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-surfaceMuted" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-text">Start Referring Friends</h3>
        <p className="mt-2 text-sm text-textMuted">
          Earn $5 for every friend who places their first order using your referral link.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primaryFg transition-colors hover:bg-primaryHover disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-focus"
        >
          {generating ? 'Generating…' : 'Get My Referral Code'}
        </button>
      </div>
    );
  }

  const referralLink = buildReferralLink(stats.code);
  const earningsDollars = (stats.earningsCents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Code card */}
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text">Your Referral Code</h3>
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-md bg-surfaceMuted px-4 py-2 font-mono text-xl font-bold tracking-widest text-primary">
            {stats.code}
          </span>
          <CopyButton text={stats.code} label="Copy Code" />
        </div>

        <p className="mt-4 text-sm text-textMuted">Or share your unique link:</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="truncate rounded-md border border-border bg-surfaceMuted px-3 py-2 text-sm text-textMuted">
            {referralLink}
          </span>
          <CopyButton text={referralLink} label="Copy Link" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Referrals" value={stats.totalReferrals} />
        <StatCard label="Successful" value={stats.successfulReferrals} />
        <StatCard label="Earnings" value={`$${earningsDollars}`} />
      </div>

      {/* Signup list */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-divider px-4 py-3">
          <h4 className="text-sm font-semibold text-text">Referred Users</h4>
        </div>

        {stats.signups.length === 0 ? (
          <EmptySignups />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surfaceMuted text-left text-xs font-medium uppercase text-textMuted">
                <th className="py-2 pl-4 pr-3">User ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 pl-3 pr-4">Reward</th>
              </tr>
            </thead>
            <tbody>
              {stats.signups.map((s) => (
                <ReferralSignupRow key={s.id} signup={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-textSubtle">
        You earn $5 when a referred friend places their first order. Reward is issued as a promo code.
      </p>
    </div>
  );
}
