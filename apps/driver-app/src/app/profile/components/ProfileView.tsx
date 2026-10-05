'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';
import type { Driver } from '@ridendine/db';

interface PayoutAccount {
  id: string;
  stripe_account_id: string;
  status: 'pending' | 'active' | 'restricted';
}

interface ProfileViewProps {
  driver: Driver;
}

type SummaryTone = 'success' | 'warning' | 'danger' | 'info' | 'idle';

const toneClass: Record<SummaryTone, string> = {
  success: 'bg-successSoft text-success',
  warning: 'bg-warningSoft text-warning',
  danger: 'bg-dangerSoft text-danger',
  info: 'bg-infoSoft text-info',
  idle: 'bg-surfaceMuted text-textMuted',
};

function titleCase(value: string | null | undefined) {
  if (!value) return 'Not provided';

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getDriverStatusTone(status: string | null | undefined): SummaryTone {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'suspended' || status === 'rejected') return 'danger';
  return 'info';
}

function getPayoutSummary(payoutAccount: PayoutAccount | null, loading: boolean) {
  if (loading) {
    return { value: 'Checking', detail: 'Loading payout account', tone: 'idle' as SummaryTone };
  }

  if (!payoutAccount) {
    return { value: 'Setup needed', detail: 'Bank account not connected', tone: 'warning' as SummaryTone };
  }

  if (payoutAccount.status === 'active') {
    return { value: 'Active', detail: 'Bank account connected', tone: 'success' as SummaryTone };
  }

  if (payoutAccount.status === 'restricted') {
    return { value: 'Needs verification', detail: 'Stripe requires action', tone: 'warning' as SummaryTone };
  }

  return { value: 'Pending', detail: 'Verification in progress', tone: 'info' as SummaryTone };
}

function getPayoutErrorSummary() {
  return { value: 'Unavailable', detail: 'Could not load payout account', tone: 'danger' as SummaryTone };
}

function maskStripeAccount(accountId: string) {
  return `${accountId.slice(0, 14)}...`;
}

