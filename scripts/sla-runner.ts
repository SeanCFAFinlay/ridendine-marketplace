/**
 * SLA Runner Script
 * Scans active orders for SLA violations and triggers engine actions.
 * Run periodically via cron: every 1-2 minutes.
 *
 * Usage: npx tsx scripts/sla-runner.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createCentralEngine } from '../packages/engine/src/core/engine.factory';
import {
  checkChefAcceptanceTimeout,
  checkDriverAssignmentTimeout,
  checkStalePreparingOrders,
} from '../packages/engine/src/core/sla-checks';

// ---- config ----

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const SYSTEM_ACTOR = { userId: 'system', role: 'system' as any };

// ---- counters ----

let cancelledOrders = 0;
let escalatedDeliveries = 0;
let staleAlerts = 0;

// ---- steps ----

async function runSLATimers(engine: ReturnType<typeof createCentralEngine>): Promise<void> {
  const { warnings, breaches } = await engine.sla.processExpiredTimers(SYSTEM_ACTOR);
  console.log(`[sla-timers] warnings=${warnings.length} breaches=${breaches.length}`);
}

async function handleChefAcceptanceTimeouts(
  engine: ReturnType<typeof createCentralEngine>,
  client: ReturnType<typeof createClient>,
): Promise<void> {
  const violations = await checkChefAcceptanceTimeout(client, 5);
  for (const v of violations) {
    console.log(`[chef-timeout] order=${v.entityId} elapsed=${v.elapsedMinutes}m`);
    try {
      await engine.masterOrder.cancelOrder({
        orderId: v.entityId,
        actorId: 'system',
        actorType: 'system',
        reason: 'Chef acceptance timeout',
      });
      cancelledOrders++;
    } catch (err) {
      console.warn(`[chef-timeout] failed to cancel order ${v.entityId}:`, err);
    }
  }
}

async function handleDriverAssignmentTimeouts(
  client: ReturnType<typeof createClient>,
): Promise<void> {
  const violations = await checkDriverAssignmentTimeout(client, 10);
  for (const v of violations) {
    console.log(`[driver-timeout] delivery=${v.entityId} elapsed=${v.elapsedMinutes}m`);

    const { error: updateError } = await client
      .from('deliveries')
      .update({ escalated_to_ops: true })
      .eq('id', v.entityId);

    if (updateError) {
      console.warn(`[driver-timeout] failed to escalate delivery ${v.entityId}:`, updateError);
      continue;
    }

    await client.from('system_alerts').insert({
      alert_type: 'driver_assignment_timeout',
      severity: 'error',
      title: 'Driver assignment timeout',
      message: `Delivery ${v.entityId} has no driver after ${v.elapsedMinutes} minutes.`,
      entity_type: 'delivery',
      entity_id: v.entityId,
      metadata: { elapsedMinutes: v.elapsedMinutes, thresholdMinutes: v.thresholdMinutes },
    });

    escalatedDeliveries++;
  }
}

async function handleStalePreparingOrders(
  client: ReturnType<typeof createClient>,
): Promise<void> {
  const violations = await checkStalePreparingOrders(client, 45);
  for (const v of violations) {
    console.log(`[stale-prep] order=${v.entityId} elapsed=${v.elapsedMinutes}m`);

    await client.from('system_alerts').insert({
      alert_type: 'stale_preparing_order',
      severity: 'warning',
      title: 'Order stale in preparing state',
      message: `Order ${v.entityId} has been preparing for ${v.elapsedMinutes} minutes.`,
      entity_type: 'order',
      entity_id: v.entityId,
      metadata: { elapsedMinutes: v.elapsedMinutes, thresholdMinutes: v.thresholdMinutes },
    });

    staleAlerts++;
  }
}

// ---- main ----

async function main(): Promise<void> {
  const client = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
  const engine = createCentralEngine(client);

  console.log('[sla-runner] starting run');

  await runSLATimers(engine);
  await handleChefAcceptanceTimeouts(engine, client);
  await handleDriverAssignmentTimeouts(client);
  await handleStalePreparingOrders(client);

  console.log(
    `[sla-runner] done — cancelled=${cancelledOrders} escalated=${escalatedDeliveries} staleAlerts=${staleAlerts}`,
  );

  await engine.events.flush();
  process.exit(0);
}

main().catch((err) => {
  console.error('[sla-runner] fatal error:', err);
  process.exit(1);
});
