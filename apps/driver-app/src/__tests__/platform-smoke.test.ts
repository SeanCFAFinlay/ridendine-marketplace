/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('driver-app smoke wiring', () => {
  it('middleware preserves login/signup as public routes', () => {
    const src = read('middleware.ts');
    expect(src).toContain("publicRoutes: ['/auth/login', '/auth/signup']");
    expect(src).toContain("loginRoute: '/auth/login'");
  });

  it('driver home page enforces auth redirect', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("redirect('/auth/login')");
  });

  it('critical driver pages exist for assignment lifecycle surfaces', () => {
    const deliveryPage = read('app/delivery/[id]/page.tsx');
    const historyPage = read('app/history/page.tsx');
    const earningsPage = read('app/earnings/page.tsx');
    expect(deliveryPage.length).toBeGreaterThan(100);
    expect(historyPage.length).toBeGreaterThan(100);
    expect(earningsPage.length).toBeGreaterThan(100);
  });
});
