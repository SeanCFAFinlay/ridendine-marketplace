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

vi.mock('../services/eta.service', () => ({
  createEtaService: vi.fn(() => ({ __eta: true })),
}));

vi.mock('../orchestrators/order.orchestrator', () => ({
  createOrderOrchestrator: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/kitchen.engine', () => ({
  createKitchenEngine: vi.fn(() => ({})),
}));

vi.mock('../orchestrators/dispatch.engine', () => ({
  createDispatchEngine: vi.fn(() => ({})),
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

describe('createCentralEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton between tests
    import('./engine.factory').then(({ resetEngine }) => resetEngine());
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

    // Domain orchestrators
    expect(engine).toHaveProperty('orders');
    expect(engine).toHaveProperty('kitchen');
    expect(engine).toHaveProperty('dispatch');
    expect(engine).toHaveProperty('commerce');
    expect(engine).toHaveProperty('support');
    expect(engine).toHaveProperty('platform');
    expect(engine).toHaveProperty('ops');

    expect(engine).toHaveProperty('ledger');
    expect(engine).toHaveProperty('payoutAutomation');
    expect(engine).toHaveProperty('reconciliation');
  });

  it('passes paymentAdapter to createOrderOrchestrator', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const { createOrderOrchestrator } = await import('../orchestrators/order.orchestrator');

    const mockClient = {} as any;
    const mockAdapter = { cancelPaymentIntent: vi.fn() } as any;

    createCentralEngine(mockClient, mockAdapter);

    const callArgs = (createOrderOrchestrator as any).mock.calls[0];
    expect(callArgs[5]).toBe(mockAdapter);
    expect(callArgs[6]).toBeDefined();
  });

  it('calls createOrderOrchestrator without adapter when none provided', async () => {
    const { createCentralEngine } = await import('./engine.factory');
    const { createOrderOrchestrator } = await import('../orchestrators/order.orchestrator');

    createCentralEngine({} as any);

    expect(createOrderOrchestrator).toHaveBeenCalledTimes(1);
    const callArgs = (createOrderOrchestrator as any).mock.calls[0];
    expect(callArgs[5]).toBeUndefined();
    expect(callArgs[6]).toBeDefined();
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

describe('getEngine (singleton)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { resetEngine } = await import('./engine.factory');
    resetEngine();
  });

  it('returns the same instance on repeated calls', async () => {
    const { getEngine, resetEngine } = await import('./engine.factory');
    resetEngine();

    const mockClient = {} as any;
    const first = getEngine(mockClient);
    const second = getEngine(mockClient);

    expect(first).toBe(second);
  });

  it('creates a fresh instance after resetEngine()', async () => {
    const { getEngine, resetEngine } = await import('./engine.factory');
    resetEngine();

    const mockClient = {} as any;
    const first = getEngine(mockClient);
    resetEngine();
    const second = getEngine(mockClient);

    expect(first).not.toBe(second);
  });
});
