/**
 * TDD: TrendCharts component tests
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock Card component
jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockTrendData = {
  success: true,
  data: {
    trend: [
      { date: '2026-04-20', orders: 10, revenue: 250.00, completed: 8, cancelled: 2 },
      { date: '2026-04-21', orders: 15, revenue: 375.00, completed: 13, cancelled: 2 },
    ],
    topChefs: [
      { name: 'Chef Alice', revenue: 500.00 },
      { name: 'Chef Bob', revenue: 300.00 },
    ],
    peakHours: Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: i === 12 ? 50 : 5 })),
    summary: {
      totalOrders: 25,
      totalRevenue: 625.00,
      avgDailyOrders: 12,
      completionRate: 84,
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockResolvedValue({
    json: jest.fn().mockResolvedValue(mockTrendData),
  });
});

import { TrendCharts } from '../trend-charts';

describe('TrendCharts', () => {
  it('renders loading skeletons initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<TrendCharts />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders summary KPIs after data loads', async () => {
    render(<TrendCharts />);
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
    expect(screen.getByText('$625.00')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
  });

  it('renders period selector buttons', async () => {
    render(<TrendCharts />);
    await waitFor(() => screen.getByText('7d'));
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
  });

  it('calls fetch with correct days param on period change', async () => {
    render(<TrendCharts />);
    await waitFor(() => screen.getByText('7d'));

    await act(async () => {
      fireEvent.click(screen.getByText('7d'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('days=7')
    );
  });

  it('renders chart section headings', async () => {
    render(<TrendCharts />);
    await waitFor(() => screen.getByText('Daily Order Volume'));
    expect(screen.getByText('Daily Revenue')).toBeInTheDocument();
    expect(screen.getByText('Top Chefs by Revenue')).toBeInTheDocument();
    expect(screen.getByText('Order Volume by Hour')).toBeInTheDocument();
  });

  it('renders top chefs list', async () => {
    render(<TrendCharts />);
    await waitFor(() => screen.getByText('Chef Alice'));
    expect(screen.getByText('Chef Bob')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
  });

  it('shows error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<TrendCharts />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics.')).toBeInTheDocument();
    });
  });

  it('shows "No data for this period" when topChefs is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { ...mockTrendData.data, topChefs: [] },
      }),
    });
    render(<TrendCharts />);
    await waitFor(() => {
      expect(screen.getByText('No data for this period.')).toBeInTheDocument();
    });
  });
});
