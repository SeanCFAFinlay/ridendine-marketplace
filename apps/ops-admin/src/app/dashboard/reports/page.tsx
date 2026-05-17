'use client';

import { useState } from 'react';
import { Card, Button } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchJson } from '@/lib/client-api';

type ReportType = 'revenue' | 'orders' | 'chefs' | 'drivers' | 'customers';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [data, setData] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [_reportType, _setReportType] = useState<ReportType>('revenue');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const days = Math.ceil((new Date(endDate!).getTime() - new Date(startDate!).getTime()) / (86400000));
      const d = await fetchJson<{ data?: unknown }>(`/api/analytics/trends?days=${days}`, undefined, 'Failed to load report');
      if ('data' in d) setData(d.data);

      if (showCompare && compareStartDate && compareEndDate) {
        const compareDays = Math.ceil((new Date(compareEndDate).getTime() - new Date(compareStartDate).getTime()) / (86400000));
        const cD = await fetchJson<{ data?: unknown }>(`/api/analytics/trends?days=${compareDays}`, undefined, 'Failed to load comparison');
        if ('data' in cD) setCompareData(cD.data);
      } else {
        setCompareData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    }
    finally { setLoading(false); }
  };

  const quickRanges = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 14 days', days: 14 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
  ];

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    setStartDate(start.toISOString().split('T')[0]!);
    setEndDate(end.toISOString().split('T')[0]!);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Reports</h1>
            <p className="mt-1 text-textMuted">Generate detailed reports with date ranges and period comparison</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/export?type=orders&start=${startDate}&end=${endDate}`}
              className="rounded-lg bg-surfaceMuted px-3 py-1.5 text-xs font-medium text-textSubtle hover:bg-surfaceMuted">
              Export CSV
            </a>
          </div>
        </div>

        {/* Date Range Controls */}
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card className="border-border bg-surface p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-2">
              {quickRanges.map(r => (
                <button key={r.days} onClick={() => setQuickRange(r.days)}
                  className="rounded-lg bg-surfaceMuted px-3 py-1.5 text-xs font-medium text-textSubtle hover:bg-surfaceMuted">
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="rounded-lg bg-surface border border-border text-white px-3 py-1.5 text-sm" />
              <span className="text-textMuted">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="rounded-lg bg-surface border border-border text-white px-3 py-1.5 text-sm" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showCompare} onChange={e => setShowCompare(e.target.checked)}
                className="rounded border-border" />
              <span className="text-xs text-textMuted">Compare period</span>
            </label>
            {showCompare && (
              <div className="flex items-center gap-2">
                <input type="date" value={compareStartDate} onChange={e => setCompareStartDate(e.target.value)}
                  className="rounded-lg bg-surface border border-border text-white px-3 py-1.5 text-sm" />
                <span className="text-textMuted">to</span>
                <input type="date" value={compareEndDate} onChange={e => setCompareEndDate(e.target.value)}
                  className="rounded-lg bg-surface border border-border text-white px-3 py-1.5 text-sm" />
              </div>
            )}
            <Button onClick={fetchReport} disabled={loading} className="bg-primary">
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* Report Results */}
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-surface p-4">
                <p className="text-xs text-textMuted uppercase">Total Orders</p>
                <p className="mt-1 text-2xl font-bold text-white">{data.summary.totalOrders}</p>
                {compareData && (
                  <p className={`text-xs mt-1 ${data.summary.totalOrders >= compareData.summary.totalOrders ? 'text-success' : 'text-danger'}`}>
                    vs {compareData.summary.totalOrders} ({data.summary.totalOrders >= compareData.summary.totalOrders ? '+' : ''}{data.summary.totalOrders - compareData.summary.totalOrders})
                  </p>
                )}
              </Card>
              <Card className="border-border bg-surface p-4">
                <p className="text-xs text-textMuted uppercase">Revenue</p>
                <p className="mt-1 text-2xl font-bold text-success">${data.summary.totalRevenue.toFixed(2)}</p>
                {compareData && (
                  <p className={`text-xs mt-1 ${data.summary.totalRevenue >= compareData.summary.totalRevenue ? 'text-success' : 'text-danger'}`}>
                    vs ${compareData.summary.totalRevenue.toFixed(2)}
                  </p>
                )}
              </Card>
              <Card className="border-border bg-surface p-4">
                <p className="text-xs text-textMuted uppercase">Avg Daily Orders</p>
                <p className="mt-1 text-2xl font-bold text-info">{data.summary.avgDailyOrders}</p>
              </Card>
              <Card className="border-border bg-surface p-4">
                <p className="text-xs text-textMuted uppercase">Completion Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">{data.summary.completionRate}%</p>
              </Card>
            </div>

            {/* Daily breakdown table */}
            <Card className="border-border bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-white">Daily Breakdown</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs uppercase tracking-wider text-textMuted border-b border-border">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Orders</th>
                      <th className="px-4 py-2">Revenue</th>
                      <th className="px-4 py-2">Completed</th>
                      <th className="px-4 py-2">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trend.filter((d: any) => d.orders > 0).reverse().map((d: any) => (
                      <tr key={d.date} className="border-b border-border hover:bg-surfaceMuted">
                        <td className="px-4 py-2 text-sm text-white">{d.date}</td>
                        <td className="px-4 py-2 text-sm text-textSubtle">{d.orders}</td>
                        <td className="px-4 py-2 text-sm text-success">${d.revenue.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-textSubtle">{d.completed}</td>
                        <td className="px-4 py-2 text-sm text-danger">{d.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Top chefs */}
            {data.topChefs.length > 0 && (
              <Card className="border-border bg-surface p-6">
                <h3 className="font-semibold text-white mb-4">Top Performing Chefs</h3>
                <div className="space-y-2">
                  {data.topChefs.map((chef: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-surface px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-textMuted w-6">{i + 1}</span>
                        <span className="text-sm font-medium text-white">{chef.name}</span>
                      </div>
                      <span className="text-sm font-bold text-success">${chef.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {!data && !loading && (
          <Card className="border-border bg-surface p-8 text-center">
            <p className="text-textMuted">Select a date range and click Generate Report to view data.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
