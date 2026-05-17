/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LiveIndicator, ridendineTokens } from '@ridendine/ui';

// The token-driven LiveIndicator renders the dot with an inline
// backgroundColor style sourced from ridendineTokens.status, so these
// tests assert against the resolved style values rather than legacy
// Tailwind palette class names.
const liveColor = ridendineTokens.status.live.fg;
const pendingColor = ridendineTokens.status.pending.fg;
const errorColor = ridendineTokens.status.error.fg;

describe('LiveIndicator', () => {
  it('shows "Live" text when status is connected', () => {
    render(<LiveIndicator status="connected" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders the live (success) color dot when connected', () => {
    render(<LiveIndicator status="connected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot.style.backgroundColor).toBe(hexToRgb(liveColor));
  });

  it('animates the dot with pulse when connected', () => {
    render(<LiveIndicator status="connected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot).toHaveClass('animate-pulse');
  });

  it('shows "Connecting…" text when status is connecting', () => {
    render(<LiveIndicator status="connecting" />);
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('renders the pending (warning) color dot when connecting', () => {
    render(<LiveIndicator status="connecting" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot.style.backgroundColor).toBe(hexToRgb(pendingColor));
  });

  it('shows "Offline" text when status is disconnected', () => {
    render(<LiveIndicator status="disconnected" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders the error (danger) color dot when disconnected', () => {
    render(<LiveIndicator status="disconnected" />);
    const dot = screen.getByTestId('live-indicator-dot');
    expect(dot.style.backgroundColor).toBe(hexToRgb(errorColor));
  });

  it('accepts className and applies it to the container', () => {
    render(<LiveIndicator status="connected" className="custom-class" />);
    const container = screen.getByTestId('live-indicator');
    expect(container).toHaveClass('custom-class');
  });
});

/** jsdom serializes inline color styles as `rgb(r, g, b)`. */
function hexToRgb(hex: string): string {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
