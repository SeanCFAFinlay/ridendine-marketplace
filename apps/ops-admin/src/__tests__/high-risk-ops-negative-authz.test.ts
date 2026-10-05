/**
 * @jest-environment node
 */

import { ActorRole } from '@ridendine/types';
import type { ActorContext, PlatformCapability } from '@ridendine/types';
import { guardPlatformApi } from '@ridendine/engine/server';
import { validateEngineProcessorHeaders } from '../../../../packages/utils/src/processor-auth';
import * as negativeAuthzAudit from '../../../../scripts/audit/high-risk-ops-negative-authz.cjs';

type EndpointNegativeContract = {
  route: string;
  method: string;
  guard: 'platform' | 'processor' | 'command_center' | 'stripe_signature';
  capability?: PlatformCapability;
  unauthenticatedStatus?: number;
  deniedRoles?: string[];
  disabledEnvStatus?: number;
  deniedHeaderCases?: Array<{ name: string; headers: Record<string, string>; status: number }>;
  deniedSignatureCases?: Array<{ name: string; status: number }>;
};

const {
  endpointNegativeContracts,
  validateNegativeContracts,
} = negativeAuthzAudit as {
  endpointNegativeContracts: EndpointNegativeContract[];
  validateNegativeContracts: () => { failures: unknown[] };
};

function actor(role: string): ActorContext {
  return { userId: `phase-12-${role}`, role: role as ActorContext['role'], entityId: 'e1' };
}

function headersFrom(values: Record<string, string>) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(values)) headers.set(key, value);
  return headers;
}

describe('Phase 12 high-risk Ops negative authorization matrix', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'phase-12-cron-secret',
      ENGINE_PROCESSOR_TOKEN: 'phase-12-processor-token',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is internally valid and covers every Phase 11 method row', () => {
    expect(validateNegativeContracts().failures).toEqual([]);
    // Floor lowered 30 -> 27: the nine /api/cron/* wrapper rows were removed with
    // those unscheduled duplicate routes, and four rows were added for the new
    // reconciliation and retention processors.
    expect(endpointNegativeContracts.length).toBeGreaterThanOrEqual(27);
  });

  describe.each(endpointNegativeContracts.filter((contract) => contract.guard === 'platform'))(
    '$method $route platform guard',
    (contract) => {
      it('returns 401 when no actor is available', () => {
        const denied = guardPlatformApi(null, contract.capability!);
        expect(denied).not.toBeNull();
        expect(denied!.status).toBe(contract.unauthenticatedStatus);
      });

      it.each(contract.deniedRoles ?? [])('returns 403 for denied role %s', (role) => {
        const denied = guardPlatformApi(actor(role), contract.capability!);
        expect(denied).not.toBeNull();
        expect(denied!.status).toBe(403);
      });
    }
  );

  describe.each(endpointNegativeContracts.filter((contract) => contract.guard === 'processor'))(
    '$method $route processor guard',
    (contract) => {
      it.each(contract.deniedHeaderCases ?? [])('rejects $name', ({ headers, status }) => {
        expect(validateEngineProcessorHeaders(headersFrom(headers))).toBe(false);
        expect(status).toBe(401);
      });
    }
  );

  it('captures command-center disabled-env and team_manage denial semantics', () => {
    const rows = endpointNegativeContracts.filter((contract) => contract.guard === 'command_center');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.capability).toBe('team_manage');
      expect(row.disabledEnvStatus).toBe(403);
      expect(row.deniedRoles).toContain(ActorRole.OPS_ADMIN);
      expect(row.deniedRoles).toContain(ActorRole.FINANCE_ADMIN);
    }
  });

  it('captures Stripe webhook signature denial semantics', () => {
    const row = endpointNegativeContracts.find((contract) => contract.guard === 'stripe_signature');
    expect(row).toBeDefined();
    expect(row!.route).toBe('/api/stripe/webhook');
    expect(row!.deniedSignatureCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'missing stripe-signature', status: 400 }),
        expect.objectContaining({ name: 'invalid stripe-signature', status: 400 }),
      ])
    );
  });
});
