// ==========================================
// CENTRAL ENGINE FACTORY
// Unified entry point for all engine services
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { DomainEventEmitter, createEventEmitter } from './event-emitter';
import { AuditLogger, createAuditLogger } from './audit-logger';
import { SLAManager, createSLAManager } from './sla-manager';
import { NotificationSender, createNotificationSender } from './notification-sender';
import { createResendProvider } from './email-provider';
import { OrderOrchestrator, createOrderOrchestrator, type PaymentAdapter } from '../orchestrators/order.orchestrator';
import { KitchenEngine, createKitchenEngine } from '../orchestrators/kitchen.engine';
import { DispatchEngine, createDispatchEngine } from '../orchestrators/dispatch.engine';
import { CommerceLedgerEngine, createCommerceLedgerEngine } from '../orchestrators/commerce.engine';
import { SupportExceptionEngine, createSupportExceptionEngine } from '../orchestrators/support.engine';
import { PlatformWorkflowEngine, createPlatformWorkflowEngine } from '../orchestrators/platform.engine';
import { OpsControlEngine, createOpsControlEngine } from '../orchestrators/ops.engine';
import { MasterOrderEngine, createMasterOrderEngine } from '../orchestrators/master-order-engine';
import { DeliveryEngine as MasterDeliveryEngine, createDeliveryEngine } from '../orchestrators/delivery-engine';
import { BusinessRulesEngine, createBusinessRulesEngine } from './business-rules-engine';
import { PayoutEngine, createPayoutEngine } from '../orchestrators/payout-engine';

/**
 * Central Engine instance
 * Provides access to all engine services
 */
export interface CentralEngine {
  // Core utilities
  events: DomainEventEmitter;
  audit: AuditLogger;
  sla: SLAManager;
  notifications: NotificationSender;

  // Business rules (validation layer)
  rules: BusinessRulesEngine;

  // Canonical engines (single authority for lifecycle transitions)
  masterOrder: MasterOrderEngine;
  masterDelivery: MasterDeliveryEngine;
  payouts: PayoutEngine;

  // Domain orchestrators (facades that delegate to canonical engines)
  orders: OrderOrchestrator;
  kitchen: KitchenEngine;
  dispatch: DispatchEngine;
  commerce: CommerceLedgerEngine;
  support: SupportExceptionEngine;
  platform: PlatformWorkflowEngine;
  ops: OpsControlEngine;
}

/**
 * Create a fully initialized Central Engine
 * @param paymentAdapter Optional Stripe adapter for voiding payments on rejection/cancel (FND-017)
 */
export function createCentralEngine(
  client: SupabaseClient,
  paymentAdapter?: PaymentAdapter,
): CentralEngine {
  // Create core utilities
  const events = createEventEmitter(client);
  const audit = createAuditLogger(client);
  const sla = createSLAManager(client, events);
  const notifications = createNotificationSender(client);

  // Register email provider (only active when RESEND_API_KEY is set)
  notifications.registerProvider(createResendProvider());

  // Create business rules engine (validation layer)
  const rules = createBusinessRulesEngine(client);

  // Create canonical engines (single authority for lifecycle transitions)
  const masterOrder = createMasterOrderEngine(client, audit, events);
  const masterDelivery = createDeliveryEngine(client, audit, events, masterOrder);
  const payouts = createPayoutEngine(client, audit, events);

  // Create domain orchestrators (facades that delegate to canonical engines)
  const orders = createOrderOrchestrator(client, events, audit, sla, undefined, paymentAdapter);
  const kitchen = createKitchenEngine(client, events, audit);
  const dispatch = createDispatchEngine(client, events, audit, sla);
  const commerce = createCommerceLedgerEngine(client, events, audit);
  const support = createSupportExceptionEngine(client, events, audit);
  const platform = createPlatformWorkflowEngine(client, events, audit, orders, dispatch, support);
  const ops = createOpsControlEngine(client, events, audit, dispatch, support, commerce);

  return {
    events,
    audit,
    sla,
    notifications,
    rules,
    masterOrder,
    masterDelivery,
    payouts,
    orders,
    kitchen,
    dispatch,
    commerce,
    support,
    platform,
    ops,
  };
}

/**
 * Singleton pattern for server-side usage
 */
let engineInstance: CentralEngine | null = null;

export function getEngine(client: SupabaseClient): CentralEngine {
  if (!engineInstance) {
    engineInstance = createCentralEngine(client);
  }
  return engineInstance;
}

/**
 * Reset engine instance (useful for testing)
 */
export function resetEngine(): void {
  engineInstance = null;
}
