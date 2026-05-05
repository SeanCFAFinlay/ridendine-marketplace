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
import { createTwilioProvider } from './sms-provider';
import { NotificationTriggers, createNotificationTriggers } from './notification-triggers';
import type { PaymentAdapter } from '../types/payment-adapter';
import { OrderCreationService, createOrderCreationService } from '../orchestrators/order-creation.service';
import { KitchenEngine, createKitchenEngine } from '../orchestrators/kitchen.engine';
import { CommerceLedgerEngine, createCommerceLedgerEngine } from '../orchestrators/commerce.engine';
import { SupportExceptionEngine, createSupportExceptionEngine } from '../orchestrators/support.engine';
import { PlatformWorkflowEngine, createPlatformWorkflowEngine } from '../orchestrators/platform.engine';
import { OpsControlEngine, createOpsControlEngine } from '../orchestrators/ops.engine';
import {
  OperationsCommandGateway,
  createOperationsCommandGateway,
} from '../orchestrators/operations-command.gateway';
import { MasterOrderEngine, createMasterOrderEngine } from '../orchestrators/master-order-engine';
import { DeliveryEngine as MasterDeliveryEngine, createDeliveryEngine } from '../orchestrators/delivery-engine';
import { DriverMatchingService, createDriverMatchingService } from '../orchestrators/driver-matching.service';
import { OfferManagementService, createOfferManagementService } from '../orchestrators/offer-management.service';
import { DispatchOrchestrator, createDispatchOrchestrator } from '../orchestrators/dispatch-orchestrator';
import { BusinessRulesEngine, createBusinessRulesEngine } from './business-rules-engine';
import { PayoutEngine, createPayoutEngine } from '../orchestrators/payout-engine';
import { createEtaService } from '../services/eta.service';
import type { EtaService } from '@ridendine/routing';
import { createLedgerService, type LedgerService } from '../services/ledger.service';
import { createPayoutService, type PayoutService } from '../services/payout.service';
import { createReconciliationService, type ReconciliationService } from '../services/reconciliation.service';
import { getStripeClient } from '../services/stripe.service';

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
  triggers: NotificationTriggers;
  /** Phase 1+ routing / ETA (server-side; use for refreshFromDriverPing, etc.). */
  eta: EtaService;

  // Business rules (validation layer)
  rules: BusinessRulesEngine;

  // Canonical engines (single authority for lifecycle transitions)
  masterOrder: MasterOrderEngine;
  masterDelivery: MasterDeliveryEngine;
  payouts: PayoutEngine;
  /** Idempotent ledger writes (Phase 5). */
  ledger: LedgerService;
  /** Preview / execute payout runs + instant payouts (Phase 5). */
  payoutAutomation: PayoutService;
  /** Stripe ↔ ledger reconciliation (Phase 5). */
  reconciliation: ReconciliationService;

  // Order creation (Phase 3 extraction — createOrder, authorizePayment, submitToKitchen)
  orderCreation: OrderCreationService;

  // Phase 2 dispatch split (Stage 2)
  driverMatching: DriverMatchingService;
  offerManagement: OfferManagementService;
  dispatchOrchestrator: DispatchOrchestrator;

  // Domain orchestrators (facades that delegate to canonical engines)
  orders: MasterOrderEngine;
  kitchen: KitchenEngine;
  dispatch: DispatchOrchestrator;
  commerce: CommerceLedgerEngine;
  support: SupportExceptionEngine;
  platform: PlatformWorkflowEngine;
  ops: OpsControlEngine;
  operations: OperationsCommandGateway;
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
  // Register SMS provider (only active when TWILIO_* env vars are set)
  notifications.registerProvider(createTwilioProvider());

  const triggers = createNotificationTriggers(client, notifications);

  // Create business rules engine (validation layer)
  const rules = createBusinessRulesEngine(client);

  // Create canonical engines (single authority for lifecycle transitions)
  const masterOrder = createMasterOrderEngine(client, audit, events, paymentAdapter);
  const masterDelivery = createDeliveryEngine(client, audit, events, masterOrder);
  const payouts = createPayoutEngine(client, audit, events);
  const ledger = createLedgerService(client);
  const payoutAutomation = createPayoutService(client, ledger, {
    audit,
    getStripe: () => {
      try {
        return getStripeClient();
      } catch {
        return null;
      }
    },
  });
  const reconciliation = createReconciliationService(client);

  const eta = createEtaService(client);

  const orderCreation = createOrderCreationService(client, events, audit, sla, masterOrder, eta);

  // Phase 2 dispatch split
  const driverMatching = createDriverMatchingService(client, eta);
  const offerManagement = createOfferManagementService(client, events, audit, sla, driverMatching, eta);
  const dispatchOrchestrator = createDispatchOrchestrator(
    client, events, audit, sla, eta,
    masterOrder, masterDelivery, offerManagement, driverMatching
  );

  // Create domain orchestrators (facades that delegate to canonical engines)
  const kitchen = createKitchenEngine(client, events, audit);
  const commerce = createCommerceLedgerEngine(client, events, audit);
  const support = createSupportExceptionEngine(client, events, audit);
  const platform = createPlatformWorkflowEngine(client, events, audit, masterOrder, dispatchOrchestrator, support);
  const ops = createOpsControlEngine(client, events, audit, dispatchOrchestrator, support, commerce);
  const operations = createOperationsCommandGateway({
    client,
    audit,
    orders: masterOrder,
    platform,
    dispatch: dispatchOrchestrator,
    ops,
    commerce,
    support,
    payoutAutomation,
    sla,
  });

  return {
    events,
    audit,
    sla,
    notifications,
    triggers,
    eta,
    rules,
    masterOrder,
    masterDelivery,
    payouts,
    ledger,
    payoutAutomation,
    reconciliation,
    orderCreation,
    driverMatching,
    offerManagement,
    dispatchOrchestrator,
    orders: masterOrder,
    kitchen,
    dispatch: dispatchOrchestrator,
    commerce,
    support,
    platform,
    ops,
    operations,
  };
}

/**
 * Per-request engine factory (no singleton — avoids stale client references).
 */
export function getEngine(client: SupabaseClient): CentralEngine {
  return createCentralEngine(client);
}
