'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Storefront = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ChefProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  bio: string | null;
  status: string;
  created_at: string;
  chef_storefronts: Storefront[] | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case 'approved': return 'bg-success text-white';
    case 'pending':  return 'bg-warning text-white';
    case 'suspended': return 'bg-primary text-white';
    case 'rejected': return 'bg-danger text-white';
    default:         return 'bg-surfaceMuted text-white';
  }
}

export default function ChefApprovalsPage() {
  const [chefs, setChefs] = useState<ChefProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChefs();
  }, []);

  async function fetchChefs() {
    try {
      const response = await fetch('/api/chefs');
      const result = await response.json();
      const all = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
      setChefs(all);
    } catch (error) {
      console.error('Failed to fetch chefs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
    try {
      await fetch(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchChefs();
    } catch (error) {
      console.error(`Failed to ${action} chef:`, error);
    }
  }

  const pending = chefs.filter((c) => c.status === 'pending');
  const needsOnboarding = chefs.filter(
    (c) =>
      c.status === 'approved' &&
      (!c.chef_storefronts || c.chef_storefronts.length === 0 || !c.chef_storefronts.some((s) => s.is_active))
  );
  const recentlyJoined = chefs
    .filter((c) => {
      const ageDays = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays < 30;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl">
          <div className="text-center text-textMuted">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  function ChefRow({ chef }: { chef: ChefProfile }) {
    const storefront = chef.chef_storefronts?.[0];
    const ageDays = Math.floor((Date.now() - new Date(chef.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return (
      <Card className="border-border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
              {getInitials(chef.display_name)}
            </div>
            <div>
              <Link href={`/dashboard/chefs/${chef.id}`} className="text-base font-semibold text-white hover:text-primary">
                {chef.display_name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-textMuted">
                {chef.phone && <span>{chef.phone}</span>}
                <span>·</span>
                <span>Joined {ageDays === 0 ? 'today' : `${ageDays}d ago`}</span>
                <span>·</span>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeColor(chef.status)}`}>
                  {chef.status}
                </span>
                {storefront ? (
                  <Badge variant={storefront.is_active ? 'success' : 'warning'}>
                    {storefront.is_active ? 'Storefront live' : 'Storefront inactive'}
                  </Badge>
                ) : (
                  <Badge variant="warning">No storefront yet</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/chefs/${chef.id}`}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primaryHover"
            >
              View / Manage
            </Link>
            {chef.status === 'pending' && (
              <>
                <button
                  onClick={() => handleAction(chef.id, 'approve')}
                  className="rounded bg-success px-3 py-1.5 text-sm font-medium text-white hover:bg-success"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(chef.id, 'reject')}
                  className="rounded bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger"
                >
                  Reject
                </button>
              </>
            )}
            {chef.status === 'approved' && (
              <button
                onClick={() => handleAction(chef.id, 'suspend')}
                className="rounded bg-surfaceMuted px-3 py-1.5 text-sm font-medium text-white hover:bg-surfaceMuted"
              >
                Suspend
              </button>
            )}
            {chef.status === 'suspended' && (
              <button
                onClick={() => handleAction(chef.id, 'unsuspend')}
                className="rounded bg-success px-3 py-1.5 text-sm font-medium text-white hover:bg-success"
              >
                Reinstate
              </button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Chef Onboarding</h1>
          <p className="mt-2 text-textMuted">
            New chef signups are auto-approved. Use this page to track recent joiners,
            spot chefs who haven&apos;t finished setting up a storefront, and intervene
            when a chef needs to be suspended or reinstated.
          </p>
          <p className="mt-2 text-sm text-textMuted">
            For the full chef directory + filters, see{' '}
            <Link href="/dashboard/chefs" className="text-primary hover:underline">
              All Chefs
            </Link>
            .
          </p>
        </div>

        {/* Pending review (rare after auto-approve, but keep for legacy + ops imports) */}
        {pending.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Pending Review</h2>
              <Badge className="bg-warning text-white">{pending.length}</Badge>
            </div>
            <div className="space-y-3">
              {pending.map((chef) => <ChefRow key={chef.id} chef={chef} />)}
            </div>
          </section>
        )}

        {/* Approved but storefront not yet live */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Needs Storefront Setup</h2>
            <Badge className="bg-primary text-white">{needsOnboarding.length}</Badge>
          </div>
          <p className="mb-3 text-sm text-textMuted">
            These chefs signed up and are approved, but their storefront is either missing
            or inactive. They need to finish onboarding in the chef portal — or you can
            help them from the chef detail page.
          </p>
          {needsOnboarding.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-8 text-center text-sm text-textMuted">
              All approved chefs have an active storefront.
            </div>
          ) : (
            <div className="space-y-3">
              {needsOnboarding.map((chef) => <ChefRow key={chef.id} chef={chef} />)}
            </div>
          )}
        </section>

        {/* Recently joined (last 30 days) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recently Joined</h2>
            <Badge className="bg-surfaceMuted text-white">{recentlyJoined.length}</Badge>
          </div>
          {recentlyJoined.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface py-8 text-center text-sm text-textMuted">
              No new chef signups in the last 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {recentlyJoined.map((chef) => <ChefRow key={chef.id} chef={chef} />)}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
