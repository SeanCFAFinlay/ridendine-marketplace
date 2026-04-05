import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type QueueName = 'pending' | 'active' | 'escalated' | 'stale';

function getQueueName(input: string | undefined): QueueName {
  if (input === 'active' || input === 'escalated' || input === 'stale') {
    return input;
  }
  return 'pending';
}

function getSearchParam(
  value: string | string[] | undefined,
  fallback = ''
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queue = getQueueName(getSearchParam(params.queue, 'pending'));
  const search = getSearchParam(params.search).trim().toLowerCase();
  const page = Number(getSearchParam(params.page, '1'));

  let commandCenter;
  try {
    commandCenter = await getEngine().ops.getDispatchCommandCenter();
  } catch (error) {
    console.error('[ridendine][ops-admin][deliveries-page-load-failed]', error);
    commandCenter = {
      summary: {
        pendingDispatch: 0,
        activeDeliveries: 0,
        escalatedDeliveries: 0,
        staleAssignments: 0,
        driversOnline: 0,
        driversBusy: 0,
        driversUnavailable: 0,
        expiredOffers: 0,
      },
      pendingQueue: [],
      activeQueue: [],
      escalatedQueue: [],
      staleAssignments: [],
      driverSupply: [],
      coverageGaps: [],
    };
  }
  const sourceQueue =
    queue === 'active'
      ? commandCenter.activeQueue
      : queue === 'escalated'
        ? commandCenter.escalatedQueue
        : queue === 'stale'
          ? commandCenter.staleAssignments
          : commandCenter.pendingQueue;

  const filtered = sourceQueue.filter((item) => {
    if (!search) return true;
    const haystack = [
      item.orderNumber,
      item.storefrontName,
      item.customerName,
      item.pickupAddress,
      item.dropoffAddress,
      item.assignedDriver?.name ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search);
  });

  const pageSize = 10;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dispatch Command Center</h1>
            <p className="mt-1 text-gray-400">
              Deterministic dispatch queues, driver supply visibility, and intervention controls.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
              <p className="mt-1 text-xl font-semibold text-white">{commandCenter.summary.pendingDispatch}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
              <p className="mt-1 text-xl font-semibold text-white">{commandCenter.summary.activeDeliveries}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Escalated</p>
              <p className="mt-1 text-xl font-semibold text-white">{commandCenter.summary.escalatedDeliveries}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Expired Offers</p>
              <p className="mt-1 text-xl font-semibold text-white">{commandCenter.summary.expiredOffers}</p>
            </div>
          </div>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(['pending', 'active', 'escalated', 'stale'] as QueueName[]).map((entry) => (
                <Link
                  key={entry}
                  href={`/dashboard/deliveries?queue=${entry}`}
                  className={`rounded-full px-4 py-2 text-sm ${
                    queue === entry
                      ? 'bg-[#E85D26] text-white'
                      : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#222745]'
                  }`}
                >
                  {entry}
                </Link>
              ))}
            </div>
            <form className="flex gap-2" action="/dashboard/deliveries">
              <input type="hidden" name="queue" value={queue} />
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search order, customer, storefront, driver"
                className="w-full min-w-[280px] rounded-lg border border-gray-700 bg-[#1a1a2e] px-3 py-2 text-sm text-white focus:border-[#E85D26] focus:outline-none"
              />
              <button className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white">
                Search
              </button>
            </form>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {queue.charAt(0).toUpperCase() + queue.slice(1)} Queue
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Page {safePage} of {totalPages}. {filtered.length} deliveries match the current filter.
                </p>
              </div>
              <Badge className="bg-gray-700 text-gray-200">{filtered.length}</Badge>
            </div>

            <div className="space-y-4">
              {pageItems.map((item) => (
                <Link
                  key={item.deliveryId}
                  href={`/dashboard/deliveries/${item.deliveryId}`}
                  className="block rounded-lg border border-gray-800 bg-[#1a1a2e] p-4 transition-colors hover:border-[#E85D26]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-white">Order {item.orderNumber}</span>
                        <Badge className="bg-blue-500/20 text-blue-200">{item.status}</Badge>
                        {item.escalatedToOps && (
                          <Badge className="bg-red-500/20 text-red-200">Escalated</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{item.storefrontName}</p>
                      <p className="text-sm text-gray-400">
                        {item.pickupAddress} to {item.dropoffAddress}
                      </p>
                      <p className="text-sm text-gray-500">
                        Customer: {item.customerName} · Attempts: {item.assignmentAttemptsCount}
                      </p>
                      {item.assignedDriver && (
                        <p className="text-sm text-gray-500">
                          Driver: {item.assignedDriver.name}
                        </p>
                      )}
                    </div>

                    <div className="min-w-[220px] rounded-lg bg-[#121928] p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Top candidates</p>
                      <div className="mt-2 space-y-2">
                        {item.topCandidates.length === 0 ? (
                          <p className="text-gray-500">No eligible supply in range.</p>
                        ) : (
                          item.topCandidates.map((candidate) => (
                            <div key={candidate.driverId} className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-white">{candidate.name}</p>
                                <p className="text-xs text-gray-500">
                                  {candidate.distanceKm == null
                                    ? 'No live location'
                                    : `${candidate.distanceKm.toFixed(1)} km`} · {candidate.status}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400">
                                load {candidate.activeDeliveries}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {pageItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-700 p-10 text-center text-gray-500">
                  No deliveries match this queue view.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`/dashboard/deliveries?queue=${queue}&search=${encodeURIComponent(search)}&page=${Math.max(1, safePage - 1)}`}
                className={`rounded-lg px-4 py-2 text-sm ${
                  safePage <= 1 ? 'pointer-events-none bg-gray-800 text-gray-600' : 'bg-[#1a1a2e] text-white'
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/dashboard/deliveries?queue=${queue}&search=${encodeURIComponent(search)}&page=${Math.min(totalPages, safePage + 1)}`}
                className={`rounded-lg px-4 py-2 text-sm ${
                  safePage >= totalPages ? 'pointer-events-none bg-gray-800 text-gray-600' : 'bg-[#1a1a2e] text-white'
                }`}
              >
                Next
              </Link>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-gray-800 bg-[#16213e] p-6">
              <h2 className="text-lg font-semibold text-white">Driver Supply</h2>
              <div className="mt-4 space-y-3">
                {commandCenter.driverSupply.slice(0, 8).map((driver) => (
                  <div key={driver.driverId} className="rounded-lg bg-[#1a1a2e] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white">{driver.name}</p>
                        <p className="text-xs text-gray-500">
                          {driver.status} · declines {driver.recentDeclines} · expiries {driver.recentExpiries}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">load {driver.activeDeliveries}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-gray-800 bg-[#16213e] p-6">
              <h2 className="text-lg font-semibold text-white">Coverage Gaps</h2>
              <div className="mt-4 space-y-3">
                {commandCenter.coverageGaps.length === 0 ? (
                  <p className="text-sm text-gray-500">No open coverage gaps identified.</p>
                ) : (
                  commandCenter.coverageGaps.map((gap) => (
                    <div key={gap.area} className="rounded-lg bg-[#1a1a2e] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-white">{gap.area}</p>
                          <p className="text-xs text-gray-500">
                            {gap.openDeliveries} open deliveries · {gap.availableDrivers} available drivers
                          </p>
                        </div>
                        <Badge
                          className={
                            gap.riskLevel === 'high'
                              ? 'bg-red-500/20 text-red-200'
                              : gap.riskLevel === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-200'
                                : 'bg-emerald-500/20 text-emerald-200'
                          }
                        >
                          {gap.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
