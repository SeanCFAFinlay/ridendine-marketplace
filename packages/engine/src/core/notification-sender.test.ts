// ==========================================
// NOTIFICATION SENDER TESTS
// TDD: Provider registration and delivery flow
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock @ridendine/notifications so tests don't depend on template content
vi.mock('@ridendine/notifications', () => ({
  createNotification: vi.fn(
    (type: string, userId: string, _params: unknown, data?: unknown) => ({
      type,
      userId,
      title: `Notification: ${type}`,
      body: `Body for ${type}`,
      data: data ?? {},
    })
  ),
}));

import { NotificationSender, type NotificationDeliveryProvider } from './notification-sender';

function createDedupeChain(maybeSingleResult: { data: { id: string } | null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
  };
}

function createMockClient(dedupeHit = false) {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const dedupeChain = createDedupeChain(dedupeHit ? { data: { id: 'dup' } } : { data: null });
  const chain = {
    ...dedupeChain,
    insert: insertMock,
  };
  return {
    from: vi.fn(() => chain),
    _insertMock: insertMock,
    _maybeSingle: dedupeChain.maybeSingle,
  };
}

describe('NotificationSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Database write ----

  it('writes to the notifications table on send', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    await sender.send('order_placed' as any, 'user-123', { orderNumber: 'RD-001' });

    expect(client.from).toHaveBeenCalledWith('notifications');
    expect(client._insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        type: 'order_placed',
      })
    );
  });

  it('includes title and body in the DB insert', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    await sender.send('order_accepted' as any, 'user-456');

    expect(client._insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        body: expect.any(String),
      })
    );
  });

  it('skips insert and providers when dedupe finds existing row (order_id)', async () => {
    const client = createMockClient(true);
    const sender = new NotificationSender(client as any);
    const provider: NotificationDeliveryProvider = {
      name: 'p',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
    };
    sender.registerProvider(provider);

    await sender.send('order_placed' as any, 'u1', { orderNumber: '1' }, { order_id: 'ord-99' });

    expect(client._insertMock).not.toHaveBeenCalled();
    expect(provider.deliver).not.toHaveBeenCalled();
  });

  // ---- Provider registration ----

  it('calls registered available providers after DB write', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    const mockProvider: NotificationDeliveryProvider = {
      name: 'test-provider',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
    };

    sender.registerProvider(mockProvider);
    await sender.send('order_placed' as any, 'user-456', { orderNumber: 'RD-002' }, { order_id: 'o1' });

    expect(mockProvider.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order_placed',
        userId: 'user-456',
      })
    );
  });

  it('skips providers whose isAvailable() returns false', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    const unavailableProvider: NotificationDeliveryProvider = {
      name: 'disabled-provider',
      isAvailable: () => false,
      deliver: vi.fn(),
    };

    sender.registerProvider(unavailableProvider);
    await sender.send('order_placed' as any, 'user-789', {}, { order_id: 'x' });

    expect(unavailableProvider.deliver).not.toHaveBeenCalled();
  });

  it('calls all available providers when multiple are registered', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    const providerA: NotificationDeliveryProvider = {
      name: 'provider-a',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
    };
    const providerB: NotificationDeliveryProvider = {
      name: 'provider-b',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
    };

    sender.registerProvider(providerA);
    sender.registerProvider(providerB);
    await sender.send('order_ready' as any, 'user-multi', {}, { order_id: 'o2' });

    expect(providerA.deliver).toHaveBeenCalledTimes(1);
    expect(providerB.deliver).toHaveBeenCalledTimes(1);
  });

  // ---- Error isolation ----

  it('does not throw when a provider rejects', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    const crashProvider: NotificationDeliveryProvider = {
      name: 'crash-provider',
      isAvailable: () => true,
      deliver: vi.fn().mockRejectedValue(new Error('Provider crashed')),
    };

    sender.registerProvider(crashProvider);

    await expect(sender.send('order_placed' as any, 'user-000', {}, { order_id: 'o3' })).resolves.not.toThrow();
  });

  it('does not throw when DB insert throws synchronously', async () => {
    const dedupe = createDedupeChain({ data: null });
    const badClient = {
      from: vi.fn(() => ({
        ...dedupe,
        insert: vi.fn().mockImplementation(() => {
          throw new Error('DB error');
        }),
      })),
    };
    const sender = new NotificationSender(badClient as any);

    await expect(sender.send('order_placed' as any, 'user-err', {}, { order_id: 'o4' })).resolves.not.toThrow();
  });

  it('still calls available providers even when DB write fails', async () => {
    const dedupe = createDedupeChain({ data: null });
    const badClient = {
      from: vi.fn(() => ({
        ...dedupe,
        insert: vi.fn().mockImplementation(() => {
          throw new Error('DB error');
        }),
      })),
    };
    const sender = new NotificationSender(badClient as any);

    const provider: NotificationDeliveryProvider = {
      name: 'fallback-provider',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: true }),
    };
    sender.registerProvider(provider);

    await sender.send('order_placed' as any, 'user-fallback', {}, { order_id: 'o5' });

    expect(provider.deliver).toHaveBeenCalledTimes(1);
  });

  it('does not throw when provider returns delivered: false with an error message', async () => {
    const client = createMockClient();
    const sender = new NotificationSender(client as any);

    const failProvider: NotificationDeliveryProvider = {
      name: 'fail-provider',
      isAvailable: () => true,
      deliver: vi.fn().mockResolvedValue({ delivered: false, error: 'rate_limited' }),
    };

    sender.registerProvider(failProvider);

    await expect(sender.send('order_delivered' as any, 'user-rl', {}, { order_id: 'o6' })).resolves.not.toThrow();
  });
});
