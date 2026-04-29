import type {
  AssignmentAttempt,
  DeliveryInterventionDetail,
  DispatchCommandCenterReadModel,
  DispatchQueueItem,
  DriverSupplySnapshot,
  FinanceOperationsReadModel,
  OpsDashboardReadModel,
  PlatformRuleSet,
} from '@ridendine/types';
import type { SupabaseClient } from '../client/types';
import { calculateDistanceKm, extractAreaFromAddress, scoreDriverForDispatch } from '@ridendine/utils';
import {
  getChefLiabilitySummaries,
  getDriverLiabilitySummaries,
  getPendingPayoutAdjustmentSummaries,
  getPendingRefundSummaries,
  getRecentLedgerEntries,
} from './finance.repository';

type AnyRow = Record<string, any>;

function mapAssignmentAttempt(row: AnyRow): AssignmentAttempt {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    driverId: row.driver_id,
    attemptNumber: row.attempt_number,
    offeredAt: row.offered_at,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at ?? undefined,
    response: row.response,
    declineReason: row.decline_reason ?? undefined,
    distanceMeters: row.distance_meters ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
  };
}

async function listDriverSupply(
  client: SupabaseClient,
  pickupLat?: number | null,
  pickupLng?: number | null,
  rules?: PlatformRuleSet
): Promise<DriverSupplySnapshot[]> {
  const [driversResult, deliveriesResult, attemptsResult] = await Promise.all([
    (client
      .from('drivers')
      .select(`
        id,
        status,
        first_name,
        last_name,
        driver_presence(status, current_lat, current_lng)
      `) as any),
    (client
      .from('deliveries')
      .select('driver_id, updated_at')
      .in('status', ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff']) as any),
    (client
      .from('assignment_attempts')
      .select('driver_id, response')
      .gte('offered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as any),
  ]);

  if (driversResult.error) throw driversResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;
  if (attemptsResult.error) throw attemptsResult.error;

  const activeCounts = new Map<string, number>();
  const lastAssignmentByDriver = new Map<string, string>();
  for (const delivery of deliveriesResult.data ?? []) {
    if (!delivery.driver_id) continue;
    activeCounts.set(delivery.driver_id, (activeCounts.get(delivery.driver_id) ?? 0) + 1);
    const previous = lastAssignmentByDriver.get(delivery.driver_id);
    if (!previous || previous < delivery.updated_at) {
      lastAssignmentByDriver.set(delivery.driver_id, delivery.updated_at);
    }
  }

  const recentDeclines = new Map<string, number>();
  const recentExpiries = new Map<string, number>();
  for (const attempt of attemptsResult.data ?? []) {
    if (!attempt.driver_id) continue;
    if (attempt.response === 'declined') {
      recentDeclines.set(attempt.driver_id, (recentDeclines.get(attempt.driver_id) ?? 0) + 1);
    }
    if (attempt.response === 'expired') {
      recentExpiries.set(attempt.driver_id, (recentExpiries.get(attempt.driver_id) ?? 0) + 1);
    }
  }

  const snapshots = ((driversResult.data ?? []) as AnyRow[]).map((driver) => {
    const presence = Array.isArray(driver.driver_presence)
      ? driver.driver_presence[0]
      : driver.driver_presence;
    const activeDeliveries = activeCounts.get(driver.id) ?? 0;
    const distanceKm = calculateDistanceKm(
      pickupLat,
      pickupLng,
      presence?.current_lat,
      presence?.current_lng
    );
    return {
      driverId: driver.id,
      name: [driver.first_name, driver.last_name].filter(Boolean).join(' ') || 'Unknown Driver',
      status: driver.status !== 'approved' ? 'unavailable' : presence?.status ?? 'offline',
      approvalState: driver.status,
      activeDeliveries,
      distanceKm,
      lastAssignmentAt: lastAssignmentByDriver.get(driver.id) ?? null,
      recentDeclines: recentDeclines.get(driver.id) ?? 0,
      recentExpiries: recentExpiries.get(driver.id) ?? 0,
      fairnessScore: 1 / (activeDeliveries + 1),
    } satisfies DriverSupplySnapshot;
  });

  const effectiveRules =
    rules ??
    ({
      dispatchRadiusKm: 10,
      maxDeliveryDistanceKm: 15,
    } as PlatformRuleSet);
  return snapshots.sort((a, b) => scoreDriverForDispatch(b, effectiveRules) - scoreDriverForDispatch(a, effectiveRules));
}

function buildDispatchItem(
  delivery: AnyRow,
  attempts: AnyRow[],
  exception: AnyRow | undefined,
  candidates: DriverSupplySnapshot[]
): DispatchQueueItem {
  return {
    deliveryId: delivery.id,
    orderId: delivery.order?.id ?? '',
    orderNumber: delivery.order?.order_number ?? 'N/A',
    status: delivery.status,
    pickupAddress: delivery.pickup_address,
    dropoffAddress: delivery.dropoff_address,
    pickupArea: extractAreaFromAddress(delivery.pickup_address),
    customerName:
      [delivery.order?.customer?.first_name, delivery.order?.customer?.last_name]
        .filter(Boolean)
        .join(' ') || 'Unknown Customer',
    storefrontName: delivery.order?.storefront?.name ?? 'Unknown Storefront',
    createdAt: delivery.created_at,
    estimatedPickupAt: delivery.estimated_pickup_at ?? null,
    estimatedDropoffAt: delivery.estimated_dropoff_at ?? null,
    assignmentAttemptsCount: delivery.assignment_attempts_count ?? attempts.length,
    activeAttemptCount: attempts.filter((attempt) => attempt.response === 'pending').length,
    lastAssignmentAt: delivery.last_assignment_at ?? null,
    escalatedToOps: Boolean(delivery.escalated_to_ops),
    escalationReason: exception?.exception_type ?? null,
    assignedDriver: delivery.driver
      ? {
          id: delivery.driver.id,
          name:
            [delivery.driver.first_name, delivery.driver.last_name].filter(Boolean).join(' ') ||
            'Unknown Driver',
          phone: delivery.driver.phone ?? null,
        }
      : null,
    topCandidates: candidates.slice(0, 3),
    timelineSummary: attempts
      .slice(0, 3)
      .map(
        (attempt) =>
          `Attempt ${attempt.attempt_number}: ${attempt.response} at ${new Date(attempt.offered_at).toLocaleString()}`
      ),
    queueReason: delivery.escalated_to_ops
      ? 'escalated'
      : delivery.status === 'pending'
        ? 'pending_dispatch'
        : 'active_delivery',
  };
}

export async function getOpsDashboardReadModel(
  client: SupabaseClient
): Promise<OpsDashboardReadModel> {
  const [statsResult, driverPresenceResult, supportResult, deliveryResult] = await Promise.all([
    (client.rpc('get_ops_dashboard_stats') as any),
    (client.from('driver_presence').select('status') as any),
    (client.from('support_tickets').select('status').not('status', 'in', '(resolved,closed)') as any),
    (client
      .from('deliveries')
      .select('status, escalated_to_ops')
      .in('status', ['pending', 'assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff']) as any),
  ]);

  if (statsResult.error) throw statsResult.error;
  if (driverPresenceResult.error) throw driverPresenceResult.error;
  if (supportResult.error) throw supportResult.error;
  if (deliveryResult.error) throw deliveryResult.error;

  const stats = statsResult.data?.[0] ?? {};
  const driverPresence = driverPresenceResult.data ?? [];
  const deliveries = deliveryResult.data ?? [];
  const driversOnline = driverPresence.filter((row: AnyRow) => row.status === 'online').length;
  const driversBusy = driverPresence.filter((row: AnyRow) => row.status === 'busy').length;
  const driversUnavailable = driverPresence.filter((row: AnyRow) => !['online', 'busy'].includes(row.status)).length;
  const pendingDispatch = deliveries.filter((row: AnyRow) => row.status === 'pending').length;
  const activeDeliveries = deliveries.filter((row: AnyRow) => row.status !== 'pending').length;
  const deliveryEscalations = deliveries.filter((row: AnyRow) => row.escalated_to_ops).length;
  const supportBacklog = supportResult.data?.length ?? 0;

  return {
    activeOrders: Number(stats.active_orders ?? 0),
    ordersNeedingAction: Number(stats.pending_orders ?? 0) + Number(stats.ready_orders ?? 0),
    activeDeliveries,
    pendingDispatch,
    openExceptions: Number(stats.open_exceptions ?? 0),
    slaBreaches: Number(stats.sla_breaches_today ?? 0),
    pendingRefunds: Number(stats.pending_refunds ?? 0),
    storefrontRisks: Number(stats.paused_storefronts ?? 0),
    driversOnline,
    driversBusy,
    driversUnavailable,
    supportBacklog,
    deliveryEscalations,
    cards: [
      {
        label: 'Orders needing action',
        value: Number(stats.pending_orders ?? 0) + Number(stats.ready_orders ?? 0),
        tone:
          Number(stats.pending_orders ?? 0) + Number(stats.ready_orders ?? 0) > 10
            ? 'warning'
            : 'default',
      },
      {
        label: 'Pending dispatch',
        value: pendingDispatch,
        tone: pendingDispatch > 5 ? 'critical' : 'warning',
      },
      {
        label: 'Open exceptions',
        value: Number(stats.open_exceptions ?? 0),
        tone: Number(stats.critical_exceptions ?? 0) > 0 ? 'critical' : 'warning',
      },
      {
        label: 'Support backlog',
        value: supportBacklog,
        tone: supportBacklog > 10 ? 'warning' : 'default',
      },
    ],
  };
}

export async function getDispatchCommandCenterReadModel(
  client: SupabaseClient,
  rules: PlatformRuleSet
): Promise<DispatchCommandCenterReadModel> {
  const deliveriesResult = await (client
    .from('deliveries')
    .select(`
      *,
      order:orders(
        id,
        order_number,
        customer:customers(first_name,last_name),
        storefront:chef_storefronts(name)
      ),
      driver:drivers(id,first_name,last_name,phone)
    `)
    .in('status', ['pending', 'assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff'])
    .order('created_at', { ascending: true }) as any);

  if (deliveriesResult.error) throw deliveriesResult.error;
  const deliveries = (deliveriesResult.data ?? []) as AnyRow[];
  const deliveryIds = deliveries.map((delivery) => delivery.id);

  const [attemptsResult, exceptionsResult, globalDriverSupply, expiredOffersResult] = await Promise.all([
    deliveryIds.length
      ? ((client
          .from('assignment_attempts')
          .select('*')
          .in('delivery_id', deliveryIds)
          .order('offered_at', { ascending: false }) as any) as Promise<any>)
      : Promise.resolve({ data: [], error: null }),
    deliveryIds.length
      ? ((client
          .from('order_exceptions')
          .select('delivery_id, exception_type, status, created_at')
          .in('delivery_id', deliveryIds)
          .in('status', ['open', 'acknowledged', 'in_progress', 'escalated'])
          .order('created_at', { ascending: false }) as any) as Promise<any>)
      : Promise.resolve({ data: [], error: null }),
    listDriverSupply(client, undefined, undefined, rules),
    (client
      .from('assignment_attempts')
      .select('id')
      .eq('response', 'pending')
      .lt('expires_at', new Date().toISOString()) as any),
  ]);

  if (attemptsResult.error) throw attemptsResult.error;
  if (exceptionsResult.error) throw exceptionsResult.error;
  if (expiredOffersResult.error) throw expiredOffersResult.error;

  const attemptsByDelivery = new Map<string, AnyRow[]>();
  for (const attempt of attemptsResult.data ?? []) {
    const bucket = attemptsByDelivery.get(attempt.delivery_id) ?? [];
    bucket.push(attempt);
    attemptsByDelivery.set(attempt.delivery_id, bucket);
  }

  const exceptionByDelivery = new Map<string, AnyRow>();
  for (const exception of exceptionsResult.data ?? []) {
    if (!exceptionByDelivery.has(exception.delivery_id)) {
      exceptionByDelivery.set(exception.delivery_id, exception);
    }
  }

  const pendingQueue: DispatchQueueItem[] = [];
  const activeQueue: DispatchQueueItem[] = [];
  const escalatedQueue: DispatchQueueItem[] = [];
  const staleAssignments: DispatchQueueItem[] = [];

  for (const delivery of deliveries) {
    const candidates = await listDriverSupply(
      client,
      delivery.pickup_lat,
      delivery.pickup_lng,
      rules
    );
    const item = buildDispatchItem(
      delivery,
      attemptsByDelivery.get(delivery.id) ?? [],
      exceptionByDelivery.get(delivery.id),
      candidates
    );
    if (delivery.escalated_to_ops) escalatedQueue.push(item);
    if (delivery.status === 'pending') pendingQueue.push(item);
    else activeQueue.push(item);

    if (
      delivery.driver_id &&
      delivery.last_assignment_at &&
      Date.now() - new Date(delivery.last_assignment_at).getTime() >
        rules.offerTimeoutSeconds * 1000 * 2
    ) {
      staleAssignments.push({ ...item, queueReason: 'stale_assignment' });
    }
  }

  const coverageMap = new Map<string, { openDeliveries: number; availableDrivers: number }>();
  for (const item of pendingQueue) {
    const bucket = coverageMap.get(item.pickupArea) ?? { openDeliveries: 0, availableDrivers: 0 };
    bucket.openDeliveries += 1;
    coverageMap.set(item.pickupArea, bucket);
  }

  return {
    summary: {
      pendingDispatch: pendingQueue.length,
      activeDeliveries: activeQueue.length,
      escalatedDeliveries: escalatedQueue.length,
      staleAssignments: staleAssignments.length,
      driversOnline: globalDriverSupply.filter((driver) => driver.status === 'online').length,
      driversBusy: globalDriverSupply.filter((driver) => driver.status === 'busy').length,
      driversUnavailable: globalDriverSupply.filter((driver) => driver.status !== 'online' && driver.status !== 'busy').length,
      expiredOffers: expiredOffersResult.data?.length ?? 0,
    },
    pendingQueue,
    activeQueue,
    escalatedQueue,
    staleAssignments,
    driverSupply: globalDriverSupply,
    coverageGaps: [...coverageMap.entries()].map(([area, counts]) => ({
      area,
      openDeliveries: counts.openDeliveries,
      availableDrivers: counts.availableDrivers,
      riskLevel:
        counts.openDeliveries > counts.availableDrivers
          ? 'high'
          : counts.openDeliveries === counts.availableDrivers
            ? 'medium'
            : 'low',
    })),
  };
}

export async function getDeliveryInterventionDetailReadModel(
  client: SupabaseClient,
  deliveryId: string
): Promise<DeliveryInterventionDetail | null> {
  const deliveryResult = await (client
    .from('deliveries')
    .select(`
      *,
      order:orders(
        id,
        order_number,
        status,
        payment_status,
        total,
        created_at,
        customer:customers(id,first_name,last_name,phone,email),
        storefront:chef_storefronts(id,name,slug)
      ),
      driver:drivers(id,first_name,last_name,phone,status,driver_presence(status))
    `)
    .eq('id', deliveryId)
    .single() as any);

  if (deliveryResult.error) {
    if (deliveryResult.error.code === 'PGRST116') return null;
    throw deliveryResult.error;
  }

  const delivery = deliveryResult.data as AnyRow;
  const [attemptsResult, exceptionsResult, notesResult, trackingResult, eventsResult, refundResult, payoutResult] =
    await Promise.all([
      (client.from('assignment_attempts').select('*').eq('delivery_id', deliveryId).order('offered_at', { ascending: false }) as any),
      (client.from('order_exceptions').select('id, exception_type, status, created_at').eq('delivery_id', deliveryId).order('created_at', { ascending: false }) as any),
      (client.from('admin_notes').select('id, content, created_at, created_by').eq('entity_type', 'delivery').eq('entity_id', deliveryId).order('created_at', { ascending: false }) as any),
      (client.from('delivery_tracking_events').select('id, lat, lng, recorded_at').eq('delivery_id', deliveryId).order('recorded_at', { ascending: false }).limit(25) as any),
      (client.from('delivery_events').select('id, event_type, created_at, data').eq('delivery_id', deliveryId).order('created_at', { ascending: false }).limit(25) as any),
      (client.from('refund_cases').select('approved_amount_cents, requested_amount_cents').eq('order_id', delivery.order?.id ?? '').in('status', ['pending', 'approved', 'processing', 'completed']) as any),
      (client.from('payout_adjustments').select('id').eq('order_id', delivery.order?.id ?? '').eq('status', 'pending') as any),
    ]);

  for (const result of [attemptsResult, exceptionsResult, notesResult, trackingResult, eventsResult, refundResult, payoutResult]) {
    if (result.error) throw result.error;
  }

  const leadingException = exceptionsResult.data?.[0];
  const refundExposureCents = (refundResult.data ?? []).reduce(
    (sum: number, row: AnyRow) =>
      sum + Number(row.approved_amount_cents ?? row.requested_amount_cents ?? 0),
    0
  );

  return {
    deliveryId: delivery.id,
    status: delivery.status,
    escalationState: leadingException
      ? (leadingException.status === 'escalated'
          ? 'escalated'
          : leadingException.status === 'acknowledged'
            ? 'acknowledged'
            : leadingException.status === 'resolved'
              ? 'resolved'
              : 'open')
      : 'none',
    escalationReason: leadingException?.exception_type ?? null,
    order: {
      id: delivery.order?.id ?? '',
      orderNumber: delivery.order?.order_number ?? 'N/A',
      status: delivery.order?.status ?? 'unknown',
      paymentStatus: delivery.order?.payment_status ?? null,
      total: Number(delivery.order?.total ?? 0),
      createdAt: delivery.order?.created_at ?? delivery.created_at,
    },
    customer: delivery.order?.customer
      ? {
          id: delivery.order.customer.id,
          name:
            [delivery.order.customer.first_name, delivery.order.customer.last_name]
              .filter(Boolean)
              .join(' ') || 'Unknown Customer',
          phone: delivery.order.customer.phone ?? null,
          email: delivery.order.customer.email ?? null,
        }
      : null,
    storefront: delivery.order?.storefront
      ? {
          id: delivery.order.storefront.id,
          name: delivery.order.storefront.name,
          slug: delivery.order.storefront.slug ?? null,
        }
      : null,
    driver: delivery.driver
      ? {
          id: delivery.driver.id,
          name:
            [delivery.driver.first_name, delivery.driver.last_name].filter(Boolean).join(' ') ||
            'Unknown Driver',
          phone: delivery.driver.phone ?? null,
          status: delivery.driver.status ?? null,
          presenceStatus: Array.isArray(delivery.driver.driver_presence)
            ? delivery.driver.driver_presence[0]?.status ?? null
            : delivery.driver.driver_presence?.status ?? null,
        }
      : null,
    pickup: { address: delivery.pickup_address, lat: delivery.pickup_lat ?? null, lng: delivery.pickup_lng ?? null },
    dropoff: { address: delivery.dropoff_address, lat: delivery.dropoff_lat ?? null, lng: delivery.dropoff_lng ?? null },
    payout: {
      deliveryFee: Number(delivery.delivery_fee ?? 0),
      driverPayout: Number(delivery.driver_payout ?? 0),
      refundExposureCents,
      payoutHoldCount: payoutResult.data?.length ?? 0,
    },
    assignmentAttempts: (attemptsResult.data ?? []).map(mapAssignmentAttempt),
    eventTimeline: [
      ...(eventsResult.data ?? []).map((event: AnyRow) => ({
        id: event.id,
        type: event.event_type,
        timestamp: event.created_at,
        note: event.data?.notes ?? null,
      })),
      ...(exceptionsResult.data ?? []).map((exception: AnyRow) => ({
        id: exception.id,
        type: `exception.${exception.exception_type}`,
        timestamp: exception.created_at,
        note: exception.status,
      })),
    ].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
    opsNotes: (notesResult.data ?? []).map((note: AnyRow) => ({
      id: note.id,
      content: note.content,
      createdAt: note.created_at,
      createdBy: note.created_by,
    })),
    trackingBreadcrumbs: (trackingResult.data ?? []).map((point: AnyRow) => ({
      id: point.id,
      lat: Number(point.lat),
      lng: Number(point.lng),
      recordedAt: point.recorded_at,
    })),
  };
}

export async function getFinanceOperationsReadModel(
  client: SupabaseClient,
  rules: PlatformRuleSet,
  dateRange: { start: string; end: string },
  summary: FinanceOperationsReadModel['summary']
): Promise<FinanceOperationsReadModel> {
  const [pendingRefunds, pendingAdjustments, recentLedger, chefLiabilities, driverLiabilities] =
    await Promise.all([
      getPendingRefundSummaries(client, 50),
      getPendingPayoutAdjustmentSummaries(client, 50),
      getRecentLedgerEntries(client, 50),
      getChefLiabilitySummaries(client, 20),
      getDriverLiabilitySummaries(client, 20),
    ]);

  return {
    summary,
    pendingRefundAmount: pendingRefunds.reduce((sum, refund) => sum + refund.amount_cents / 100, 0),
    pendingAdjustmentAmount: pendingAdjustments.reduce((sum, adjustment) => sum + adjustment.amount_cents / 100, 0),
    refundAutoReviewThresholdCents: rules.refundAutoReviewThresholdCents,
    pendingRefunds: pendingRefunds.map((refund) => ({
      id: refund.id,
      orderNumber: refund.order_number,
      customerName: refund.customer_name,
      amountCents: refund.amount_cents,
      reason: refund.reason,
      createdAt: refund.created_at,
      status: refund.amount_cents >= rules.refundAutoReviewThresholdCents ? 'manual_review' : 'standard_review',
    })),
    pendingAdjustments: pendingAdjustments.map((adjustment) => ({
      id: adjustment.id,
      payeeType: adjustment.payee_type,
      payeeId: adjustment.payee_id,
      amountCents: adjustment.amount_cents,
      adjustmentType: adjustment.adjustment_type,
      status: adjustment.status,
      orderNumber: adjustment.order_number,
      createdAt: adjustment.created_at,
    })),
    recentLedger: recentLedger
      .filter((entry) => entry.created_at >= dateRange.start && entry.created_at <= dateRange.end)
      .map((entry) => ({
        id: entry.id,
        entryType: entry.entry_type,
        amountCents: entry.amount_cents,
        currency: entry.currency,
        description: entry.description,
        createdAt: entry.created_at,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
      })),
    chefLiabilities,
    driverLiabilities,
  };
}
