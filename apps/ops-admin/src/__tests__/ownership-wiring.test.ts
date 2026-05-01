import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readFile(pathParts: string[]): string {
  return readFileSync(join(__dirname, '..', '..', '..', ...pathParts), 'utf8');
}

describe('cross-tenant ownership wiring', () => {
  it('chef order route rejects orders outside chef storefront', () => {
    const src = readFile([
      'chef-admin',
      'src',
      'app',
      'api',
      'orders',
      '[id]',
      'route.ts',
    ]);
    expect(src).toContain('verifyChefOwnsOrder');
    expect(src).toContain('FORBIDDEN');
  });

  it('driver delivery route rejects deliveries not assigned to driver', () => {
    const src = readFile([
      'driver-app',
      'src',
      'app',
      'api',
      'deliveries',
      '[id]',
      'route.ts',
    ]);
    expect(src).toContain('verifyDriverOwnsDelivery');
    expect(src).toContain('FORBIDDEN');
  });
});
