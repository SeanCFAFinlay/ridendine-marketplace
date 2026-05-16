import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

// `tone` is the canonical prop per the design brief. `variant` is kept as an
// alias so legacy callers (<Badge variant="primary">) continue to work.
const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      tone: {
        neutral: 'bg-surfaceMuted text-text',
        primary: 'bg-primarySoft text-primary',
        accent: 'bg-accentSoft text-accent',
        success: 'bg-successSoft text-success',
        warning: 'bg-warningSoft text-warning',
        danger: 'bg-dangerSoft text-danger',
        info: 'bg-infoSoft text-info',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
      },
    },
    defaultVariants: {
      tone: 'neutral',
      size: 'md',
    },
  },
);

type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

const variantToTone: Record<string, BadgeTone> = {
  default: 'neutral',
  primary: 'primary',
  accent: 'accent',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  danger: 'danger',
  info: 'info',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, 'tone'> {
  tone?: BadgeTone;
  /** Legacy alias for `tone`. */
  variant?: keyof typeof variantToTone;
}

export function Badge({ className, tone, variant, size, ...props }: BadgeProps) {
  const resolvedTone: BadgeTone = tone ?? (variant ? variantToTone[variant] ?? 'neutral' : 'neutral');
  return (
    <span className={cn(badgeVariants({ tone: resolvedTone, size }), className)} {...props} />
  );
}

// ── Domain helpers (kept for backward compat) ──────────────────────────────

const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'info',
  preparing: 'info',
  ready_for_pickup: 'primary',
  picked_up: 'primary',
  in_transit: 'primary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  rejected: 'danger',
  refunded: 'neutral',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  refunded: 'Refunded',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ORDER_STATUS_TONE[status] ?? 'neutral'}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const DELIVERY_STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  assigned: 'info',
  accepted: 'info',
  en_route_to_pickup: 'primary',
  arrived_at_pickup: 'primary',
  picked_up: 'primary',
  en_route_to_dropoff: 'primary',
  arrived_at_dropoff: 'primary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  failed: 'danger',
};

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  accepted: 'Accepted',
  en_route_to_pickup: 'En Route to Pickup',
  arrived_at_pickup: 'At Pickup',
  picked_up: 'Picked Up',
  en_route_to_dropoff: 'En Route',
  arrived_at_dropoff: 'At Dropoff',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={DELIVERY_STATUS_TONE[status] ?? 'neutral'}>
      {DELIVERY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
