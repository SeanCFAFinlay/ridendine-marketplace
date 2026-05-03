import { describe, expect, it, vi } from 'vitest';
import { createEtaService } from './eta.service';

const { OsrmProvider, EtaService } = vi.hoisted(() => {
  const OsrmProvider = vi.fn(function OsrmProviderMock() {
    return;
  });
  const EtaService = vi.fn(function EtaServiceMock(
    this: unknown,
    provider: unknown,
    client: unknown
  ) {
    return { provider, client };
  });
  return { OsrmProvider, EtaService };
});

vi.mock('@ridendine/routing', () => ({
  OsrmProvider,
  EtaService,
}));

describe('createEtaService', () => {
  it('constructs EtaService with OsrmProvider and client', () => {
    vi.clearAllMocks();
    const client = { tag: 'supabase' } as any;
    const svc = createEtaService(client);
    expect(OsrmProvider).toHaveBeenCalledTimes(1);
    expect(EtaService).toHaveBeenCalledTimes(1);
    const [providerArg, clientArg] = EtaService.mock.calls[0]!;
    expect(providerArg).toBeInstanceOf(OsrmProvider);
    expect(clientArg).toBe(client);
    expect(svc).toEqual({ provider: expect.any(OsrmProvider), client });
  });
});
