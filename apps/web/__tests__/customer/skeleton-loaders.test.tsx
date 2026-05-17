/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ReviewsSkeleton } from '../../src/components/reviews/reviews-skeleton';
import { CheckoutSkeleton } from '../../src/components/checkout/checkout-skeleton';

// ---- ReviewsSkeleton tests ----

describe('ReviewsSkeleton', () => {
  it('uses animate-pulse on each card wrapper', () => {
    const { container } = render(<ReviewsSkeleton />);
    const pulseEls = container.querySelectorAll('.animate-pulse');
    expect(pulseEls.length).toBeGreaterThanOrEqual(3);
  });

  it('renders avatar circle skeleton (rounded-full + bg-surfaceMuted)', () => {
    const { container } = render(<ReviewsSkeleton />);
    const circles = container.querySelectorAll('.rounded-full.bg-surfaceMuted');
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it('renders name bar (h-3 w-24)', () => {
    const { container } = render(<ReviewsSkeleton />);
    const nameBars = container.querySelectorAll('.h-3.w-24.bg-surfaceMuted');
    expect(nameBars.length).toBeGreaterThanOrEqual(3);
  });

  it('renders stars bar (h-3 w-16)', () => {
    const { container } = render(<ReviewsSkeleton />);
    const starsBars = container.querySelectorAll('.h-3.w-16.bg-surfaceMuted');
    expect(starsBars.length).toBeGreaterThanOrEqual(3);
  });

  it('renders two comment text lines per card (h-2 bg-surfaceMuted)', () => {
    const { container } = render(<ReviewsSkeleton />);
    const textLines = container.querySelectorAll('.h-2.bg-surfaceMuted');
    expect(textLines.length).toBeGreaterThanOrEqual(6); // 3 cards × 2 lines
  });

  it('has aria-busy and aria-label for accessibility', () => {
    const { container } = render(<ReviewsSkeleton />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-busy', 'true');
    expect(root).toHaveAttribute('aria-label', 'Loading reviews');
  });
});

// ---- CheckoutSkeleton tests ----

describe('CheckoutSkeleton', () => {
  it('renders multiple animate-pulse regions (main form + sidebar)', () => {
    const { container } = render(<CheckoutSkeleton />);
    const pulseEls = container.querySelectorAll('.animate-pulse');
    expect(pulseEls.length).toBeGreaterThanOrEqual(4);
  });

  it('renders bg-surfaceMuted field bars', () => {
    const { container } = render(<CheckoutSkeleton />);
    const bars = container.querySelectorAll('.bg-surfaceMuted');
    expect(bars.length).toBeGreaterThan(10);
  });

  it('renders address option rows with radio + text bars', () => {
    const { container } = render(<CheckoutSkeleton />);
    // Radio circles: h-4 w-4 rounded-full bg-surfaceMuted
    const radioBars = container.querySelectorAll('.h-4.w-4.rounded-full.bg-surfaceMuted');
    expect(radioBars.length).toBeGreaterThanOrEqual(2);
  });

  it('renders a tip grid with four option boxes', () => {
    const { container } = render(<CheckoutSkeleton />);
    const tipBoxes = container.querySelectorAll('.h-14.rounded-lg.bg-surfaceMuted');
    expect(tipBoxes.length).toBeGreaterThanOrEqual(4);
  });

  it('renders item image placeholders (h-12 w-12)', () => {
    const { container } = render(<CheckoutSkeleton />);
    const imagePlaceholders = container.querySelectorAll('.h-12.w-12.bg-surfaceMuted');
    expect(imagePlaceholders.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a sidebar summary section with animate-pulse', () => {
    const { container } = render(<CheckoutSkeleton />);
    const sidebarPulse = container.querySelector('.sticky.top-24');
    expect(sidebarPulse).toBeInTheDocument();
    expect(sidebarPulse?.className).toContain('animate-pulse');
  });
});
