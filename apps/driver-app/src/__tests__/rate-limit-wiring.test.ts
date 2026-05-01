/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

describe('driver location rate-limit wiring', () => {
  it('uses the driverLocation policy in location route', () => {
    const routePath = join(__dirname, '../app/api/location/route.ts');
    const source = readFileSync(routePath, 'utf8');
    expect(source).toContain('RATE_LIMIT_POLICIES.driverLocation');
    expect(source).toContain("namespace: RATE_STORE");
  });
});
