'use client';

import React from 'react';

export interface OrderProgressStepperProps {
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  estimatedDeliveryMinutes?: number | null;
  driverFirstName?: string | null;
  driverPhone?: string | null;
}

interface StepDefinition {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const STEPS: StepDefinition[] = [
  {
    key: 'pending',
    label: 'Order Placed',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path
          fillRule="evenodd"
          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    key: 'accepted',
    label: 'Accepted',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    key: 'preparing',
    label: 'Preparing',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    key: 'ready',
    label: 'Ready',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    key: 'picked_up',
    label: 'Picked Up',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
      </svg>
    ),
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  pending: 0,
  checkout_pending: 0,
  payment_authorized: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  ready: 3,
  picked_up: 4,
  in_transit: 4,
  delivered: 5,
  completed: 5,
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTimestampForStep(
  stepKey: string,
  props: OrderProgressStepperProps
): string | null {
  const map: Record<string, string | null | undefined> = {
    pending: props.createdAt,
    accepted: props.acceptedAt,
    preparing: props.preparingAt,
    ready: props.readyAt,
    picked_up: props.pickedUpAt,
    delivered: props.deliveredAt,
  };
  const val = map[stepKey];
  return val ?? null;
}

interface StepCircleProps {
  stepKey: string;
  icon: React.ReactNode;
  state: 'completed' | 'current' | 'future';
}

function StepCircle({ stepKey, icon, state }: StepCircleProps) {
  const baseClass = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors';

  if (state === 'completed') {
    return (
      <div
        data-testid={`step-icon-${stepKey}`}
        className={`${baseClass} bg-success text-white`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  if (state === 'current') {
    return (
      <div
        data-testid={`step-icon-${stepKey}`}
        className={`${baseClass} bg-primary text-primaryFg`}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      data-testid={`step-icon-${stepKey}`}
      className={`${baseClass} bg-surfaceMuted text-textSubtle`}
    >
      {icon}
    </div>
  );
}

interface StepRowProps {
  step: StepDefinition;
  state: 'completed' | 'current' | 'future';
  timestamp: string | null;
  isLast: boolean;
}

function StepRow({ step, state, timestamp, isLast }: StepRowProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          data-testid={`step-${step.key}`}
          className={state === 'current' ? 'animate-pulse' : ''}
        >
          <StepCircle stepKey={step.key} icon={step.icon} state={state} />
        </div>
        {!isLast && (
          <div
            className={`mt-1 w-0.5 flex-1 min-h-[2rem] ${
              state === 'completed' ? 'bg-success/40' : 'bg-surfaceMuted'
            }`}
          />
        )}
      </div>
      <div className="pb-6 pt-1.5">
        <p
          className={`text-sm font-semibold ${
            state === 'future' ? 'text-textSubtle' : 'text-text'
          }`}
        >
          {step.label}
        </p>
        {timestamp && state !== 'future' && (
          <p
            data-testid={`step-time-${step.key}`}
            className="mt-0.5 text-xs text-textMuted"
          >
            {formatTime(timestamp)}
          </p>
        )}
        {!timestamp && state === 'current' && (
          <p
            data-testid={`step-time-${step.key}`}
            className="mt-0.5 text-xs font-medium text-primary"
          >
            In progress
          </p>
        )}
      </div>
    </div>
  );
}

function DriverInfo({
  driverFirstName,
  driverPhone,
}: {
  driverFirstName: string;
  driverPhone?: string | null;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl bg-primarySoft px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primaryFg">
        {driverFirstName[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-textMuted">Your driver</p>
        <p className="text-sm font-semibold text-text">{driverFirstName}</p>
      </div>
      {driverPhone && (
        <a
          href={`tel:${driverPhone}`}
          aria-label="Call driver"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primaryFg transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:shadow-focus"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        </a>
      )}
    </div>
  );
}

function EstimatedDelivery({ minutes }: { minutes: number }) {
  return (
    <div className="mt-4 rounded-xl bg-primarySoft px-4 py-3">
      <p className="text-sm text-primary">
        Estimated delivery in <span className="font-semibold">{minutes} min</span>
      </p>
    </div>
  );
}

export function OrderProgressStepper(props: OrderProgressStepperProps) {
  const {
    status,
    estimatedDeliveryMinutes,
    driverFirstName,
    driverPhone,
  } = props;

  if (status === 'cancelled' || status === 'failed') {
    return (
      <div className="rounded-xl bg-dangerSoft p-6 text-center">
        <p className="text-base font-semibold text-danger">
          This order was cancelled.
        </p>
      </div>
    );
  }

  if (status === 'refunded') {
    return (
      <div className="rounded-xl bg-surfaceMuted p-6 text-center">
        <p className="text-base font-semibold text-text">
          Refund in progress or completed.
        </p>
      </div>
    );
  }

  const currentIndex = STATUS_TO_STEP_INDEX[status] ?? 0;
  const isDelivered = currentIndex >= 5;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-textMuted">
        Order Progress
      </h3>

      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const state: 'completed' | 'current' | 'future' =
            i < currentIndex || isDelivered
              ? 'completed'
              : i === currentIndex
              ? 'current'
              : 'future';

          const timestamp = getTimestampForStep(step.key, props);

          return (
            <StepRow
              key={step.key}
              step={step}
              state={state}
              timestamp={timestamp}
              isLast={i === STEPS.length - 1}
            />
          );
        })}
      </div>

      {driverFirstName && (
        <DriverInfo driverFirstName={driverFirstName} driverPhone={driverPhone} />
      )}

      {estimatedDeliveryMinutes != null &&
        estimatedDeliveryMinutes > 0 &&
        !isDelivered && (
          <EstimatedDelivery minutes={estimatedDeliveryMinutes} />
        )}
    </div>
  );
}
