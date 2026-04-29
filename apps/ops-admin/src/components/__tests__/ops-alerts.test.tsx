import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// Mock @ridendine/db
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
};
const mockSupabase = {
  from: jest.fn(),
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
};
jest.mock('@ridendine/db', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}));

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

// Mock AudioContext
const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { value: 0 },
  type: 'sine',
};
const mockGain = {
  connect: jest.fn(),
  gain: { value: 0 },
};
const mockAudioContext = {
  createOscillator: jest.fn(() => mockOscillator),
  createGain: jest.fn(() => mockGain),
  destination: {},
  currentTime: 0,
};
global.AudioContext = jest.fn(() => mockAudioContext) as any;

import { OpsAlerts } from '../ops-alerts';

function makeQueryBuilder(rows: any[]) {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows }),
  };
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.channel.mockReturnValue(mockChannel);
  mockChannel.on.mockReturnThis();
  mockChannel.subscribe.mockReturnThis();
});

describe('OpsAlerts', () => {
  it('renders bell icon button', async () => {
    mockSupabase.from.mockReturnValue(makeQueryBuilder([]));
    render(<OpsAlerts />);
    const btn = screen.getByRole('button', { name: /alerts/i });
    expect(btn).toBeInTheDocument();
  });

  it('shows no badge when there are no alerts', async () => {
    mockSupabase.from.mockReturnValue(makeQueryBuilder([]));
    render(<OpsAlerts />);
    await waitFor(() => {
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  it('shows badge count when alerts exist', async () => {
    const fakeAlerts = [
      { id: '1', alert_type: 'sla', title: 'SLA breach', severity: 'warning', entity_type: 'order', entity_id: 'o1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', alert_type: 'refund', title: 'Pending refund', severity: 'info', entity_type: 'order', entity_id: 'o2', created_at: '2024-01-01T09:00:00Z' },
    ];
    mockSupabase.from.mockReturnValue(makeQueryBuilder(fakeAlerts));
    render(<OpsAlerts />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('opens dropdown on bell click and shows alerts', async () => {
    const fakeAlerts = [
      { id: '1', alert_type: 'sla', title: 'SLA breach', severity: 'critical', entity_type: 'delivery', entity_id: 'd1', created_at: '2024-01-01T10:00:00Z' },
    ];
    mockSupabase.from.mockReturnValue(makeQueryBuilder(fakeAlerts));
    render(<OpsAlerts />);
    await waitFor(() => screen.getByText('1'));

    const btn = screen.getByRole('button', { name: /alerts/i });
    await act(async () => { fireEvent.click(btn); });

    expect(screen.getByText('Alerts (1)')).toBeInTheDocument();
    expect(screen.getByText('SLA breach')).toBeInTheDocument();
  });

  it('shows "No active alerts" when dropdown is open with no alerts', async () => {
    mockSupabase.from.mockReturnValue(makeQueryBuilder([]));
    render(<OpsAlerts />);
    const btn = screen.getByRole('button', { name: /alerts/i });
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByText('No active alerts')).toBeInTheDocument();
  });

  it('builds correct link for delivery entity type', async () => {
    const fakeAlerts = [
      { id: '1', alert_type: 'late', title: 'Late delivery', severity: 'error', entity_type: 'delivery', entity_id: 'abc123', created_at: '2024-01-01T10:00:00Z' },
    ];
    mockSupabase.from.mockReturnValue(makeQueryBuilder(fakeAlerts));
    render(<OpsAlerts />);
    await waitFor(() => screen.getByText('1'));
    const btn = screen.getByRole('button', { name: /alerts/i });
    await act(async () => { fireEvent.click(btn); });
    const link = screen.getByText('Late delivery').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard/deliveries/abc123');
  });

  it('shows "View all alerts" link when alerts exist', async () => {
    const fakeAlerts = [
      { id: '1', alert_type: 'sla', title: 'Alert 1', severity: 'warning', entity_type: 'order', entity_id: 'o1', created_at: '2024-01-01T10:00:00Z' },
    ];
    mockSupabase.from.mockReturnValue(makeQueryBuilder(fakeAlerts));
    render(<OpsAlerts />);
    await waitFor(() => screen.getByText('1'));
    const btn = screen.getByRole('button', { name: /alerts/i });
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByText('View all alerts')).toBeInTheDocument();
  });

  it('subscribes to realtime channel on mount', async () => {
    mockSupabase.from.mockReturnValue(makeQueryBuilder([]));
    render(<OpsAlerts />);
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('ops-alerts');
    });
  });
});
