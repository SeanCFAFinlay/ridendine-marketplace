'use client';

import { Button, Badge } from '@ridendine/ui';

export type ConnectOnboardingStatus = 'not_started' | 'pending' | 'active';

interface ConnectOnboardingProps {
  status: ConnectOnboardingStatus;
  stripeAccountId?: string;
  isLoading?: boolean;
  onSetup: () => void | Promise<void>;
}

function StatusBadge({ status }: { status: ConnectOnboardingStatus }) {
  if (status === 'active') {
    return <Badge variant="success">Active</Badge>;
  }
  if (status === 'pending') {
    return <Badge variant="info">Pending Verification</Badge>;
  }
  return <Badge variant="warning">Not Connected</Badge>;
}

function NotStartedContent({
  isLoading,
  onSetup,
}: {
  isLoading: boolean;
  onSetup: () => void | Promise<void>;
}) {
  return (
    <div className="rounded-lg bg-primarySoft border border-primary/20 p-4">
      <p className="text-sm font-medium text-primary">
        Connect your bank account to receive earnings
      </p>
      <p className="text-xs text-primary mt-1">
        Set up Stripe to get paid for deliveries
      </p>
      <Button
        onClick={onSetup}
        disabled={isLoading}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-white hover:bg-primaryHover"
      >
        {isLoading ? 'Setting up...' : 'Set Up Payouts'}
      </Button>
    </div>
  );
}

function ConnectedContent({
  status,
  stripeAccountId,
  isLoading,
  onSetup,
}: {
  status: ConnectOnboardingStatus;
  stripeAccountId?: string;
  isLoading: boolean;
  onSetup: () => void | Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-[#6b7280]">Account Status</span>
        <StatusBadge status={status} />
      </div>
      {stripeAccountId && (
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#6b7280]">Stripe Account</span>
          <span className="text-[14px] font-medium text-[#1a1a1a]">
            {stripeAccountId.slice(0, 12)}...
          </span>
        </div>
      )}
      {status === 'pending' && (
        <Button
          onClick={onSetup}
          disabled={isLoading}
          variant="outline"
          className="w-full mt-2 rounded-lg text-[14px]"
        >
          {isLoading ? 'Loading...' : 'Complete Verification'}
        </Button>
      )}
    </div>
  );
}

export function ConnectOnboarding({
  status,
  stripeAccountId,
  isLoading = false,
  onSetup,
}: ConnectOnboardingProps) {
  if (status === 'not_started') {
    return <NotStartedContent isLoading={isLoading} onSetup={onSetup} />;
  }

  return (
    <ConnectedContent
      status={status}
      stripeAccountId={stripeAccountId}
      isLoading={isLoading}
      onSetup={onSetup}
    />
  );
}
