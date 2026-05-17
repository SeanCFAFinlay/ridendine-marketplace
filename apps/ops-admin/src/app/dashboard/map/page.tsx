'use client';

import dynamic from 'next/dynamic';
import { Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

const LiveMap = dynamic(() => import('@/components/map/live-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-surface animate-pulse rounded-lg flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

export default function MapPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Live Map</h1>
          <p className="mt-2 text-textMuted">
            Real-time driver presence and active delivery geography based on the
            current `drivers`, `driver_presence`, and `deliveries` tables.
          </p>
        </div>

        <Card className="mb-6 border-border bg-surface p-4 text-sm text-textSubtle">
          The map reflects current presence pings and active delivery coordinates.
          It is useful for live oversight, but it is not yet a full dispatch
          command workstation with route optimization or playback history.
        </Card>

        <div className="bg-surface rounded-lg border border-border overflow-hidden" style={{ height: '70vh' }}>
          <LiveMap />
        </div>
      </div>
    </DashboardLayout>
  );
}
