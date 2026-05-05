// ==========================================
// ENGINE FACTORY TESTS
// TDD: Central engine wiring and composition
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all heavy dependencies so the factory can be tested in isolation
vi.mock('./event-emitter', () => ({
  createEventEmitter: vi.fn(() => ({ emit: vi.fn(), flush: vi.fn() })),
}));

vi.mock('./audit-logger', () => ({
  createAuditLogger: vi.fn(() => ({
    log: vi.fn(),
    logStatusChange: vi.fn(),
    logOverride: vi.fn(),
  })),
}));

vi.mock('./sla-manager', () => ({
  createSLAManager: vi.fn(() => ({
    startTimer: vi.fn(),
    completeTimer: vi.fn(),
  })),
}));

vi.mock('./notification-sender', () => ({
  createNotificationSender: vi.fn(() => ({
    send: vi.fn(),
    registerProvider: vi.fn(),
  })),
}));

vi.mock('./email-provider', () => ({
  createResendProvider: vi.fn(() => ({
    name: 'mock-resend',
    isAvailable: () => false,
    deliver: vi.fn(),
  })),
}));

vi.mock('./business-rules-engine', () => ({
  createBusinessRulesEngine: vi.fn(() => ({})),
}));

vi.mock('../services/eta.service', () => ({
  createEtaService: vi.fn(() => ({ __eta: true })),
}));

vi.mock('../services/ledger.service', () => ({
  createLedgerService: vi.fn(() => ({})),
}));

vi.mock('../services/payout.service', () => ({
  createPayoutService: vi.fn(() => ({})),
}));

vi.mock('../services/reconciliation.service', () => ({
  createReconciliationService: vi.fn(() => ({})),
}));

vi.mock('../services/stripe.service', () => ({
  getStripeClient: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/master-order-engine', () => ({
  createMasterOrderEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/delivery-engine', () => ({
  createDeliveryEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/payout-engine', () => ({
  createPayoutEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/order-creation.service', () => ({
  createOrderCreationService: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/driver-matching.service', () => ({
  createDriverMatchingService: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/offer-management.service', () => ({
  createOfferManagementService: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/dispatch-orchestrator', () => ({
  createDispatchOrchestrator: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/kitchen.engine', () => ({
  createKitchenEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/commerce.engine', () => ({
  createCommerceLedgerEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/support.engine', () => ({
  createSupportExceptionEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/platform.engine', () => ({
  createPlatformWorkflowEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/ops.engine', () => ({
  createOpsControlEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/operations-command.gateway', () => ({
  createOperationsCommandGateway: vi.fn(() => ({})),
}));

describe('createCentralEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates engine with all required service properties', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const mockClient = {} as any;

    const engine = createCentralEngine(mockClient);

    // Core utilities
    expect(engine).toHaveProperty('events');
    expect(engine).toHaveProperty('audit');
    expect(engine).toHaveProperty('sla');
    expect(engine).toHaveProperty('notifications');
    expect(engine).toHaveProperty('eta');

    // Canonical engines
    expect(engine).toHaveProperty('masterOrder');
    expect(engine).toHaveProperty('masterDelivery');
    expect(engine).toHaveProperty('orderCreation');
    expect(engine).toHaveProperty('dispatchOrchestrator');

    // Aliased facade properties
    expect(engine).toHaveProperty('orders');
    expect(engine).toHaveProperty('dispatch');
    expect(engine).toHaveProperty('kitchen');
    expect(engine).toHaveProperty('commerce');
    expect(engine).toHaveProperty('support');
    expect(engine).toHaveProperty('platform');
    expect(engine).toHaveProperty('ops');

    expect(engine).toHaveProperty('ledger');
    expect(engine).toHaveProperty('payoutAutomation');
    expect(engine).toHaveProperty('reconciliation');
  });

  it('orders is the same instance as masterOrder', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const engine = createCentralEngine({} as any);
    expect(engine.orders).toBe(engine.masterOrder);
  });

  it('dispatch is the same instance as dispatchOrchestrator', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const engine = createCentralEngine({} as any);
    expect(engine.dispatch).toBe(engine.dispatchOrchestrator);
  });

  it('registers email provider on the notification sender', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const { createNotificationSender } = await import('./notification-sender');

    createCentralEngine({} as any);

    const sender = (createNotificationSender as any).mock.results[0]?.value;
    expect(sender.registerProvider).toHaveBeenCalledTimes(1);
  });

  it('passes the Supabase client to createEventEmitter', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const { createEventEmitter } = await import('./event-emitter');

    const mockClient = { _id: 'test-client' } as any;
    createCentralEngine(mockClient);

    expect(createEventEmitter).toHaveBeenCalledWith(mockClient);
  });

  it('passes the Supabase client to createAuditLogger', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const { createAuditLogger } = await import('./audit-logger');

    const mockClient = { _id: 'test-client-2' } as any;
    createCentralEngine(mockClient);

    expect(createAuditLogger).toHaveBeenCalledWith(mockClient);
  });
});

describe('getEngine (per-request)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('returns a fresh instance on each call', async () => {
    const { getEngine } = await import('./engine.factory');

    const mockClient = {} as any;
    const first = getEngine(mockClient);
    const second = getEngine(mockClient);

    expect(first).not.toBe(second);
  });

  it('creates a valid engine on every call', async () => {
    const { getEngine } = await import('./engine.factory');

    const engine = getEngine({} as any);

    expect(engine).toHaveProperty('orders');
    expect(engine).toHaveProperty('dispatch');
    expect(engine).toHaveProperty('orderCreation');
  });
});
