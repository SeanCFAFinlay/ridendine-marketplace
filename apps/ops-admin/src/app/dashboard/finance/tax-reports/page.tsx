import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { PageHeader, EmptyState, StatusBadge, KpiTile } from '@ridendine/ui';
import { formatCurrency } from '@ridendine/utils';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';
import { TaxExportButtons, type CourierTaxRow, type OntarioHstSummary } from './tax-export-button';

export const dynamic = 'force-dynamic';

export default async function OntarioTaxReportsPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const currentYear = new Date().getFullYear();
  const admin = createAdminClient() as unknown as SupabaseClient;

  let courierRows: CourierTaxRow[] = [];
  let hstSummary: OntarioHstSummary = {
    taxYear: currentYear,
    totalRevenue: 0,
    taxablePlatformFees: 0,
    hstCollected: 0,
    federalShare: 0,
    provincialShare: 0,
  };
  let error = false;

  try {
    // 1. Fetch Drivers
    const { data: drivers, error: driversError } = await admin
      .from('drivers')
      .select('id, first_name, last_name, email, phone, status, total_deliveries, created_at');

    if (driversError) throw driversError;

    // 2. Fetch Driver Payouts
    const { data: payouts } = await admin
      .from('driver_payouts')
      .select('id, driver_id, amount, status, period_start, period_end, paid_at');

    // 3. Fetch Completed Deliveries
    const { data: deliveries } = await admin
      .from('deliveries')
      .select('id, driver_id, status, driver_payout, created_at');

    // Group earnings by driver
    const earningsMap = new Map<string, { total: number; deliveryCount: number }>();

    for (const p of payouts ?? []) {
      if (p.status === 'paid' && p.amount) {
        const cur = earningsMap.get(p.driver_id) ?? { total: 0, deliveryCount: 0 };
        cur.total += Number(p.amount);
        earningsMap.set(p.driver_id, cur);
      }
    }

    // Include completed deliveries if not already captured in formal payout runs
    for (const d of deliveries ?? []) {
      if (d.driver_id && d.status === 'delivered') {
        const cur = earningsMap.get(d.driver_id) ?? { total: 0, deliveryCount: 0 };
        cur.deliveryCount += 1;
        // If driver had no formal payouts recorded yet, reflect delivery payout earnings
        if (!payouts || payouts.length === 0) {
          cur.total += Number(d.driver_payout ?? 0);
        }
        earningsMap.set(d.driver_id, cur);
      }
    }

    courierRows = (drivers ?? []).map((driver) => {
      const stats = earningsMap.get(driver.id) ?? { total: 0, deliveryCount: driver.total_deliveries ?? 0 };
      const totalEarnings = stats.total;
      return {
        id: driver.id,
        name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unnamed Courier',
        email: driver.email,
        phone: driver.phone || 'N/A',
        status: driver.status,
        deliveriesCount: stats.deliveryCount,
        totalEarnings,
        t4aEligible: totalEarnings >= 500, // CRA T4A Box 048 threshold: $500 CAD
      };
    });

    // 4. Fetch Orders for Ontario HST calculations (13%)
    const { data: orders } = await admin
      .from('orders')
      .select('id, total, subtotal, tax, service_fee, delivery_fee, status');

    let totalGrossRevenue = 0;
    let totalTaxCollected = 0;
    let totalPlatformFees = 0;

    for (const order of orders ?? []) {
      if (order.status !== 'cancelled') {
        totalGrossRevenue += Number(order.total ?? 0);
        totalTaxCollected += Number(order.tax ?? 0);
        totalPlatformFees += Number(order.service_fee ?? 0);
      }
    }

    // In Ontario: HST is 13% (5% Federal GST + 8% Provincial PST)
    // 5/13 is Federal, 8/13 is Ontario Provincial
    const fedShare = totalTaxCollected * (5 / 13);
    const provShare = totalTaxCollected * (8 / 13);

    hstSummary = {
      taxYear: currentYear,
      totalRevenue: totalGrossRevenue,
      taxablePlatformFees: totalPlatformFees,
      hstCollected: totalTaxCollected,
      federalShare: fedShare,
      provincialShare: provShare,
    };
  } catch (err) {
    console.error('[ridendine][ops-admin][tax-reports-load-failed]', err);
    error = true;
  }

  const t4aEligibleCount = courierRows.filter((c) => c.t4aEligible).length;
  const totalCourierEarnings = courierRows.reduce((acc, c) => acc + c.totalEarnings, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />

        <PageHeader
          title="Ontario Tax & CRA T4A Compliance"
          subtitle="Canada Revenue Agency (CRA) T4A Box 048 courier contractor reporting and Ontario 13% HST liability ledger."
          actions={
            !error && (
              <TaxExportButtons
                taxYear={currentYear}
                courierRows={courierRows}
                hstSummary={hstSummary}
              />
            )
          }
        />

        {error ? (
          <EmptyState
            title="Failed to load tax records"
            description="Unable to query courier earnings or tax data. Verify database connectivity."
          />
        ) : (
          <>
            {/* KPI Overview */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiTile
                label={`Ontario HST Collected (${currentYear})`}
                value={formatCurrency(hstSummary.hstCollected)}
                className="border-border bg-surface"
              />
              <KpiTile
                label="Total Courier Contractor Payouts"
                value={formatCurrency(totalCourierEarnings)}
                className="border-border bg-surface"
              />
              <KpiTile
                label="T4A Eligible Couriers (≥ $500)"
                value={String(t4aEligibleCount)}
                className="border-border bg-surface"
              />
              <KpiTile
                label="Registered Ontario Couriers"
                value={String(courierRows.length)}
                className="border-border bg-surface"
              />
            </div>

            {/* Ontario HST Summary Card */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Ontario Harmonized Sales Tax (HST) - 13.00%</h2>
                  <p className="text-xs text-textMuted">
                    Pegged to Province of Ontario, Canada. Combined 5% Federal GST + 8% Ontario Provincial PST.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-surfaceMuted px-3 py-1 text-xs font-medium text-textSubtle">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Ontario Exclusive Operations
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-sm">
                <div className="rounded-md border border-border/60 bg-surfaceMuted/40 p-3">
                  <div className="text-xs text-textMuted">Total Marketplace Order Volume</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(hstSummary.totalRevenue)}
                  </div>
                  <div className="mt-1 text-[11px] text-textMuted">Gross diner checkout volume</div>
                </div>

                <div className="rounded-md border border-border/60 bg-surfaceMuted/40 p-3">
                  <div className="text-xs text-textMuted">Federal Component (5.00% GST)</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(hstSummary.federalShare)}
                  </div>
                  <div className="mt-1 text-[11px] text-textMuted">Receiver General for Canada share</div>
                </div>

                <div className="rounded-md border border-border/60 bg-surfaceMuted/40 p-3">
                  <div className="text-xs text-textMuted">Ontario Provincial (8.00% PST)</div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(hstSummary.provincialShare)}
                  </div>
                  <div className="mt-1 text-[11px] text-textMuted">Province of Ontario statutory share</div>
                </div>
              </div>
            </div>

            {/* CRA T4A Box 048 Couriers Table */}
            <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    CRA T4A Box 048 - Independent Courier Contractor Rollup
                  </h2>
                  <p className="text-xs text-textMuted">
                    Canada Revenue Agency requires T4A Box 048 (Fees for Services) reporting for any contractor paid $500.00 CAD or more in a calendar year.
                  </p>
                </div>
                <div className="text-xs text-textSubtle">
                  Filing Threshold: <span className="font-semibold text-white">$500.00 CAD</span>
                </div>
              </div>

              {courierRows.length === 0 ? (
                <EmptyState
                  title="No couriers registered"
                  description="Courier tax and T4A Box 048 lines will appear once couriers register and complete deliveries."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
                        <th className="py-3 pr-4">Courier Name</th>
                        <th className="py-3 pr-4">Contact</th>
                        <th className="py-3 pr-4">Deliveries</th>
                        <th className="py-3 pr-4">Gross Earnings</th>
                        <th className="py-3 pr-4">CRA Box 048 Amount</th>
                        <th className="py-3 text-right">T4A Filing Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courierRows.map((courier) => (
                        <tr key={courier.id} className="border-b border-border text-textSubtle">
                          <td className="py-3 pr-4 font-medium text-white">
                            <div>{courier.name}</div>
                            <div className="text-[11px] text-textMuted font-mono">{courier.id.slice(0, 8)}...</div>
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            <div>{courier.email}</div>
                            <div className="text-textMuted">{courier.phone}</div>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-white">
                            {courier.deliveriesCount}
                          </td>
                          <td className="py-3 pr-4 font-medium text-white">
                            {formatCurrency(courier.totalEarnings)}
                          </td>
                          <td className="py-3 pr-4 font-mono font-medium text-emerald-400">
                            {formatCurrency(courier.totalEarnings)}
                          </td>
                          <td className="py-3 text-right">
                            {courier.t4aEligible ? (
                              <StatusBadge status="warning" label="Filing Required (≥ $500)" />
                            ) : (
                              <StatusBadge status="idle" label="Exempt (< $500)" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
