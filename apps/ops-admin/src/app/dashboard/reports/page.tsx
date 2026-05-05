'use client';

import { useState } from 'react';
import { Card, Button } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

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
  const [_reportType, _setReportType] = useState<ReportType>('revenue');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const days = Math.ceil((new Date(endDate!).getTime() - new Date(startDate!).getTime()) / (86400000));
      const res = await fetch(`/api/analytics/trends?days=${days}`);
      const d = await res.json();
      if (d.success) setData(d.data);

      if (showCompare && compareStartDate && compareEndDate) {
        const compareDays = Math.ceil((new Date(compareEndDate).getTime() - new Date(compareStartDate).getTime()) / (86400000));
        const cRes = await fetch(`/api/analytics/trends?days=${compareDays}`);
        const cD = await cRes.json();
        if (cD.success) setCompareData(cD.data);
      } else {
        setCompareData(null);
      }
    } catch { /* silent */ }
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
            <p className="mt-1 text-gray-400">Generate detailed reports with date ranges and period comparison</p>
          </div>
          <div className="flex gap-2">
            <a href={`/api/export?type=orders&start=${startDate}&end=${endDate}`}
              className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">
              Export CSV
            </a>
          </div>
        </div>

        {/* Date Range Controls */}
        <Card className="border-gray-800 bg-opsPanel p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-2">
              {quickRanges.map(r => (
                <button key={r.days} onClick={() => setQuickRange(r.days)}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-1.5 text-sm" />
              <span className="text-gray-500">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-1.5 text-sm" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showCompare} onChange={e => setShowCompare(e.target.checked)}
                className="rounded border-gray-600" />
              <span className="text-xs text-gray-400">Compare period</span>
            </label>
            {showCompare && (
              <div className="flex items-center gap-2">
                <input type="date" value={compareStartDate} onChange={e => setCompareStartDate(e.target.value)}
                  className="rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-1.5 text-sm" />
                <span className="text-gray-500">to</span>
                <input type="date" value={compareEndDate} onChange={e => setCompareEndDate(e.target.value)}
                  className="rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-1.5 text-sm" />
              </div>
            )}
            <Button onClick={fetchReport} disabled={loading} className="bg-[#E85D26]">
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </Card>

        {/* Report Results */}
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-gray-800 bg-opsPanel p-4">
                <p className="text-xs text-gray-500 uppercase">Total Orders</p>
                <p className="mt-1 text-2xl font-bold text-white">{data.summary.totalOrders}</p>
                {compareData && (
                  <p className={`text-xs mt-1 ${data.summary.totalOrders >= compareData.summary.totalOrders ? 'text-emerald-400' : 'text-red-400'}`}>
                    vs {compareData.summary.totalOrders} ({data.summary.totalOrders >= compareData.summary.totalOrders ? '+' : ''}{data.summary.totalOrders - compareData.summary.totalOrders})
                  </p>
                )}
              </Card>
              <Card className="border-gray-800 bg-opsPanel p-4">
                <p className="text-xs text-gray-500 uppercase">Revenue</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">${data.summary.totalRevenue.toFixed(2)}</p>
                {compareData && (
                  <p className={`text-xs mt-1 ${data.summary.totalRevenue >= compareData.summary.totalRevenue ? 'text-emerald-400' : 'text-red-400'}`}>
                    vs ${compareData.summary.totalRevenue.toFixed(2)}
                  </p>
                )}
              </Card>
              <Card className="border-gray-800 bg-opsPanel p-4">
                <p className="text-xs text-gray-500 uppercase">Avg Daily Orders</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">{data.summary.avgDailyOrders}</p>
              </Card>
              <Card className="border-gray-800 bg-opsPanel p-4">
                <p className="text-xs text-gray-500 uppercase">Completion Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">{data.summary.completionRate}%</p>
              </Card>
            </div>

            {/* Daily breakdown table */}
            <Card className="border-gray-800 bg-opsPanel overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="font-semibold text-white">Daily Breakdown</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-opsPanel">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-700">
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Orders</th>
                      <th className="px-4 py-2">Revenue</th>
                      <th className="px-4 py-2">Completed</th>
                      <th className="px-4 py-2">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trend.filter((d: any) => d.orders > 0).reverse().map((d: any) => (
                      <tr key={d.date} className="border-b border-gray-800 hover:bg-white/5">
                        <td className="px-4 py-2 text-sm text-white">{d.date}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{d.orders}</td>
                        <td className="px-4 py-2 text-sm text-emerald-400">${d.revenue.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-300">{d.completed}</td>
                        <td className="px-4 py-2 text-sm text-red-400">{d.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Top chefs */}
            {data.topChefs.length > 0 && (
              <Card className="border-gray-800 bg-opsPanel p-6">
                <h3 className="font-semibold text-white mb-4">Top Performing Chefs</h3>
                <div className="space-y-2">
                  {data.topChefs.map((chef: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-opsPanel px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 w-6">{i + 1}</span>
                        <span className="text-sm font-medium text-white">{chef.name}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">${chef.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}

        {!data && !loading && (
          <Card className="border-gray-800 bg-opsPanel p-8 text-center">
            <p className="text-gray-500">Select a date range and click Generate Report to view data.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
