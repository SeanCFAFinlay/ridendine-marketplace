import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-brand-100 text-brand-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Order status badge helper
export function OrderStatusBadge({ status }: { status: string }) {
  const variants: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    pending: 'warning',
    accepted: 'info',
    preparing: 'info',
    ready_for_pickup: 'primary',
    picked_up: 'primary',
    in_transit: 'primary',
    delivered: 'success',
    completed: 'success',
    cancelled: 'error',
    rejected: 'error',
    refunded: 'default',
  };

  const labels: Record<string, string> = {
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

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
}

// Delivery status badge helper
export function DeliveryStatusBadge({ status }: { status: string }) {
  const variants: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
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
    cancelled: 'error',
    failed: 'error',
  };

  const labels: Record<string, string> = {
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

  return (
    <Badge variant={variants[status] || 'default'}>
      {labels[status] || status}
    </Badge>
  );
}
