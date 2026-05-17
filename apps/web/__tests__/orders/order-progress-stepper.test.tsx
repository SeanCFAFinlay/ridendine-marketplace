/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

import { OrderProgressStepper } from '../../src/components/orders/order-progress-stepper';

const baseProps = {
  status: 'pending' as string,
  createdAt: '2026-05-06T10:00:00.000Z',
};

describe('OrderProgressStepper', () => {
  it('renders all 6 step labels', () => {
    render(<OrderProgressStepper {...baseProps} />);
    expect(screen.getByText('Order Placed')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Picked Up')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('highlights the current step (pending → first step active)', () => {
    render(<OrderProgressStepper status="pending" createdAt="2026-05-06T10:00:00.000Z" />);
    const activeStep = screen.getByTestId('step-pending');
    expect(activeStep).toHaveClass('animate-pulse');
  });

  it('highlights accepted as current step', () => {
    render(<OrderProgressStepper status="accepted" createdAt="2026-05-06T10:00:00.000Z" />);
    const activeStep = screen.getByTestId('step-accepted');
    expect(activeStep).toHaveClass('animate-pulse');
  });

  it('marks all steps before current as completed (success)', () => {
    render(<OrderProgressStepper status="preparing" createdAt="2026-05-06T10:00:00.000Z" />);
    const pendingStep = screen.getByTestId('step-icon-pending');
    const acceptedStep = screen.getByTestId('step-icon-accepted');
    expect(pendingStep).toHaveClass('bg-success');
    expect(acceptedStep).toHaveClass('bg-success');
  });

  it('marks current step with brand primary', () => {
    render(<OrderProgressStepper status="preparing" createdAt="2026-05-06T10:00:00.000Z" />);
    const currentIcon = screen.getByTestId('step-icon-preparing');
    expect(currentIcon).toHaveClass('bg-primary');
  });

  it('marks future steps as muted', () => {
    render(<OrderProgressStepper status="pending" createdAt="2026-05-06T10:00:00.000Z" />);
    const futureIcon = screen.getByTestId('step-icon-delivered');
    expect(futureIcon).toHaveClass('bg-surfaceMuted');
  });

  it('shows timestamp for the current step when provided', () => {
    render(
      <OrderProgressStepper
        status="accepted"
        createdAt="2026-05-06T10:00:00.000Z"
        acceptedAt="2026-05-06T10:05:00.000Z"
      />
    );
    // Should show a formatted time for accepted step
    expect(screen.getByTestId('step-time-accepted')).toBeInTheDocument();
  });

  it('shows createdAt timestamp for the placed step', () => {
    render(<OrderProgressStepper status="pending" createdAt="2026-05-06T10:00:00.000Z" />);
    expect(screen.getByTestId('step-time-pending')).toBeInTheDocument();
  });

  it('shows driver name and phone link when provided and status is picked_up', () => {
    render(
      <OrderProgressStepper
        status="picked_up"
        createdAt="2026-05-06T10:00:00.000Z"
        driverFirstName="Alex"
        driverPhone="+16045551234"
      />
    );
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
    const phoneLink = screen.getByRole('link', { name: /call/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:+16045551234');
  });

  it('does not show driver section when no driver info', () => {
    render(<OrderProgressStepper status="picked_up" createdAt="2026-05-06T10:00:00.000Z" />);
    expect(screen.queryByRole('link', { name: /call/i })).not.toBeInTheDocument();
  });

  it('shows estimated delivery time when provided', () => {
    render(
      <OrderProgressStepper
        status="preparing"
        createdAt="2026-05-06T10:00:00.000Z"
        estimatedDeliveryMinutes={35}
      />
    );
    expect(screen.getByText(/35 min/i)).toBeInTheDocument();
  });

  it('shows cancelled state message instead of stepper when cancelled', () => {
    render(<OrderProgressStepper status="cancelled" createdAt="2026-05-06T10:00:00.000Z" />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
    expect(screen.queryByTestId('step-pending')).not.toBeInTheDocument();
  });

  it('shows all steps completed when delivered', () => {
    render(<OrderProgressStepper status="delivered" createdAt="2026-05-06T10:00:00.000Z" />);
    const allIcons = ['pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered'];
    for (const step of allIcons) {
      expect(screen.getByTestId(`step-icon-${step}`)).toHaveClass('bg-success');
    }
  });
});