function SummaryCard({
  label,
  value,
  detail,
  tone = 'idle',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: SummaryTone;
}) {
  return (
    <Card className="border border-divider bg-surface p-4 shadow-sm">
      <p className="text-[12px] font-semibold uppercase text-textMuted">{label}</p>
      <p className="mt-2 text-xl font-bold text-text">{value}</p>
      <p className="mt-1 text-[13px] text-textMuted">{detail}</p>
      <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass[tone]}`}>
        {value}
      </span>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surfaceMuted px-3 py-2">
      <p className="text-[12px] font-medium text-textMuted">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-text">{value || 'Not provided'}</p>
    </div>
  );
}

export default function ProfileView({ driver }: ProfileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: driver.first_name,
    last_name: driver.last_name,
    phone: driver.phone,
  });

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setPayoutLoading(false);
      return;
    }

    const client = supabase;

    async function loadPayoutAccount() {
      try {
        const { data, error } = await client
          .from('driver_payout_accounts')
          .select('id, stripe_account_id, status')
          .eq('driver_id', driver.id)
          .maybeSingle();
        if (error) throw error;
        setPayoutAccount(data as PayoutAccount | null);
        setPayoutError(null);
      } catch (err) {
        setPayoutAccount(null);
        setPayoutError(err instanceof Error ? err.message : 'Could not load payout account');
      } finally {
        setPayoutLoading(false);
      }
    }

    void loadPayoutAccount();
  }, [supabase, driver.id]);

  const payoutSetupSuccess = searchParams.get('payout_setup') === 'success';
  const driverStatus = titleCase(driver.status);
  const statusTone = getDriverStatusTone(driver.status);
  const contactComplete = Boolean(driver.email && driver.phone);
  const vehicleComplete = Boolean(driver.vehicle_type && driver.vehicle_description);
  const payoutSummary = payoutError ? getPayoutErrorSummary() : getPayoutSummary(payoutAccount, payoutLoading);

  const handleSetupPayouts = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/payouts/setup', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start payout setup');
      }
    } catch {
      alert('Failed to start payout setup. Please try again.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/driver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">
          Driver account
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text">Driver profile command center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-textMuted">
          Profile, vehicle, and payout readiness records used by Driver and Ops.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Driver status"
          value={driverStatus}
          detail="Ops approval state"
          tone={statusTone}
        />
        <SummaryCard
          label="Contact record"
          value={contactComplete ? 'Complete' : 'Needs update'}
          detail={driver.email || 'Email missing'}
          tone={contactComplete ? 'success' : 'warning'}
        />
        <SummaryCard
          label="Vehicle record"
          value={vehicleComplete ? 'Complete' : 'Incomplete'}
          detail={titleCase(driver.vehicle_type)}
          tone={vehicleComplete ? 'success' : 'warning'}
        />
        <SummaryCard
          label="Payout setup"
          value={payoutSummary.value}
          detail={payoutSummary.detail}
          tone={payoutSummary.tone}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="border border-divider bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-text">Driver information</h2>
              <p className="mt-1 text-sm text-textMuted">
                Contact details used for account support and operational follow-up.
              </p>
            </div>
            <Badge variant={driver.status === 'approved' ? 'success' : 'info'}>
              {driverStatus}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[13px] font-medium text-textMuted" htmlFor="driver-first-name">
                First Name
              </label>
              {isEditing ? (
                <input
                  id="driver-first-name"
                  type="text"
                  value={formData.first_name}
                  onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="mt-1 text-[15px] font-semibold text-text">{driver.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-textMuted" htmlFor="driver-last-name">
                Last Name
              </label>
              {isEditing ? (
                <input
                  id="driver-last-name"
                  type="text"
                  value={formData.last_name}
                  onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="mt-1 text-[15px] font-semibold text-text">{driver.last_name}</p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-textMuted" htmlFor="driver-phone">
                Phone
              </label>
              {isEditing ? (
                <input
                  id="driver-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p className="mt-1 text-[15px] font-semibold text-text">{driver.phone}</p>
              )}
            </div>

            <FieldRow label="Email" value={driver.email} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isEditing ? (
              <>
                <Button
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primaryHover"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      first_name: driver.first_name,
                      last_name: driver.last_name,
                      phone: driver.phone,
                    });
                  }}
                  variant="secondary"
                  className="flex-1 rounded-lg py-3 text-[15px] font-semibold"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full rounded-lg bg-primary py-3 text-[15px] font-semibold text-white hover:bg-primaryHover"
              >
                Edit profile
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border border-divider bg-surface p-5 shadow-sm" data-testid="driver-vehicle-details">
            <h2 className="text-[17px] font-semibold text-text">Vehicle details</h2>
            <p className="mt-1 text-sm text-textMuted">
              Vehicle records help Ops understand capacity and dispatch fit.
            </p>
            <div className="mt-4 space-y-3">
              <FieldRow label="Vehicle Type" value={titleCase(driver.vehicle_type)} />
              <FieldRow label="Vehicle Description" value={driver.vehicle_description || 'Not provided'} />
            </div>
          </Card>

          <Card className="border border-divider bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold text-text">Payout account</h2>
                <p className="mt-1 text-sm text-textMuted">
                  Bank connection used for scheduled and instant payouts.
                </p>
              </div>
              <Badge variant={payoutSummary.tone === 'success' ? 'success' : 'info'}>
                {payoutSummary.value}
              </Badge>
            </div>

            {payoutLoading ? (
              <div className="mt-4 h-12 animate-pulse rounded bg-surfaceMuted" />
            ) : payoutError ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-dangerSoft p-4">
                <p className="text-sm font-medium text-danger">Could not load payout account</p>
                <p className="mt-1 text-xs text-danger">{payoutError}</p>
                <Button
                  onClick={() => router.refresh()}
                  className="mt-3 w-full rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-white hover:bg-primaryHover"
                >
                  Retry
                </Button>
              </div>
            ) : payoutSetupSuccess && !payoutAccount ? (
              <div className="mt-4 rounded-lg border border-success/30 bg-successSoft p-4">
                <p className="text-sm font-medium text-success">Payout account setup initiated!</p>
                <p className="mt-1 text-xs text-success">
                  Verification may take a few minutes. Refresh to check status.
                </p>
              </div>
            ) : !payoutAccount ? (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primarySoft p-4">
                <p className="text-sm font-medium text-primary">
                  Connect your bank account to receive earnings
                </p>
                <p className="mt-1 text-xs text-primary">Set up Stripe to get paid for deliveries</p>
                <Button
                  onClick={() => void handleSetupPayouts()}
                  disabled={setupLoading}
                  className="mt-3 w-full rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-white hover:bg-primaryHover"
                >
                  {setupLoading ? 'Setting up...' : 'Set up payouts'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surfaceMuted px-3 py-2">
                  <span className="text-[14px] text-textMuted">Account Status</span>
                  <Badge
                    variant={
                      payoutAccount.status === 'active'
                        ? 'success'
                        : payoutAccount.status === 'restricted'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {payoutAccount.status === 'active'
                      ? 'Active'
                      : payoutAccount.status === 'restricted'
                        ? 'Needs Verification'
                        : 'Pending'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surfaceMuted px-3 py-2">
                  <span className="text-[14px] text-textMuted">Stripe Account</span>
                  <span className="text-[14px] font-medium text-text">
                    {maskStripeAccount(payoutAccount.stripe_account_id)}
                  </span>
                </div>
                {payoutAccount.status === 'restricted' && (
                  <Button
                    onClick={() => void handleSetupPayouts()}
                    disabled={setupLoading}
                    variant="outline"
                    className="mt-2 w-full rounded-lg text-[14px]"
                  >
                    {setupLoading ? 'Loading...' : 'Complete verification'}
                  </Button>
                )}
              </div>
            )}
          </Card>

          <Link
            href="/settings"
            className="flex items-center justify-between rounded-lg border border-divider bg-surface px-4 py-3 text-[15px] font-medium text-text shadow-sm hover:border-primary/30"
          >
            <span>Payout and instant settings</span>
            <span className="text-primary">Open</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
