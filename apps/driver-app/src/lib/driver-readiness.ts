import type { DriverReadinessSignal, DriverReadinessStatus } from '@ridendine/types';
import { DRIVER_LOCATION_STALE_THRESHOLD_MS } from '@ridendine/utils';

export const DRIVER_DISPATCH_LOCATION_TTL_MS = DRIVER_LOCATION_STALE_THRESHOLD_MS;

/**
 * Phase 1 exposes this for downstream summary/UI copy. Dispatch blocking still
 * uses DRIVER_DISPATCH_LOCATION_TTL_MS to match the engine matcher.
 */
export const DRIVER_LIVE_LOCATION_LABEL_MS = 5 * 60_000;

export type DriverReadinessInput = {
  approvalStatus: string | null | undefined;
  presenceStatus: string | null | undefined;
  lastLocationAt: string | null | undefined;
  activeDeliveryCount?: number;
  payoutConnected?: boolean;
  complianceOpenItems?: number;
  now?: Date;
};

const SIGNAL_COPY: Record<
  DriverReadinessStatus,
  Omit<DriverReadinessSignal, 'status' | 'detail'>
> = {
  ready: {
    label: 'Ready',
    blocksDispatch: false,
    priority: 'success',
  },
  needs_location: {
    label: 'Location needed',
    blocksDispatch: true,
    priority: 'danger',
  },
  not_dispatchable: {
    label: 'Not dispatchable',
    blocksDispatch: true,
    priority: 'danger',
  },
  not_approved: {
    label: 'Approval needed',
    blocksDispatch: true,
    priority: 'danger',
  },
  suspended: {
    label: 'Suspended',
    blocksDispatch: true,
    priority: 'danger',
  },
  active_delivery_risk: {
    label: 'Active delivery risk',
    blocksDispatch: true,
    priority: 'danger',
  },
  payout_setup_needed: {
    label: 'Payout setup needed',
    blocksDispatch: false,
    priority: 'warning',
  },
};

function normalizeStatus(status: string | null | undefined): string {
  return status?.trim().toLowerCase() ?? '';
}

function positiveCount(count: number | undefined): number {
  return Math.max(0, count ?? 0);
}

function locationAgeMs(lastLocationAt: string | null | undefined, now: Date): number | null {
  if (!lastLocationAt) return null;

  const timestamp = Date.parse(lastLocationAt);
  if (!Number.isFinite(timestamp)) return null;

  return now.getTime() - timestamp;
}

function buildSignal(status: DriverReadinessStatus, detail: string): DriverReadinessSignal {
  return {
    status,
    ...SIGNAL_COPY[status],
    detail,
  };
}

export function getDriverReadinessSignal(input: DriverReadinessInput): DriverReadinessSignal {
  const approvalStatus = normalizeStatus(input.approvalStatus);
  const presenceStatus = normalizeStatus(input.presenceStatus);
  const activeDeliveryCount = positiveCount(input.activeDeliveryCount);
  const complianceOpenItems = positiveCount(input.complianceOpenItems);
  const now = input.now ?? new Date();

  if (approvalStatus === 'suspended') {
    return buildSignal('suspended', 'Driver account is suspended and cannot receive offers.');
  }

  if (approvalStatus === 'rejected' || approvalStatus !== 'approved') {
    return buildSignal('not_approved', 'Driver approval has not cleared operations review.');
  }

  if (activeDeliveryCount > 0 && presenceStatus === 'offline') {
    return buildSignal(
      'active_delivery_risk',
      'Driver has an active delivery but is currently offline.'
    );
  }

  if (complianceOpenItems > 0) {
    return buildSignal(
      'not_dispatchable',
      'Driver has open compliance items that must be resolved before dispatch.'
    );
  }

  if (presenceStatus === 'online') {
    const ageMs = locationAgeMs(input.lastLocationAt, now);

    if (ageMs === null) {
      return buildSignal('needs_location', 'Online drivers need a GPS fix before dispatch.');
    }

    if (ageMs < 0 || ageMs > DRIVER_DISPATCH_LOCATION_TTL_MS) {
      return buildSignal(
        'not_dispatchable',
        'Driver GPS is stale and must refresh before dispatch.'
      );
    }
  } else {
    return buildSignal('not_dispatchable', 'Driver must be online to receive dispatch offers.');
  }

  if (input.payoutConnected === false) {
    return buildSignal(
      'payout_setup_needed',
      'Payout setup has not started; driver can still receive dispatch offers.'
    );
  }

  return buildSignal('ready', 'Driver is approved, online, and location is fresh for dispatch.');
}
