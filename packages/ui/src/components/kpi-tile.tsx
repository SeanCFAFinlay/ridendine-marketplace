'use client';

import * as React from 'react';
import { cn } from '../utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

function Sparkline({ data, width = 64, height = 24, className }: SparklineProps) {
  if (!data.length) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  const points = data
    .map((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TrendDirection = 'up' | 'down' | 'neutral';

interface KpiTileProps {
  label: string;
  value: string | number;
  change?: number;
  sparklineData?: number[];
  className?: string;
}

function getTrend(change?: number): TrendDirection {
  if (change === undefined || change === 0) return 'neutral';
  return change > 0 ? 'up' : 'down';
}

export function KpiTile({ label, value, change, sparklineData, className }: KpiTileProps) {
  const trend = getTrend(change);

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-1 flex items-center gap-1">
              <TrendArrow direction={trend} />
              <span
                className={cn(
                  'text-xs font-medium',
                  trend === 'up' && 'text-emerald-600',
                  trend === 'down' && 'text-red-500',
                  trend === 'neutral' && 'text-gray-400'
                )}
              >
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div
            className={cn(
              trend === 'up' && 'text-emerald-500',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-gray-400'
            )}
          >
            <Sparkline data={sparklineData} />
          </div>
        )}
      </div>
    </div>
  );
}

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <svg className="h-3 w-3 text-emerald-600" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 2l4 5H2l4-5z" />
      </svg>
    );
  }
  if (direction === 'down') {
    return (
      <svg className="h-3 w-3 text-red-500" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M6 10L2 5h8l-4 5z" />
      </svg>
    );
  }
  return (
    <svg className="h-3 w-3 text-gray-400" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="2" y="5.5" width="8" height="1.5" rx="0.75" />
    </svg>
  );
}
